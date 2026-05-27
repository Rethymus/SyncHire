# Production Dockerfile for FastAPI backend
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Stage 1: Builder
FROM base AS builder

# Copy requirements file
COPY api/requirements.txt .

# Install Python dependencies
RUN pip install --user -r requirements.txt

# Stage 2: Production
FROM base AS production

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Ensure Python scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY api/ .

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run with gunicorn for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-config", "logging.conf"]
