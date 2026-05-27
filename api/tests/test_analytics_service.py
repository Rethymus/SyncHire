"""
Comprehensive unit tests for Analytics Service

These tests follow 2026 best practices:
- Async testing with pytest-asyncio
- Comprehensive mocking of external dependencies
- Edge case and error case coverage
- Analytics calculation testing
- Performance metrics validation
"""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.models.application import Application
from app.models.resume import Resume
from app.models.jd import JD


@pytest.mark.unit
class TestAnalyticsBasic:
    """Test basic analytics functionality"""

    @pytest.mark.asyncio
    async def test_get_application_statistics(self, db_session: AsyncSession):
        """Test getting application statistics"""
        user_id = uuid.uuid4()

        # Create test applications with different statuses
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        statuses = ["applied", "interview", "offer", "rejected"]
        for status in statuses:
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status=status,
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        # Import analytics service
        from app.api.analytics import get_application_statistics

        result = await get_application_statistics(user_id=user_id, db=db_session)

        assert result["total_applications"] == 4
        assert result["by_status"]["applied"] == 1
        assert result["by_status"]["interview"] == 1
        assert result["by_status"]["offer"] == 1
        assert result["by_status"]["rejected"] == 1

    @pytest.mark.asyncio
    async def test_get_application_statistics_empty(self, db_session: AsyncSession):
        """Test getting statistics with no applications"""
        user_id = uuid.uuid4()

        from app.api.analytics import get_application_statistics

        result = await get_application_statistics(user_id=user_id, db=db_session)

        assert result["total_applications"] == 0
        assert result["by_status"] == {}

    @pytest.mark.asyncio
    async def test_get_success_rate(self, db_session: AsyncSession):
        """Test calculating application success rate"""
        user_id = uuid.uuid4()

        # Create test applications
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # 10 offers out of 50 applications = 20% success rate
        for i in range(10):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="offer",
            )
            db_session.add(app)

        for i in range(40):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="rejected",
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_application_statistics

        result = await get_application_statistics(user_id=user_id, db=db_session)

        assert result["success_rate"] == 20.0


@pytest.mark.unit
class TestAnalyticsTimeline:
    """Test timeline and trend analytics"""

    @pytest.mark.asyncio
    async def test_get_application_timeline(self, db_session: AsyncSession):
        """Test getting application timeline"""
        user_id = uuid.uuid4()

        # Create applications over time
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # Create applications over the past 30 days
        for days_ago in range(30):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
                created_at=datetime.utcnow() - timedelta(days=days_ago),
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_application_timeline

        result = await get_application_timeline(user_id=user_id, db=db_session, days=30)

        assert len(result) > 0
        assert "date" in result[0]
        assert "count" in result[0]

    @pytest.mark.asyncio
    async def test_get_status_transition_funnel(self, db_session: AsyncSession):
        """Test getting status transition funnel"""
        user_id = uuid.uuid4()

        # Create applications in different stages
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # Create funnel: 100 applied -> 50 interview -> 10 offer
        for _ in range(100):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
            )
            db_session.add(app)

        for _ in range(50):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="interview",
            )
            db_session.add(app)

        for _ in range(10):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="offer",
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_status_transition_funnel

        result = await get_status_transition_funnel(user_id=user_id, db=db_session)

        assert result["applied"] == 100
        assert result["interview"] == 50
        assert result["offer"] == 10


@pytest.mark.unit
class TestAnalyticsActivity:
    """Test activity and engagement analytics"""

    @pytest.mark.asyncio
    async def test_get_user_activity_summary(self, db_session: AsyncSession):
        """Test getting user activity summary"""
        user_id = uuid.uuid4()

        # Create various user activities
        resume = Resume(
            id=uuid.uuid4(),
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
            created_at=datetime.utcnow() - timedelta(days=5),
        )
        jd = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
            created_at=datetime.utcnow() - timedelta(days=3),
        )

        application = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume.id,
            jd_id=jd.id,
            status="applied",
            created_at=datetime.utcnow() - timedelta(days=1),
        )

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(application)
        await db_session.commit()

        from app.api.analytics import get_user_activity_summary

        result = await get_user_activity_summary(user_id=user_id, db=db_session)

        assert result["total_resumes"] >= 1
        assert result["total_jds"] >= 1
        assert result["total_applications"] >= 1
        assert "last_activity" in result

    @pytest.mark.asyncio
    async def test_get_weekly_activity(self, db_session: AsyncSession):
        """Test getting weekly activity statistics"""
        user_id = uuid.uuid4()

        # Create activities throughout the week
        for day in range(7):
            resume = Resume(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Resume {day}",
                content="Content",
                file_path="path.pdf",
                created_at=datetime.utcnow() - timedelta(days=day),
            )
            db_session.add(resume)

        await db_session.commit()

        from app.api.analytics import get_weekly_activity

        result = await get_weekly_activity(user_id=user_id, db=db_session)

        assert len(result) == 7  # One entry per day
        assert all("date" in item for item in result)
        assert all("count" in item for item in result)


