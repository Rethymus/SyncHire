"""
Comprehensive unit tests for AdvancedSearchService

These tests follow 2026 best practices:
- Async testing with pytest-asyncio
- Comprehensive mocking of external dependencies
- Edge case and error case coverage
- Full-text search testing
- Filter validation testing
"""

import pytest
import uuid
from unittest.mock import MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime

from app.services.advanced_search import (
    AdvancedSearchService,
    SearchFilters,
)
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application


@pytest.mark.unit
class TestSearchFilters:
    """Test SearchFilters class"""

    def test_search_filters_initialization(self):
        """Test SearchFilters initialization with all parameters"""
        filters = SearchFilters(
            location_city="San Francisco",
            location_state="CA",
            location_country="USA",
            location_remote=True,
            salary_min=100000,
            salary_max=150000,
            experience_level="Senior",
            employment_type="Full-time",
        )

        assert filters.location_city == "San Francisco"
        assert filters.salary_min == 100000
        assert filters.experience_level == "Senior"

    def test_search_filters_to_dict(self):
        """Test converting filters to dictionary"""
        filters = SearchFilters(
            location_city="San Francisco",
            salary_min=100000,
            posted_date_from=date(2024, 1, 1),
        )

        result = filters.to_dict()

        assert result["location_city"] == "San Francisco"
        assert result["salary_min"] == 100000
        assert result["posted_date_from"] == "2024-01-01"

    def test_search_filters_from_dict(self):
        """Test creating filters from dictionary"""
        data = {
            "location_city": "San Francisco",
            "salary_min": 100000,
            "posted_date_from": "2024-01-01",
        }

        filters = SearchFilters.from_dict(data)

        assert filters.location_city == "San Francisco"
        assert filters.salary_min == 100000
        assert filters.posted_date_from == date(2024, 1, 1)


@pytest.mark.unit
class TestAdvancedSearchServiceResume:
    """Test resume search functionality"""

    @pytest.mark.asyncio
    async def test_search_resumes_basic(self, db_session: AsyncSession):
        """Test basic resume search"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test resumes
        for i in range(5):
            resume = Resume(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Software Engineer {i}",
                content=f"Python and FastAPI experience {i}",
                file_path=f"path{i}.pdf",
            )
            db_session.add(resume)

        await db_session.commit()

        result = await search_service.search_resumes(
            user_id=user_id, query="Python FastAPI", page=1, page_size=10
        )

        assert "results" in result
        assert "total" in result
        assert "page" in result
        assert result["page"] == 1

    @pytest.mark.asyncio
    async def test_search_resumes_with_filters(self, db_session: AsyncSession):
        """Test resume search with filters"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test resume
        resume = Resume(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Software Engineer",
            content="Python experience",
            file_path="path.pdf",
            created_at=datetime(2024, 1, 1),
        )
        db_session.add(resume)
        await db_session.commit()

        filters = SearchFilters(created_from=date(2024, 1, 1))

        result = await search_service.search_resumes(
            user_id=user_id,
            query="Python",
            filters=filters,
            page=1,
            page_size=10,
        )

        assert "results" in result
        assert "filters_applied" in result

    @pytest.mark.asyncio
    async def test_search_resumes_empty_results(self, db_session: AsyncSession):
        """Test resume search with no results"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        result = await search_service.search_resumes(
            user_id=user_id, query="nonexistent", page=1, page_size=10
        )

        assert result["total"] == 0
        assert len(result["results"]) == 0

    @pytest.mark.asyncio
    async def test_search_resumes_pagination(self, db_session: AsyncSession):
        """Test resume search pagination"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create 25 test resumes
        for i in range(25):
            resume = Resume(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Resume {i}",
                content=f"Content {i}",
                file_path=f"path{i}.pdf",
            )
            db_session.add(resume)

        await db_session.commit()

        # Test first page
        result = await search_service.search_resumes(
            user_id=user_id, query="Resume", page=1, page_size=10
        )

        assert len(result["results"]) <= 10
        assert result["page"] == 1

        # Test second page
        result = await search_service.search_resumes(
            user_id=user_id, query="Resume", page=2, page_size=10
        )

        assert result["page"] == 2


