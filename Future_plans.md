# Plan: Build Web Frontend (React/Vite) and FastAPI Backend for Study Resource Finder

## Overview
Create a full-stack web application with a React/Vite frontend and FastAPI backend that integrates with the existing ScholarSource CrewAI implementation. The API will handle long-running crew executions asynchronously with job status polling, and parse markdown output into structured JSON for display in a table.

## User Decisions
- **Frontend:** React + Vite (modern framework)
- **Async Strategy:** Background jobs with status polling
- **Output Format:** Parse markdown into structured table data
- **Storage:** Supabase (PostgreSQL) - Production-ready persistence ⭐ UPDATED
- **MVP Feature:** Save/share result links included

## Project Structure (After Implementation)

```
/Users/teial/Tutorials/AI/scholar_source/
├── backend/                      # NEW - FastAPI backend
│   ├── __init__.py
│   ├── main.py                   # FastAPI app entry point
│   ├── models.py                 # Pydantic models for requests/responses
│   ├── database.py               # ⭐ NEW - Supabase client and DB operations
│   ├── jobs.py                   # Background job management (uses Supabase)
│   ├── crew_runner.py            # Wrapper for ScholarSource crew
│   └── markdown_parser.py        # Parse crew output to structured JSON
│
├── web/                          # NEW - React/Vite frontend
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── App.jsx               # Main app component
│   │   ├── main.jsx              # Entry point
│   │   ├── components/
│   │   │   ├── CourseForm.jsx    # Form component
│   │   │   ├── ResultsTable.jsx  # Results display
│   │   │   └── LoadingStatus.jsx # Job status polling UI
│   │   ├── api/
│   │   │   └── client.js         # API client functions
│   │   └── styles/
│   │       └── App.css           # Styles (from mockup)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.local                # API URL configuration
│
├── src/scholar_source/           # EXISTING - CrewAI implementation
│   ├── crew.py                   # No changes needed
│   ├── main.py                   # CLI still works independently
│   └── config/                   # No changes needed
│
├── pyproject.toml                # UPDATE - Add FastAPI dependencies
└── README.md                     # UPDATE - Add web app instructions
```

## Implementation Plan

---

## Part 0: Supabase Setup ⭐ NEW (Do This First!)

### 0.1 Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `scholar-source` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project" (takes ~2 minutes)

### 0.2 Create Database Table

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste and run the following SQL:

```sql
-- Jobs table to store job status and results
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
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

-- Indexes for faster lookups
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (public access for MVP)
CREATE POLICY "Enable all access for jobs" ON jobs
    FOR ALL USING (true);
```

4. Click "Run" to execute

### 0.3 Get API Credentials

1. In Supabase Dashboard, go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### 0.4 Update .env File

Add Supabase credentials to your `.env` file:

```bash
# Existing API keys
OPENAI_API_KEY=your_openai_key_here
SERPER_API_KEY=your_serper_key_here

# NEW - Supabase credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGc...your_anon_key_here
```

**✅ Supabase Setup Complete!** Now proceed to backend implementation.

---

## Part 1: Backend (FastAPI) Implementation

### 1.1 Update Dependencies in pyproject.toml

**File:** [pyproject.toml](pyproject.toml)

**Add to dependencies:**
```toml
dependencies = [
    "crewai[tools]>=0.120.1,<1.0.0",
    "lancedb<0.26",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "python-multipart>=0.0.9",
    "pydantic>=2.0.0",
    "supabase>=2.0.0",  # ⭐ NEW - Supabase Python client
    "python-dotenv>=1.0.0",  # ⭐ NEW - Environment variable management
]
```

### 1.2 Create Backend Directory Structure

**New files to create:**
- `backend/__init__.py` - Package marker
- `backend/main.py` - FastAPI application
- `backend/models.py` - Pydantic request/response models
- `backend/database.py` ⭐ NEW - Supabase client and DB operations
- `backend/jobs.py` - Background job management (uses Supabase)
- `backend/crew_runner.py` - CrewAI integration wrapper
- `backend/markdown_parser.py` - Parse markdown to JSON
- `.env` - Environment variables (SUPABASE_URL, SUPABASE_KEY)

### 1.3 Supabase Database Schema ⭐ NEW

**Create table in Supabase Dashboard:**

```sql
-- Jobs table to store job status and results
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
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

-- Indexes for faster lookups
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Enable Row Level Security (optional, for production)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (can be restricted later)
CREATE POLICY "Enable all access for jobs" ON jobs
    FOR ALL USING (true);
```

