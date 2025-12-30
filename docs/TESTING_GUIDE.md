# ScholarSource Testing Guide

Comprehensive guide for running, writing, and maintaining tests for the ScholarSource application.

---

## 🚀 Quick Start

```bash
# Install backend test dependencies
pip install -r requirements-dev.txt

# Install frontend test dependencies
cd web
npm install -D vitest @vitest/ui @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event jsdom msw

# Add test scripts to web/package.json (see section below)

# Run all tests
cd ..
./scripts/test-all.sh
```

---

## 📁 Test Suite Overview

### Backend Tests (120+ test cases)

```
tests/
├── conftest.py                     # Shared fixtures and mocks
├── unit/                           # Unit tests (fast, isolated)
│   ├── test_markdown_parser.py     # Markdown parsing (60+ tests)
│   ├── test_models.py              # Pydantic validation
│   ├── test_cache.py               # Cache functionality
│   └── test_rate_limiter.py        # Rate limiting
├── integration/                    # Integration tests
│   ├── test_api_endpoints.py       # API endpoint tests (40+ tests)
│   └── test_job_lifecycle.py       # Job workflow tests
└── e2e/                            # End-to-end tests (future)
```

### Frontend Tests (35+ test cases)

```
web/src/
├── test/
│   ├── setup.js                    # Vitest configuration
│   └── mocks/
│       ├── handlers.js             # MSW API handlers
│       └── server.js               # MSW server setup
├── components/
│   ├── ResultCard.test.jsx         # Component tests
│   ├── StatusMessage.test.jsx
│   ├── ConfirmDialog.test.jsx
│   └── Hero.test.jsx
└── api/
    └── client.test.js              # API client tests
```

### Test Coverage
- **Total Tests**: 155+ test cases
- **Backend Coverage Goal**: ≥70% overall, ≥85% for critical paths
- **Frontend Coverage Goal**: ≥70% overall
- **Mock Systems**: Complete Supabase and CrewAI mocks, MSW for API

---

## 🧪 Running Tests

### All Tests

```bash
# Run both backend and frontend tests
./scripts/test-all.sh
```

### Backend Tests

```bash
# Run all backend tests
./scripts/test-backend.sh

# Or directly with pytest
pytest

# Run specific test file
pytest tests/unit/test_markdown_parser.py

# Run specific test
pytest tests/unit/test_models.py::TestCourseInputRequest::test_valid_course_url_input

# Run with verbose output
pytest -v

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/

# Run with coverage report
pytest --cov=backend --cov-report=html
open htmlcov/index.html
```

### Frontend Tests

```bash
# Run all frontend tests
./scripts/test-frontend.sh

# Or directly with npm
cd web
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
open coverage/index.html

# Watch mode
npm test -- --watch

# Run specific test file
npm test -- ResultCard.test.jsx
```

---

## 📦 Installation & Setup

### 1. Install Dependencies

**Backend:**
```bash
pip install -r requirements-dev.txt
```

**Frontend:**
```bash
cd web
npm install -D vitest @vitest/ui @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event \
  jsdom msw
```

**Note:** The frontend test dependencies are listed in `web/package.json.additions`. 
Make sure to merge these into your `web/package.json` if they're not already there.

### 2. Add Scripts to package.json

Add these scripts to `web/package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3. Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

---

## 🧬 Testing Stack

### Backend (Python/FastAPI)

| Tool | Version | Purpose |
|------|---------|---------|
| **pytest** | ≥7.4.0 | Test runner and framework |
| **pytest-asyncio** | ≥0.21.0 | Async test support for FastAPI |
| **pytest-cov** | ≥4.1.0 | Code coverage reporting |
| **pytest-mock** | ≥3.11.0 | Mocking external dependencies |
| **httpx** | ≥0.24.0 | HTTP client for testing FastAPI |
| **fakeredis** | ≥2.19.0 | Mock Redis for rate limiting |
| **faker** | ≥20.0.0 | Generate fake test data |

**Installation:**
```bash
pip install -r requirements-dev.txt
```

### Frontend (React/Vitest)

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | ≥1.0.0 | Fast, Vite-native test runner |
| **@vitest/ui** | ≥1.0.0 | Visual test runner UI |
| **@testing-library/react** | ≥14.0.0 | User-centric component testing |
| **@testing-library/jest-dom** | ≥6.1.0 | Custom DOM matchers |
| **@testing-library/user-event** | ≥14.5.0 | User interaction simulation |
| **MSW** | ≥2.0.0 | Mock Service Worker for API mocking |
| **jsdom** | ≥23.0.0 | DOM implementation for Node.js |

**Installation:**
```bash
cd web
npm install -D vitest @vitest/ui @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event \
  jsdom msw
```

---

## ✍️ Writing Tests

### Backend Test Example

```python
import pytest
from backend.markdown_parser import parse_markdown_to_resources

