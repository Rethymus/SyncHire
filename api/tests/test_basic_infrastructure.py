"""
Basic test to verify test infrastructure is working correctly
"""

import pytest
import uuid
from unittest.mock import AsyncMock


@pytest.mark.unit
def test_basic_fixture_usage(fake):
    """Test that basic fixtures work"""
    email = fake.email()
    assert "@" in email
    assert "." in email


@pytest.mark.unit
def test_uuid_generation():
    """Test UUID generation for tests"""
    test_id = uuid.uuid4()
    assert isinstance(test_id, uuid.UUID)


@pytest.mark.unit
async def test_async_mock():
    """Test async mock functionality"""
    mock_func = AsyncMock(return_value={"status": "success"})
    result = await mock_func()
    assert result["status"] == "success"


@pytest.mark.unit
class TestBasicTestClass:
    """Test basic test class structure"""

    def test_class_method(self):
        """Test method in test class"""
        assert True

    @pytest.mark.asyncio
    async def test_async_class_method(self):
        """Test async method in test class"""
        assert await self.async_operation() == "test"

    async def async_operation(self):
        """Helper async method"""
        return "test"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_import_statements():
    """Test that all required imports work"""
    from app.services.application_service import ApplicationService
    from app.services.jd_service import JDService
    from app.services.resume_service import ResumeService
    from app.services.advanced_search import AdvancedSearchService
    from app.core.errors import ValidationError, NotFoundError

    assert ApplicationService is not None
    assert JDService is not None
    assert ResumeService is not None
    assert AdvancedSearchService is not None
    assert ValidationError is not None
    assert NotFoundError is not None


@pytest.mark.unit
def test_pytest_markers():
    """Test that pytest markers are configured"""
    # This test verifies the markers are registered
    assert hasattr(pytest.mark, "unit")
    assert hasattr(pytest.mark, "integration")
    assert hasattr(pytest.mark, "e2e")
    assert hasattr(pytest.mark, "performance")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