**Environment Variables (.env):**
```bash
# Existing
OPENAI_API_KEY=your_openai_key
SERPER_API_KEY=your_serper_key

# NEW - Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_or_service_role_key
```

### 1.4 Implement Backend Components

#### **backend/database.py** ⭐ NEW

**Purpose:** Supabase client initialization and database operations

**Implementation:**
```python
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment")

supabase: Client = create_client(supabase_url, supabase_key)

def get_supabase_client() -> Client:
    """Get the Supabase client instance."""
    return supabase
```

#### **backend/models.py**

**Purpose:** Define Pydantic models for API requests and responses

**Models needed:**
```python
class CourseInputRequest(BaseModel):
    university_name: str | None = None
    subject: str | None = None
    course_number: str | None = None
    course_url: str | None = None
    course_name: str | None = None
    textbook: str | None = None
    syllabus: str | None = None
    topics_list: str | None = None
    additional_info: str | None = None

class JobSubmitResponse(BaseModel):
    job_id: str
    status: str  # "pending"
    message: str

class Resource(BaseModel):
    type: str  # "PDF", "Video", "Course", etc.
    title: str
    source: str
    url: str
    description: str | None = None

class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "pending", "running", "completed", "failed"
    status_message: str | None = None  # Current progress/status message
    search_title: str | None = None  # User-friendly job name
    results: List[Resource] | None = None
    raw_output: str | None = None
    error: str | None = None
    metadata: dict | None = None  # Additional flexible data
    created_at: str
    completed_at: str | None = None
```

#### **backend/jobs.py**

**Purpose:** Manage background jobs using Supabase ⭐ UPDATED

**Features:**
- Store jobs in Supabase PostgreSQL database
- Job states: pending → running → completed/failed
- UUIDs generated by database
- Persistent storage (survives server restarts)
- No need for thread locks (database handles concurrency)

**Key functions:**
```python
from database import get_supabase_client
import uuid
from datetime import datetime

def create_job(inputs: dict) -> str:
    """
    Create new job in Supabase, return job_id.

    Returns:
        str: UUID of created job
    """
    supabase = get_supabase_client()

    job_data = {
        "status": "pending",
        "inputs": inputs,
        "created_at": datetime.utcnow().isoformat()
    }

    response = supabase.table("jobs").insert(job_data).execute()
    return response.data[0]["id"]

def get_job(job_id: str) -> dict | None:
    """
    Get job status and results from Supabase.

    Returns:
        dict | None: Job data or None if not found
    """
    supabase = get_supabase_client()

    response = supabase.table("jobs").select("*").eq("id", job_id).execute()

    if not response.data:
        return None

    return response.data[0]

def update_job_status(job_id: str, status: str, **kwargs):
    """
    Update job status and other fields in Supabase.

    Args:
        job_id: UUID of job
        status: New status (pending, running, completed, failed)
        **kwargs: Additional fields (results, error, status_message, raw_output, search_title, metadata)
    """
    supabase = get_supabase_client()

    update_data = {"status": status}

    if status in ["completed", "failed"]:
        update_data["completed_at"] = datetime.utcnow().isoformat()

    # Add optional fields
    for key in ["results", "error", "status_message", "raw_output", "search_title", "metadata"]:
        if key in kwargs:
            update_data[key] = kwargs[key]

    supabase.table("jobs").update(update_data).eq("id", job_id).execute()
```

#### **backend/crew_runner.py**

**Purpose:** Run ScholarSource crew in background thread

**Approach:**
- Import `ScholarSource` from `src.scholar_source.crew`
- Run `crew.kickoff(inputs=inputs)` in background thread
- Capture output (raw text and file content)
- Handle errors and timeouts
- Update job status via `jobs.py`

**Key function:**
```python
def run_crew_async(job_id: str, inputs: dict):
    """
    Run crew in background thread.
    Updates job status throughout execution.
    """
    # Set status to "running"
    # Instantiate ScholarSource
    # Call kickoff(inputs)
    # Capture output
    # Read report.md file
    # Parse markdown to structured data
    # Update job with results
    # Handle errors
```

#### **backend/markdown_parser.py**

**Purpose:** Parse crew's markdown output into structured JSON

**Input:** Markdown content from `report.md`

**Output:** List of Resource objects with fields:
- `type` - Extracted from context (PDF, Video, Course, Website, etc.)
- `title` - Resource name
- `source` - Where it's from (e.g., "MIT OpenCourseWare")
- `url` - Link to resource
- `description` - Brief description (optional)

**Approach:**
- Use regex or markdown parser to find resource sections
- Extract links with `[title](url)` pattern
- Infer type from context clues (keywords like "video", "course", "pdf")
- Handle various markdown formats gracefully
- Return structured list of resources