@pytest.mark.unit
class TestAdvancedSearchServiceJD:
    """Test JD search functionality"""

    @pytest.mark.asyncio
    async def test_search_jds_basic(self, db_session: AsyncSession):
        """Test basic JD search"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test JDs
        for i in range(5):
            jd = JD(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Software Engineer {i}",
                company=f"Company {i}",
                content=f"Python and FastAPI required {i}",
            )
            db_session.add(jd)

        await db_session.commit()

        result = await search_service.search_jds(
            user_id=user_id, query="Python FastAPI", page=1, page_size=10
        )

        assert "results" in result
        assert "total" in result
        assert result["page"] == 1

    @pytest.mark.asyncio
    async def test_search_jds_with_location_filters(self, db_session: AsyncSession):
        """Test JD search with location filters"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test JDs
        jd1 = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Software Engineer",
            company="Tech Corp",
            content="Python required",
            location_city="San Francisco",
            location_state="CA",
            location_remote=True,
        )
        jd2 = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Senior Developer",
            company="Another Corp",
            content="FastAPI required",
            location_city="New York",
            location_state="NY",
            location_remote=False,
        )

        db_session.add(jd1)
        db_session.add(jd2)
        await db_session.commit()

        filters = SearchFilters(location_city="San Francisco", location_remote=True)

        result = await search_service.search_jds(
            user_id=user_id, query="Python", filters=filters, page=1, page_size=10
        )

        assert "results" in result
        assert "filters_applied" in result

    @pytest.mark.asyncio
    async def test_search_jds_with_salary_filters(self, db_session: AsyncSession):
        """Test JD search with salary filters"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test JDs with different salaries
        jd1 = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Junior Developer",
            company="Startup",
            content="Python required",
            salary_min=60000,
            salary_max=80000,
        )
        jd2 = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Senior Developer",
            company="Big Corp",
            content="FastAPI required",
            salary_min=120000,
            salary_max=150000,
        )

        db_session.add(jd1)
        db_session.add(jd2)
        await db_session.commit()

        filters = SearchFilters(salary_min=100000)

        result = await search_service.search_jds(
            user_id=user_id, query="Developer", filters=filters, page=1, page_size=10
        )

        assert "results" in result

    @pytest.mark.asyncio
    async def test_search_jds_sorting(self, db_session: AsyncSession):
        """Test JD search with different sorting options"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test JDs
        for i in range(5):
            jd = JD(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Job {i}",
                company=f"Company {i}",
                content="Content",
                salary_max=100000 + i * 10000,
            )
            db_session.add(jd)

        await db_session.commit()

        # Test sorting by salary
        result = await search_service.search_jds(
            user_id=user_id,
            query="Job",
            page=1,
            page_size=10,
            sort_by="salary",
            sort_order="desc",
        )

        assert "results" in result


