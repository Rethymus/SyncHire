from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from app.core.deps import get_current_user, get_db
from app.core.logger import logger
from app.core.cache import cache_get, cache_set
from app.models.user import User
from app.models.application import Application
from app.models.resume import Resume
from app.models.jd import JD
from pydantic import BaseModel

router = APIRouter()


class StatsOverview(BaseModel):
    total_applications: int
    total_resumes: int
    total_jds: int
    active_applications: int
    interview_count: int
    offer_count: int
    rejection_count: int
    pending_count: int


class SuccessRateMetrics(BaseModel):
    application_to_interview_rate: float
    interview_to_offer_rate: float
    overall_success_rate: float
    average_match_score: float
    total_applications: int


class ActivityDataPoint(BaseModel):
    date: str
    applications: int
    interviews: int
    offers: int
    rejections: int


class StatusDistribution(BaseModel):
    status: str
    count: int
    percentage: float


class TrendData(BaseModel):
    period: str
    applications: int
    success_rate: float
    avg_match_score: float


class Insight(BaseModel):
    type: str
    title: str
    description: str
    actionable: bool
    priority: str


class AnalyticsResponse(BaseModel):
    overview: StatsOverview
    success_rates: SuccessRateMetrics
    status_distribution: List[StatusDistribution]
    recent_activity: List[ActivityDataPoint]
    trends: List[TrendData]
    insights: List[Insight]
    generated_at: datetime


def calculate_success_rate(applications: List[Application]) -> Dict[str, float]:
    """Calculate various success rate metrics."""
    total = len(applications)
    if total == 0:
        return {
            "application_to_interview_rate": 0.0,
            "interview_to_offer_rate": 0.0,
            "overall_success_rate": 0.0,
            "average_match_score": 0.0,
        }

    interviews = len([a for a in applications if a.status in ["interview", "offer"]])
    offers = len([a for a in applications if a.status == "offer"])

    application_to_interview = (interviews / total) * 100 if total > 0 else 0.0
    interview_to_offer = (offers / interviews) * 100 if interviews > 0 else 0.0
    overall_success = (offers / total) * 100 if total > 0 else 0.0

    match_scores = [a.match_score for a in applications if a.match_score is not None]
    avg_match_score = sum(match_scores) / len(match_scores) if match_scores else 0.0

    return {
        "application_to_interview_rate": round(application_to_interview, 2),
        "interview_to_offer_rate": round(interview_to_offer, 2),
        "overall_success_rate": round(overall_success, 2),
        "average_match_score": round(avg_match_score, 2),
    }


