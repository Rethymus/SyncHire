import logging
import sys
from enum import Enum
from pathlib import Path
from typing import Optional

from app.core.config import get_settings

settings = get_settings()


class LogCategory(Enum):
    """Log categories for structured logging."""
    STORAGE = "storage"
    DATABASE = "database"
    API = "api"
    AUTH = "auth"
    AI = "ai"
    MCP = "mcp"
    GENERAL = "general"


class StructuredLogger:
    """Structured logger with category support."""

    def __init__(self, name: str = "synchire"):
        self.logger = logging.getLogger(name)
        self._setup_logger()

    def _setup_logger(self):
        """Configure logger with appropriate handlers and formatters."""
        if self.logger.handlers:
            return  # Already configured

        self.logger.setLevel(logging.INFO)

        # Console handler with detailed formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)

        # Detailed format with timestamp, level, category and message
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(category)s] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)

        self.logger.addHandler(console_handler)

        # Prevent propagation to avoid duplicate logs
        self.logger.propagate = False

    def _log_with_category(self, level: int, category: LogCategory, message: str, **kwargs):
        """Log a message with category context."""
        extra = {'category': category.value}
        extra.update(kwargs)
        self.logger.log(level, message, extra=extra)

    def debug(self, category: LogCategory, message: str, **kwargs):
        """Log debug message with category."""
        self._log_with_category(logging.DEBUG, category, message, **kwargs)

    def info(self, category: LogCategory, message: str, **kwargs):
        """Log info message with category."""
        self._log_with_category(logging.INFO, category, message, **kwargs)

    def warning(self, category: LogCategory, message: str, **kwargs):
        """Log warning message with category."""
        self._log_with_category(logging.WARNING, category, message, **kwargs)

    def warn(self, category: LogCategory, message: str, **kwargs):
        """Alias for warning."""
        self.warning(category, message, **kwargs)

    def error(self, category: LogCategory, message: str, **kwargs):
        """Log error message with category."""
        self._log_with_category(logging.ERROR, category, message, **kwargs)

    def critical(self, category: LogCategory, message: str, **kwargs):
        """Log critical message with category."""
        self._log_with_category(logging.CRITICAL, category, message, **kwargs)

    def exception(self, category: LogCategory, message: str, **kwargs):
        """Log exception with category."""
        extra = {'category': category.value}
        extra.update(kwargs)
        self.logger.exception(message, extra=extra)


# Global logger instance
logger = StructuredLogger()