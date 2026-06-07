"""
Enhanced Security Middleware for SyncHire API

Provides comprehensive security measures:
- Request validation and sanitization
- Security headers injection
- CSRF protection
- Session validation
- Rate limiting integration
- Security event logging
"""

import time
import re
from typing import Callable
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import logging

from app.core.config import get_settings
from app.core.security_enhanced import (
    SecurityAuditor,
    CSRFProtection,
)

logger = logging.getLogger(__name__)
settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects security headers into all responses
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        response.headers["X-DNS-Prefetch-Control"] = "off"

        # Remove server information
        try:
            del response.headers["Server"]
        except KeyError:
            pass

        return response


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Validates and sanitizes request input to prevent injection attacks
    """

    # Patterns for SQL injection detection
    SQL_INJECTION_PATTERNS = [
        r"(\bunion\b.*\bselect\b)",
        r"(\bor\b.*=)",
        r"(\band\b.*=)",
        r"(\bdrop\b.*\btable\b)",
        r"(\bexec\b|\bexecute\b)",
        r"(;.*\bdrop\b)",
        r"(;.*\bdelete\b)",
        r"(;.*\binsert\b)",
        r"(;.*\bupdate\b)",
    ]

    # Patterns for XSS detection
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"onerror\s*=",
        r"onload\s*=",
        r"onclick\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip validation for certain endpoints
        if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Validate request body for POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                # Get request body
                body = await request.body()

                if body:
                    # Decode and validate
                    body_str = body.decode("utf-8", errors="ignore")

                    # Check for SQL injection
                    if self._detect_sql_injection(body_str):
                        logger.warning(
                            f"SQL injection attempt detected from {request.client.host}"
                        )
                        await SecurityAuditor.log_security_event(
                            "sql_injection_attempt",
                            None,
                            {
                                "ip": request.client.host,
                                "path": request.url.path,
                                "body_preview": body_str[:200],
                            },
                            "warning",
                        )
                        return JSONResponse(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            content={"error": "Invalid request detected"},
                        )

                    # Check for XSS
                    if self._detect_xss(body_str):
                        logger.warning(
                            f"XSS attempt detected from {request.client.host}"
                        )
                        await SecurityAuditor.log_security_event(
                            "xss_attempt",
                            None,
                            {
                                "ip": request.client.host,
                                "path": request.url.path,
                                "body_preview": body_str[:200],
                            },
                            "warning",
                        )
                        return JSONResponse(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            content={"error": "Invalid request detected"},
                        )

                    # Check for path traversal
                    if self._detect_path_traversal(body_str):
                        logger.warning(
                            f"Path traversal attempt detected from {request.client.host}"
                        )
                        await SecurityAuditor.log_security_event(
                            "path_traversal_attempt",
                            None,
                            {"ip": request.client.host, "path": request.url.path},
                            "warning",
                        )
                        return JSONResponse(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            content={"error": "Invalid request detected"},
                        )

            except Exception as e:
                logger.error(f"Error in input validation middleware: {e}")

        response = await call_next(request)
        return response

    def _detect_sql_injection(self, input_str: str) -> bool:
        """Detect SQL injection patterns"""
        input_lower = input_str.lower()
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, input_lower, re.IGNORECASE):
                return True
        return False

    def _detect_xss(self, input_str: str) -> bool:
        """Detect XSS patterns"""
        for pattern in self.XSS_PATTERNS:
            if re.search(pattern, input_str, re.IGNORECASE | re.DOTALL):
                return True
        return False

    def _detect_path_traversal(self, input_str: str) -> bool:
        """Detect path traversal patterns"""
        path_traversal_patterns = ["../", "..\\", "%2e%2e", "%252e"]
        for pattern in path_traversal_patterns:
            if pattern in input_str.lower():
                return True
        return False


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware for state-changing operations
    """

    # Paths that require CSRF protection
    PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

    # Exempt paths (authentication endpoints, webhooks, etc.)
    EXEMPT_PATHS = {
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/api/oauth",
        "/api/password-reset",
        "/health",
        "/",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if this is a protected method
        if request.method in self.PROTECTED_METHODS:
            auth_header = request.headers.get("authorization", "")
            if auth_header.lower().startswith("bearer "):
                return await call_next(request)

            # Check if path is exempt
            if not any(request.url.path.startswith(path) for path in self.EXEMPT_PATHS):
                # Validate CSRF token
                csrf_token = request.headers.get("X-CSRF-Token")
                session_id = request.headers.get("X-Session-ID")

                if not csrf_token or not session_id:
                    await SecurityAuditor.log_security_event(
                        "csrf_missing",
                        None,
                        {"ip": request.client.host, "path": request.url.path},
                        "warning",
                    )
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"error": "CSRF token required"},
                    )

                # Validate token
                is_valid = await CSRFProtection.validate_csrf_token(
                    csrf_token, session_id
                )
                if not is_valid:
                    await SecurityAuditor.log_security_event(
                        "csrf_invalid",
                        None,
                        {"ip": request.client.host, "path": request.url.path},
                        "warning",
                    )
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"error": "Invalid CSRF token"},
                    )

        response = await call_next(request)

        # Add new CSRF token to response for state-changing operations
        if request.method in self.PROTECTED_METHODS and request.method != "GET":
            session_id = request.headers.get("X-Session-ID")
            if session_id:
                new_token = CSRFProtection.generate_csrf_token()
                await CSRFProtection.store_csrf_token(new_token, session_id)
                response.headers["X-CSRF-Token"] = new_token

        return response