@pytest.mark.unit
class TestAnalyticsPerformance:
    """Test performance-related analytics"""

    @pytest.mark.asyncio
    async def test_get_application_velocity(self, db_session: AsyncSession):
        """Test calculating application velocity (time to response)"""
        user_id = uuid.uuid4()

        # Create applications with different response times
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # Fast response (1 day)
        app1 = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="interview",
            created_at=datetime.utcnow() - timedelta(days=1),
        )

        # Slow response (30 days)
        app2 = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="rejected",
            created_at=datetime.utcnow() - timedelta(days=30),
        )

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(app1)
        db_session.add(app2)
        await db_session.commit()

        from app.api.analytics import get_application_velocity

        result = await get_application_velocity(user_id=user_id, db=db_session)

        assert "average_response_time_days" in result
        assert "fastest_response_days" in result
        assert "slowest_response_days" in result

    @pytest.mark.asyncio
    async def test_get_match_score_distribution(self, db_session: AsyncSession):
        """Test getting match score distribution"""
        user_id = uuid.uuid4()

        # Create applications with different match scores
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # Create applications with match scores from 0.5 to 1.0
        for i in range(10):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
                match_score=0.5 + (i * 0.05),
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_match_score_distribution

        result = await get_match_score_distribution(user_id=user_id, db=db_session)

        assert "average_match_score" in result
        assert "median_match_score" in result
        assert "distribution" in result


@pytest.mark.unit
class TestAnalyticsInsights:
    """Test actionable insights generation"""

    @pytest.mark.asyncio
    async def test_get_actionable_insights(self, db_session: AsyncSession):
        """Test getting actionable insights"""
        user_id = uuid.uuid4()

        # Create data that should generate insights
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # Many applications but few interviews (need optimization)
        for _ in range(20):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
            )
            db_session.add(app)

        # Only 2 interviews
        for _ in range(2):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="interview",
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_actionable_insights

        result = await get_actionable_insights(user_id=user_id, db=db_session)

        assert len(result) > 0
        assert all("type" in insight for insight in result)
        assert all("message" in insight for insight in result)
        assert all("priority" in insight for insight in result)

    @pytest.mark.asyncio
    async def test_get_stagnation_alerts(self, db_session: AsyncSession):
        """Test getting stagnation alerts for old applications"""
        user_id = uuid.uuid4()

        # Create old applications with no updates
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # Applications older than 30 days with no status change
        for _ in range(5):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
                created_at=datetime.utcnow() - timedelta(days=45),
                updated_at=datetime.utcnow() - timedelta(days=45),
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_stagnation_alerts

        result = await get_stagnation_alerts(user_id=user_id, db=db_session)

        assert len(result) >= 5
        assert all("application_id" in alert for alert in result)
        assert all("days_stagnant" in alert for alert in result)


@pytest.mark.unit
class TestAnalyticsEdgeCases:
    """Test edge cases and error scenarios"""

    @pytest.mark.asyncio
    async def test_analytics_with_no_data(self, db_session: AsyncSession):
        """Test analytics when user has no data"""
        user_id = uuid.uuid4()

        from app.api.analytics import (
            get_application_statistics,
            get_user_activity_summary,
            get_application_timeline,
        )

        stats = await get_application_statistics(user_id=user_id, db=db_session)
        activity = await get_user_activity_summary(user_id=user_id, db=db_session)
        timeline = await get_application_timeline(user_id=user_id, db=db_session)

        assert stats["total_applications"] == 0
        assert activity["total_resumes"] == 0
        assert len(timeline) == 0

    @pytest.mark.asyncio
    async def test_analytics_with_future_dates(self, db_session: AsyncSession):
        """Test analytics handling future dates"""
        user_id = uuid.uuid4()

        # Create application with future date (should be handled gracefully)
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        app = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
            created_at=datetime.utcnow() + timedelta(days=30),  # Future date
        )

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(app)
        await db_session.commit()

        from app.api.analytics import get_application_statistics

        result = await get_application_statistics(user_id=user_id, db=db_session)

        # Should still work without errors
        assert result["total_applications"] >= 1

    @pytest.mark.asyncio
    async def test_analytics_pagination(self, db_session: AsyncSession):
        """Test analytics with large datasets"""
        user_id = uuid.uuid4()

        # Create large dataset
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        # Create 100 applications
        for _ in range(100):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_application_timeline

        result = await get_application_timeline(
            user_id=user_id, db=db_session, days=30, page=1, page_size=20
        )

        # Should return paginated results
        assert len(result) <= 20


@pytest.mark.unit
class TestAnalyticsPerformance:
    """Test analytics performance optimization"""

    @pytest.mark.asyncio
    async def test_analytics_query_performance(self, db_session: AsyncSession):
        """Test that analytics queries are optimized"""
        user_id = uuid.uuid4()

        # Create test data
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        for _ in range(50):
            app = Application(
                id=uuid.uuid4(),
                user_id=user_id,
                resume_id=resume_id,
                jd_id=jd_id,
                status="applied",
            )
            db_session.add(app)

        db_session.add(resume)
        db_session.add(jd)
        await db_session.commit()

        from app.api.analytics import get_application_statistics
        import time

        start_time = time.time()

        result = await get_application_statistics(user_id=user_id, db=db_session)

        end_time = time.time()
        query_time = end_time - start_time

        # Query should complete in reasonable time (< 1 second)
        assert query_time < 1.0
        assert result["total_applications"] == 50

    @pytest.mark.asyncio
    async def test_analytics_caching(self, db_session: AsyncSession):
        """Test that analytics can be cached"""
        user_id = uuid.uuid4()

        # Create test data
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        resume = Resume(
            id=resume_id,
            user_id=user_id,
            title="My Resume",
            content="Content",
            file_path="path.pdf",
        )
        jd = JD(
            id=jd_id,
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Job description",
        )

        app = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
        )

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(app)
        await db_session.commit()

        from app.api.analytics import get_application_statistics

        # First call
        result1 = await get_application_statistics(user_id=user_id, db=db_session)

        # Second call (could be cached)
        result2 = await get_application_statistics(user_id=user_id, db=db_session)

        # Results should be consistent
        assert result1["total_applications"] == result2["total_applications"]