def test_parse_numbered_resources():
    """Should parse numbered resource format correctly."""
    # Arrange
    markdown = """
    **1. OpenStax Textbook** (Type: Open Textbook)
    - **Link:** https://openstax.org/books/calculus
    - **What it covers:** Calculus fundamentals
    """

    # Act
    result = parse_markdown_to_resources(markdown)
    resources = result['resources']

    # Assert
    assert len(resources) == 1
    assert resources[0]['title'] == 'OpenStax Textbook'
    assert resources[0]['type'] == 'Textbook'
    assert 'openstax.org' in resources[0]['url']
```

### Frontend Test Example

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultCard from './ResultCard';

describe('ResultCard', () => {
  it('renders resource information correctly', () => {
    // Arrange
    const resource = {
      type: 'Textbook',
      title: 'Introduction to Algorithms',
      source: 'MIT Press',
      url: 'https://example.com',
      description: 'Great book',
    };

    // Act
    render(<ResultCard resource={resource} index={0} />);

    // Assert
    expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    expect(screen.getByText(/MIT Press/i)).toBeInTheDocument();
  });
});
```

---

## 🎭 Mocking External Dependencies

### Backend: Mock Supabase

The test suite includes a complete mock Supabase client:

```python
def test_with_mock_supabase(mock_supabase):
    """Use mock_supabase fixture from conftest.py"""
    # Add data to mock database
    mock_supabase.jobs_data['test-job-id'] = {
        'id': 'test-job-id',
        'status': 'completed',
        'results': []
    }

    # Test code that uses Supabase
    job = get_job('test-job-id')
    assert job['status'] == 'completed'
```

**Available Fixtures:**
- `mock_supabase` - Complete Supabase client mock
- `mock_crew_success` - CrewAI returns valid markdown
- `mock_crew_failure` - CrewAI raises exception
- `mock_crew_with_errors` - CrewAI returns markdown with errors

### Frontend: Mock API with MSW

```javascript
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

it('handles API error', async () => {
  // Override handler for this test
  server.use(
    http.post('http://localhost:8000/api/submit', () => {
      return HttpResponse.json(
        { detail: { error: 'Server error' } },
        { status: 500 }
      );
    })
  );

  // Test error handling
  await expect(submitJob({})).rejects.toThrow();
});
```

**Mock Endpoints:**
- `/api/health` - Health check
- `/api/submit` - Job submission
- `/api/status/:jobId` - Job status
- `/api/cancel/:jobId` - Job cancellation

---

## 📊 Test Coverage

### View Coverage Reports

**Backend:**
```bash
pytest --cov=backend --cov-report=html
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

**Frontend:**
```bash
cd web
npm run test:coverage
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Coverage Goals

| Component | Target | Priority |
|-----------|--------|----------|
| Markdown Parser | 90%+ | High |
| API Endpoints | 85%+ | High |
| Models | 80%+ | Medium |
| UI Components | 70%+ | Medium |
| Cache Logic | 75%+ | Medium |
| Rate Limiting | 80%+ | High |

---

## 🎯 Best Practices

### 1. Test Naming

✅ **Good:**
```python
def test_parse_numbered_resources_with_valid_markdown():
    """Should extract resources from numbered format"""
```

❌ **Bad:**
```python
def test1():
    """Test"""
```

### 2. Arrange-Act-Assert (AAA)

```python
def test_filter_excluded_domains():
    # Arrange
    markdown = "**1. MIT Resource**\n- **Link:** https://mit.edu"
    excluded = "mit.edu"

    # Act
    result = parse_markdown_to_resources(markdown, excluded_sites=excluded)

    # Assert
    assert len(result['resources']) == 0
```

### 3. Test Behavior, Not Implementation

✅ **Good (test what the user sees):**
```javascript
it('displays error when submission fails', async () => {
  // Trigger error and check user-visible error message
});
```

❌ **Bad (test internal state):**
```javascript
it('sets error state to true', () => {
  // Testing internal implementation details
});
```

### 4. Use Descriptive Test Data

```python
# Good
SAMPLE_MARKDOWN_WITH_TWO_RESOURCES = """
**1. OpenStax Calculus**
- **Link:** https://openstax.org/calc
**2. Khan Academy**
- **Link:** https://khanacademy.org/math
"""

# Bad
test_data = "**1. A** https://a.com **2. B** https://b.com"
```

### 5. Mock External Dependencies

Always mock external services (CrewAI, Supabase, OpenAI):

```python
@pytest.fixture
def mock_openai(mocker):
    """Mock OpenAI API calls"""
    return mocker.patch('crewai.Agent.openai_client')
```

---

## 🚦 Continuous Integration

### GitHub Actions Workflows

Tests run automatically on every push and pull request.

**`.github/workflows/test.yml`:**
- Backend tests (Python 3.12)
- Frontend tests (Node.js 18)
- Linting (black, isort, flake8, ESLint)
- Coverage upload to Codecov

**`.github/workflows/coverage.yml`:**
- Combined coverage reports
- PR comments with summaries
- Coverage tracking over time

