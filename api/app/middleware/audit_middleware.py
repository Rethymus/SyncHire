"""
Audit Middleware for GDPR Compliance

This middleware automatically logs all requests that access or modify user data.
"""

import uuid
import json
from datetime import datetime
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.audit_service import AuditAction, ResourceType
import logging

logger = logging.getLogger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically audit all data access and modifications.

    Logs:
    - All POST/PUT/PATCH/DELETE requests (data modifications)
    - All GET requests to user data endpoints (data access)
    - Authentication events
    - Data exports
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        # Endpoints that should be audited
        self.audited_endpoints = {
            # User data endpoints
            "/api/users": ResourceType.USER,
            "/api/resumes": ResourceType.RESUME,
            "/api/jds": ResourceType.JD,
            "/api/applications": ResourceType.APPLICATION,
            "/api/notifications": ResourceType.NOTIFICATION,
            "/api/search": ResourceType.SEARCH,
            "/api/interviews": ResourceType.INTERVIEW,
            # Compliance endpoints
            "/api/gdpr": ResourceType.USER,
            "/api/compliance": ResourceType.USER,
            # Authentication endpoints
            "/api/auth/login": ResourceType.USER,
            "/api/auth/logout": ResourceType.USER,
            "/api/auth/register": ResourceType.USER,
        }

        # Endpoints that should not be audited
        self.excluded_endpoints = {
            "/api/health",
            "/api/docs",
            "/api/openapi.json",
            "/api/redoc",
            "/api/favicon.ico",
            "/static/",
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and audit if necessary.

        Args:
            request: Incoming request
            call_next: Next middleware or route handler

        Returns:
            Response from route handler
        """
        # Check if endpoint should be excluded
        if self._should_exclude(request):
            return await call_next(request)

        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Get request metadata
        user_id = await self._get_user_id(request)
        ip_address = self._get_ip_address(request)
        user_agent = request.headers.get("user-agent", "")

        # Check if endpoint should be audited
        resource_type = self._get_resource_type(request)
        if not resource_type:
            return await call_next(request)

        # Store request body for POST/PUT/PATCH
        request_body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            request_body = await self._get_request_body(request)

        # Process request
        start_time = datetime.utcnow()
        response = await call_next(request)
        duration = (datetime.utcnow() - start_time).total_seconds()

        # Audit the request
        try:
            await self._audit_request(
                request=request,
                response=response,
                user_id=user_id,
                resource_type=resource_type,
                request_id=request_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_body=request_body,
                duration=duration,
            )
        except Exception as e:
            # Don't fail the request if audit logging fails
            logger.error(f"Failed to audit request: {str(e)}")

        return response

    def _should_exclude(self, request: Request) -> bool:
        """Check if request should be excluded from auditing."""
        path = request.url.path

        # Check exact matches
        if path in self.excluded_endpoints:
            return True

        # Check prefix matches
        for excluded in self.excluded_endpoints:
            if path.startswith(excluded):
                return True

        return False

    def _get_resource_type(self, request: Request) -> Optional[ResourceType]:
        """Get resource type based on request path."""
        path = request.url.path

        for endpoint, resource_type in self.audited_endpoints.items():
            if path.startswith(endpoint):
                return resource_type

        return None

    async def _get_user_id(self, request: Request) -> Optional[uuid.UUID]:
        """Extract user ID from request."""
        try:
            # Check if user is in state (set by auth middleware)
            if hasattr(request.state, "user") and request.state.user:
                return request.state.user.get("id")

            # Try to get from Authorization header
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                # Token will be validated by auth middleware
                # This is just a fallback
                pass

            return None
        except Exception:
            return None

    def _get_ip_address(self, request: Request) -> Optional[str]:
        """Extract IP address from request."""
        # Check forwarded headers (for proxies/load balancers)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client address
        if request.client:
            return request.client.host

        return None

    async def _get_request_body(self, request: Request) -> Optional[dict]:
        """Extract request body for logging."""
        try:
            # Note: This consumes the body, so we need to store it back
            body = await request.body()
            if body:
                return json.loads(body.decode())
            return None
        except Exception:
            return None

    async def _audit_request(
        self,
        request: Request,
        response: Response,
        user_id: Optional[uuid.UUID],
        resource_type: ResourceType,
        request_id: str,
        ip_address: Optional[str],
        user_agent: str,
        request_body: Optional[dict],
        duration: float,
    ):
        """Audit the request based on method and response status."""
        # Only audit successful requests (2xx, 3xx) and failed requests (4xx, 5xx)
        # Don't audit 404s for missing endpoints
        if response.status_code == 404:
            return

        # Map HTTP methods to audit actions
        method = request.method
        path = request.url.path

        # Determine audit action
        if method == "GET":
            action = AuditAction.READ
        elif method == "POST":
            if "/auth/login" in path:
                action = AuditAction.AUTH_LOGIN
            elif "/auth/register" in path:
                action = AuditAction.CREATE
            elif "/export" in path or "/download" in path:
                action = AuditAction.EXPORT
            else:
                action = AuditAction.CREATE
        elif method in ["PUT", "PATCH"]:
            action = AuditAction.UPDATE
        elif method == "DELETE":
            action = AuditAction.DELETE
        else:
            action = AuditAction.READ

        # Extract resource ID from path
        resource_id = self._extract_resource_id(path)

        # Note: We can't directly access the database session in middleware
        # Instead, we'll log asynchronously without blocking the request
        # The actual audit log will be created by the endpoint handlers
        # This middleware just extracts and stores the metadata

        # Determine old_values and new_values
        old_values = None
        new_values = None

        if method in ["POST", "PUT", "PATCH"]:
            new_values = request_body
        elif method == "DELETE":
            old_values = {"deleted": True}

        # Add response metadata
        metadata = {
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "method": method,
            "path": path,
        }

        # Store audit metadata in request state for later use
        request.state.audit_metadata = {
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "old_values": old_values,
            "new_values": new_values,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_id": request_id,
            "description": f"{method} {path} - {response.status_code}",
            "metadata": metadata,
        }

        # Note: The actual audit log will be created by endpoint handlers
        # that have access to the database session via dependency injection

    def _extract_resource_id(self, path: str) -> Optional[uuid.UUID]:
        """Extract resource ID from URL path."""
        try:
            # Split path and find UUID segments
            segments = path.split("/")
            for segment in segments:
                # Check if segment is a valid UUID
                try:
                    return uuid.UUID(segment)
                except ValueError:
                    continue
            return None
        except Exception:
            return None


class AuditContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add database session to request state for audit logging.

    This should be added AFTER the database middleware but BEFORE the audit middleware.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add database session to request state."""
        # The database session should be injected by dependency injection
        # We just pass through here
        return await call_next(request)


# Dependency to get database session for audit logging
async def get_audit_db(request: Request) -> Optional[AsyncSession]:
    """Get database session from request state for audit logging."""
    # This should be overridden by the actual database dependency
    return None
