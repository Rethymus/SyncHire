"""
Quality Metrics and Reporting for SyncHire AI Workflows

Collects, calculates, and reports quality metrics for AI prompt testing.
"""

import json
import time
from datetime import datetime
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum


class QualityGateStatus(Enum):
    """Quality gate status"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


@dataclass
class QualityMetrics:
    """Quality metrics for AI workflow"""
    json_parse_success_rate: float  # 0.0 to 1.0
    hallucination_rate: float  # 0.0 to 1.0 (0 = no hallucinations)
    bilingual_accuracy: float  # 0.0 to 1.0
    average_response_time: float  # seconds
    p90_response_time: float  # seconds
    p95_response_time: float  # seconds
    total_workflow_duration: float  # seconds

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CriticalCheck:
    """Critical check result"""
    name: str
    status: QualityGateStatus
    message: str
    details: Dict[str, Any] | None = None


@dataclass
class QualityGateResult:
    """Quality gate evaluation result"""
    passed: bool
    status: QualityGateStatus
    critical_checks: List[CriticalCheck]
    metrics: QualityMetrics
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "status": self.status.value,
            "critical_checks": [
                {
                    "name": check.name,
                    "status": check.status.value,
                    "message": check.message,
                    "details": check.details
                }
                for check in self.critical_checks
            ],
            "metrics": self.metrics.to_dict(),
            "timestamp": self.timestamp
        }


class QualityMetricsCollector:
    """Collects and calculates quality metrics for AI workflows"""

    def __init__(self):
        self.measurements: List[Dict[str, Any]] = []
        self.start_time: float | None = None
        self.end_time: float | None = None

    def start_workflow(self) -> None:
        """Start measuring workflow execution"""
        self.start_time = time.time()

    def end_workflow(self) -> None:
        """End measuring workflow execution"""
        self.end_time = time.time()

    def record_step(
        self,
        step_name: str,
        duration: float,
        success: bool,
        output_valid: bool = True
    ) -> None:
        """Record a workflow step measurement"""
        self.measurements.append({
            "step": step_name,
            "duration": duration,
            "success": success,
            "output_valid": output_valid,
            "timestamp": datetime.now().isoformat()
        })

    def calculate_metrics(self) -> QualityMetrics:
        """Calculate quality metrics from collected measurements"""
        if not self.measurements:
            return QualityMetrics(
                json_parse_success_rate=0.0,
                hallucination_rate=0.0,
                bilingual_accuracy=0.0,
                average_response_time=0.0,
                p90_response_time=0.0,
                p95_response_time=0.0,
                total_workflow_duration=0.0
            )

        # JSON parse success rate
        json_steps = [m for m in self.measurements if m["output_valid"]]
        json_parse_rate = len(json_steps) / len(self.measurements)

        # Hallucination rate (from step results)
        hallucination_steps = [m for m in self.measurements if m.get("hallucination_detected", False)]
        hallucination_rate = len(hallucination_steps) / len(self.measurements)

        # Bilingual accuracy (from step results)
        bilingual_steps = [m for m in self.measurements if m.get("bilingual_success", True)]
        bilingual_accuracy = len(bilingual_steps) / len(self.measurements)

        # Response times
        durations = [m["duration"] for m in self.measurements]
        avg_duration = sum(durations) / len(durations)

        sorted_durations = sorted(durations)
        p90_duration = sorted_durations[int(len(sorted_durations) * 0.9)]
        p95_duration = sorted_durations[int(len(sorted_durations) * 0.95)]

        # Total workflow duration
        total_duration = 0.0
        if self.start_time and self.end_time:
            total_duration = self.end_time - self.start_time

        return QualityMetrics(
            json_parse_success_rate=json_parse_rate,
            hallucination_rate=hallucination_rate,
            bilingual_accuracy=bilingual_accuracy,
            average_response_time=avg_duration,
            p90_response_time=p90_duration,
            p95_response_time=p95_duration,
            total_workflow_duration=total_duration
        )

    def evaluate_quality_gate(self, metrics: QualityMetrics) -> QualityGateResult:
        """Evaluate quality gate based on metrics"""
        critical_checks = []

        # Critical check 1: Hallucination rate
        if metrics.hallucination_rate == 0.0:
            critical_checks.append(CriticalCheck(
                name="hallucination_check",
                status=QualityGateStatus.PASSED,
                message="No hallucinations detected in resume restructure",
                details={"hallucination_rate": metrics.hallucination_rate}
            ))
        else:
            critical_checks.append(CriticalCheck(
                name="hallucination_check",
                status=QualityGateStatus.FAILED,
                message=f"Hallucinations detected: {metrics.hallucination_rate:.1%}",
                details={"hallucination_rate": metrics.hallucination_rate}
            ))

        # Critical check 2: JSON parse success rate
        if metrics.json_parse_success_rate >= 0.95:
            critical_checks.append(CriticalCheck(
                name="json_format_check",
                status=QualityGateStatus.PASSED,
                message=f"JSON parse success rate: {metrics.json_parse_success_rate:.1%}",
                details={"success_rate": metrics.json_parse_success_rate}
            ))
        elif metrics.json_parse_success_rate >= 0.90:
            critical_checks.append(CriticalCheck(
                name="json_format_check",
                status=QualityGateStatus.WARNING,
                message=f"JSON parse success rate below target: {metrics.json_parse_success_rate:.1%}",
                details={"success_rate": metrics.json_parse_success_rate}
            ))
        else:
            critical_checks.append(CriticalCheck(
                name="json_format_check",
                status=QualityGateStatus.FAILED,
                message=f"JSON parse success rate too low: {metrics.json_parse_success_rate:.1%}",
                details={"success_rate": metrics.json_parse_success_rate}
            ))

        # Critical check 3: Bilingual accuracy
        if metrics.bilingual_accuracy >= 0.90:
            critical_checks.append(CriticalCheck(
                name="bilingual_check",
                status=QualityGateStatus.PASSED,
                message=f"Bilingual processing accuracy: {metrics.bilingual_accuracy:.1%}",
                details={"accuracy": metrics.bilingual_accuracy}
            ))
        else:
            critical_checks.append(CriticalCheck(
                name="bilingual_check",
                status=QualityGateStatus.WARNING,
                message=f"Bilingual accuracy below target: {metrics.bilingual_accuracy:.1%}",
                details={"accuracy": metrics.bilingual_accuracy}
            ))

        # Critical check 4: Response time benchmarks
        if metrics.p90_response_time < 30.0:
            critical_checks.append(CriticalCheck(
                name="performance_check",
                status=QualityGateStatus.PASSED,
                message=f"P90 response time: {metrics.p90_response_time:.1f}s",
                details={"p90_duration": metrics.p90_response_time}
            ))
        else:
            critical_checks.append(CriticalCheck(
                name="performance_check",
                status=QualityGateStatus.WARNING,
                message=f"P90 response time exceeds target: {metrics.p90_response_time:.1f}s",
                details={"p90_duration": metrics.p90_response_time}
            ))

        # Determine overall gate status
        failed_checks = [c for c in critical_checks if c.status == QualityGateStatus.FAILED]
        warning_checks = [c for c in critical_checks if c.status == QualityGateStatus.WARNING]

        if failed_checks:
            overall_status = QualityGateStatus.FAILED
            gate_passed = False
        elif warning_checks:
            overall_status = QualityGateStatus.WARNING
            gate_passed = True  # Warnings don't block
        else:
            overall_status = QualityGateStatus.PASSED
            gate_passed = True

        return QualityGateResult(
            passed=gate_passed,
            status=overall_status,
            critical_checks=critical_checks,
            metrics=metrics,
            timestamp=datetime.now().isoformat()
        )

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive quality report"""
        metrics = self.calculate_metrics()
        gate_result = self.evaluate_quality_gate(metrics)

        return {
            "report_type": "ai_workflow_quality_report",
            "timestamp": gate_result.timestamp,
            "workflow_steps": len(self.measurements),
            "metrics": gate_result.metrics.to_dict(),
            "quality_gate": gate_result.to_dict(),
            "recommendations": self._generate_recommendations(gate_result)
        }

    def _generate_recommendations(self, gate_result: QualityGateResult) -> List[str]:
        """Generate recommendations based on quality gate results"""
        recommendations = []

        for check in gate_result.critical_checks:
            if check.status == QualityGateStatus.FAILED:
                if check.name == "hallucination_check":
                    recommendations.append(
                        "CRITICAL: Review and strengthen anti-hallucination prompts in resume_restructure.md"
                    )
                elif check.name == "json_format_check":
                    recommendations.append(
                        "Review prompt templates for consistent JSON output formatting"
                    )
            elif check.status == QualityGateStatus.WARNING:
                if check.name == "bilingual_check":
                    recommendations.append(
                        "Improve bilingual language handling in prompt templates"
                    )
                elif check.name == "performance_check":
                    recommendations.append(
                        "Optimize prompt length or consider model upgrades for better performance"
                    )

        if not recommendations:
            recommendations.append("All quality checks passed. No action needed.")

        return recommendations

    def save_report(self, filename: str = "quality_report.json") -> None:
        """Save quality report to file"""
        report = self.generate_report()

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)


