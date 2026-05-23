#!/bin/bash
# Run database migrations

cd api

if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

echo "Running database migrations..."
alembic upgrade head

echo "✅ Migrations completed"
