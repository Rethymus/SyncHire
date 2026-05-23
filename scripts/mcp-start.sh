#!/bin/bash
# Start all MCP servers for development

echo "🔧 Starting MCP servers..."

MCP_PORTS=(8001 8002 8003 8004)
MCP_NAMES=("jd-parser" "resume-analyzer" "job-matcher" "interview-prep")

for i in "${!MCP_PORTS[@]}"; do
    PORT=${MCP_PORTS[$i]}
    NAME=${MCP_NAMES[$i]}

    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  $NAME already running on port $PORT"
    else
        echo "🚀 Starting $NAME on port $PORT..."
        cd "mcp-servers/$NAME"
        python main.py --port $PORT &
        cd ../..
        echo "✅ $NAME started"
    fi
done

echo ""
echo "MCP Services:"
echo "  JD Parser:        http://localhost:8001"
echo "  Resume Analyzer:  http://localhost:8002"
echo "  Job Matcher:      http://localhost:8003"
echo "  Interview Prep:   http://localhost:8004"