**Key function:**
```python
def parse_markdown_to_resources(markdown_content: str) -> List[Resource]:
    """Parse markdown report into structured resources"""
```

#### **backend/main.py**

**Purpose:** FastAPI application with endpoints

**Endpoints:**

1. **POST /api/submit**
   - Accept course inputs (CourseInputRequest)
   - Validate at least one input provided
   - Create job in background
   - Start crew execution thread
   - Return job_id and status

2. **GET /api/status/{job_id}**
   - Return job status and results
   - Return structured resources if completed
   - Return error if failed

3. **GET /api/results/{job_id}** ⭐ NEW - Shareable Results
   - Return completed job results (for sharing)
   - Return 404 if job doesn't exist or isn't completed
   - Return structured resources and metadata
   - Used for shareable links

4. **GET /api/health**
   - Health check endpoint
   - Return API status

**CORS Configuration:**
- Allow frontend origin (http://localhost:5173 for Vite dev)
- Allow credentials
- Allow common headers

**Key features:**
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import threading

app = FastAPI(title="Study Resource Finder API")

# CORS middleware for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/submit", response_model=JobSubmitResponse)
async def submit_job(inputs: CourseInputRequest):
    # Validate inputs
    # Create job
    # Start background thread
    # Return job_id

@app.get("/api/status/{job_id}", response_model=JobStatusResponse)
async def get_status(job_id: str):
    # Get job from jobs_db
    # Return status and results

@app.get("/api/results/{job_id}", response_model=JobStatusResponse)
async def get_results(job_id: str):
    # Get job from jobs_db
    # Return 404 if not found or not completed
    # Return results for sharing

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
```

**Run command:**
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Part 2: Frontend (React/Vite) Implementation

### 2.1 Initialize React/Vite Project

**Commands:**
```bash
cd /Users/teial/Tutorials/AI/scholar_source
npm create vite@latest web -- --template react
cd web
npm install
```

### 2.2 Project Structure

**web/src/** components:
- `main.jsx` - Entry point (Vite default)
- `App.jsx` - Main application component with routing
- `pages/HomePage.jsx` - Main form page
- `pages/ResultsPage.jsx` ⭐ NEW - Shareable results page
- `components/CourseForm.jsx` - Form for course inputs
- `components/ResultsTable.jsx` - Display resources in table
- `components/LoadingStatus.jsx` - Poll job status, show progress
- `api/client.js` - API client functions
- `styles/App.css` - Styles from mockup HTML

**Additional dependency:**
- `react-router-dom` - For routing between home and results pages

### 2.3 Implement Frontend Components

#### **web/src/api/client.js**

**Purpose:** API client functions

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function submitJob(inputs) {
  const response = await fetch(`${API_BASE_URL}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });
  if (!response.ok) throw new Error('Failed to submit job');
  return response.json();
}

export async function getJobStatus(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);
  if (!response.ok) throw new Error('Failed to get job status');
  return response.json();
}

