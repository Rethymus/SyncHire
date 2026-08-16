"""Model registry.

The cloud models require PostgreSQL-only dependencies (asyncpg,
pgvector) that are absent in the Lite environment. Import the cloud
block lazily/guardedly so Lite routers importing ``app.models.*``
submodules (e.g. ``app.models.jd_lite``) do not trigger the cloud
database engine. In Lite mode ``CLOUD_MODELS_AVAILABLE`` is False and
only the lite models registered via ``app.core.database_lite.Base``
are used.
"""

CLOUD_MODELS_AVAILABLE = True

try:
    from app.models.user import User
    from app.models.resume import Resume
    from app.models.jd import JD
    from app.models.application import Application
    from app.models.application_status_history import ApplicationStatusHistory
    from app.models.notification import Notification
    from app.models.search import SearchHistory, SavedSearch, SearchAnalytics
    from app.models.interview import Interview, InterviewReminder, InterviewEvent
    from app.models.audit_log import AuditLog, DataRetentionLog, ConsentLog
    from app.models.task import Task

    __all__ = [
        "User",
        "Resume",
        "JD",
        "Application",
        "ApplicationStatusHistory",
        "Notification",
        "SearchHistory",
        "SavedSearch",
        "SearchAnalytics",
        "Interview",
        "InterviewReminder",
        "InterviewEvent",
        "AuditLog",
        "DataRetentionLog",
        "ConsentLog",
        "Task",
    ]
except ModuleNotFoundError:  # Lite environment (no asyncpg/pgvector)
    CLOUD_MODELS_AVAILABLE = False
    __all__ = []
