#!/bin/bash

# Integration test script for SyncHire MCP servers

echo "╔════════════════════════════════════════════════╗"
echo "║   SyncHire MCP Servers Integration Tests     ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if tsx is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed"
    exit 1
fi

# Run tests
npx tsx integration-test.ts

# Exit with test result
exit $?
