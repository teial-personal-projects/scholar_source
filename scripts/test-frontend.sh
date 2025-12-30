#!/bin/bash
# Frontend test runner script

set -e  # Exit on error

echo "🧪 Running ScholarSource Frontend Tests..."
echo

# Change to web directory
cd web

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run tests with coverage
echo
echo "Running Vitest with coverage..."
echo

npm run test:coverage "$@"

echo
echo "✅ Frontend tests completed!"
echo "📊 Coverage report: web/coverage/index.html"