def generate_insights(
    applications: List[Application],
    success_rates: Dict[str, float],
    overview: StatsOverview,
) -> List[Dict[str, Any]]:
    """Generate actionable insights based on user data."""
    insights = []

    # Low interview rate insight
    if success_rates["application_to_interview_rate"] < 15:
        insights.append(
            {
                "type": "warning",
                "title": "Low interview rate",
                "description": f"Your interview rate ({success_rates['application_to_interview_rate']:.1f}%) is below average. Consider improving your resume customization.",
                "actionable": True,
                "priority": "high",
            }
        )

    # High match score but low interviews
    if (
        success_rates["average_match_score"] > 70
        and success_rates["application_to_interview_rate"] < 20
    ):
        insights.append(
            {
                "type": "opportunity",
                "title": "Optimize your applications",
                "description": "You're getting good match scores but few interviews. Focus on tailoring your cover letters and optimizing your application timing.",
                "actionable": True,
                "priority": "medium",
            }
        )

    # Good interview rate
    if success_rates["application_to_interview_rate"] > 25:
        insights.append(
            {
                "type": "success",
                "title": "Strong interview performance",
                "description": f"Great job! Your interview rate ({success_rates['application_to_interview_rate']:.1f}%) is excellent. Keep up the good work.",
                "actionable": False,
                "priority": "low",
            }
        )

    # Activity recommendations
    if overview.active_applications < 5:
        insights.append(
            {
                "type": "info",
                "title": "Increase your activity",
                "description": "You have fewer than 5 active applications. Consider increasing your application rate to improve your chances.",
                "actionable": True,
                "priority": "medium",
            }
        )

    # Rejection rate warning
    if overview.rejection_count > overview.interview_count * 2:
        insights.append(
            {
                "type": "warning",
                "title": "High rejection rate",
                "description": "You're experiencing more rejections than interviews. Review your resume and consider targeting roles that better match your experience.",
                "actionable": True,
                "priority": "high",
            }
        )

    return insights


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    days: int = Query(
        default=30, ge=7, le=365, description="Number of days to analyze"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get comprehensive analytics for the current user.

    Returns overview statistics, success rates, status distribution,
    activity timeline, trends, and actionable insights.
    """
    try:
        # Check cache first
        cache_key = f"analytics:{current_user.id}:{days}"
        cached_data = await cache_get(cache_key)
        if cached_data:
            logger.info(f"Returning cached analytics for user {current_user.id}")
            return AnalyticsResponse(**cached_data)

        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Fetch user's applications
        result = await db.execute(
            select(Application)
            .where(
                and_(
                    Application.user_id == current_user.id,
                    Application.created_at >= start_date,
                )
            )
            .order_by(Application.created_at.desc())
        )
        applications = result.scalars().all()

        # Fetch all-time data for overview
        all_apps_result = await db.execute(
            select(Application).where(Application.user_id == current_user.id)
        )
        all_applications = all_apps_result.scalars().all()

        # Calculate overview statistics
        overview = StatsOverview(
            total_applications=len(all_applications),
            total_resumes=0,  # Will be calculated
            total_jds=0,  # Will be calculated
            active_applications=len(
                [
                    a
                    for a in all_applications
                    if a.status in ["applied", "interview", "pending"]
                ]
            ),
            interview_count=len(
                [a for a in all_applications if a.status == "interview"]
            ),
            offer_count=len([a for a in all_applications if a.status == "offer"]),
            rejection_count=len(
                [a for a in all_applications if a.status == "rejected"]
            ),
            pending_count=len(
                [a for a in all_applications if a.status in ["pending", "applied"]]
            ),
        )

        # Get resume and JD counts
        resume_count = await db.execute(
            select(func.count(Resume.id)).where(Resume.user_id == current_user.id)
        )
        overview.total_resumes = resume_count.scalar() or 0

        jd_count = await db.execute(
            select(func.count(JD.id)).where(JD.user_id == current_user.id)
        )
        overview.total_jds = jd_count.scalar() or 0

        # Calculate success rates
        success_metrics = calculate_success_rate(all_applications)
        success_rates = SuccessRateMetrics(**success_metrics)

        # Calculate status distribution
        status_counts = {}
        for app in all_applications:
            status_counts[app.status] = status_counts.get(app.status, 0) + 1

        total = len(all_applications)
        status_distribution = [
            StatusDistribution(
                status=status,
                count=count,
                percentage=round((count / total) * 100, 2) if total > 0 else 0.0,
            )
            for status, count in status_counts.items()
        ]

        # Generate activity timeline (daily data)
        activity_timeline = []
        for i in range(days):
            day_date = end_date - timedelta(days=i)
            day_start = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_apps = [a for a in applications if day_start <= a.created_at < day_end]

            activity_timeline.append(
                ActivityDataPoint(
                    date=day_start.strftime("%Y-%m-%d"),
                    applications=len(day_apps),
                    interviews=len([a for a in day_apps if a.status == "interview"]),
                    offers=len([a for a in day_apps if a.status == "offer"]),
                    rejections=len([a for a in day_apps if a.status == "rejected"]),
                )
            )

        activity_timeline.reverse()  # Show oldest to newest

        # Generate trends (weekly data)
        trends = []
        weeks = days // 7
        for week in range(weeks):
            week_start = start_date + timedelta(weeks=week)
            week_end = week_start + timedelta(days=7)

            week_apps = [
                a for a in applications if week_start <= a.created_at < week_end
            ]
            week_success = calculate_success_rate(week_apps)

            trends.append(
                TrendData(
                    period=f"Week {week + 1}",
                    applications=len(week_apps),
                    success_rate=week_success["application_to_interview_rate"],
                    avg_match_score=week_success["average_match_score"],
                )
            )

        # Generate insights
        insights_data = generate_insights(all_applications, success_metrics, overview)
        insights = [Insight(**insight) for insight in insights_data]

        response = AnalyticsResponse(
            overview=overview,
            success_rates=success_rates,
            status_distribution=status_distribution,
            recent_activity=activity_timeline[-30:],  # Last 30 days
            trends=trends,
            insights=insights,
            generated_at=datetime.utcnow(),
        )

        # Cache for 5 minutes
        await cache_set(cache_key, response.model_dump(), expire=300)

        logger.info(f"Generated analytics for user {current_user.id}")
        return response

    except Exception as e:
        logger.error(f"Error generating analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate analytics")


@router.get("/analytics/overview", response_model=StatsOverview)
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get quick overview statistics for dashboard."""
    try:
        # Get application statistics
        result = await db.execute(
            select(
                func.count(Application.id).label("total"),
                func.sum(
                    case(
                        (Application.status == "interview", 1),
                        else_=0,
                    )
                ).label("interviews"),
                func.sum(
                    case(
                        (Application.status == "offer", 1),
                        else_=0,
                    )
                ).label("offers"),
                func.sum(
                    case(
                        (Application.status == "rejected", 1),
                        else_=0,
                    )
                ).label("rejections"),
                func.sum(
                    case(
                        (
                            Application.status.in_(["applied", "interview", "pending"]),
                            1,
                        ),
                        else_=0,
                    )
                ).label("active"),
                func.sum(
                    case(
                        (Application.status.in_(["pending", "applied"]), 1),
                        else_=0,
                    )
                ).label("pending"),
            ).where(Application.user_id == current_user.id)
        )

        stats = result.one()

        # Get resume and JD counts
        resume_count = await db.execute(
            select(func.count(Resume.id)).where(Resume.user_id == current_user.id)
        )

        jd_count = await db.execute(
            select(func.count(JD.id)).where(JD.user_id == current_user.id)
        )

        return StatsOverview(
            total_applications=stats.total or 0,
            total_resumes=resume_count.scalar() or 0,
            total_jds=jd_count.scalar() or 0,
            active_applications=stats.active or 0,
            interview_count=stats.interviews or 0,
            offer_count=stats.offers or 0,
            rejection_count=stats.rejections or 0,
            pending_count=stats.pending or 0,
        )

    except Exception as e:
        logger.error(f"Error fetching analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch overview")


@router.get("/analytics/success-rates", response_model=SuccessRateMetrics)
async def get_success_rates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed success rate metrics."""
    try:
        result = await db.execute(
            select(Application).where(Application.user_id == current_user.id)
        )
        applications = result.scalars().all()

        metrics = calculate_success_rate(applications)
        return SuccessRateMetrics(**metrics)

    except Exception as e:
        logger.error(f"Error calculating success rates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate success rates")


@router.get("/analytics/activity", response_model=List[ActivityDataPoint])
async def get_activity_timeline(
    days: int = Query(default=30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity timeline for the specified period."""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        result = await db.execute(
            select(Application)
            .where(
                and_(
                    Application.user_id == current_user.id,
                    Application.created_at >= start_date,
                )
            )
            .order_by(Application.created_at.desc())
        )
        applications = result.scalars().all()

        activity_timeline = []
        for i in range(days):
            day_date = end_date - timedelta(days=i)
            day_start = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_apps = [a for a in applications if day_start <= a.created_at < day_end]

            activity_timeline.append(
                ActivityDataPoint(
                    date=day_start.strftime("%Y-%m-%d"),
                    applications=len(day_apps),
                    interviews=len([a for a in day_apps if a.status == "interview"]),
                    offers=len([a for a in day_apps if a.status == "offer"]),
                    rejections=len([a for a in day_apps if a.status == "rejected"]),
                )
            )

        activity_timeline.reverse()
        return activity_timeline

    except Exception as e:
        logger.error(f"Error fetching activity timeline: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity timeline")
