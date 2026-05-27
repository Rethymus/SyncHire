# Production Dockerfile for MCP servers
FROM python:3.11-slim

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
        && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash mcpuser

# Copy requirements and install dependencies
COPY mcp-servers/*/requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/jd-parser/requirements.txt && \
    pip install --no-cache-dir -r /tmp/resume-analyzer/requirements.txt && \
    pip install --no-cache-dir -r /tmp/job-matcher/requirements.txt && \
    pip install --no-cache-dir -r /tmp/interview-prep/requirements.txt

# Copy application code
COPY mcp-servers/ .

# Set ownership
RUN chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Expose ports for each MCP server
EXPOSE 8001 8002 8003 8004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

# Start all MCP servers with supervisord
CMD ["python", "-m", "jd_parser.src.main"]
