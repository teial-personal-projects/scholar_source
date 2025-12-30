# ScholarSource Technical Design Document

> **Note:** This document contains low-level implementation details. For high-level system architecture, see `docs/SYSTEM_DESIGN.md`.

## 1. Introduction

This Technical Design Document (TDD) provides detailed implementation specifications for ScholarSource components. It covers function signatures, algorithms, data structures, and implementation flows that developers need to write code.

**Audience:** Software engineers implementing or maintaining the system.

**Related Documents:**
- `docs/SYSTEM_DESIGN.md` - High-level system architecture
- `docs/TESTING_GUIDE.md` - Testing documentation

---

## 2. Backend Technical Design

### 2.1 Job Management Component (`backend/jobs.py`)

#### 2.1.1 Function Signatures

```python
def create_job(inputs: dict) -> str:
    """
    Create a new job in Supabase database.
    
    Args:
        inputs: Dictionary of course input parameters
        
    Returns:
        str: UUID of the created job
        
    Raises:
        Exception: If job creation fails
    """
```

**Implementation Details:**
- Generates search title from inputs using `_generate_search_title()`
- Sets initial status to 'pending'
- Stores inputs as JSONB in database
- Returns job UUID from database

```python
def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Get job data from Supabase database.
    
    Args:
        job_id: UUID of the job
        
    Returns:
        dict | None: Job data dictionary or None if not found
    """
```

**Implementation Details:**
- Queries `jobs` table by `id` column
- Returns None if job not found
- Logs errors but doesn't raise exceptions

```python
def update_job_status(
    job_id: str,
    status: str,
    results: Optional[list] = None,
    error: Optional[str] = None,
    status_message: Optional[str] = None,
    raw_output: Optional[str] = None,
    metadata: Optional[dict] = None
) -> None:
    """
    Update job status and optional fields in Supabase.
    
    Args:
        job_id: UUID of the job
        status: New status (pending, running, completed, failed, cancelled)
        results: List of Resource dictionaries (optional)
        error: Error message if failed (optional)
        status_message: Current progress message (optional)
        raw_output: Raw markdown output from crew (optional)
        metadata: Additional metadata (optional)
        
    Raises:
        Exception: If update fails
    """
```

**Implementation Details:**
- Updates `jobs` table using Supabase client
- Sets `completed_at` timestamp when status is 'completed' or 'failed'
- All optional fields can be None
- Raises exception on database errors

### 2.2 Crew Runner Component (`backend/crew_runner.py`)

#### 2.2.1 Function Signatures

```python
def run_crew_async(job_id: str, inputs: Dict[str, str], bypass_cache: bool = False) -> None:
    """
    Run the ScholarSource crew asynchronously with cancellation support.
    
    This function:
    1. Updates job status to 'running'
    2. Executes the crew with provided inputs using kickoff_async()
    3. Parses the markdown output into structured resources
    4. Updates job with results or error
    5. Supports cancellation via cancel_crew_job()
    
    Args:
        job_id: UUID of the job to run
        inputs: Dictionary of course input parameters
        bypass_cache: If True, bypass cache and get fresh results
    """
```

**Implementation Details:**
- Creates new thread with daemon=True
- Creates new event loop in thread (asyncio.new_event_loop())
- Calls `_run_crew_worker()` in the event loop
- Thread runs independently of main process

```python
async def _run_crew_worker(job_id: str, inputs: Dict[str, str], bypass_cache: bool = False) -> None:
    """
    Worker function that runs in background thread.
    
    Args:
        job_id: UUID of the job
        inputs: Course input parameters
        bypass_cache: If True, bypass cache and get fresh results
    """
```

**Execution Flow:**
1. Check if job was cancelled before starting
2. Check cache (if not bypassed) using `get_cached_analysis()`
3. If cache hit and valid, update job with cached results and return
4. Update job status to 'running'
5. Create ScholarSource crew instance
6. Execute crew with `crew().kickoff_async(inputs=inputs)`
7. Store async task in `_active_tasks` dict for cancellation
8. Parse markdown output using `parse_markdown_to_resources()`
9. Update job with results, raw_output, and metadata
10. Store results in cache using `set_cached_analysis()`
11. Handle exceptions and update job with error

