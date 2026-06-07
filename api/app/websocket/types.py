"""
WebSocket Types and Message Schemas

Defines message types, schemas, and data structures for WebSocket communication.
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
import uuid


class MessageType(str, Enum):
    """WebSocket message types"""

    # Connection management
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    HEARTBEAT = "heartbeat"
    ERROR = "error"

    # Notifications
    NOTIFICATION_NEW = "notification_new"
    NOTIFICATION_READ = "notification_read"
    NOTIFICATION_DELETED = "notification_deleted"

    # Application updates
    APPLICATION_STATUS = "application_status"
    APPLICATION_NEW = "application_new"
    APPLICATION_UPDATED = "application_updated"

    # Job alerts
    JOB_ALERT = "job_alert"
    JOB_MATCH_UPDATE = "job_match_update"

    # Interview updates
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_REMINDER = "interview_reminder"
    INTERVIEW_CANCELLED = "interview_cancelled"

    # System notifications
    SYSTEM_MESSAGE = "system_message"
    SYSTEM_UPDATE = "system_update"

    # Activity feed
    ACTIVITY_NEW = "activity_new"
    ACTIVITY_UPDATE = "activity_update"

    # Search suggestions
    SEARCH_SUGGESTION = "search_suggestion"
    SEARCH_RESULT = "search_result"

    # Analytics
    ANALYTICS_UPDATE = "analytics_update"
    PROFILE_VIEW = "profile_view"


class WebSocketMessage(BaseModel):
    """Standard WebSocket message format"""

    model_config = ConfigDict(use_enum_values=True)

    type: MessageType
    data: Dict[str, Any]
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class NotificationData(BaseModel):
    """Notification payload data"""

    notification_id: str
    type: str
    title: str
    message: str
    action_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ApplicationStatusData(BaseModel):
    """Application status update data"""

    application_id: str
    company: str
    position: str
    status: str
    status_text: str
    updated_at: str


class JobAlertData(BaseModel):
    """Job alert data"""

    job_id: str
    company: str
    position: str
    location: str
    match_score: int
    posted_date: str
    urgency: str = "normal"


class InterviewData(BaseModel):
    """Interview data"""

    interview_id: str
    application_id: str
    company: str
    position: str
    interview_date: str
    interview_time: str
    interview_type: str
    reminder_sent: bool = False


class ActivityData(BaseModel):
    """Activity feed data"""

    activity_id: str
    type: str
    description: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: str


class SearchSuggestionData(BaseModel):
    """Search suggestion data"""

    query: str
    suggestions: List[Dict[str, Any]]
    total_results: int


class ConnectionInfo(BaseModel):
    """WebSocket connection information"""

    user_id: str
    connection_id: str
    connected_at: str
    last_heartbeat: str
    subscriptions: List[str] = Field(default_factory=list)
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None


class HeartbeatMessage(BaseModel):
    """Heartbeat message for connection health"""

    connection_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = "alive"


class ErrorMessage(BaseModel):
    """Error message format"""

    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