@pytest.mark.unit
class TestAdvancedSearchServiceApplication:
    """Test application search functionality"""

    @pytest.mark.asyncio
    async def test_search_applications_basic(self, db_session: AsyncSession):
        """Test basic application search"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test applications
        resume_id = uuid.uuid4()
        jd_id = uuid.uuid4()

        # Create related entities
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

        application = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
        )

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(application)
        await db_session.commit()

        result = await search_service.search_applications(
            user_id=user_id, query="Tech Corp", page=1, page_size=10
        )

        assert "results" in result
        assert len(result["results"]) >= 1

    @pytest.mark.asyncio
    async def test_search_applications_with_status_filter(
        self, db_session: AsyncSession
    ):
        """Test application search with status filter"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

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

        app1 = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
        )
        app2 = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="interview",
        )

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(app1)
        db_session.add(app2)
        await db_session.commit()

        filters = SearchFilters(status="applied")

        result = await search_service.search_applications(
            user_id=user_id, query=None, filters=filters, page=1, page_size=10
        )

        assert "results" in result

    @pytest.mark.asyncio
    async def test_search_applications_sort_by_match_score(
        self, db_session: AsyncSession
    ):
        """Test application search sorted by match score"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test applications with different match scores
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

        app1 = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="applied",
            match_score=0.75,
        )
        app2 = Application(
            id=uuid.uuid4(),
            user_id=user_id,
            resume_id=resume_id,
            jd_id=jd_id,
            status="interview",
            match_score=0.90,
        )

        db_session.add(resume)
        db_session.add(jd)
        db_session.add(app1)
        db_session.add(app2)
        await db_session.commit()

        result = await search_service.search_applications(
            user_id=user_id,
            query=None,
            page=1,
            page_size=10,
            sort_by="match_score",
            sort_order="desc",
        )

        assert "results" in result


@pytest.mark.unit
class TestAdvancedSearchServiceQueryParsing:
    """Test search query parsing"""

    def test_parse_search_query_basic(self):
        """Test basic query parsing"""
        db_session = MagicMock(spec=AsyncSession)
        search_service = AdvancedSearchService(db_session)

        result = search_service._parse_search_query("Python FastAPI Developer")

        assert result["original_query"] == "Python FastAPI Developer"
        assert len(result["terms"]) == 3
        assert "Python" in result["terms"]

    def test_parse_search_query_with_phrases(self):
        """Test parsing queries with phrases"""
        db_session = MagicMock(spec=AsyncSession)
        search_service = AdvancedSearchService(db_session)

        result = search_service._parse_search_query(
            '"Python Developer" "FastAPI Experience"'
        )

        assert len(result["phrases"]) == 2
        assert "Python Developer" in result["phrases"]

    def test_parse_search_query_with_boolean_operators(self):
        """Test parsing queries with boolean operators"""
        db_session = MagicMock(spec=AsyncSession)
        search_service = AdvancedSearchService(db_session)

        result = search_service._parse_search_query("Python AND FastAPI OR Django")

        assert result["has_and"] is True
        assert result["has_or"] is True

    def test_parse_search_query_with_fuzzy_terms(self):
        """Test parsing queries with fuzzy search terms"""
        db_session = MagicMock(spec=AsyncSession)
        search_service = AdvancedSearchService(db_session)

        result = search_service._parse_search_query("Python~ FastAPI~")

        assert len(result["fuzzy_terms"]) == 2
        assert "Python" in result["fuzzy_terms"]


@pytest.mark.unit
class TestAdvancedSearchServiceSavedSearches:
    """Test saved search functionality"""

    @pytest.mark.asyncio
    async def test_save_search(self, db_session: AsyncSession):
        """Test saving a search"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        filters = SearchFilters(location_city="San Francisco")

        result = await search_service.save_search(
            user_id=user_id,
            name="SF Jobs",
            search_query="Python Developer",
            filters=filters,
        )

        assert result.name == "SF Jobs"
        assert result.query == "Python Developer"

    @pytest.mark.asyncio
    async def test_get_saved_searches(self, db_session: AsyncSession):
        """Test retrieving saved searches"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create a saved search
        await search_service.save_search(
            user_id=user_id,
            name="My Search",
            search_query="Python",
            filters=SearchFilters(),
        )

        result = await search_service.get_saved_searches(user_id=user_id)

        assert len(result) >= 1
        assert result[0].name == "My Search"

    @pytest.mark.asyncio
    async def test_delete_saved_search(self, db_session: AsyncSession):
        """Test deleting a saved search"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create a saved search
        saved_search = await search_service.save_search(
            user_id=user_id,
            name="My Search",
            search_query="Python",
            filters=SearchFilters(),
        )

        result = await search_service.delete_saved_search(
            user_id=user_id, saved_search_id=saved_search.id
        )

        assert result is True


