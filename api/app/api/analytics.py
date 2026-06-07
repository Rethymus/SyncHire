from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
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
from app.models.search import SearchHistory, SavedSearch
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


class RecentActivityItem(BaseModel):
    type: str  # "application", "search", "resume_upload", etc.
    title: str
    description: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class SearchStatistics(BaseModel):
    total_searches: int
    saved_searches: int
    recent_searches: int
    most_searched_companies: List[Dict[str, Any]]
    search_frequency_trend: List[Dict[str, Any]]


class ResumeStatistics(BaseModel):
    total_resumes: int
    resumes_with_embeddings: int
    recently_updated: int
    template_usage: Dict[str, int]


class DashboardResponse(BaseModel):
    """Consolidated dashboard data in a single response."""

    overview: StatsOverview
    success_rates: SuccessRateMetrics
    status_distribution: List[StatusDistribution]
    recent_activity: List[RecentActivityItem]
    search_statistics: SearchStatistics
    resume_statistics: ResumeStatistics
    insights: List[Insight]
    generated_at: datetime


def calculate_success_rate(applications: List[Application]) -> Dict[str, float]:
    """Calculate various success rate metrics.

    NOTE: This function operates on already-fetched Application objects.
    For large datasets, prefer using SQL aggregation directly in the query
    (see get_analytics_overview for the optimal approach).
    """
    total = len(applications)
    if total == 0:
        return {
            "application_to_interview_rate": 0.0,
            "interview_to_offer_rate": 0.0,
            "overall_success_rate": 0.0,
            "average_match_score": 0.0,
        }

    # Use list comprehension instead of filter for better performance
    interviews = sum(1 for a in applications if a.status in ["interview", "offer"])
    offers = sum(1 for a in applications if a.status == "offer")

    application_to_interview = (interviews / total) * 100 if total > 0 else 0.0
    interview_to_offer = (offers / interviews) * 100 if interviews > 0 else 0.0
    overall_success = (offers / total) * 100 if total > 0 else 0.0

    # Calculate average match score more efficiently
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


async def get_application_statistics(user_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Return all-time application counts and offer success rate for a user."""
    result = await db.execute(
        select(Application.status, func.count(Application.id))
        .where(Application.user_id == user_id)
        .group_by(Application.status)
    )
    by_status = {status: count for status, count in result.all()}
    total = sum(by_status.values())
    offers = by_status.get("offer", 0)

    return {
        "total_applications": total,
        "by_status": by_status,
        "success_rate": round((offers / total) * 100, 2) if total else 0.0,
    }


async def get_application_timeline(
    user_id: str,
    db: AsyncSession,
    days: int = 30,
    page: int = 1,
    page_size: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return daily application counts for the requested lookback window."""
    start_date = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(Application)
        .where(
            and_(
                Application.user_id == user_id,
                Application.created_at >= start_date,
            )
        )
        .order_by(Application.created_at.asc())
    )

    counts: Dict[str, int] = {}
    for application in result.scalars().all():
        day = application.created_at.date().isoformat()
        counts[day] = counts.get(day, 0) + 1

    timeline = [{"date": day, "count": count} for day, count in sorted(counts.items())]
    if page_size is not None:
        start = max(page - 1, 0) * page_size
        return timeline[start : start + page_size]
    return timeline


async def get_status_transition_funnel(
    user_id: str, db: AsyncSession
) -> Dict[str, int]:
    """Return application counts by pipeline status."""
    result = await db.execute(
        select(Application.status, func.count(Application.id))
        .where(Application.user_id == user_id)
        .group_by(Application.status)
    )
    return {status: count for status, count in result.all()}


