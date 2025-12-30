#!/bin/bash
# Backend test runner script

set -e  # Exit on error

echo "🧪 Running ScholarSource Backend Tests..."
echo

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "✅ Activating virtual environment..."
    source .venv/bin/activate
fi

# Install test dependencies if needed
if ! python -c "import pytest" 2>/dev/null; then
    echo "📦 Installing test dependencies..."
    pip install -r requirements-dev.txt
fi

# Run tests with coverage
echo
echo "Running pytest with coverage..."
echo

pytest \
    --cov=backend \
    --cov-report=html \
    --cov-report=term \
    --cov-report=xml \
    -v \
    "$@"

echo
echo "✅ Backend tests completed!"
echo "📊 Coverage report: htmlcov/index.html"
