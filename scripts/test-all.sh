#!/bin/bash
# Run all tests (backend + frontend)

set -e  # Exit on error

echo "🧪 Running All ScholarSource Tests..."
echo
echo "════════════════════════════════════════════════════════════"
echo

# Run backend tests
echo "📦 BACKEND TESTS"
echo "────────────────────────────────────────────────────────────"
./scripts/test-backend.sh

echo
echo "════════════════════════════════════════════════════════════"
echo

# Run frontend tests
echo "🌐 FRONTEND TESTS"
echo "────────────────────────────────────────────────────────────"
./scripts/test-frontend.sh

echo
echo "════════════════════════════════════════════════════════════"
echo
echo "✅ All tests completed successfully!"
echo
echo "📊 Coverage Reports:"
echo "   Backend:  htmlcov/index.html"
echo "   Frontend: web/coverage/index.html"