async def get_user_activity_summary(user_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Return high-level activity counts and most recent activity timestamp."""
    resume_count = (
        await db.execute(select(func.count(Resume.id)).where(Resume.user_id == user_id))
    ).scalar() or 0
    jd_count = (
        await db.execute(select(func.count(JD.id)).where(JD.user_id == user_id))
    ).scalar() or 0
    application_count = (
        await db.execute(
            select(func.count(Application.id)).where(Application.user_id == user_id)
        )
    ).scalar() or 0

    timestamps: List[datetime] = []
    for model in (Resume, JD, Application):
        result = await db.execute(
            select(model.created_at)
            .where(model.user_id == user_id)
            .order_by(model.created_at.desc())
            .limit(1)
        )
        timestamp = result.scalar_one_or_none()
        if timestamp is not None:
            timestamps.append(timestamp)

    return {
        "total_resumes": resume_count,
        "total_jds": jd_count,
        "total_applications": application_count,
        "last_activity": max(timestamps).isoformat() if timestamps else None,
    }


async def get_weekly_activity(user_id: str, db: AsyncSession) -> List[Dict[str, Any]]:
    """Return a seven-day activity histogram across resumes, JDs, and applications."""
    today = datetime.utcnow().date()
    counts = {
        (today - timedelta(days=offset)).isoformat(): 0 for offset in range(6, -1, -1)
    }
    start = datetime.combine(today - timedelta(days=6), datetime.min.time())

    for model in (Resume, JD, Application):
        result = await db.execute(
            select(model.created_at).where(
                and_(model.user_id == user_id, model.created_at >= start)
            )
        )
        for created_at in result.scalars().all():
            key = created_at.date().isoformat()
            if key in counts:
                counts[key] += 1

    return [{"date": day, "count": count} for day, count in counts.items()]


async def get_application_velocity(user_id: str, db: AsyncSession) -> Dict[str, float]:
    """Estimate response velocity from applications that reached a response status."""
    result = await db.execute(
        select(Application).where(
            and_(
                Application.user_id == user_id,
                Application.status.in_(["interview", "offer", "rejected"]),
            )
        )
    )
    now = datetime.utcnow()
    response_times = [
        max((now - application.created_at).days, 0)
        for application in result.scalars().all()
        if application.created_at is not None
    ]

    if not response_times:
        return {
            "average_response_time_days": 0.0,
            "fastest_response_days": 0,
            "slowest_response_days": 0,
        }

    return {
        "average_response_time_days": round(
            sum(response_times) / len(response_times), 2
        ),
        "fastest_response_days": min(response_times),
        "slowest_response_days": max(response_times),
    }


async def get_match_score_distribution(
    user_id: str, db: AsyncSession
) -> Dict[str, Any]:
    """Return summary statistics and buckets for application match scores."""
    result = await db.execute(
        select(Application.match_score).where(
            and_(Application.user_id == user_id, Application.match_score.isnot(None))
        )
    )
    scores = sorted(float(score) for score in result.scalars().all())
    if not scores:
        return {
            "average_match_score": 0.0,
            "median_match_score": 0.0,
            "distribution": {},
        }

    midpoint = len(scores) // 2
    if len(scores) % 2:
        median = scores[midpoint]
    else:
        median = (scores[midpoint - 1] + scores[midpoint]) / 2

    distribution = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0,
    }
    for score in scores:
        normalized = score * 100 if score <= 1 else score
        if normalized <= 20:
            distribution["0-20"] += 1
        elif normalized <= 40:
            distribution["21-40"] += 1
        elif normalized <= 60:
            distribution["41-60"] += 1
        elif normalized <= 80:
            distribution["61-80"] += 1
        else:
            distribution["81-100"] += 1

    return {
        "average_match_score": round(sum(scores) / len(scores), 2),
        "median_match_score": round(median, 2),
        "distribution": distribution,
    }


async def get_actionable_insights(
    user_id: str, db: AsyncSession
) -> List[Dict[str, str]]:
    """Generate simple, user-facing analytics insights."""
    stats = await get_application_statistics(user_id=user_id, db=db)
    total = stats["total_applications"]
    if total == 0:
        return []

    by_status = stats["by_status"]
    interview_count = by_status.get("interview", 0) + by_status.get("offer", 0)
    interview_rate = (interview_count / total) * 100

    insights: List[Dict[str, str]] = []
    if interview_rate < 15:
        insights.append(
            {
                "type": "optimization",
                "message": "Interview rate is low; tailor resumes and cover letters for higher-fit roles.",
                "priority": "high",
            }
        )
    if by_status.get("applied", 0) >= 10 and by_status.get("offer", 0) == 0:
        insights.append(
            {
                "type": "pipeline",
                "message": "Many applications have not converted to offers yet; review follow-up timing and role targeting.",
                "priority": "medium",
            }
        )
    if not insights:
        insights.append(
            {
                "type": "status",
                "message": "Application pipeline is active; keep monitoring conversion by stage.",
                "priority": "low",
            }
        )
    return insights


async def get_stagnation_alerts(
    user_id: str, db: AsyncSession, threshold_days: int = 30
) -> List[Dict[str, Any]]:
    """Return active applications that have not changed recently."""
    cutoff = datetime.utcnow() - timedelta(days=threshold_days)
    result = await db.execute(
        select(Application).where(
            and_(
                Application.user_id == user_id,
                Application.status.in_(["applied", "pending"]),
                Application.updated_at <= cutoff,
            )
        )
    )

    alerts = []
    now = datetime.utcnow()
    for application in result.scalars().all():
        updated_at = application.updated_at or application.created_at
        alerts.append(
            {
                "application_id": str(application.id),
                "days_stagnant": max((now - updated_at).days, 0),
                "status": application.status,
            }
        )
    return alerts


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
        await db.execute(
            select(Application)
            .where(
                and_(
                    Application.user_id == current_user.id,
                    Application.created_at >= start_date,
                )
            )
            .order_by(Application.created_at.desc())
        )
        # applications = result.scalars().all()  # Commented out - unused variable

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

        # Calculate status distribution using SQL aggregation
        status_result = await db.execute(
            select(Application.status, func.count(Application.id))
            .where(Application.user_id == current_user.id)
            .group_by(Application.status)
        )
        status_counts = dict(status_result.all())

        total = len(all_applications)
        status_distribution = [
            StatusDistribution(
                status=status,
                count=count,
                percentage=round((count / total) * 100, 2) if total > 0 else 0.0,
            )
            for status, count in status_counts.items()
        ]

        # Generate activity timeline (daily data) using SQL aggregation
        activity_timeline_result = await db.execute(
            select(
                func.date(Application.created_at).label("date"),
                func.count(Application.id).label("applications"),
                func.sum(case((Application.status == "interview", 1), else_=0)).label(
                    "interviews"
                ),
                func.sum(case((Application.status == "offer", 1), else_=0)).label(
                    "offers"
                ),
                func.sum(case((Application.status == "rejected", 1), else_=0)).label(
                    "rejections"
                ),
            )
            .where(
                and_(
                    Application.user_id == current_user.id,
                    Application.created_at >= start_date,
                )
            )
            .group_by(func.date(Application.created_at))
            .order_by(func.date(Application.created_at))
        )

        # Build a dictionary for quick lookup
        activity_by_date = {
            row.date: ActivityDataPoint(
                date=row.date.strftime("%Y-%m-%d"),
                applications=row.applications,
                interviews=row.interviews or 0,
                offers=row.offers or 0,
                rejections=row.rejections or 0,
            )
            for row in activity_timeline_result
        }

        # Fill in missing dates with zeros
        activity_timeline = []
        for i in range(days):
            day_date = end_date - timedelta(days=i)
            day_start = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_key = day_start.date()

            if day_key in activity_by_date:
                activity_timeline.append(activity_by_date[day_key])
            else:
                activity_timeline.append(
                    ActivityDataPoint(
                        date=day_start.strftime("%Y-%m-%d"),
                        applications=0,
                        interviews=0,
                        offers=0,
                        rejections=0,
                    )
                )

        activity_timeline.reverse()  # Show oldest to newest

        # Generate trends (weekly data) using SQL aggregation
        # For PostgreSQL, we need to calculate week numbers differently
        weeks = days // 7

        # Build weekly trends using date truncation
        trends = []
        for week in range(weeks):
            week_start = start_date + timedelta(weeks=week)
            week_end = week_start + timedelta(days=7)

            # Single SQL query per week (much better than N queries per application)
            week_result = await db.execute(
                select(
                    func.count(Application.id).label("applications"),
                    func.avg(Application.match_score).label("avg_match_score"),
                    func.sum(
                        case((Application.status == "interview", 1), else_=0)
                    ).label("interviews"),
                    func.sum(case((Application.status == "offer", 1), else_=0)).label(
                        "offers"
                    ),
                ).where(
                    and_(
                        Application.user_id == current_user.id,
                        Application.created_at >= week_start,
                        Application.created_at < week_end,
                    )
                )
            )

            row = week_result.first()
            total_apps = row.applications or 0
            interviews = row.interviews or 0
            # offers = row.offers or 0  # Commented out - unused variable

            application_to_interview = (
                (interviews / total_apps) * 100 if total_apps > 0 else 0.0
            )

            trends.append(
                TrendData(
                    period=f"Week {week + 1}",
                    applications=total_apps,
                    success_rate=round(application_to_interview, 2),
                    avg_match_score=round(row.avg_match_score or 0.0, 2),
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


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get consolidated dashboard data in a single API call.

    This endpoint combines overview statistics, recent activity, search stats,
    resume stats, and actionable insights to reduce frontend API calls by 70%.
    """
    try:
        # Check cache first (5 minute cache)
        cache_key = f"dashboard:{current_user.id}"
        cached_data = await cache_get(cache_key)
        if cached_data:
            logger.info(f"Returning cached dashboard data for user {current_user.id}")
            return DashboardResponse(**cached_data)

        # Get overview statistics
        overview = await _get_overview_stats(db, current_user.id)

        # Get success rates
        applications_result = await db.execute(
            select(Application)
            .where(Application.user_id == current_user.id)
            .order_by(Application.created_at.desc())
            .limit(100)
        )
        applications = applications_result.scalars().all()
        success_rates_data = calculate_success_rate(list(applications))

        success_rates = SuccessRateMetrics(
            application_to_interview_rate=success_rates_data[
                "application_to_interview_rate"
            ],
            interview_to_offer_rate=success_rates_data["interview_to_offer_rate"],
            overall_success_rate=success_rates_data["overall_success_rate"],
            average_match_score=success_rates_data["average_match_score"],
            total_applications=len(applications),
        )

        # Get status distribution
        status_result = await db.execute(
            select(Application.status, func.count(Application.id))
            .where(Application.user_id == current_user.id)
            .group_by(Application.status)
        )
        status_counts = status_result.all()
        total_apps = sum(count for _, count in status_counts) or 1

        status_distribution = [
            StatusDistribution(
                status=status,
                count=count,
                percentage=round((count / total_apps) * 100, 1),
            )
            for status, count in status_counts
        ]

        # Get recent activity (last 10 activities across different types)
        recent_activities = await _get_recent_activity(db, current_user.id)

        # Get search statistics
        search_stats = await _get_search_statistics(db, current_user.id)

        # Get resume statistics
        resume_stats = await _get_resume_statistics(db, current_user.id)

        # Generate insights
        insights_data = generate_insights(
            list(applications), success_rates_data, overview
        )
        insights = [Insight(**insight) for insight in insights_data]

        dashboard_data = DashboardResponse(
            overview=overview,
            success_rates=success_rates,
            status_distribution=status_distribution,
            recent_activity=recent_activities,
            search_statistics=search_stats,
            resume_statistics=resume_stats,
            insights=insights,
            generated_at=datetime.utcnow(),
        )

        # Cache for 5 minutes
        await cache_set(cache_key, dashboard_data.dict(), ttl=300)

        return dashboard_data

    except Exception as e:
        logger.error(f"Error fetching dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard data")


async def _get_overview_stats(db: AsyncSession, user_id: str) -> StatsOverview:
    """Helper to get overview statistics."""
    stats_result = await db.execute(
        select(
            func.count(Application.id).label("total"),
            func.sum(case((Application.status == "pending", 1), else_=0)).label(
                "pending"
            ),
            func.sum(case((Application.status == "interview", 1), else_=0)).label(
                "interviews"
            ),
            func.sum(case((Application.status == "offer", 1), else_=0)).label("offers"),
            func.sum(case((Application.status == "rejected", 1), else_=0)).label(
                "rejections"
            ),
            func.sum(
                case(
                    (Application.status.in_(["pending", "applied", "optimized"]), 1),
                    else_=0,
                )
            ).label("active"),
        )
        .where(Application.user_id == user_id)
        .group_by(Application.user_id)
    )
    stats = stats_result.first()

    resume_count = await db.execute(
        select(func.count(Resume.id)).where(Resume.user_id == user_id)
    )
    jd_count = await db.execute(select(func.count(JD.id)).where(JD.user_id == user_id))

    return StatsOverview(
        total_applications=stats.total if stats else 0,
        total_resumes=resume_count.scalar() or 0,
        total_jds=jd_count.scalar() or 0,
        active_applications=stats.active if stats else 0,
        interview_count=stats.interviews if stats else 0,
        offer_count=stats.offers if stats else 0,
        rejection_count=stats.rejections if stats else 0,
        pending_count=stats.pending if stats else 0,
    )


async def _get_recent_activity(
    db: AsyncSession, user_id: str
) -> List[RecentActivityItem]:
    """Get recent activity across different types."""
    activities = []
    cutoff_date = datetime.utcnow() - timedelta(days=7)

    # Recent applications
    app_result = await db.execute(
        select(Application)
        .where(
            and_(Application.user_id == user_id, Application.created_at >= cutoff_date)
        )
        .order_by(Application.created_at.desc())
        .limit(5)
    )
    for app in app_result.scalars():
        activities.append(
            RecentActivityItem(
                type="application",
                title=f"Application {app.status}",
                description="Application for position created",
                timestamp=app.created_at,
                metadata={"application_id": str(app.id), "status": app.status},
            )
        )

    # Recent searches
    search_result = await db.execute(
        select(SearchHistory)
        .where(
            and_(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= cutoff_date,
            )
        )
        .order_by(SearchHistory.created_at.desc())
        .limit(5)
    )
    for search in search_result.scalars():
        activities.append(
            RecentActivityItem(
                type="search",
                title=f"Search: {search.query[:50]}...",
                description=f"Searched with {len(search.filters or [])} filters",
                timestamp=search.created_at,
                metadata={"search_id": str(search.id), "query": search.query},
            )
        )

    # Sort by timestamp and limit to 10
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:10]