---

## 🐛 Troubleshooting

### Backend Issues

**ModuleNotFoundError**
```bash
# Ensure dependencies are installed
pip install -r requirements-dev.txt

# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

**Tests fail in CI but pass locally**
- Check environment variables in `.github/workflows/test.yml`
- Ensure all dependencies are in `requirements-dev.txt`

**Rate limit tests interfere**
- Tests use in-memory rate limiting (not Redis)
- `fakeredis` handles state isolation

### Frontend Issues

**Import errors**
```bash
cd web
npm install
```

**Tests timeout**
```javascript
it('slow test', async () => {
  // ...
}, 15000);  // Increase timeout to 15 seconds
```

**MSW errors**
- Check `web/src/test/mocks/server.js` is imported
- Verify handlers are defined in `web/src/test/mocks/handlers.js`

---

## 🔍 Debugging Tests

### Backend

```python
# Add breakpoint in test
import pdb; pdb.set_trace()

# Run with -s flag to see print statements
pytest -s tests/unit/test_models.py

# Run single test with verbose output
pytest -vv tests/unit/test_models.py::TestResource::test_valid_resource
```

### Frontend

```javascript
// Add debugger statement
it('test', () => {
  debugger;
  // ...
});

// Print component tree
console.log(screen.debug());

// Run with --inspect flag
npm test -- --inspect
```

---

## 📈 Watch Mode

### Backend (pytest-watch)

```bash
# Install pytest-watch
pip install pytest-watch

# Run in watch mode
ptw
```

### Frontend (Vitest)

```bash
cd web
npm test -- --watch
```

---

## 📚 What Was Created

### Backend Files (11 files)
- `tests/conftest.py` - Shared fixtures (300+ lines)
- `tests/unit/test_markdown_parser.py` - 60+ test cases
- `tests/unit/test_models.py` - Pydantic validation tests
- `tests/unit/test_cache.py` - Cache tests
- `tests/unit/test_rate_limiter.py` - Rate limit tests
- `tests/integration/test_api_endpoints.py` - API tests (40+ cases)
- `tests/integration/test_job_lifecycle.py` - Workflow tests
- `pytest.ini` - Pytest configuration
- `requirements-dev.txt` - Dev dependencies

### Frontend Files (8 files)
- `web/vitest.config.js` - Vitest configuration
- `web/src/test/setup.js` - Test setup
- `web/src/test/mocks/handlers.js` - MSW handlers
- `web/src/test/mocks/server.js` - MSW server
- `web/src/components/ResultCard.test.jsx` - Component tests
- `web/src/components/StatusMessage.test.jsx`
- `web/src/components/ConfirmDialog.test.jsx`
- `web/src/components/Hero.test.jsx`
- `web/src/api/client.test.js` - API client tests

### Scripts & CI/CD (6 files)
- `scripts/test-backend.sh` - Backend runner
- `scripts/test-frontend.sh` - Frontend runner
- `scripts/test-all.sh` - Run all tests
- `.github/workflows/test.yml` - Main CI workflow
- `.github/workflows/coverage.yml` - Coverage workflow
- `TESTING_GUIDE.md` - This file

**Total: 25 files, 155+ test cases**

---

## 📋 Remaining Tasks

The following tasks from the original testing plan are still pending:

### High Priority
- [ ] **Add HomePage integration test** - Test the full user flow from form submission to results display
  - Location: `web/src/pages/HomePage.test.jsx`
  - Should test: Form validation, job submission, status polling, results rendering, error handling

### Medium Priority
- [ ] **Add E2E test** - Full workflow test (submit → poll → results)
  - Location: `tests/e2e/test_full_workflow.py`
  - Should test: Complete end-to-end flow without mocks (or minimal mocks)
  - Consider using Playwright or Cypress for browser-based E2E tests

### Low Priority
- [ ] **Improve coverage to 80%+** - Verify and improve overall test coverage
  - Current: ~70% (needs verification)
  - Target: 80%+ overall, 90%+ for critical paths
  - Run: `pytest --cov=backend --cov-report=term` and `npm run test:coverage`

---

## 🎓 Next Steps

1. **Run Tests**: `./scripts/test-all.sh`
2. **View Coverage**: Open `htmlcov/index.html` and `web/coverage/index.html`
3. **Complete Remaining Tasks**: See [Remaining Tasks](#-remaining-tasks) section above
4. **Add More Tests**: Expand coverage for edge cases
5. **E2E Tests**: Implement full workflow E2E test
6. **Visual Tests**: Consider adding visual regression testing
7. **Performance**: Benchmark critical paths

---

## 📖 Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

## ✅ Summary

This comprehensive testing suite provides:

✅ **155+ test cases** covering backend and frontend
✅ **Complete mock systems** for Supabase, CrewAI, and API endpoints
✅ **CI/CD integration** with GitHub Actions
✅ **Coverage tracking** with Codecov
✅ **Best practices** for maintainable, reliable tests