def create_quality_report_summary(report: Dict[str, Any]) -> str:
    """Create human-readable summary of quality report"""
    lines = [
        "# AI Workflow Quality Report",
        f"Generated: {report['timestamp']}",
        "",
        "## Quality Metrics",
        f"- JSON Parse Success Rate: {report['metrics']['json_parse_success_rate']:.1%}",
        f"- Hallucination Rate: {report['metrics']['hallucination_rate']:.1%}",
        f"- Bilingual Accuracy: {report['metrics']['bilingual_accuracy']:.1%}",
        f"- Average Response Time: {report['metrics']['average_response_time']:.1f}s",
        f"- P90 Response Time: {report['metrics']['p90_response_time']:.1f}s",
        f"- Total Workflow Duration: {report['metrics']['total_workflow_duration']:.1f}s",
        "",
        "## Quality Gate",
        f"Status: {report['quality_gate']['status'].upper()}",
        f"Passed: {report['quality_gate']['passed']}",
        "",
        "### Critical Checks"
    ]

    for check in report['quality_gate']['critical_checks']:
        status_icon = "✅" if check['status'] == "passed" else "⚠️" if check['status'] == "warning" else "❌"
        lines.append(f"- {status_icon} {check['name']}: {check['message']}")

    lines.extend([
        "",
        "## Recommendations"
    ])

    for i, rec in enumerate(report['recommendations'], 1):
        lines.append(f"{i}. {rec}")

    return "\n".join(lines)


# Example usage
if __name__ == "__main__":
    # Simulate a workflow run
    collector = QualityMetricsCollector()
    collector.start_workflow()

    # Simulate workflow steps
    collector.record_step("jd_analysis", 5.2, True, True)
    collector.record_step("experience_retrieval", 3.1, True, True)
    collector.record_step("resume_restructure", 8.5, True, True)  # No hallucination
    collector.record_step("interview_questions", 4.7, True, True)
    collector.record_step("self_intro", 3.9, True, True)

    collector.end_workflow()

    # Generate and save report
    report = collector.generate_report()
    print(json.dumps(report, indent=2))

    # Save to file
    collector.save_report("example_quality_report.json")

    # Print human-readable summary
    summary = create_quality_report_summary(report)
    print("\n" + summary)
