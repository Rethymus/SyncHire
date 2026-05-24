#!/usr/bin/env python3
"""
API Performance Testing Script for SyncHire

Tests response times for critical endpoints:
- JD parsing: < 5 seconds
- Resume upload: < 10 seconds
- Match calculation: < 3 seconds
- PDF export: < 15 seconds
"""

import asyncio
import time
import httpx
from pathlib import Path
from typing import Dict, Any


class APIPerformanceTester:
    """Test API endpoint performance"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = None
        self.auth_token = None
        self.test_results = []

    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        return self

    async def __aexit__(self, *args):
        if self.client:
            await self.client.aclose()

    async def test_endpoint(
        self,
        name: str,
        method: str,
        endpoint: str,
        target_time: float,
        **kwargs
    ) -> Dict[str, Any]:
        """Test a single endpoint"""
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.pop("headers", {})

        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        start = time.time()
        try:
            if method.upper() == "GET":
                response = await self.client.get(url, headers=headers, **kwargs)
            elif method.upper() == "POST":
                response = await self.client.post(url, headers=headers, **kwargs)
            elif method.upper() == "PUT":
                response = await self.client.put(url, headers=headers, **kwargs)
            elif method.upper() == "DELETE":
                response = await self.client.delete(url, headers=headers, **kwargs)

            elapsed = (time.time() - start) * 1000
            success = response.status_code < 400

            result = {
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "elapsed_ms": elapsed,
                "target_ms": target_time * 1000,
                "success": success,
                "status_code": response.status_code,
                "passed": elapsed <= (target_time * 1000) and success
            }

            self.test_results.append(result)
            return result

        except Exception as e:
            elapsed = (time.time() - start) * 1000
            result = {
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "elapsed_ms": elapsed,
                "target_ms": target_time * 1000,
                "success": False,
                "status_code": None,
                "error": str(e),
                "passed": False
            }
            self.test_results.append(result)
            return result

    async def login(self, email: str = "test@example.com", password: str = "testpass123"):
        """Login and get auth token"""
        result = await self.test_endpoint(
            "Login",
            "POST",
            "/api/auth/login",
            2.0,
            json={"email": email, "password": password}
        )

        if result["success"]:
            # Extract token from response
            # Adjust based on actual API response structure
            pass

    async def run_all_tests(self):
        """Run all performance tests"""
        print("╔════════════════════════════════════════════════╗")
        print("║     SyncHire API Performance Testing          ║")
        print("╚════════════════════════════════════════════════╝\n")

        # 1. Health Check
        print("🔍 Testing Health Endpoint...")
        result = await self.test_endpoint("Health Check", "GET", "/health", 1.0)
        self.print_result(result)

        # 2. Login
        print("\n🔐 Testing Login...")
        await self.login()
        self.print_result(self.test_results[-1])

        # 3. Test JD Parsing
        print("\n📄 Testing JD Parsing...")
        sample_jd = """
        # Senior Software Engineer

        ## Requirements
        - 5+ years Python experience
        - Experience with FastAPI
        - Knowledge of PostgreSQL
        """
        result = await self.test_endpoint(
            "Parse JD",
            "POST",
            "/api/jds/parse",
            5.0,
            json={"content": sample_jd}
        )
        self.print_result(result)

        # 4. Test Resume Upload (if we have a test file)
        test_resume = Path("tests/fixtures/test_resume.pdf")
        if test_resume.exists():
            print("\n📤 Testing Resume Upload...")
            with open(test_resume, "rb") as f:
                files = {"file": ("test_resume.pdf", f, "application/pdf")}
                data = {"title": "Test Resume"}
                result = await self.test_endpoint(
                    "Upload Resume",
                    "POST",
                    "/api/resumes/",
                    10.0,
                    files=files,
                    data=data
                )
            self.print_result(result)

        # 5. Test Match Calculation
        print("\n🎯 Testing Match Calculation...")
        # This would need actual resume_id and jd_id from previous tests
        # For now, we'll test the endpoint structure
        result = await self.test_endpoint(
            "Calculate Match",
            "POST",
            "/api/applications/00000000-0000-0000-0000-000000000001/match",
            3.0
        )
        self.print_result(result)

        # 6. Test PDF Export
        print("\n📋 Testing PDF Export...")
        result = await self.test_endpoint(
            "Export PDF",
            "POST",
            "/api/resumes/00000000-0000-0000-0000-000000000001/export",
            15.0,
            json={"template": "professional", "dpi": 300}
        )
        self.print_result(result)

        # Print Summary
        self.print_summary()

    def print_result(self, result: Dict[str, Any]):
        """Print individual test result"""
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        elapsed = result["elapsed_ms"]
        target = result["target_ms"]
        print(f"  {status} {result['name']:<25} {elapsed:>7.1f}ms (target: {target:.0f}ms)")

        if "error" in result:
            print(f"       Error: {result['error']}")

    def print_summary(self):
        """Print test summary"""
        print("\n╔════════════════════════════════════════════════╗")
        print("║              Summary                          ║")
        print("╚════════════════════════════════════════════════╝\n")

        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = total - passed

        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")

        if failed > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  • {result['name']}: {result['elapsed_ms']:.1f}ms (target: {result['target_ms']:.0f}ms)")

        # Calculate average response time
        avg_time = sum(r["elapsed_ms"] for r in self.test_results) / total
        print(f"\nAverage Response Time: {avg_time:.1f}ms")

        # Performance recommendations
        print("\n💡 Recommendations:")
        for result in self.test_results:
            if not result["passed"]:
                if result["elapsed_ms"] > result["target_ms"] * 2:
                    print(f"  ⚠️  {result['name']}: Response time {result['elapsed_ms']:.0f}ms is more than 2x target")
                elif result["elapsed_ms"] > result["target_ms"]:
                    print(f"  ⚡ {result['name']}: Slightly exceeds target, consider optimization")


async def main():
    """Run performance tests"""
    async with APIPerformanceTester() as tester:
        await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
