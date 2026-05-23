#!/bin/bash
# Stop all MCP servers

echo "🛑 Stopping MCP servers..."

MCP_PORTS=(8001 8002 8003 8004)
MCP_NAMES=("jd-parser" "resume-analyzer" "job-matcher" "interview-prep")

for i in "${!MCP_PORTS[@]}"; do
    PORT=${MCP_PORTS[$i]}
    NAME=${MCP_NAMES[$i]}

    PID=$(lsof -ti :$PORT)
    if [ -n "$PID" ]; then
        echo "Stopping $NAME (PID: $PID)..."
        kill $PID
        echo "✅ Stopped $NAME"
    else
        echo "⚠️  $NAME was not running"
    fi
done

echo "✅ All MCP servers stopped"