export async function getResults(jobId) {
  const response = await fetch(`${API_BASE_URL}/api/results/${jobId}`);
  if (!response.ok) throw new Error('Results not found');
  return response.json();
}
```

#### **web/src/components/CourseForm.jsx**

**Purpose:** Form matching the mockup design

**Features:**
- Form fields for all 9 inputs (university_name, subject, etc.)
- Mark optional fields with "(optional)" label
- Client-side validation (at least one field required)
- Submit handler that calls API
- Disable form during submission
- Pass job_id to parent on successful submission

**Props:**
```jsx
function CourseForm({ onJobSubmitted }) {
  const [formData, setFormData] = useState({
    university_name: '',
    subject: '',
    // ... other fields
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate at least one field
    // Call submitJob API
    // Pass job_id to parent via onJobSubmitted(jobId)
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields matching mockup */}
    </form>
  );
}
```

#### **web/src/components/LoadingStatus.jsx**

**Purpose:** Poll job status and show progress

**Features:**
- Poll `/api/status/{jobId}` every 2 seconds
- Show current status (pending, running, completed, failed)
- Display progress messages from crew
- Stop polling when job completes or fails
- Pass results to parent when completed

**Props:**
```jsx
function LoadingStatus({ jobId, onComplete, onError }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await getJobStatus(jobId);
      if (status.status === 'completed') {
        onComplete(status.results, status.raw_output);
        clearInterval(interval);
      } else if (status.status === 'failed') {
        onError(status.error);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="loading-status">
      {/* Loading spinner and status messages */}
    </div>
  );
}
```

#### **web/src/components/ResultsTable.jsx**

**Purpose:** Display resources in table format (matching mockup)

**Features:**
- Table with columns: Type, Title, Source, Link, Actions
- Type badges with colors (PDF=blue, Video=pink, Course=green)
- "Copy" button for each resource
- **"Share Results" button** ⭐ NEW - Copies shareable URL to clipboard
- "Export to NotebookLM" button (initially just copies all URLs)
- Tip box at bottom

**Props:**
```jsx
function ResultsTable({ resources, jobId }) {
  const getBadgeClass = (type) => {
    // Return CSS class based on type
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const shareResults = () => {
    const shareUrl = `${window.location.origin}/results/${jobId}`;
    copyToClipboard(shareUrl);
    // Show "Link copied!" notification
  };

  return (
    <div className="results-section">
      <div className="results-header">
        <h2>📖 Recommended Resources</h2>
        <div className="action-buttons">
          <button onClick={shareResults} className="share-btn">
            🔗 Share Results
          </button>
          <button onClick={exportToNotebookLM} className="export-btn">
            Export to NotebookLM
          </button>
        </div>
      </div>
      <table>
        {/* Render resources */}
      </table>
      <div className="tip-box">
        💡 Tip: Import these resources into Google NotebookLM...
      </div>
    </div>
  );
}
```

#### **web/src/pages/HomePage.jsx**

**Purpose:** Main form page - orchestrates UI flow

**State management:**
```jsx
function HomePage() {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleJobSubmitted = (newJobId) => {
    setJobId(newJobId);
    setIsLoading(true);
  };

  const handleComplete = (resources, rawOutput) => {
    setResults(resources);
    setIsLoading(false);
    // Optionally navigate to shareable results page
    // navigate(`/results/${jobId}`);
  };

  const handleError = (errorMsg) => {
    setError(errorMsg);
    setIsLoading(false);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📚 Study Resource Finder</h1>
        <p>Discover curated study materials for your courses</p>
      </header>

      <div className="main-card">
        <CourseForm onJobSubmitted={handleJobSubmitted} />

        {isLoading && (
          <LoadingStatus
            jobId={jobId}
            onComplete={handleComplete}
            onError={handleError}
          />
        )}

        {results && <ResultsTable resources={results} jobId={jobId} />}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
```

#### **web/src/pages/ResultsPage.jsx** ⭐ NEW

**Purpose:** Shareable results page - loads results from URL parameter

**Features:**
- Parse job_id from URL: `/results/:jobId`
- Fetch results from `/api/results/{jobId}` on mount
- Display loading state while fetching
- Show results in ResultsTable component
- Show 404 if job not found
- Link back to home page

**Implementation:**
```jsx
function ResultsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadResults() {
      try {
        const data = await getResults(jobId);
        setResults(data.results);
      } catch (err) {
        setError('Results not found or job not completed');
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [jobId]);

  if (loading) return <div>Loading results...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <header className="header">
        <h1>📚 Study Resource Finder</h1>
        <p>Shared Results</p>
        <button onClick={() => navigate('/')}>← Create New Search</button>
      </header>

      <div className="main-card">
        <ResultsTable resources={results} jobId={jobId} />
      </div>
    </div>
  );
}
```

#### **web/src/App.jsx**

**Purpose:** Main app with routing

**Implementation:**
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results/:jobId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### **web/src/styles/App.css**

**Purpose:** Port CSS from mockup HTML

**Approach:**
- Copy all styles from `/Users/teial/Downloads/study-resource-finder-mockup.html`
- Adapt to React component structure
- Keep gradient background, card design, form styling, table styling

### 2.4 Configuration Files

#### **web/.env.local**

```bash
VITE_API_URL=http://localhost:8000
```

#### **web/vite.config.js**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

---

## Part 3: Integration & Testing

### 3.1 Testing Workflow

**Start Backend:**
```bash
# From project root
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Start Frontend:**
```bash
# From web/ directory
npm run dev
```

**Test Flow:**
1. Open http://localhost:5173
2. Fill form with course information
3. Submit form
4. Watch loading status poll API
5. View results in table when complete
6. Test copy buttons
7. Test export functionality

### 3.2 Validation Tests

**Backend:**
- POST /api/submit with no inputs → should return 400 error
- POST /api/submit with valid inputs → should return job_id
- GET /api/status/{job_id} during execution → should show "running"
- GET /api/status/{job_id} after completion → should return resources
- GET /api/status/{invalid_id} → should return 404

**Frontend:**
- Submit form with no inputs → should show validation error
- Submit form with one input → should start job
- Loading status should poll every 2 seconds
- Results table should display parsed resources
- Copy buttons should work
- Export button should copy all URLs

---

## Part 4: Documentation Updates

### 4.1 Update README.md

**Add sections:**
- **Web Application Setup** - How to run frontend and backend
- **API Documentation** - Endpoint descriptions
- **Development Workflow** - Running both servers locally
- **Environment Variables** - Required API keys and configuration

### 4.2 Create backend/README.md

**Document:**
- API endpoints with examples
- Request/response schemas
- Job lifecycle (pending → running → completed/failed)
- How to extend with new parsers or features

### 4.3 Create web/README.md

**Document:**
- How to run dev server
- Build for production
- Environment variables
- Component structure
- Styling approach

---

## Critical Files to Create/Modify

### New Files (Backend)
1. `backend/__init__.py`
2. `backend/main.py` - FastAPI app with 4 endpoints
3. `backend/models.py` - Pydantic models
4. `backend/database.py` ⭐ NEW - Supabase client initialization
5. `backend/jobs.py` - Supabase job management (CRUD operations)
6. `backend/crew_runner.py` - CrewAI integration
7. `backend/markdown_parser.py` - Parse markdown to JSON

### New Files (Frontend)
1. `web/src/App.jsx` - Main component with routing
2. `web/src/pages/HomePage.jsx` - Main form page
3. `web/src/pages/ResultsPage.jsx` ⭐ NEW - Shareable results page
4. `web/src/components/CourseForm.jsx` - Form component
5. `web/src/components/LoadingStatus.jsx` - Status polling
6. `web/src/components/ResultsTable.jsx` - Results display with share button
7. `web/src/api/client.js` - API client with getResults()
8. `web/src/styles/App.css` - Styles from mockup
9. `web/.env.local` - Configuration
10. `web/vite.config.js` - Vite config

### Modified Files
1. `pyproject.toml` - Add FastAPI dependencies
2. `README.md` - Add web app documentation

---

## Technical Considerations

### Job Management ⭐ UPDATED
- Jobs stored in Supabase PostgreSQL database
- **Persistent storage** - Jobs survive server restarts
- **Production-ready** - Scalable and reliable
- UUID-based job IDs generated by database
- Automatic timestamps (created_at, completed_at)
- **Shareable links persist forever** (or until manually deleted)

### Crew Execution
- Runs in background thread via `threading.Thread`
- Long execution times (potentially 1-5 minutes)
- Captures stdout/stderr for progress updates
- Reads `report.md` file after completion

### Markdown Parsing Challenges
- Crew output format may vary
- Need robust regex/parsing logic
- Fallback to raw markdown if parsing fails
- May need to adjust based on actual crew output

### CORS & Security
- Development: Allow localhost origins
- Production: Restrict to actual domain
- **Supabase RLS (Row Level Security)** - Can be enabled for multi-tenancy
- No user authentication in MVP (public job access)
- Supabase API key secured via environment variables

### Error Handling
- Network errors in frontend
- Crew execution failures
- Parsing failures
- Invalid inputs
- Missing API keys (OpenAI, Serper, Supabase)
- Database connection errors
- Invalid job IDs (404 errors)

---

## Success Criteria

✅ **Supabase database configured with jobs table** ⭐ NEW
✅ **Jobs persisted to Supabase (survive restarts)** ⭐ NEW
✅ Backend API running on port 8000
✅ Frontend dev server running on port 5173
✅ Form accepts course inputs and validates at least one field
✅ API creates background job and returns job_id
✅ Frontend polls job status every 2 seconds
✅ Crew executes and generates resources
✅ Markdown parsed into structured JSON
✅ Results displayed in table matching mockup design
✅ Copy buttons functional
✅ **Share Results button copies shareable URL**
✅ **Shareable link `/results/{job_id}` works**
✅ **Results page loads from shared link**
✅ **Shared links persist after server restart** ⭐ NEW
✅ Export to NotebookLM button functional
✅ Error states handled gracefully

---

## Future Enhancements (Out of Scope)

- User authentication (login, user-specific job history)
- Job history page (view all past jobs)
- Real-time progress via WebSockets
- Advanced filtering/sorting of results
- Job deletion/cleanup (automatic or manual)
- Deploy to production (Docker, Vercel, Railway, etc.)
- Rate limiting and API quotas
- Caching of results (Redis)
- Custom URLs for shared links (e.g., `/results/mit-cs-6034` instead of UUID)
- Analytics (job completion rates, popular courses)
- Email notifications when job completes
