#!/usr/bin/env python3
"""
Comprehensive test execution script for SyncHire backend

This script provides:
- Organized test execution by category
- Coverage reporting
- Performance tracking
- Parallel test execution
- Detailed test reporting
"""

import subprocess
import sys
import os
from pathlib import Path
import argparse
import json
from datetime import datetime


class TestRunner:
    """Comprehensive test runner with reporting"""

    def __init__(self, coverage_threshold=80):
        self.coverage_threshold = coverage_threshold
        self.results = {
            "unit": {"passed": 0, "failed": 0, "skipped": 0, "duration": 0},
            "integration": {"passed": 0, "failed": 0, "skipped": 0, "duration": 0},
            "overall": {"passed": 0, "failed": 0, "skipped": 0, "duration": 0},
        }

    def run_tests(
        self,
        test_type="all",
        verbose=False,
        coverage=False,
        parallel=False,
        markers=None,
        pattern=None,
    ):
        """Run tests with specified configuration"""
        base_cmd = ["python", "-m", "pytest"]

        # Add verbose flag
        if verbose:
            base_cmd.append("-v")

        # Add coverage
        if coverage:
            base_cmd.extend(
                [
                    "--cov=app",
                    "--cov-report=html",
                    "--cov-report=term-missing",
                    f"--cov-fail-under={self.coverage_threshold}",
                ]
            )

        # Add parallel execution
        if parallel:
            base_cmd.extend(["-n", "auto"])

        # Add markers
        if markers:
            base_cmd.extend(["-m", markers])

        # Add pattern
        if pattern:
            base_cmd.extend(["-k", pattern])

        # Determine test directory
        if test_type == "unit":
            test_dirs = ["tests/test_*.py"]
            base_cmd.extend(["-m", "unit"])
        elif test_type == "integration":
            test_dirs = ["tests/integration/"]
            base_cmd.extend(["-m", "integration"])
        elif test_type == "service":
            test_dirs = ["tests/test_*_service.py"]
        elif test_type == "api":
            test_dirs = ["tests/test_api.py", "tests/test_*.py"]
        else:
            test_dirs = ["tests/"]

        base_cmd.extend(test_dirs)

        # Run tests
        print(f"\n{'='*60}")
        print(f"Running {test_type} tests...")
        print(f"{'='*60}\n")

        start_time = datetime.now()
        result = subprocess.run(base_cmd, cwd=Path(__file__).parent.parent)
        duration = (datetime.now() - start_time).total_seconds()

        # Store results
        self.results[test_type]["duration"] = duration

        return result.returncode == 0

    def run_service_tests(self, coverage=True):
        """Run all service tests with comprehensive coverage"""
        services = [
            "application_service",
            "jd_service",
            "resume_service",
            "search_service",
            "analytics_service",
        ]

        print("\n" + "=" * 60)
        print("Running Service Tests")
        print("=" * 60 + "\n")

        all_passed = True
        for service in services:
            print(f"\nTesting {service}...")
            test_file = f"tests/test_{service}.py"

            cmd = ["python", "-m", "pytest", test_file, "-v"]

            if coverage:
                cmd.extend(
                    [
                        "--cov=app.services",
                        "--cov-report=term-missing:skip-covered",
                        f"--cov-fail-under={self.coverage_threshold}",
                    ]
                )

            result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)
            if result.returncode != 0:
                all_passed = False
                print(f"❌ {service} tests failed")
            else:
                print(f"✅ {service} tests passed")

        return all_passed

    def run_performance_tests(self):
        """Run performance tests"""
        print("\n" + "=" * 60)
        print("Running Performance Tests")
        print("=" * 60 + "\n")

        cmd = ["python", "-m", "pytest", "-m", "performance", "-v", "--tb=short"]

        result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)
        return result.returncode == 0

    def generate_coverage_report(self):
        """Generate detailed coverage report"""
        print("\n" + "=" * 60)
        print("Generating Coverage Report")
        print("=" * 60 + "\n")

        cmd = [
            "python",
            "-m",
            "pytest",
            "--cov=app",
            "--cov-report=html:htmlcov",
            "--cov-report=json:coverage.json",
            "tests/",
        ]

        subprocess.run(cmd, cwd=Path(__file__).parent.parent)

        # Print summary
        try:
            with open("coverage.json", "r") as f:
                coverage_data = json.load(f)

            total_coverage = coverage_data["totals"]["percent_covered"]
            print(f"\nOverall Coverage: {total_coverage:.1f}%")

            if total_coverage < self.coverage_threshold:
                print(f"⚠️  Coverage below threshold of {self.coverage_threshold}%")
                return False
            else:
                print(f"✅ Coverage meets threshold of {self.coverage_threshold}%")
                return True
        except FileNotFoundError:
            print("⚠️  Coverage report not generated")
            return False

    def run_all_tests(self, coverage=True, parallel=False):
        """Run complete test suite"""
        print("\n" + "=" * 60)
        print("SyncHire Backend Test Suite")
        print("=" * 60)

        start_time = datetime.now()

        # Unit tests
        print("\n🧪 Running Unit Tests...")
        unit_passed = self.run_tests(
            test_type="unit", coverage=False, parallel=parallel
        )

        # Service tests
        print("\n🔧 Running Service Tests...")
        service_passed = self.run_service_tests(coverage=coverage)

        # Integration tests
        print("\n🔗 Running Integration Tests...")
        integration_passed = self.run_tests(
            test_type="integration", coverage=False, parallel=parallel
        )

        # Coverage report
        coverage_passed = True
        if coverage:
            print("\n📊 Generating Coverage Report...")
            coverage_passed = self.generate_coverage_report()

        # Summary
        duration = (datetime.now() - start_time).total_seconds()

        print("\n" + "=" * 60)
        print("Test Summary")
        print("=" * 60)
        print(f"Unit Tests:        {'✅ PASSED' if unit_passed else '❌ FAILED'}")
        print(f"Service Tests:     {'✅ PASSED' if service_passed else '❌ FAILED'}")
        print(
            f"Integration Tests: {'✅ PASSED' if integration_passed else '❌ FAILED'}"
        )
        print(f"Coverage:          {'✅ PASSED' if coverage_passed else '❌ FAILED'}")
        print(f"Duration:          {duration:.2f}s")
        print("=" * 60)

        all_passed = (
            unit_passed and service_passed and integration_passed and coverage_passed
        )

        if all_passed:
            print("\n✅ All tests passed!")
            return 0
        else:
            print("\n❌ Some tests failed!")
            return 1


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="SyncHire Backend Test Runner")
    parser.add_argument(
        "test_type",
        nargs="?",
        choices=["all", "unit", "integration", "service", "api", "performance"],
        default="all",
        help="Type of tests to run",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument(
        "-c",
        "--coverage",
        action="store_true",
        default=True,
        help="Generate coverage report",
    )
    parser.add_argument(
        "--no-coverage", action="store_true", help="Skip coverage report"
    )
    parser.add_argument(
        "-p", "--parallel", action="store_true", help="Run tests in parallel"
    )
    parser.add_argument("-m", "--markers", help="Run tests with specific markers")
    parser.add_argument("-k", "--pattern", help="Run tests matching pattern")
    parser.add_argument(
        "--cov-threshold",
        type=int,
        default=80,
        help="Coverage threshold percentage (default: 80)",
    )

    args = parser.parse_args()

    runner = TestRunner(coverage_threshold=args.cov_threshold)

    if args.no_coverage:
        args.coverage = False

    if args.test_type == "all":
        sys.exit(runner.run_all_tests(coverage=args.coverage, parallel=args.parallel))
    elif args.test_type == "service":
        success = runner.run_service_tests(coverage=args.coverage)
        sys.exit(0 if success else 1)
    elif args.test_type == "performance":
        success = runner.run_performance_tests()
        sys.exit(0 if success else 1)
    else:
        success = runner.run_tests(
            test_type=args.test_type,
            verbose=args.verbose,
            coverage=args.coverage,
            parallel=args.parallel,
            markers=args.markers,
            pattern=args.pattern,
        )
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
