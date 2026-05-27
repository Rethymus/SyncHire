#!/usr/bin/env python3
"""
Security Audit Script for SyncHire Platform

Performs comprehensive security checks:
- Configuration validation
- Dependency vulnerability scanning
- Code security patterns
- Data protection verification
- Authentication security checks
"""

import os
import sys
import subprocess
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SecurityAudit:
    """Comprehensive security audit for SyncHire platform"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.issues: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.passed_checks: List[Dict[str, Any]] = []

    def run_full_audit(self) -> Dict[str, Any]:
        """Run complete security audit"""
        logger.info("Starting comprehensive security audit...")

        # Configuration checks
        self.check_configuration_security()

        # Dependency checks
        self.check_dependency_vulnerabilities()

        # Code security checks
        self.check_code_security_patterns()

        # Authentication checks
        self.check_authentication_security()

        # Data protection checks
        self.check_data_protection()

        # API security checks
        self.check_api_security()

        # Frontend security checks
        self.check_frontend_security()

        # Generate report
        return self.generate_report()

    def check_configuration_security(self) -> None:
        """Check security configuration"""
        logger.info("Checking configuration security...")

        # Check .env files
        env_file = self.project_root / "api" / ".env"
        if env_file.exists():
            self.add_issue(
                "configuration",
                ".env file found in codebase",
                "high",
                "Remove .env files from version control"
            )

        # Check for hardcoded secrets
        api_files = list((self.project_root / "api").rglob("*.py"))
        for file_path in api_files:
            content = file_path.read_text()
            secret_patterns = [
                r'password\s*=\s*["\'][^"\']+["\']',
                r'api_key\s*=\s*["\'][^"\']+["\']',
                r'secret\s*=\s*["\'][^"\']+["\']',
                r'token\s*=\s*["\'][^"\']+["\']',
            ]

            for pattern in secret_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    self.add_issue(
                        "configuration",
                        f"Potential hardcoded secret in {file_path.relative_to(self.project_root)}",
                        "high",
                        "Use environment variables for sensitive data"
                    )
                    break

        # Check CORS configuration
        config_file = self.project_root / "api" / "app" / "core" / "config.py"
        if config_file.exists():
            content = config_file.read_text()
            if "CORS_ORIGINS" in content:
                # Check if wildcard is used
                if '["*"]' in content or '["*"]' in content:
                    self.add_issue(
                        "configuration",
                        "Wildcard CORS origin detected",
                        "high",
                        "Restrict CORS origins to specific domains"
                    )

        self.add_passed_check("configuration", "Configuration security checks completed")

    def check_dependency_vulnerabilities(self) -> None:
        """Check for dependency vulnerabilities"""
        logger.info("Checking dependency vulnerabilities...")

        # Check Python dependencies
        requirements_file = self.project_root / "api" / "requirements.txt"
        if requirements_file.exists():
            try:
                # Run safety check
                result = subprocess.run(
                    ["safety", "check", "--file", str(requirements_file)],
                    capture_output=True,
                    text=True,
                    timeout=60
                )

                if result.returncode != 0:
                    self.add_issue(
                        "dependencies",
                        "Vulnerabilities found in Python dependencies",
                        "high",
                        "Run: safety check --file requirements.txt"
                    )
                else:
                    self.add_passed_check("dependencies", "No Python vulnerabilities found")

            except (subprocess.TimeoutExpired, FileNotFoundError):
                self.add_warning(
                    "dependencies",
                    "Safety check not installed. Run: pip install safety"
                )

        # Check Node.js dependencies
        package_files = list(self.project_root.rglob("package.json"))
        for package_file in package_files:
            if "node_modules" not in str(package_file):
                try:
                    result = subprocess.run(
                        ["npm", "audit", "--json"],
                        cwd=package_file.parent,
                        capture_output=True,
                        text=True,
                        timeout=60
                    )

                    if result.returncode == 0:
                        audit_data = json.loads(result.stdout)
                        vulnerabilities = audit_data.get("vulnerabilities", {})

                        if vulnerabilities:
                            high_vulns = len(vulnerabilities.get("high", []))
                            critical_vulns = len(vulnerabilities.get("critical", []))

                            if high_vulns > 0 or critical_vulns > 0:
                                self.add_issue(
                                    "dependencies",
                                    f"High/critical vulnerabilities in {package_file.parent.name}",
                                    "high",
                                    "Run: npm audit fix"
                                )
                except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
                    pass

    def check_code_security_patterns(self) -> None:
        """Check code for security patterns"""
        logger.info("Checking code security patterns...")

        # Check for SQL injection risks
        api_files = list((self.project_root / "api").rglob("*.py"))
        for file_path in api_files:
            content = file_path.read_text()

            # Check for string concatenation in SQL
            if re.search(r'execute\([^)]*\+[^)]*\)', content):
                self.add_issue(
                    "code_security",
                    f"Potential SQL injection in {file_path.relative_to(self.project_root)}",
                    "critical",
                    "Use parameterized queries"
                )

            # Check for eval() usage
            if re.search(r'\beval\(', content):
                self.add_issue(
                    "code_security",
                    f"Unsafe eval() in {file_path.relative_to(self.project_root)}",
                    "high",
                    "Avoid using eval() with user input"
                )

            # Check for shell=True
            if re.search(r'subprocess\..*shell=True', content):
                self.add_issue(
                    "code_security",
                    f"shell=True in {file_path.relative_to(self.project_root)}",
                    "high",
                    "Avoid shell=True in subprocess calls"
                )

        # Check for XSS risks in frontend
        tsx_files = list((self.project_root / "frontend").rglob("*.tsx"))
        for file_path in tsx_files:
            content = file_path.read_text()

            # Check for dangerouslySetInnerHTML
            if "dangerouslySetInnerHTML" in content:
                self.add_warning(
                    "code_security",
                    f"dangerouslySetInnerHTML in {file_path.relative_to(self.project_root)}",
                    "Ensure HTML is sanitized"
                )

            # Check for innerHTML
            if re.search(r'\.innerHTML\s*=', content):
                self.add_warning(
                    "code_security",
                    f"innerHTML usage in {file_path.relative_to(self.project_root)}",
                    "Ensure HTML is sanitized"
                )

        self.add_passed_check("code_security", "Code security pattern checks completed")

    def check_authentication_security(self) -> None:
        """Check authentication security"""
        logger.info("Checking authentication security...")

        # Check for password hashing
        auth_service = self.project_root / "api" / "app" / "services" / "auth_service.py"
        if auth_service.exists():
            content = auth_service.read_text()

            if "get_password_hash" not in content:
                self.add_issue(
                    "authentication",
                    "Password hashing not implemented",
                    "critical",
                    "Implement secure password hashing"
                )

            if "verify_password" not in content:
                self.add_issue(
                    "authentication",
                    "Password verification not implemented",
                    "critical",
                    "Implement secure password verification"
                )

        # Check for JWT implementation
        security_file = self.project_root / "api" / "app" / "core" / "security.py"
        if security_file.exists():
            content = security_file.read_text()

            if "jwt.encode" not in content:
                self.add_issue(
                    "authentication",
                    "JWT encoding not implemented",
                    "high",
                    "Implement JWT token generation"
                )

            if "jwt.decode" not in content:
                self.add_issue(
                    "authentication",
                    "JWT decoding not implemented",
                    "high",
                    "Implement JWT token validation"
                )

        # Check for rate limiting
        rate_limit_file = self.project_root / "api" / "app" / "middleware" / "rate_limit.py"
        if not rate_limit_file.exists():
            self.add_issue(
                "authentication",
                "Rate limiting not implemented",
                "high",
                "Implement rate limiting for authentication endpoints"
            )

        self.add_passed_check("authentication", "Authentication security checks completed")

    def check_data_protection(self) -> None:
        """Check data protection measures"""
        logger.info("Checking data protection...")

        # Check for encryption utilities
        security_enhanced = self.project_root / "api" / "app" / "core" / "security_enhanced.py"
        if security_enhanced.exists():
            content = security_enhanced.read_text()

            if "DataEncryption" not in content:
                self.add_warning(
                    "data_protection",
                    "Data encryption utilities not found",
                    "Implement data encryption at rest"
                )

            if "PasswordPolicy" not in content:
                self.add_warning(
                    "data_protection",
                    "Password policy enforcement not found",
                    "Implement password policies"
                )

        # Check for data masking
        data_protection = self.project_root / "api" / "app" / "utils" / "data_protection.py"
        if not data_protection.exists():
            self.add_warning(
                "data_protection",
                "Data protection utilities not found",
                "Implement data masking and anonymization"
            )

        # Check for GDPR compliance
        gdpr_router = self.project_root / "api" / "app" / "api" / "gdpr.py"
        if not gdpr_router.exists():
            self.add_warning(
                "data_protection",
                "GDPR compliance endpoints not found",
                "Implement GDPR compliance features"
            )

        self.add_passed_check("data_protection", "Data protection checks completed")

    def check_api_security(self) -> None:
        """Check API security"""
        logger.info("Checking API security...")

        # Check for security middleware
        security_middleware = self.project_root / "api" / "app" / "middleware" / "security_middleware.py"
        if not security_middleware.exists():
            self.add_issue(
                "api_security",
                "Security middleware not implemented",
                "high",
                "Implement comprehensive security middleware"
            )

        # Check for CSRF protection
        if security_middleware.exists():
            content = security_middleware.read_text()
            if "CSRFMiddleware" not in content:
                self.add_warning(
                    "api_security",
                    "CSRF protection not implemented",
                    "Implement CSRF protection"
                )

        # Check for input validation
        if security_middleware.exists():
            content = security_middleware.read_text()
            if "InputValidationMiddleware" not in content:
                self.add_warning(
                    "api_security",
                    "Input validation middleware not implemented",
                    "Implement input validation"
                )

        # Check for security headers
        main_file = self.project_root / "api" / "main.py"
        if main_file.exists():
            content = main_file.read_text()
            if "SecurityHeadersMiddleware" not in content:
                self.add_warning(
                    "api_security",
                    "Security headers middleware not configured",
                    "Implement security headers"
                )

        self.add_passed_check("api_security", "API security checks completed")

    def check_frontend_security(self) -> None:
        """Check frontend security"""
        logger.info("Checking frontend security...")

        # Check for CSP implementation
        middleware_file = self.project_root / "frontend" / "src" / "middleware.ts"
        if middleware_file.exists():
            content = middleware_file.read_text()
            if "Content-Security-Policy" not in content:
                self.add_warning(
                    "frontend_security",
                    "CSP not implemented in middleware",
                    "Implement Content Security Policy"
                )

        # Check for XSS protection
        sanitize_file = self.project_root / "frontend" / "src" / "lib" / "sanitize.ts"
        if not sanitize_file.exists():
            self.add_warning(
                "frontend_security",
                "XSS protection utilities not found",
                "Implement HTML sanitization"
            )

        # Check for security utilities
        security_frontend = self.project_root / "frontend" / "src" / "lib" / "security-frontend.ts"
        if not security_frontend.exists():
            self.add_warning(
                "frontend_security",
                "Frontend security utilities not found",
                "Implement frontend security measures"
            )

        # Check for DOMPurify
        package_json = self.project_root / "frontend" / "package.json"
        if package_json.exists():
            content = package_json.read_text()
            if "dompurify" not in content:
                self.add_warning(
                    "frontend_security",
                    "DOMPurify not installed",
                    "Install DOMPurify for XSS protection: npm install dompurify @types/dompurify"
                )

        self.add_passed_check("frontend_security", "Frontend security checks completed")

    def add_issue(self, category: str, message: str, severity: str, recommendation: str) -> None:
        """Add a security issue"""
        self.issues.append({
            "category": category,
            "message": message,
            "severity": severity,
            "recommendation": recommendation
        })

    def add_warning(self, category: str, message: str, recommendation: str = "") -> None:
        """Add a security warning"""
        self.warnings.append({
            "category": category,
            "message": message,
            "recommendation": recommendation
        })

    def add_passed_check(self, category: str, message: str) -> None:
        """Add a passed security check"""
        self.passed_checks.append({
            "category": category,
            "message": message
        })

    def generate_report(self) -> Dict[str, Any]:
        """Generate security audit report"""
        # Sort issues by severity
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        sorted_issues = sorted(
            self.issues,
            key=lambda x: severity_order.get(x["severity"], 4)
        )

        # Calculate scores
        critical_count = sum(1 for issue in sorted_issues if issue["severity"] == "critical")
        high_count = sum(1 for issue in sorted_issues if issue["severity"] == "high")

        overall_status = "PASS"
        if critical_count > 0:
            overall_status = "FAIL"
        elif high_count > 5:
            overall_status = "WARNING"

        return {
            "overall_status": overall_status,
            "summary": {
                "critical_issues": critical_count,
                "high_issues": high_count,
                "total_issues": len(self.issues),
                "warnings": len(self.warnings),
                "passed_checks": len(self.passed_checks)
            },
            "issues": sorted_issues,
            "warnings": self.warnings,
            "passed_checks": self.passed_checks,
            "recommendations": self._generate_recommendations()
        }

    def _generate_recommendations(self) -> List[str]:
        """Generate prioritized recommendations"""
        recommendations = []

        # Critical issues first
        critical_issues = [issue for issue in self.issues if issue["severity"] == "critical"]
        if critical_issues:
            recommendations.append("URGENT: Address all critical security issues immediately")

        # High priority issues
        high_issues = [issue for issue in self.issues if issue["severity"] == "high"]
        if len(high_issues) > 5:
            recommendations.append("HIGH: Multiple high-priority security issues require attention")

        # Dependency updates
        dependency_issues = [issue for issue in self.issues if issue["category"] == "dependencies"]
        if dependency_issues:
            recommendations.append("Update vulnerable dependencies: pip install -r requirements.txt --upgrade")

        # Code security
        code_issues = [issue for issue in self.issues if issue["category"] == "code_security"]
        if code_issues:
            recommendations.append("Review and fix code security vulnerabilities")

        # Configuration
        config_issues = [issue for issue in self.issues if issue["category"] == "configuration"]
        if config_issues:
            recommendations.append("Review and secure configuration files")

        return recommendations


def main():
    """Main execution function"""
    # Get project root
    project_root = Path(__file__).parent.parent

    # Run security audit
    auditor = SecurityAudit(project_root)
    report = auditor.run_full_audit()

    # Print report
    print("\n" + "="*60)
    print("SECURITY AUDIT REPORT")
    print("="*60)

    print(f"\nOverall Status: {report['overall_status']}")
    print(f"\nSummary:")
    print(f"  Critical Issues: {report['summary']['critical_issues']}")
    print(f"  High Issues: {report['summary']['high_issues']}")
    print(f"  Total Issues: {report['summary']['total_issues']}")
    print(f"  Warnings: {report['summary']['warnings']}")
    print(f"  Passed Checks: {report['summary']['passed_checks']}")

    if report['issues']:
        print(f"\nSecurity Issues:")
        for issue in report['issues']:
            print(f"\n  [{issue['severity'].upper()}] {issue['message']}")
            print(f"    Category: {issue['category']}")
            print(f"    Recommendation: {issue['recommendation']}")

    if report['warnings']:
        print(f"\nWarnings:")
        for warning in report['warnings']:
            print(f"\n  [WARNING] {warning['message']}")
            print(f"    Category: {warning['category']}")
            if warning['recommendation']:
                print(f"    Recommendation: {warning['recommendation']}")

    if report['recommendations']:
        print(f"\nRecommendations:")
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"  {i}. {rec}")

    print("\n" + "="*60)

    # Save report to file
    report_file = project_root / "security_audit_report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\nDetailed report saved to: {report_file}")

    # Exit with appropriate code
    sys.exit(0 if report['overall_status'] == "PASS" else 1)


if __name__ == "__main__":
    main()