```python
def cancel_crew_job(job_id: str) -> bool:
    """
    Cancel an active crew job by cancelling its async task.
    
    Args:
        job_id: UUID of the job to cancel
        
    Returns:
        bool: True if task was found and cancelled, False otherwise
    """
```

**Implementation Details:**
- Looks up task in `_active_tasks` dict by job_id
- Calls `task.cancel()` if task exists and not done
- Returns True if cancelled, False if not found

### 2.3 Markdown Parser Component (`backend/markdown_parser.py`)

#### 2.3.1 Function Signatures

```python
def parse_markdown_to_resources(markdown_content: str, excluded_sites: Optional[str] = None) -> Dict[str, Any]:
    """
    Parse markdown report into structured resources and metadata.
    
    Args:
        markdown_content: Raw markdown content from crew output
        excluded_sites: Comma-separated list of domains to exclude
        
    Returns:
        Dict with 'resources' (list) and 'textbook_info' (dict or None)
    """
```

**Parsing Strategies (in order):**

1. **Numbered Resources Format:**
   - Pattern: `**1. Title** (Type: ResourceType)`
   - Extracts: title, type, link, description
   - Regex: `r'\*\*(\d+)\.\s*([^*]+)\*\*\s*\(Type:\s*([^)]+)\)'`

2. **Link Sections Format:**
   - Pattern: `## Section` followed by markdown links
   - Extracts: section title, links with descriptions
   - Falls back if numbered format fails

3. **All Links Format:**
   - Pattern: Any markdown link `[text](url)`
   - Extracts: all links from markdown
   - Last resort if other strategies fail

**Post-Processing:**
- Filters out resources with "ERROR" in title, description, or URL
- Filters excluded domains if `excluded_sites` provided
- Extracts textbook info from markdown (pattern: `**Textbook:** ...`)

```python
def _filter_excluded_domains(resources: List[Dict], excluded_sites: str) -> List[Dict]:
    """
    Filter resources by excluded domains.
    
    Args:
        resources: List of resource dictionaries
        excluded_sites: Comma-separated list of domains (e.g., "mit.edu, khanacademy.org")
        
    Returns:
        List of resources with excluded domains removed
    """
```

**Implementation Details:**
- Splits `excluded_sites` by comma
- Strips whitespace from each domain
- Checks if resource URL contains any excluded domain
- Case-insensitive matching

```python
def _contains_error(url: str, title: str, description: str) -> bool:
    """
    Check if resource contains error indicators.
    
    Args:
        url: Resource URL
        title: Resource title
        description: Resource description
        
    Returns:
        bool: True if error detected, False otherwise
    """
```

**Error Detection:**
- Checks for "ERROR" (case-insensitive) in url, title, or description
- Checks for "Failed to connect", "Could not fetch", "404", "Not found"
- Returns True if any error indicator found

### 2.4 Cache Component (`backend/cache.py`)

#### 2.4.1 Function Signatures

```python
def _compute_config_hash() -> str:
    """
    Compute a hash of agents.yaml and tasks.yaml files.
    
    Returns:
        str: SHA256 hash (first 16 characters)
    """
```

**Implementation Details:**
- Reads `src/scholar_source/config/agents.yaml` and `tasks.yaml`
- Computes SHA256 hash of both files concatenated
- Returns first 16 characters of hex digest
- Handles missing files gracefully (uses placeholder string)

```python
def _generate_cache_key(inputs: Dict[str, Any], config_hash: str) -> str:
    """
    Generate a cache key from inputs and config hash.
    
    Args:
        inputs: Course input parameters
        config_hash: Hash of config files
        
    Returns:
        str: Cache key string
    """
```