class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Monitors security events and anomalies
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.request_times = {}
        self.suspicious_ips = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"

        # Track request timing
        self.request_times[client_ip] = self.request_times.get(client_ip, [])
        self.request_times[client_ip].append(start_time)

        # Clean old request times (older than 1 minute)
        self.request_times[client_ip] = [
            t for t in self.request_times[client_ip] if start_time - t < 60
        ]

        # Check for rapid requests (potential DoS)
        if (
            len(self.request_times[client_ip]) > 100
        ):  # More than 100 requests per minute
            await SecurityAuditor.log_security_event(
                "rapid_requests_detected",
                None,
                {"ip": client_ip, "request_count": len(self.request_times[client_ip])},
                "warning",
            )

        # Process request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            # Log slow requests (potential performance attacks)
            if process_time > 10:  # More than 10 seconds
                await SecurityAuditor.log_security_event(
                    "slow_request",
                    None,
                    {
                        "ip": client_ip,
                        "path": request.url.path,
                        "process_time": process_time,
                    },
                    "info",
                )

            # Add timing header
            response.headers["X-Process-Time"] = str(process_time)

            return response

        except Exception as e:
            # Log security-relevant exceptions
            await SecurityAuditor.log_security_event(
                "request_exception",
                None,
                {"ip": client_ip, "path": request.url.path, "error": str(e)},
                "error",
            )
            raise


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """
    IP whitelist/blacklist middleware for admin endpoints
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.blacklisted_ips = set()
        self.whitelisted_ips = set()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"

        # Check blacklist
        if client_ip in self.blacklisted_ips:
            await SecurityAuditor.log_security_event(
                "blacklisted_ip_access_attempt",
                None,
                {"ip": client_ip, "path": request.url.path},
                "warning",
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"error": "Access denied"},
            )

        # For admin endpoints, check whitelist
        if request.url.path.startswith("/api/admin"):
            if self.whitelisted_ips and client_ip not in self.whitelisted_ips:
                await SecurityAuditor.log_security_event(
                    "unauthorized_admin_access",
                    None,
                    {"ip": client_ip, "path": request.url.path},
                    "warning",
                )
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"error": "Unauthorized access"},
                )

        return await call_next(request)

    def add_to_blacklist(self, ip: str):
        """Add IP to blacklist"""
        self.blacklisted_ips.add(ip)
        logger.info(f"Added IP to blacklist: {ip}")

    def add_to_whitelist(self, ip: str):
        """Add IP to whitelist"""
        self.whitelisted_ips.add(ip)
        logger.info(f"Added IP to whitelist: {ip}")


class ContentLengthMiddleware(BaseHTTPMiddleware):
    """
    Validates content length to prevent oversized payload attacks
    """

    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB default

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check content length for POST/PUT/PATCH requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_length = request.headers.get("content-length")

            if content_length:
                try:
                    content_length_int = int(content_length)
                    if content_length_int > self.MAX_CONTENT_LENGTH:
                        await SecurityAuditor.log_security_event(
                            "oversized_payload",
                            None,
                            {
                                "ip": request.client.host,
                                "content_length": content_length_int,
                                "path": request.url.path,
                            },
                            "warning",
                        )
                        return JSONResponse(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            content={"error": "Payload too large"},
                        )
                except ValueError:
                    pass

        return await call_next(request)


class SecurityContextMiddleware(BaseHTTPMiddleware):
    """
    Adds security context to request state for use in endpoints
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Add security context to request state
        request.state.security_context = {
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "request_id": request.headers.get("x-request-id", "unknown"),
            "timestamp": time.time(),
        }

        response = await call_next(request)

        # Add security headers
        response.headers["X-Request-ID"] = request.state.security_context["request_id"]
        response.headers["X-Content-Type-Options"] = "nosniff"

        return response
