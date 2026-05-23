#!/bin/bash
# Reset database (CAUTION: This deletes all data)

read -p "⚠️  This will delete all data. Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo "Stopping services..."
docker-compose down -v

echo "Starting fresh database..."
docker-compose up -d postgres

echo "Waiting for PostgreSQL..."
until docker exec synchire-postgres pg_isready -U synchire > /dev/null 2>&1; do
    sleep 2
done

echo "Running migrations..."
cd api
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
alembic upgrade head
cd ..

echo "✅ Database reset complete"