**Key Generation Logic:**
1. Build key parts list:
   - If `course_url`: `"course:{course_url}"`
   - If `book_url`: `"book_url:{book_url}"`
   - If `book_title` + `book_author`: `"book:{title}|{author}"`
   - If `isbn`: `"isbn:{isbn}"`
   - If `topics_list`: Sort topics, join: `"topics:{sorted_topics}"`
   - If `desired_resource_types`: Sort types, join: `"types:{sorted_types}"`
2. Join key parts with `|` separator
3. Compute SHA256 hash of joined string + config_hash
4. Return first 16 characters of hex digest

**Cache Key Format:**
- Analysis: `"analysis:{hash}"`
- Full: `"full:{hash}"`

```python
def get_cached_analysis(inputs: Dict[str, Any], cache_type: str = 'analysis') -> Optional[Dict[str, Any]]:
    """
    Retrieve cached course analysis or full results.
    
    Args:
        inputs: Course input parameters
        cache_type: 'analysis' or 'full'
        
    Returns:
        dict | None: Cached results or None if not found/expired
    """
```

**TTL Logic:**
- Analysis cache: 30 days (`COURSE_ANALYSIS_TTL_DAYS` env var, default 30)
- Full cache: 7 days (`RESOURCE_RESULTS_TTL_DAYS` env var, default 7)
- Checks `cached_at` timestamp against current time
- Returns None if expired or not found

```python
def set_cached_analysis(inputs: Dict[str, Any], results: Dict[str, Any], cache_type: str = 'analysis') -> None:
    """
    Store cached course analysis or full results.
    
    Args:
        inputs: Original input parameters
        results: Results to cache
        cache_type: 'analysis' or 'full'
    """
```

**Implementation Details:**
- Generates cache key using `_generate_cache_key()`
- Upserts into `course_cache` table
- Stores inputs, results, config_hash, cache_type, cached_at

### 2.5 Rate Limiter Component (`backend/rate_limiter.py`)

#### 2.5.1 Implementation Details

**Rate Limiter Initialization:**
```python
if REDIS_URL:
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=REDIS_URL,
        default_limits=["1000/hour"]
    )
else:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["1000/hour"]
    )
```

**Rate Limit Decorators:**
- `/api/submit`: `@limiter.limit("10/hour; 2/minute")`
- `/api/status/{job_id}`: `@limiter.limit("100/minute")`
- `/api/cancel/{job_id}`: `@limiter.limit("20/hour")`

**Error Handler:**
```python
def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors.
    
    Returns:
        JSONResponse with 429 status and retry_after header
    """
```

**Retry-After Calculation:**
- Extracts time window from limit string
- Default: 60 seconds
- If "minute" in limit: 60 seconds
- If "hour" in limit: 3600 seconds
- If "second" in limit: 1 second

---

## 3. Database Technical Design

### 3.1 Complete SQL Schema

#### 3.1.1 Jobs Table DDL

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    inputs JSONB NOT NULL,
    results JSONB,
    raw_output TEXT,
    error TEXT,
    status_message TEXT,
    search_title TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for jobs" ON jobs
    FOR ALL USING (true);
