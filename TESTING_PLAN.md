# Testing Implementation Plan

## Overview

This document outlines a comprehensive testing strategy for the ScholarSource application, covering both backend (FastAPI/Python) and frontend (React/Vite) components.

**Current State:** Minimal testing - only `test_crew.py` for manual crew validation
**Goal:** Establish robust automated testing with unit tests, integration tests, and E2E tests

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Stack](#testing-stack)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [Integration Testing](#integration-testing)
6. [Test Coverage Goals](#test-coverage-goals)
7. [CI/CD Integration](#cicd-integration)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Testing Philosophy

### Priorities

1. **Critical Paths First**: Test core workflows (job submission, status polling, results parsing)
2. **Edge Cases**: Handle errors, rate limits, malformed inputs
3. **Don't Mock Everything**: Use real instances where possible (in-memory DB, test API)
4. **Fast Feedback**: Unit tests should run in <5 seconds total
5. **Maintainable**: Tests should be clear, focused, and easy to update

### What to Test vs. What to Skip

**✅ Test:**
- Business logic (markdown parsing, resource filtering, error detection)
- API endpoints (request/response contracts)
- Error handling (rate limits, validation, external failures)
- Critical user flows (submit → poll → results)

**⚠️ Test Sparingly:**
- Third-party libraries (pytest, FastAPI, React)
- Simple getters/setters
- Configuration loading (unless critical)

**❌ Don't Test:**
- External APIs (OpenAI, CrewAI) - mock these
- Deployment infrastructure (Railway, Cloudflare)

---

## Testing Stack

### Backend (Python/FastAPI)

| Tool | Purpose | Why |
|------|---------|-----|
| **pytest** | Test runner | Industry standard, fixture support, parametrization |
| **pytest-asyncio** | Async test support | FastAPI uses async endpoints |
| **httpx** | HTTP client for FastAPI | Official recommendation for testing FastAPI |
| **pytest-cov** | Coverage reporting | Track test coverage metrics |
| **pytest-mock** | Mocking | Mock external dependencies (OpenAI, CrewAI) |
| **fakeredis** | Redis mocking | Test rate limiting without real Redis |

**Installation:**
```bash
# Add to requirements.txt (dev dependencies)
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
pytest-mock>=3.11.0
httpx>=0.24.0
fakeredis>=2.19.0
```

### Frontend (React/Vite)

| Tool | Purpose | Why |
|------|---------|-----|
| **Vitest** | Test runner | Vite-native, fast, Jest-compatible API |
| **@testing-library/react** | Component testing | User-centric testing approach |
| **@testing-library/jest-dom** | DOM matchers | Better assertions for DOM testing |
| **msw** (Mock Service Worker) | API mocking | Intercept network requests |
| **@vitest/ui** | Test UI | Visual test runner (optional) |

**Installation:**
```bash
# Add to web/package.json devDependencies
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw
```

---

## Backend Testing

### Test Structure

```
tests/
├── __init__.py
├── conftest.py                  # Shared fixtures
├── unit/
│   ├── __init__.py
│   ├── test_markdown_parser.py  # Markdown parsing logic
│   ├── test_models.py           # Pydantic model validation
│   ├── test_cache.py            # Cache key generation, storage
│   └── test_rate_limiter.py     # Rate limit logic (with fakeredis)
├── integration/
│   ├── __init__.py
│   ├── test_api_endpoints.py    # FastAPI endpoint tests
│   ├── test_job_lifecycle.py    # Submit → Poll → Complete flow
│   └── test_crew_runner.py      # Crew execution (mocked)
└── e2e/
    ├── __init__.py
    └── test_full_workflow.py    # End-to-end scenarios
```

### 1. Unit Tests

#### `tests/unit/test_markdown_parser.py`

**What to test:**
- ✅ Parse numbered resources correctly
- ✅ Parse link sections correctly
- ✅ Filter out ERROR resources
- ✅ Filter out excluded domains
- ✅ Extract textbook information
- ✅ Handle malformed markdown gracefully

**Example tests:**

```python
import pytest
from backend.markdown_parser import (
    parse_markdown_to_resources,
    _filter_excluded_domains,
    _contains_error
)


class TestMarkdownParser:
    """Test markdown parsing functionality"""

    def test_parse_numbered_resources(self):
        """Should parse numbered resource format"""
        markdown = """
        **1. OpenStax Textbook** (Type: Open Textbook)
        - **Link:** https://openstax.org/books/calculus
        - **What it covers:** Calculus fundamentals
        """

        result = parse_markdown_to_resources(markdown)
        resources = result['resources']

        assert len(resources) == 1
        assert resources[0]['title'] == 'OpenStax Textbook'
        assert resources[0]['type'] == 'Textbook'
        assert 'openstax.org' in resources[0]['url']


    def test_filter_error_resources(self):
        """Should exclude resources with ERROR in description"""
        markdown = """
        **1. Valid Resource**
        - **Link:** https://example.com/valid
        - **What it covers:** Good content

        **2. Error Resource**
        - **Link:** https://broken.com/error
        - **What it covers:** ERROR: Could not fetch https://broken.com/error
        """

        result = parse_markdown_to_resources(markdown)
        resources = result['resources']

        # Should only have 1 valid resource (error one filtered out)
        assert len(resources) == 1
        assert resources[0]['url'] == 'https://example.com/valid'


    def test_exclude_domains(self):
        """Should filter out excluded domains"""
        markdown = """
        **1. MIT Resource**
        - **Link:** https://ocw.mit.edu/courses/

        **2. Khan Academy**
        - **Link:** https://www.khanacademy.org/math

        **3. OpenStax**
        - **Link:** https://openstax.org/books
        """

        result = parse_markdown_to_resources(
            markdown,
            excluded_sites="mit.edu, khanacademy.org"
        )
        resources = result['resources']

        # Should only have OpenStax (MIT and Khan excluded)
        assert len(resources) == 1
        assert 'openstax.org' in resources[0]['url']


    def test_extract_textbook_info(self):
        """Should extract textbook metadata"""
        markdown = """
        **Textbook:** Calculus, 9th ed., by Stewart

        **1. Some Resource**
        - **Link:** https://example.com
        """

        result = parse_markdown_to_resources(markdown)
        textbook = result['textbook_info']

        assert textbook is not None
        assert 'Calculus' in textbook['title']
        assert 'Stewart' in textbook['author']


    @pytest.mark.parametrize("url,title,description,should_contain_error", [
        ("https://example.com", "Title", "Description", False),
        ("https://ERROR.com", "Title", "Description", True),
        ("https://example.com", "ERROR: Title", "Description", True),
        ("https://example.com", "Title", "ERROR: Could not fetch", True),
        ("https://example.com", "Title", "Failed to connect", True),
    ])
    def test_contains_error(self, url, title, description, should_contain_error):
        """Should detect error indicators in resource fields"""
        from backend.markdown_parser import _contains_error

        result = _contains_error(url, title, description)
        assert result == should_contain_error
```

#### `tests/unit/test_models.py`

**What to test:**
- ✅ Pydantic model validation
- ✅ Empty string → None conversion
- ✅ Invalid inputs rejected
- ✅ Optional field handling

```python
import pytest
from backend.models import CourseInputRequest, Resource


class TestCourseInputRequest:
    """Test request model validation"""

    def test_valid_course_url_input(self):
        """Should accept valid course URL"""
        data = {"course_url": "https://ocw.mit.edu/courses/math"}
        request = CourseInputRequest(**data)

        assert request.course_url == "https://ocw.mit.edu/courses/math"
        assert request.book_title is None  # Optional fields default to None


    def test_empty_strings_converted_to_none(self):
        """Should convert empty strings to None"""
        data = {
            "course_url": "https://example.com",
            "book_title": "",  # Empty string
            "topics_list": "   "  # Whitespace only
        }
        request = CourseInputRequest(**data)

        assert request.book_title is None
        assert request.topics_list is None


    def test_desired_resource_types_list(self):
        """Should accept list of resource types"""
        data = {
            "course_url": "https://example.com",
            "desired_resource_types": ["textbooks", "practice_problem_sets"]
        }
        request = CourseInputRequest(**data)

        assert len(request.desired_resource_types) == 2
        assert "textbooks" in request.desired_resource_types


class TestResourceModel:
    """Test resource data model"""

    def test_valid_resource(self):
        """Should create valid resource"""
        data = {
            "type": "Textbook",
            "title": "Calculus",
            "source": "OpenStax",
            "url": "https://openstax.org/books/calculus",
            "description": "Free calculus textbook"
        }
        resource = Resource(**data)

        assert resource.type == "Textbook"
        assert resource.title == "Calculus"


    def test_missing_required_field_fails(self):
        """Should reject resource missing required fields"""
        data = {
            "type": "Textbook",
            # Missing title, source, url
        }

        with pytest.raises(Exception):  # Pydantic ValidationError
            Resource(**data)
```

#### `tests/unit/test_rate_limiter.py`

**What to test:**
- ✅ Rate limit enforcement
- ✅ In-memory vs Redis storage selection
- ✅ Error response format
- ✅ Rate limit headers

```python
import pytest
import os
from backend.rate_limiter import limiter, rate_limit_handler
from slowapi.errors import RateLimitExceeded
from fastapi import Request


class TestRateLimiter:
    """Test rate limiting logic"""

    def test_limiter_uses_in_memory_by_default(self, monkeypatch):
        """Should use in-memory storage when REDIS_URL not set"""
        monkeypatch.delenv("REDIS_URL", raising=False)

        # Re-import to pick up env change (in real tests, use fixtures)
        # For now, just test that limiter exists
        assert limiter is not None


    def test_rate_limit_error_response(self):
        """Should return proper 429 error response"""
        # Mock request
        class MockRequest:
            pass

        request = MockRequest()

        # Mock exception
        exc = RateLimitExceeded(detail="10 per hour", retry_after=3600)

        response = rate_limit_handler(request, exc)

        assert response.status_code == 429
        assert "rate limit" in response.body.decode().lower()
        assert "3600" in response.body.decode()  # retry_after present
```

### 2. Integration Tests

#### `tests/integration/test_api_endpoints.py`

**What to test:**
- ✅ All API endpoints respond correctly
- ✅ Request/response contracts
- ✅ Error handling (400, 404, 429, 500)
- ✅ Rate limiting enforcement

```python
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


class TestHealthEndpoint:
    """Test /api/health endpoint"""

    def test_health_check_returns_200(self, client):
        """Should return healthy status"""
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestSubmitEndpoint:
    """Test /api/submit endpoint"""

    def test_submit_valid_course_url(self, client, mocker):
        """Should accept valid course URL and return job_id"""
        # Mock crew execution
        mocker.patch('backend.main.run_crew_async')

        payload = {"course_url": "https://ocw.mit.edu/courses/math"}
        response = client.post("/api/submit", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "pending"


    def test_submit_empty_payload_fails(self, client):
        """Should reject empty payload with 400"""
        response = client.post("/api/submit", json={})

        assert response.status_code == 400  # or 422 for validation error


    def test_submit_invalid_url_fails(self, client):
        """Should reject invalid URL format"""
        payload = {"course_url": "not-a-url"}
        response = client.post("/api/submit", json=payload)

        assert response.status_code == 422  # Validation error


    def test_submit_rate_limit_enforced(self, client, mocker):
        """Should enforce rate limit on /api/submit"""
        # Mock crew execution
        mocker.patch('backend.main.run_crew_async')

        payload = {"course_url": "https://example.com"}

        # Make requests until rate limit hit
        # (Depends on configured limit: 10/hour; 2/minute)
        responses = []
        for _ in range(5):  # Exceed 2/minute
            resp = client.post("/api/submit", json=payload)
            responses.append(resp.status_code)

        # At least one should be 429 (rate limited)
        assert 429 in responses


class TestStatusEndpoint:
    """Test /api/status/{job_id} endpoint"""

    def test_get_status_pending_job(self, client, mocker):
        """Should return pending status for new job"""
        # Create a job first
        mocker.patch('backend.main.run_crew_async')
        submit_resp = client.post("/api/submit", json={"course_url": "https://example.com"})
        job_id = submit_resp.json()["job_id"]

        # Check status
        response = client.get(f"/api/status/{job_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["pending", "running"]


    def test_get_status_nonexistent_job(self, client):
        """Should return 404 for nonexistent job"""
        fake_job_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/status/{fake_job_id}")

        assert response.status_code == 404


class TestCancelEndpoint:
    """Test /api/cancel/{job_id} endpoint"""

    def test_cancel_running_job(self, client, mocker):
        """Should cancel running job"""
        # Create a job
        mocker.patch('backend.main.run_crew_async')
        submit_resp = client.post("/api/submit", json={"course_url": "https://example.com"})
        job_id = submit_resp.json()["job_id"]

        # Cancel it
        response = client.post(f"/api/cancel/{job_id}")

        assert response.status_code == 200
        data = response.json()
        assert "cancelled" in data.get("status", "").lower() or "message" in data
```

#### `tests/integration/test_job_lifecycle.py`

**What to test:**
- ✅ Full job lifecycle (submit → running → completed)
- ✅ Job state transitions
- ✅ Cancellation during execution

```python
import pytest
import time
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestJobLifecycle:
    """Test complete job lifecycle"""

    def test_job_progresses_through_states(self, client, mocker):
        """Should transition: pending → running → completed"""
        # Mock crew to return quickly
        mock_result = mocker.Mock()
        mock_result.raw = "**1. Test Resource**\n- **Link:** https://example.com"
        mocker.patch('backend.crew_runner.ScholarSource').return_value.crew().kickoff_async.return_value = mock_result

        # Submit job
        submit_resp = client.post("/api/submit", json={"course_url": "https://example.com"})
        job_id = submit_resp.json()["job_id"]

        # Poll status until completed (with timeout)
        max_attempts = 30
        for _ in range(max_attempts):
            status_resp = client.get(f"/api/status/{job_id}")
            status = status_resp.json()["status"]

            if status == "completed":
                assert "results" in status_resp.json()
                return

            time.sleep(0.5)

        pytest.fail(f"Job did not complete within {max_attempts * 0.5}s")


    def test_cancelled_job_stops_execution(self, client, mocker):
        """Should stop execution when job is cancelled"""
        # Mock long-running crew
        async def slow_crew(*args, **kwargs):
            import asyncio
            await asyncio.sleep(10)  # Long task

        mocker.patch('backend.crew_runner.ScholarSource').return_value.crew().kickoff_async = slow_crew

        # Submit job
        submit_resp = client.post("/api/submit", json={"course_url": "https://example.com"})
        job_id = submit_resp.json()["job_id"]

        # Cancel it immediately
        time.sleep(0.5)  # Let it start
        cancel_resp = client.post(f"/api/cancel/{job_id}")

        assert cancel_resp.status_code == 200

        # Check status shows cancelled
        status_resp = client.get(f"/api/status/{job_id}")
        assert status_resp.json()["status"] == "cancelled"
```

### 3. Fixtures (`tests/conftest.py`)

**Shared test fixtures:**

```python
import pytest
import os
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(scope="session")
def test_env():
    """Set up test environment variables"""
    os.environ["LOG_LEVEL"] = "ERROR"  # Suppress logs during tests
    os.environ.pop("REDIS_URL", None)  # Use in-memory for tests
    yield
    # Cleanup after all tests


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def mock_crew_success(mocker):
    """Mock successful crew execution"""
    mock_result = mocker.Mock()
    mock_result.raw = """
    **1. OpenStax Calculus**
    - **Link:** https://openstax.org/books/calculus
    - **What it covers:** Calculus fundamentals
    """

    mock_crew = mocker.patch('backend.crew_runner.ScholarSource')
    mock_crew.return_value.crew().kickoff_async.return_value = mock_result
    return mock_crew


@pytest.fixture
def mock_crew_failure(mocker):
    """Mock failed crew execution"""
    mock_crew = mocker.patch('backend.crew_runner.ScholarSource')
    mock_crew.return_value.crew().kickoff_async.side_effect = Exception("Crew failed")
    return mock_crew
```

---

## Frontend Testing

### Test Structure

```
web/
├── src/
│   ├── components/
│   │   ├── Hero.test.jsx
│   │   ├── ResultCard.test.jsx
│   │   ├── InlineSearchStatus.test.jsx
│   │   └── ui/
│   │       ├── Button.test.jsx
│   │       └── TextInput.test.jsx
│   ├── pages/
│   │   └── HomePage.test.jsx
│   ├── api/
│   │   └── client.test.js
│   └── test/
│       ├── setup.js           # Test configuration
│       └── mocks/
│           └── handlers.js     # MSW API mock handlers
├── vitest.config.js
└── package.json
```

### 1. Component Tests

#### `web/src/components/ResultCard.test.jsx`

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultCard from './ResultCard';

describe('ResultCard', () => {
  const mockResource = {
    type: 'Textbook',
    title: 'Introduction to Algorithms',
    source: 'MIT Press',
    url: 'https://example.com/algorithms',
    description: 'Comprehensive algorithms textbook'
  };

  it('renders resource information correctly', () => {
    render(<ResultCard resource={mockResource} index={0} />);

    expect(screen.getByText('Introduction to Algorithms')).toBeInTheDocument();
    expect(screen.getByText(/MIT Press/i)).toBeInTheDocument();
    expect(screen.getByText(/Comprehensive algorithms textbook/i)).toBeInTheDocument();
  });

  it('shows correct badge color for textbook type', () => {
    render(<ResultCard resource={mockResource} index={0} />);

    const badge = screen.getByText('Textbook');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-900');
  });

  it('copies URL to clipboard when copy button clicked', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue()
      }
    });

    render(<ResultCard resource={mockResource} index={0} />);

    const copyButton = screen.getByText('Copy URL');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockResource.url);

    // Should show "Copied" feedback
    expect(await screen.findByText('✓ Copied')).toBeInTheDocument();
  });

  it('opens NotebookLM in new tab when button clicked', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation();

    render(<ResultCard resource={mockResource} index={0} />);

    const notebookButton = screen.getByText(/Copy \+ NotebookLM/i);
    fireEvent.click(notebookButton);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://notebooklm.google.com',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
```

#### `web/src/pages/HomePage.test.jsx`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from './HomePage';
import * as apiClient from '../api/client';

// Mock API client
vi.mock('../api/client');

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search form', () => {
    render(<HomePage />);

    expect(screen.getByText(/Search Parameters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Resources/i })).toBeInTheDocument();
  });

  it('disables submit button when form is invalid', () => {
    render(<HomePage />);

    const submitButton = screen.getByRole('button', { name: /Find Resources/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when course URL entered', () => {
    render(<HomePage />);

    // Select course URL option
    const searchTypeSelect = screen.getByLabelText(/Search Type/i);
    fireEvent.change(searchTypeSelect, { target: { value: 'course_url' } });

    // Enter URL
    const urlInput = screen.getByPlaceholderText(/ocw.mit.edu/i);
    fireEvent.change(urlInput, { target: { value: 'https://ocw.mit.edu/courses/math' } });

    const submitButton = screen.getByRole('button', { name: /Find Resources/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('submits job and polls for status', async () => {
    // Mock submit endpoint
    apiClient.submitJob.mockResolvedValue({
      job_id: 'test-job-123',
      status: 'pending'
    });

    // Mock status endpoint (simulate progression)
    apiClient.getJobStatus
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'running' })
      .mockResolvedValueOnce({
        status: 'completed',
        results: [
          {
            type: 'Textbook',
            title: 'Test Book',
            source: 'Test Source',
            url: 'https://example.com',
            description: 'Test description'
          }
        ]
      });

    render(<HomePage />);

    // Fill form
    const searchTypeSelect = screen.getByLabelText(/Search Type/i);
    fireEvent.change(searchTypeSelect, { target: { value: 'course_url' } });

    const urlInput = screen.getByPlaceholderText(/ocw.mit.edu/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /Find Resources/i });
    fireEvent.click(submitButton);

    // Should show loading state
    expect(await screen.findByText(/Finding.../i)).toBeInTheDocument();

    // Should eventually show results
    await waitFor(() => {
      expect(screen.getByText('Test Book')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays error when submission fails', async () => {
    apiClient.submitJob.mockRejectedValue(new Error('Network error'));

    render(<HomePage />);

    // Fill and submit form
    const searchTypeSelect = screen.getByLabelText(/Search Type/i);
    fireEvent.change(searchTypeSelect, { target: { value: 'course_url' } });

    const urlInput = screen.getByPlaceholderText(/ocw.mit.edu/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    const submitButton = screen.getByRole('button', { name: /Find Resources/i });
    fireEvent.click(submitButton);

    // Should show error
    expect(await screen.findByText(/Network error/i)).toBeInTheDocument();
  });
});
```

### 2. API Client Tests

#### `web/src/api/client.test.js`

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { submitJob, getJobStatus, cancelJob, checkHealth } from './client';

// Mock API server
const server = setupServer();

beforeEach(() => server.listen());
afterEach(() => server.resetHandlers());
afterEach(() => server.close());

describe('API Client', () => {
  const API_URL = 'http://localhost:8000';

  describe('submitJob', () => {
    it('submits job and returns job_id', async () => {
      server.use(
        http.post(`${API_URL}/api/submit`, () => {
          return HttpResponse.json({
            job_id: 'test-123',
            status: 'pending',
            message: 'Job created'
          });
        })
      );

      const result = await submitJob({ course_url: 'https://example.com' });

      expect(result.job_id).toBe('test-123');
      expect(result.status).toBe('pending');
    });

    it('throws error on failure', async () => {
      server.use(
        http.post(`${API_URL}/api/submit`, () => {
          return HttpResponse.json(
            { detail: { message: 'Invalid input' } },
            { status: 400 }
          );
        })
      );

      await expect(
        submitJob({ course_url: '' })
      ).rejects.toThrow('Invalid input');
    });
  });

  describe('getJobStatus', () => {
    it('retrieves job status', async () => {
      server.use(
        http.get(`${API_URL}/api/status/test-123`, () => {
          return HttpResponse.json({
            job_id: 'test-123',
            status: 'completed',
            results: []
          });
        })
      );

      const result = await getJobStatus('test-123');

      expect(result.status).toBe('completed');
    });
  });

  describe('checkHealth', () => {
    it('returns health status', async () => {
      server.use(
        http.get(`${API_URL}/api/health`, () => {
          return HttpResponse.json({
            status: 'healthy',
            version: '0.1.0'
          });
        })
      );

      const result = await checkHealth();

      expect(result.status).toBe('healthy');
    });
  });
});
```

### 3. Test Configuration

#### `web/vitest.config.js`

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ]
    }
  }
});
```

#### `web/src/test/setup.js`

```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (needed for responsive tests)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

---

## Test Coverage Goals

### Coverage Targets

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| **Markdown Parser** | 90%+ | High |
| **API Endpoints** | 85%+ | High |
| **Models (Validation)** | 80%+ | Medium |
| **UI Components** | 70%+ | Medium |
| **Cache Logic** | 75%+ | Medium |
| **Rate Limiting** | 80%+ | High |

### Measuring Coverage

**Backend:**
```bash
# Run tests with coverage
pytest --cov=backend --cov-report=html --cov-report=term

# View HTML report
open htmlcov/index.html
```

**Frontend:**
```bash
# Run tests with coverage
npm run test -- --coverage

# View HTML report
open web/coverage/index.html
```

---

## CI/CD Integration

### GitHub Actions Workflow

**`.github/workflows/test.yml`:**

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov pytest-mock httpx

      - name: Run backend tests
        run: |
          pytest --cov=backend --cov-report=xml --cov-report=term

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
          flags: backend

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./web
        run: npm ci

      - name: Run frontend tests
        working-directory: ./web
        run: npm run test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./web/coverage/coverage-final.json
          flags: frontend
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Set up testing infrastructure

- [ ] Install testing dependencies (pytest, vitest)
- [ ] Create test directory structure
- [ ] Set up `conftest.py` with basic fixtures
- [ ] Configure `vitest.config.js`
- [ ] Write first unit test (markdown parser)
- [ ] Get tests running in CI/CD

**Deliverables:**
- ✅ Testing dependencies installed
- ✅ Basic test structure in place
- ✅ At least 1 passing test in backend and frontend
- ✅ CI/CD pipeline running tests

### Phase 2: Core Unit Tests (Week 2)
**Goal:** Test critical business logic

- [ ] Complete `test_markdown_parser.py` (10+ tests)
- [ ] Complete `test_models.py` (5+ tests)
- [ ] Complete `test_cache.py` (5+ tests)
- [ ] Add frontend component tests (ResultCard, Hero)
- [ ] Aim for 50% coverage on core modules

**Deliverables:**
- ✅ 20+ backend unit tests
- ✅ 10+ frontend component tests
- ✅ 50% code coverage

### Phase 3: Integration Tests (Week 3)
**Goal:** Test API contracts and workflows

- [ ] Complete `test_api_endpoints.py` (all endpoints)
- [ ] Complete `test_job_lifecycle.py` (full workflow)
- [ ] Add API client tests (frontend)
- [ ] Add HomePage integration test
- [ ] Aim for 70% coverage

**Deliverables:**
- ✅ 15+ integration tests
- ✅ All API endpoints tested
- ✅ 70% code coverage

### Phase 4: Polish & E2E (Week 4)
**Goal:** Comprehensive coverage and edge cases

- [ ] Add E2E test (full workflow: submit → poll → results)
- [ ] Test error scenarios (rate limits, failures)
- [ ] Add parameterized tests for edge cases
- [ ] Improve coverage to 80%+
- [ ] Document testing patterns

**Deliverables:**
- ✅ 1+ E2E test
- ✅ Edge case coverage
- ✅ 80%+ code coverage
- ✅ Testing documentation

---

## Running Tests

### Backend

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/unit/test_markdown_parser.py

# Run with coverage
pytest --cov=backend --cov-report=html

# Run tests matching pattern
pytest -k "test_parse"

# Run with verbose output
pytest -v

# Run only fast tests (skip slow integration tests)
pytest -m "not slow"
```

### Frontend

```bash
cd web

# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test -- --coverage

# Watch mode (re-run on file changes)
npm run test -- --watch

# Run specific test file
npm run test -- ResultCard.test.jsx
```

---

## Best Practices

### 1. Test Naming

**Good:**
```python
def test_parse_numbered_resources_with_valid_markdown():
    """Should extract resources from numbered format"""
```

**Bad:**
```python
def test1():
    """Test"""
```

### 2. Arrange-Act-Assert (AAA) Pattern

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

### 3. Don't Test Implementation Details

**Good (test behavior):**
```javascript
it('displays error when submission fails', async () => {
  // Trigger error and check user sees it
});
```

**Bad (test internals):**
```javascript
it('sets error state to true', async () => {
  // Testing internal state management
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

```python
@pytest.fixture
def mock_openai(mocker):
    """Mock OpenAI API calls"""
    return mocker.patch('crewai.Agent.openai_client')
```

---

## Troubleshooting

### Common Issues

**Issue:** Tests fail with "ModuleNotFoundError"
**Fix:** Ensure `PYTHONPATH` includes project root or use `pytest` with proper discovery

**Issue:** Frontend tests timeout
**Fix:** Increase timeout in `waitFor()` or check for infinite loops

**Issue:** Rate limit tests interfere with each other
**Fix:** Use `fakeredis` and reset state between tests

**Issue:** Coverage reports missing files
**Fix:** Check `coverage` configuration and ensure all source files are included

---

## Summary

This testing plan provides a comprehensive approach to testing ScholarSource:

✅ **Backend:** pytest + httpx for API testing
✅ **Frontend:** Vitest + Testing Library for components
✅ **Coverage:** 80%+ target for critical paths
✅ **CI/CD:** Automated testing on every PR
✅ **Roadmap:** 4-week phased implementation

By following this plan, you'll have:
- Confidence in code changes (catch regressions early)
- Faster development (tests document expected behavior)
- Better code quality (tests encourage modular design)
- Easier onboarding (tests serve as documentation)

**Next Steps:** Review this plan, then begin Phase 1 implementation! 🚀