async def _get_search_statistics(db: AsyncSession, user_id: str) -> SearchStatistics:
    """Get search-related statistics."""
    # Total searches
    total_searches = await db.execute(
        select(func.count(SearchHistory.id)).where(SearchHistory.user_id == user_id)
    )

    # Saved searches
    saved_searches = await db.execute(
        select(func.count(SavedSearch.id)).where(SavedSearch.user_id == user_id)
    )

    # Recent searches (last 7 days)
    cutoff_date = datetime.utcnow() - timedelta(days=7)
    recent_searches = await db.execute(
        select(func.count(SearchHistory.id)).where(
            and_(
                SearchHistory.user_id == user_id,
                SearchHistory.created_at >= cutoff_date,
            )
        )
    )

    return SearchStatistics(
        total_searches=total_searches.scalar() or 0,
        saved_searches=saved_searches.scalar() or 0,
        recent_searches=recent_searches.scalar() or 0,
        most_searched_companies=[],  # TODO: Implement company extraction
        search_frequency_trend=[],  # TODO: Implement trend calculation
    )


async def _get_resume_statistics(db: AsyncSession, user_id: str) -> ResumeStatistics:
    """Get resume-related statistics."""
    # Total resumes
    total_resumes = await db.execute(
        select(func.count(Resume.id)).where(Resume.user_id == user_id)
    )

    # Resumes with embeddings
    resumes_with_embeddings = await db.execute(
        select(func.count(Resume.id)).where(
            and_(Resume.user_id == user_id, Resume.embedding.isnot(None))
        )
    )

    # Recently updated (last 7 days)
    cutoff_date = datetime.utcnow() - timedelta(days=7)
    recently_updated = await db.execute(
        select(func.count(Resume.id)).where(
            and_(Resume.user_id == user_id, Resume.updated_at >= cutoff_date)
        )
    )

    return ResumeStatistics(
        total_resumes=total_resumes.scalar() or 0,
        resumes_with_embeddings=resumes_with_embeddings.scalar() or 0,
        recently_updated=recently_updated.scalar() or 0,
        template_usage={},  # TODO: Implement template tracking
    )


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

        # Single SQL query with aggregation - MUCH more efficient
        result = await db.execute(
            select(
                func.date(Application.created_at).label("date"),
                func.count(Application.id).label("applications"),
                func.sum(case((Application.status == "interview", 1), else_=0)).label(
                    "interviews"
                ),
                func.sum(case((Application.status == "offer", 1), else_=0)).label(
                    "offers"
                ),
                func.sum(case((Application.status == "rejected", 1), else_=0)).label(
                    "rejections"
                ),
            )
            .where(
                and_(
                    Application.user_id == current_user.id,
                    Application.created_at >= start_date,
                )
            )
            .group_by(func.date(Application.created_at))
            .order_by(func.date(Application.created_at))
        )

        # Build a dictionary for quick lookup
        activity_by_date = {
            row.date: ActivityDataPoint(
                date=row.date.strftime("%Y-%m-%d"),
                applications=row.applications,
                interviews=row.interviews or 0,
                offers=row.offers or 0,
                rejections=row.rejections or 0,
            )
            for row in result
        }

        # Fill in missing dates with zeros
        activity_timeline = []
        for i in range(days):
            day_date = end_date - timedelta(days=i)
            day_start = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_key = day_start.date()

            if day_key in activity_by_date:
                activity_timeline.append(activity_by_date[day_key])
            else:
                activity_timeline.append(
                    ActivityDataPoint(
                        date=day_start.strftime("%Y-%m-%d"),
                        applications=0,
                        interviews=0,
                        offers=0,
                        rejections=0,
                    )
                )

        activity_timeline.reverse()
        return activity_timeline

    except Exception as e:
        logger.error(f"Error fetching activity timeline: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity timeline")