```

#### 3.1.2 Course Cache Table DDL

```sql
CREATE TABLE course_cache (
    cache_key TEXT PRIMARY KEY,
    config_hash TEXT NOT NULL,
    cache_type TEXT NOT NULL DEFAULT 'analysis',
    inputs JSONB NOT NULL,
    results JSONB NOT NULL,
    cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_course_cache_config_hash ON course_cache(config_hash);
CREATE INDEX idx_course_cache_cached_at ON course_cache(cached_at DESC);

ALTER TABLE course_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for course_cache" ON course_cache
    FOR ALL USING (true);
```

### 3.2 Data Validation Rules

#### 3.2.1 CourseInputRequest Validation

**Pydantic Model:**
```python
class CourseInputRequest(BaseModel):
    university_name: Optional[str] = None
    course_name: Optional[str] = None
    course_url: Optional[str] = None
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    isbn: Optional[str] = None
    book_pdf_path: Optional[str] = None
    book_url: Optional[str] = None
    topics_list: Optional[str] = None
    desired_resource_types: Optional[List[str]] = None
    excluded_sites: Optional[str] = None
    bypass_cache: Optional[bool] = False
```

**Validation Logic:**
1. **Empty String Conversion:**
   - `@model_validator(mode='before')` converts empty strings to None
   - Whitespace-only strings also converted to None

2. **At Least One Field Required:**
   - Custom validation in `validate_crew_inputs()` function
   - Checks for: course_url, course_name, university_name, book_title+author, isbn, book_pdf_path, book_url
   - Raises HTTPException 400 if none provided

3. **Email Field:**
   - Field exists in model but validation is disabled (commented out)
   - Currently not used in API

---

## 4. Frontend Technical Design

### 4.1 HomePage Component (`web/src/pages/HomePage.jsx`)

#### 4.1.1 State Management

```javascript
const [jobId, setJobId] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [results, setResults] = useState(null);
const [searchTitle, setSearchTitle] = useState(null);
const [textbookInfo, setTextbookInfo] = useState(null);
const [error, setError] = useState(null);
const [statusMessage, setStatusMessage] = useState(null);

const [searchParamType, setSearchParamType] = useState('');
const [formData, setFormData] = useState({
  course_url: '',
  book_url: '',
  book_title: '',
  book_author: '',
  isbn: '',
  topics_list: '',
  desired_resource_types: [],
  excluded_sites: '',
  bypass_cache: false
});
const [validationError, setValidationError] = useState('');
```

#### 4.1.2 Handler Functions

```javascript
const handleSubmit = async (e) => {
  // 1. Prevent default form submission
  // 2. Validate form data
  // 3. Call submitJob() API
  // 4. Set jobId and start polling
  // 5. Handle errors
};

const pollJobStatus = useCallback(async () => {
  // 1. Call getJobStatus(jobId) API
  // 2. Update status, results, error based on response
  // 3. Stop polling if completed/failed/cancelled
  // 4. Continue polling if pending/running
}, [jobId]);

const handleCancel = async () => {
  // 1. Call cancelJob(jobId) API
  // 2. Update job status to cancelled
  // 3. Stop polling
};
```

#### 4.1.3 Polling Implementation

```javascript
useEffect(() => {
  if (!jobId) return;
  
  const intervalId = setInterval(() => {
    pollJobStatus();
  }, 2000); // Poll every 2 seconds
  
  return () => clearInterval(intervalId);
}, [jobId, pollJobStatus]);
```

### 4.2 CourseForm Component (`web/src/components/CourseForm.jsx`)

#### 4.2.1 Form Fields

- Search type selector (dropdown): course_url, book_info, isbn, topics
- Course information: university_name, course_name, course_url
- Book information: book_title, book_author, isbn, book_url
- Resource type filters: checkboxes for textbooks, practice_problem_sets, etc.
- Focus topics: topics_list (textarea)
- Exclude sites: excluded_sites (textarea)
- Bypass cache: bypass_cache (checkbox)

#### 4.2.2 Validation Logic

- Form is valid if at least one required field is filled
- Required fields depend on selected search type
- Validation error displayed if form invalid
- Submit button disabled when form invalid

### 4.3 ResultsTable Component (`web/src/components/ResultsTable.jsx`)

#### 4.3.1 Features

**Filtering:**
- Filter by resource type (Textbook, PDF, Video, etc.)
- Dropdown selector for type filter
- "All" option shows all resources

**Sorting:**
- Sort by type (alphabetical)
- Sort by title (alphabetical)
- Default: by type, then by title

**Actions:**
- Copy URL to clipboard (navigator.clipboard.writeText)
- Open NotebookLM link (window.open with NotebookLM URL + resource URL)

#### 4.3.2 State Management

```javascript
const [filterType, setFilterType] = useState('all');
const [sortBy, setSortBy] = useState('type');
const [copiedUrl, setCopiedUrl] = useState(null);
```

---

## 5. CrewAI Technical Design

### 5.1 Agent Configuration

#### 5.1.1 Agent Definitions (`src/scholar_source/crew.py`)

**course_intelligence_agent:**
```python
@agent
def course_intelligence_agent(self) -> Agent:
    agent_config = self.agents_config['course_intelligence_agent']
    model = os.getenv('COURSE_INTELLIGENCE_AGENT_MODEL', agent_config.get('llm', 'openai/gpt-4o'))
    return Agent(
        config=agent_config,
        llm=model,
        verbose=True,
        tools=[
            WebPageFetcherTool(),
            WebsiteSearchTool()
        ]
    )
```

**resource_discovery_agent:**
```python
@agent
def resource_discovery_agent(self) -> Agent:
    agent_config = self.agents_config['resource_discovery_agent']
    model = os.getenv('RESOURCE_DISCOVERY_AGENT_MODEL', agent_config.get('llm', 'openai/gpt-4o-mini'))
    return Agent(
        config=agent_config,
        llm=model,
        verbose=True,
        tools=[SerperDevTool()]
    )
```

**resource_validator_agent:**
```python
@agent
def resource_validator_agent(self) -> Agent:
    agent_config = self.agents_config['resource_validator_agent']
    model = os.getenv('RESOURCE_VALIDATOR_AGENT_MODEL', agent_config.get('llm', 'openai/gpt-4o-mini'))
    return Agent(
        config=agent_config,
        llm=model,
        verbose=True,
        tools=[
            SerperDevTool(),
            WebsiteSearchTool(),
            YoutubeVideoSearchTool()
        ]
    )
```

**output_formatter_agent:**
```python
@agent
def output_formatter_agent(self) -> Agent:
    agent_config = self.agents_config['output_formatter_agent']
    model = os.getenv('OUTPUT_FORMATTER_AGENT_MODEL', agent_config.get('llm', 'openai/gpt-4o-mini'))
    return Agent(
        config=agent_config,
        llm=model,
        verbose=True
    )
```

### 5.2 Task Configuration

#### 5.2.1 Task Definitions

**course_analysis_task:**
- Extracts textbook info from course page
- Uses WebPageFetcherTool to fetch course content
- Outputs: course_title, topics_list, textbook_title, textbook_author

**resource_search_task:**
- Searches for 5-7 resources using SerperDevTool
- Outputs to `report.md` file

**resource_validation_task:**
- Validates resources using WebsiteSearchTool and YoutubeVideoSearchTool
- Filters out invalid/illegal resources

**final_output_task:**
- Formats final markdown output
- Outputs to `report.md` file

### 5.3 Crew Execution Flow

1. **Crew Creation:**
   ```python
   crew = ScholarSource().crew()
   ```

2. **Async Execution:**
   ```python
   result = await crew.kickoff_async(inputs=inputs)
   ```

3. **Output Access:**
   ```python
   markdown_output = result.raw
   ```

4. **File Output:**
   - Tasks with `output_file='report.md'` write to file
   - File created in project root directory

---

## 6. API Technical Design

### 6.1 Request/Response Schemas

#### 6.1.1 POST /api/submit

**Request Body:**
```json
{
  "course_url": "https://ocw.mit.edu/courses/...",
  "book_title": "Introduction to Algorithms",
  "book_author": "Cormen, Leiserson, Rivest, Stein",
  "desired_resource_types": ["textbooks", "practice_problem_sets"],
  "excluded_sites": "khanacademy.org",
  "bypass_cache": false
}
```

**Response (200 OK):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Job created successfully. Use job_id to poll for status."
}
```

**Error Responses:**
- **400 Bad Request:** Invalid inputs (at least one field required)
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Job creation failed

#### 6.1.2 GET /api/status/{job_id}

**Response (200 OK - Pending/Running):**
```json
{
  "job_id": "550e8400-...",
  "status": "running",
  "status_message": "Analyzing book structure...",
  "search_title": "MIT Introduction to Algorithms",
  "created_at": "2025-12-20T10:30:00Z"
}
```

**Response (200 OK - Completed):**
```json
{
  "job_id": "550e8400-...",
  "status": "completed",
  "results": [
    {
      "type": "PDF",
      "title": "MIT 6.006 Course Notes",
      "source": "MIT OpenCourseWare",
      "url": "https://...",
      "description": "..."
    }
  ],
  "raw_output": "# Study Resources...",
  "metadata": {
    "textbook_info": {
      "title": "Introduction to Algorithms",
      "author": "Cormen, Leiserson, Rivest, Stein"
    }
  },
  "created_at": "2025-12-20T10:30:00Z",
  "completed_at": "2025-12-20T10:33:45Z"
}
```

**Error Responses:**
- **404 Not Found:** Job ID doesn't exist
- **429 Too Many Requests:** Rate limit exceeded

#### 6.1.3 POST /api/cancel/{job_id}

**Response (200 OK):**
```json
{
  "job_id": "550e8400-...",
  "status": "cancelled",
  "message": "Job cancelled successfully."
}
```

**Error Responses:**
- **400 Bad Request:** Job already completed/failed/cancelled
- **404 Not Found:** Job ID doesn't exist
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Cancellation failed

### 6.2 Error Handling

**Error Response Format:**
```json
{
  "detail": {
    "error": "Error type",
    "message": "Human-readable error message"
  }
}
```

**HTTP Status Codes:**
- 200: Success
- 400: Bad Request (validation errors)
- 404: Not Found (job doesn't exist)
- 429: Too Many Requests (rate limit exceeded)
- 500: Internal Server Error (server errors)

---

## 7. Testing Technical Design

### 7.1 Test Structure

#### 7.1.1 Backend Test Structure

```
tests/
├── __init__.py
├── conftest.py                  # Shared fixtures
├── unit/
│   ├── __init__.py
│   ├── test_markdown_parser.py  # Markdown parsing tests
│   ├── test_models.py           # Pydantic model tests
│   ├── test_cache.py            # Cache tests
│   └── test_rate_limiter.py     # Rate limit tests
├── integration/
│   ├── __init__.py
│   ├── test_api_endpoints.py   # API endpoint tests
│   └── test_job_lifecycle.py   # Job workflow tests
└── e2e/
    └── __init__.py
```

#### 7.1.2 Frontend Test Structure

```
web/src/
├── components/
│   ├── ResultCard.test.jsx
│   ├── Hero.test.jsx
│   ├── StatusMessage.test.jsx
│   └── ConfirmDialog.test.jsx
├── api/
│   └── client.test.js
└── test/
    ├── setup.js
    └── mocks/
        ├── handlers.js          # MSW API handlers
        └── server.js            # MSW server setup
```

### 7.2 Test Tools and Configuration

#### 7.2.1 Backend Testing

**Tools:**
- pytest (test runner)
- pytest-asyncio (async test support)
- pytest-cov (coverage)
- pytest-mock (mocking)
- httpx (HTTP client for FastAPI)
- fakeredis (Redis mocking)

**Configuration (`pytest.ini`):**
```ini
[pytest]
testpaths = tests
addopts = -v --cov=backend --cov-report=html
asyncio_mode = auto
```

#### 7.2.2 Frontend Testing

**Tools:**
- Vitest (test runner)
- @testing-library/react (component testing)
- @testing-library/jest-dom (DOM matchers)
- MSW (Mock Service Worker for API mocking)
- jsdom (DOM environment)

**Configuration (`vitest.config.js`):**
```javascript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### 7.3 MSW Handlers (`web/src/test/mocks/handlers.js`)

**Mock Endpoints:**
- `GET /api/health` - Returns healthy status
- `POST /api/submit` - Returns job_id and pending status
- `GET /api/status/:jobId` - Returns job status (pending/running/completed)
- `POST /api/cancel/:jobId` - Returns cancellation confirmation

**Handler Examples:**
```javascript
http.post(`${API_URL}/api/submit`, async ({ request }) => {
  const body = await request.json();
  if (!body.course_url && !body.book_title) {
    return HttpResponse.json(
      { detail: { error: 'Invalid inputs' } },
      { status: 400 }
    );
  }
  return HttpResponse.json({
    job_id: 'mock-job-id-12345',
    status: 'pending'
  });
});
```

---

## 8. Caching Technical Design

### 8.1 Cache Key Generation Algorithm

**Inputs to Hash:**
1. course_url (if provided)
2. book_url (if provided)
3. book_title + book_author (if both provided)
4. isbn (if provided)
5. topics_list (sorted, comma-separated)
6. desired_resource_types (sorted, comma-separated)
7. config_hash (SHA256 of agents.yaml + tasks.yaml)

**Algorithm:**
```python
def _generate_cache_key(inputs, config_hash):
    key_parts = []
    
    if inputs.get('course_url'):
        key_parts.append(f"course:{inputs['course_url']}")
    if inputs.get('book_url'):
        key_parts.append(f"book_url:{inputs['book_url']}")
    if inputs.get('book_title') and inputs.get('book_author'):
        key_parts.append(f"book:{inputs['book_title']}|{inputs['book_author']}")
    if inputs.get('isbn'):
        key_parts.append(f"isbn:{inputs['isbn']}")
    if inputs.get('topics_list'):
        topics = sorted([t.strip() for t in inputs['topics_list'].split(',') if t.strip()])
        key_parts.append(f"topics:{','.join(topics)}")
    if inputs.get('desired_resource_types'):
        types = sorted(inputs['desired_resource_types'])
        key_parts.append(f"types:{','.join(types)}")
    
    key_string = '|'.join(key_parts) + '|' + config_hash
    hash_obj = hashlib.sha256(key_string.encode())
    hash_hex = hash_obj.hexdigest()[:16]
    
    return f"{cache_type}:{hash_hex}"
```

### 8.2 TTL Implementation

**TTL Values:**
- Analysis cache: 30 days (configurable via `COURSE_ANALYSIS_TTL_DAYS`)
- Full cache: 7 days (configurable via `RESOURCE_RESULTS_TTL_DAYS`)

**Expiration Check:**
```python
def is_cache_expired(cached_at, cache_type):
    ttl_days = COURSE_ANALYSIS_TTL_DAYS if cache_type == 'analysis' else RESOURCE_RESULTS_TTL_DAYS
    age = datetime.now(timezone.utc) - cached_at
    return age > timedelta(days=ttl_days)
```

### 8.3 Cache Invalidation

**Automatic Invalidation:**
- When `agents.yaml` or `tasks.yaml` changes, config_hash changes
- New cache keys generated, old cache entries become orphaned
- Old entries can be cleaned up manually or via scheduled job

**Manual Invalidation:**
- User sets `bypass_cache=true` in request
- Cache is checked but result is ignored
- Fresh crew execution always performed

---

## 9. References

### 9.1 Implementation Files

- `backend/main.py` - FastAPI application
- `backend/jobs.py` - Job management
- `backend/crew_runner.py` - Crew execution
- `backend/markdown_parser.py` - Markdown parsing
- `backend/cache.py` - Caching system
- `backend/models.py` - Pydantic models
- `backend/rate_limiter.py` - Rate limiting
- `web/src/pages/HomePage.jsx` - Main page component
- `web/src/components/CourseForm.jsx` - Form component
- `web/src/components/ResultsTable.jsx` - Results display
- `src/scholar_source/crew.py` - CrewAI crew definition

### 9.2 Configuration Files

- `src/scholar_source/config/agents.yaml` - Agent configurations
- `src/scholar_source/config/tasks.yaml` - Task configurations
- `pytest.ini` - Pytest configuration
- `web/vitest.config.js` - Vitest configuration
- `supabase_schema.sql` - Database schema

### 9.3 Related Documentation

- `docs/SYSTEM_DESIGN.md` - High-level system architecture
- `docs/TESTING_GUIDE.md` - Testing documentation
- `docs/CACHE_GUIDE.md` - Caching system guide

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Author:** ScholarSource Development Team

