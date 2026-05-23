#!/bin/bash
# Apache Bench Load Testing Script for SyncHire
# Tests concurrent load on critical endpoints

set -e

API_URL="${API_URL:-http://localhost:8000}"
TOKEN="${AUTH_TOKEN:-}"
RESULTS_DIR="./test_results/load_tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$RESULTS_DIR"

echo "╔════════════════════════════════════════════════╗"
echo "║     SyncHire Load Testing with Apache Bench     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "API URL: $API_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run load test
run_load_test() {
    local name=$1
    local endpoint=$2
    local requests=$3
    local concurrency=$4

    echo "Testing: $name"
    echo "Endpoint: $endpoint"
    echo "Requests: $requests, Concurrency: $concurrency"

    local output_file="$RESULTS_DIR/${name}_${TIMESTAMP}.txt"

    if [ -n "$TOKEN" ]; then
        ab -n "$requests" -c "$concurrency" \
           -H "Authorization: Bearer $TOKEN" \
           -p /dev/null \
           "$API_URL$endpoint" > "$output_file" 2>&1
    else
        ab -n "$requests" -c "$concurrency" \
           "$API_URL$endpoint" > "$output_file" 2>&1
    fi

    # Extract key metrics
    local rps=$(grep "Requests per second" "$output_file" | awk '{print $4}')
    local failed=$(grep "Failed requests" "$output_file" | awk '{print $3}')
    local time_per_request=$(grep "Time per request.*mean" "$output_file" | head -1 | awk '{print $4}')

    echo "Results:"
    echo "  RPS: $rps"
    echo "  Failed: $failed"
    echo "  Avg Response: ${time_per_request}ms"

    # Color code results
    if [ "$failed" = "0" ]; then
        echo -e "${GREEN}✓ No failed requests${NC}"
    else
        echo -e "${RED}✗ $failed failed requests${NC}"
    fi

    echo ""
}

# Test scenarios
echo "🧪 Starting Load Tests..."
echo ""

# 1. Health Check (lightweight)
run_load_test "health_check" "/health" 1000 10

# 2. Login (if credentials provided)
if [ -n "$TEST_EMAIL" ] && [ -n "$TEST_PASSWORD" ]; then
    echo "Testing login endpoint..."
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token // .token // empty')

    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo -e "${GREEN}✓ Login successful, token acquired${NC}"
        export AUTH_TOKEN=$TOKEN
    else
        echo -e "${YELLOW}⚠ Login failed, continuing without auth${NC}"
    fi
    echo ""
fi

# 3. List Resumes (requires auth)
if [ -n "$TOKEN" ]; then
    run_load_test "list_resumes" "/api/resumes/" 500 10
fi

# 4. List JDs (requires auth)
if [ -n "$TOKEN" ]; then
    run_load_test "list_jds" "/api/jds/" 500 10
fi

# 5. Parse JD (CPU intensive)
echo -e "${YELLOW}⚠ Skipping JD parse test (requires POST data)${NC}"
echo "Run manually with:"
echo "  ab -n 100 -c 5 -p jd.json -T application/json $API_URL/api/jds/parse"
echo ""

# 6. Concurrent User Simulation
echo "Running concurrent user simulation..."
for i in {1..5}; do
    curl -s "$API_URL/health" > /dev/null &
done
wait
echo -e "${GREEN}✓ Concurrent test completed${NC}"
echo ""

# Summary
echo "╔════════════════════════════════════════════════╗"
echo "║              Load Test Complete                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""
echo "💡 To view detailed results:"
echo "  cat $RESULTS_DIR/*_$TIMESTAMP.txt"
echo ""
echo "💡 To run specific tests:"
echo "  ab -n 1000 -c 50 $API_URL/health"
echo ""
echo "💡 Memory leak detection:"
echo "  while true; do curl -s $API_URL/health > /dev/null; done"
