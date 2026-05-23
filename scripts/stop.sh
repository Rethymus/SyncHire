#!/bin/bash
# Stop all SyncHire development services

echo "🛑 Stopping SyncHire development environment..."

# Stop Docker services
docker-compose down

# Optional: Remove volumes (uncomment if you want to reset data)
# docker-compose down -v

echo "✅ All services stopped"