@pytest.mark.unit
class TestAdvancedSearchServiceAnalytics:
    """Test search analytics functionality"""

    @pytest.mark.asyncio
    async def test_search_analytics_tracking(self, db_session: AsyncSession):
        """Test that search analytics are tracked"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test data
        resume = Resume(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Software Engineer",
            content="Python FastAPI",
            file_path="path.pdf",
        )
        db_session.add(resume)
        await db_session.commit()

        # Perform search (should track analytics)
        result = await search_service.search_resumes(
            user_id=user_id, query="Python", track_analytics=True
        )

        assert "search_duration_ms" in result


@pytest.mark.unit
class TestAdvancedSearchServiceEdgeCases:
    """Test edge cases and error scenarios"""

    @pytest.mark.asyncio
    async def test_search_with_empty_query(self, db_session: AsyncSession):
        """Test search with empty query string"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        result = await search_service.search_resumes(
            user_id=user_id, query="", page=1, page_size=10
        )

        assert "results" in result
        assert result["total"] >= 0

    @pytest.mark.asyncio
    async def test_search_with_special_characters(self, db_session: AsyncSession):
        """Test search with special characters"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test resume with special characters
        resume = Resume(
            id=uuid.uuid4(),
            user_id=user_id,
            title="C++ Developer",
            content="Experience with C# and .NET",
            file_path="path.pdf",
        )
        db_session.add(resume)
        await db_session.commit()

        result = await search_service.search_resumes(
            user_id=user_id, query="C++ C#", page=1, page_size=10
        )

        assert "results" in result

    @pytest.mark.asyncio
    async def test_search_pagination_boundary(self, db_session: AsyncSession):
        """Test pagination at boundaries"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create exactly 10 items
        for i in range(10):
            resume = Resume(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Resume {i}",
                content="Content",
                file_path=f"path{i}.pdf",
            )
            db_session.add(resume)

        await db_session.commit()

        # Test exact page size
        result = await search_service.search_resumes(
            user_id=user_id, query="Resume", page=1, page_size=10
        )

        assert len(result["results"]) <= 10

        # Test page beyond data
        result = await search_service.search_resumes(
            user_id=user_id, query="Resume", page=10, page_size=10
        )

        assert len(result["results"]) == 0

    @pytest.mark.asyncio
    async def test_search_with_multiple_filters(self, db_session: AsyncSession):
        """Test search with multiple filters applied"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test JDs
        jd = JD(
            id=uuid.uuid4(),
            user_id=user_id,
            title="Senior Remote Python Developer",
            company="Tech Corp",
            content="Python required",
            location_city="San Francisco",
            location_remote=True,
            salary_min=120000,
            salary_max=150000,
            experience_level="Senior",
        )
        db_session.add(jd)
        await db_session.commit()

        filters = SearchFilters(
            location_city="San Francisco",
            location_remote=True,
            salary_min=100000,
            experience_level="Senior",
        )

        result = await search_service.search_jds(
            user_id=user_id, query="Python", filters=filters, page=1, page_size=10
        )

        assert "results" in result
        assert "filters_applied" in result

    @pytest.mark.asyncio
    async def test_search_sorting_variations(self, db_session: AsyncSession):
        """Test different sorting options"""
        user_id = uuid.uuid4()
        search_service = AdvancedSearchService(db_session)

        # Create test data
        for i in range(5):
            jd = JD(
                id=uuid.uuid4(),
                user_id=user_id,
                title=f"Job {i}",
                company=f"Company {i}",
                content="Content",
                posted_date=datetime(2024, 1, i + 1),
            )
            db_session.add(jd)

        await db_session.commit()

        # Test different sort options
        for sort_by in ["relevance", "date", "title", "posted_date"]:
            result = await search_service.search_jds(
                user_id=user_id,
                query="Job",
                page=1,
                page_size=10,
                sort_by=sort_by,
                sort_order="desc",
            )

            assert "results" in result
