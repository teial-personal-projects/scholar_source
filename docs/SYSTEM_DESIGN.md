# ScholarSource System Design Document

## 1. Introduction and Overview

### 1.1 Purpose
ScholarSource is a web application that helps students discover curated educational resources aligned with their course textbooks. The system was created to address a critical need: students often struggle to find reputable, high-quality resources to supplement their textbook learning and generate effective study materials.

**Problem Statement:**
Students need reliable, legally accessible educational resources that align with their specific textbooks to create quality study materials. However, finding such resources is time-consuming and challenging, as students must:
- Manually search across multiple platforms
- Verify resource quality and legality
- Ensure resources match their textbook's structure and topics
- Validate that resources are suitable for study material generation

**Solution:**
ScholarSource automates this process by:
1. **Analyzing textbook structure** - Extracts topics, concepts, and organization from course materials or book metadata
2. **Discovering aligned resources** - Searches for 5-7 high-quality, legally accessible resources that match the textbook's content structure
3. **Validating quality** - Ensures resources are free, legal, NotebookLM-compatible, and from reputable sources
4. **Enabling study material generation** - Provides resources ready to import into Google NotebookLM

**NotebookLM Integration:**
Using NotebookLM gives students a sanitized way to ensure their study materials are valid. NotebookLM:
- Processes the imported resources to extract key information
- Generates study guides, flashcards, and practice tests based on verified content
- Provides AI-powered summarization and question generation
- Ensures students work with legitimate, high-quality educational content rather than potentially unreliable sources

By combining ScholarSource's resource discovery with NotebookLM's study material generation, students can efficiently create comprehensive, validated study materials aligned with their course textbooks.

### 1.2 System Goals
- **Resource Discovery**: Automatically find educational resources aligned with textbook content
- **Quality Validation**: Ensure resources are free, legal, and NotebookLM-compatible
- **User Experience**: Provide fast, responsive interface with real-time job status updates
- **Scalability**: Support multiple concurrent job requests with rate limiting
- **Reliability**: Persist job state across server restarts

### 1.3 Key Features
- Multi-input form supporting course URLs, book metadata, ISBNs, and PDFs
- Background job processing with real-time status polling
- Intelligent caching to avoid redundant AI operations
- Rate limiting to prevent abuse
- Shareable results via job ID

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│  React + Vite Frontend (Cloudflare Pages)                  │
│  - HomePage component with form                             │
│  - Status polling (2-second intervals)                      │
│  - Results display with filtering                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   API LAYER                                 │
│  FastAPI Backend (Railway)                                  │
│  - REST endpoints (/api/submit, /api/status, /api/cancel)  │
│  - Rate limiting (slowapi)                                  │
│  - CORS middleware                                          │
│  - Request validation (Pydantic models)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐         ┌──────────▼──────────┐
│  JOB MANAGER   │         │   CREW RUNNER       │
│  (jobs.py)     │         │  (crew_runner.py)   │
│  - Create job  │         │  - Thread executor │
│  - Update job  │         │  - Async crew      │
│  - Get job     │         │  - Cache check     │
└───────┬────────┘         └──────────┬──────────┘
        │                             │
        │                             │
┌───────▼─────────────────────────────▼──────────┐
│              DATABASE LAYER                     │
│  Supabase PostgreSQL                             │
│  - jobs table (job state, results)              │
│  - course_cache table (analysis & results cache) │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              AI AGENT SYSTEM                                 │
│  CrewAI Multi-Agent Framework                                │
│  - course_intelligence_agent (GPT-4o)                       │
│  - resource_discovery_agent (GPT-4o-mini)                   │
│  - resource_validator_agent (GPT-4o-mini)                   │
│  - output_formatter_agent (GPT-4o)                           │
│                                                               │
│  External APIs:                                              │
│  - OpenAI API (GPT models)                                   │
│  - Serper API (web search)                                   │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Application Domains

#### 2.2.1 Frontend Domain (React/Vite)

The frontend is a single-page application built with React and Vite. It consists of:

- **Page Components**: HomePage (main container), ResultsPage (shareable results)
- **Form Components**: CourseForm (input form with validation)
- **Display Components**: ResultsTable (resource display with filtering), ResultCard (individual resource), LoadingStatus (status polling), StatusMessage (status display)
- **UI Components**: Reusable components (Button, TextInput, TextLabel, HelperText, OptionalBadge)
- **API Client**: HTTP client for backend communication

State management uses React hooks (`useState`, `useEffect`) with no global state management library.

#### 2.2.2 Backend Domain (FastAPI/Python)

The backend consists of several core modules:

- **`main.py`**: FastAPI application with API endpoints, CORS, and rate limiting
- **`models.py`**: Pydantic models for request/response validation
- **`jobs.py`**: Job management (create, retrieve, update jobs in database)
- **`crew_runner.py`**: CrewAI execution in background threads with cache integration
- **`markdown_parser.py`**: Parses crew markdown output to structured JSON
- **`cache.py`**: Caching system with config-based invalidation
- **`database.py`**: Supabase client initialization
- **`rate_limiter.py`**: Rate limiting with in-memory or Redis support
- **`logging_config.py`**: Centralized logging configuration

#### 2.2.3 CrewAI Domain (Multi-Agent System)

The system uses a sequential multi-agent workflow:

1. **course_intelligence_agent** (GPT-4o): Extracts textbook info and topics from course/book inputs
2. **resource_discovery_agent** (GPT-4o-mini): Searches for 5-7 aligned educational resources
3. **resource_validator_agent** (GPT-4o-mini): Validates resource quality, legality, and compatibility
4. **output_formatter_agent** (GPT-4o): Formats results into student-friendly markdown

Agents execute sequentially, with each agent receiving output from the previous agent. Final output is written to a markdown file.

#### 2.2.4 Database Domain (Supabase PostgreSQL)

Two main tables:

1. **`jobs` table**: Stores job state, inputs, results, and metadata. Tracks job lifecycle from pending → running → completed/failed.
2. **`course_cache` table**: Stores cached course analysis and full results with TTL-based expiration.

Both tables use Row Level Security (RLS) with permissive policies for MVP. See `docs/TECHNICAL_DESIGN.md` for detailed schema definitions.

#### 2.2.5 Caching Domain

The system implements a two-level caching strategy:

- **Analysis Cache** (30-day TTL): Caches course analysis (textbook extraction, topics)
- **Full Results Cache** (7-day TTL): Caches complete resource discovery results

Cache keys include input parameters and a config hash (agents.yaml + tasks.yaml) for automatic invalidation when configurations change. Cache is stored in the `course_cache` table in Supabase. See `docs/TECHNICAL_DESIGN.md` for detailed cache key generation and TTL logic.

---

## 3. Data Design

### 3.1 Dataset Overview

**Persisted Data:**
- Job records (jobs table)
- Cache entries (course_cache table)

**Static Data:**
- Agent configurations (`src/scholar_source/config/agents.yaml`)
- Task configurations (`src/scholar_source/config/tasks.yaml`)

**Transient Data:**
- Crew execution state (in-memory during execution)
- Rate limit counters (in-memory or Redis)

### 3.2 Database Design

#### 3.2.1 Jobs Table

The `jobs` table stores job state and results:

- **Primary Key**: `id` (UUID)
- **Status Field**: Tracks job state (pending, running, completed, failed, cancelled)
- **Inputs**: JSONB field storing original input parameters
- **Results**: JSONB field storing parsed resource list
- **Metadata**: JSONB field storing textbook info and other metadata
- **Timestamps**: `created_at`, `completed_at`

**Data Flow:**
1. Job created with `status='pending'`, `inputs` populated
2. Status updated to `status='running'` when crew starts
3. Status updated to `status='completed'` with `results`, `raw_output`, `metadata`
4. Or status updated to `status='failed'` with `error` message

#### 3.2.2 Course Cache Table

The `course_cache` table stores cached results:

- **Primary Key**: `cache_key` (TEXT)
- **Cache Type**: 'analysis' or 'full'
- **Config Hash**: Hash of agents.yaml + tasks.yaml for auto-invalidation
- **Results**: JSONB field storing cached results
- **TTL**: Managed via `cached_at` timestamp

See `docs/TECHNICAL_DESIGN.md` for complete SQL schema definitions.

### 3.3 Data Models

#### 3.3.1 CourseInputRequest

Request model for course input form submission. Supports multiple input types:
- Course information (university_name, course_name, course_url)
- Book information (book_title, book_author, isbn, book_url, book_pdf_path)
- Filtering options (topics_list, desired_resource_types, excluded_sites)
- Cache control (bypass_cache)

At least one field must be provided. Empty strings are converted to None.

#### 3.3.2 Resource Model

Represents a single educational resource:
- `type`: Resource type (Textbook, PDF, Video, etc.)
- `title`: Resource title
- `source`: Provider name (e.g., "MIT OpenCourseWare")
- `url`: Direct URL to resource
- `description`: Optional description

#### 3.3.3 JobStatusResponse

Response model for job status polling:
- `job_id`: Job identifier
- `status`: Current status (pending, running, completed, failed, cancelled)
- `results`: List of Resource objects (when completed)
- `raw_output`: Raw markdown from crew
- `metadata`: Additional metadata including textbook_info
- Timestamps: `created_at`, `completed_at`

---

## 4. Interface Design

### 4.1 REST API Endpoints

#### 4.1.1 POST /api/submit
Submit a new resource discovery job. Returns job_id for status polling.

**Rate Limit:** 10/hour; 2/minute

#### 4.1.2 GET /api/status/{job_id}
Get job status and results (for polling). Returns current status and results when completed.

**Rate Limit:** 100/minute

#### 4.1.3 POST /api/cancel/{job_id}
Cancel a running or pending job.

**Rate Limit:** 20/hour

#### 4.1.4 GET /api/health
Health check endpoint. Returns API status.

See `docs/TECHNICAL_DESIGN.md` for detailed request/response schemas and error codes.

### 4.2 Frontend-Backend Communication

**Protocol:** HTTPS/REST  
**Data Format:** JSON  
**Polling Strategy:** Frontend polls `/api/status/{job_id}` every 2 seconds  
**Error Handling:** HTTP status codes (400, 404, 429, 500) with JSON error details

### 4.3 External API Interfaces

**OpenAI API:**
- Models: GPT-4o, GPT-4o-mini
- Used by CrewAI agents for LLM inference
- Authentication via `OPENAI_API_KEY` environment variable

**Serper API:**
- Web search service
- Used by resource discovery and validation agents
- Authentication via `SERPER_API_KEY` environment variable

**Supabase API:**
- PostgreSQL database access
- Authentication via `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Client library: `supabase-py`

---

## 5. Component Design

### 5.1 Backend Components

#### 5.1.1 Job Management Component (`jobs.py`)
Manages job lifecycle in the database. Handles job creation, retrieval, and status updates.

#### 5.1.2 Crew Runner Component (`crew_runner.py`)
Executes CrewAI crew in background threads. Manages async task lifecycle, handles cancellation, and integrates with cache system.

#### 5.1.3 Markdown Parser Component (`markdown_parser.py`)
Parses crew markdown output to structured JSON. Extracts resources and textbook info, filters excluded domains, and detects error resources.

#### 5.1.4 Cache Component (`cache.py`)
Generates cache keys from inputs, computes config hash for invalidation, and retrieves/stores cached results with TTL checking.

### 5.2 Frontend Components

#### 5.2.1 HomePage Component
Main page container managing form state, job submission, status polling, and results display.

#### 5.2.2 CourseForm Component
Renders input form with validation and handles user input for all search parameters.

#### 5.2.3 ResultsTable Component
Displays resource results with filtering by type, sorting, and actions (copy URLs, open NotebookLM).

See `docs/TECHNICAL_DESIGN.md` for detailed function signatures, state management, and implementation flows.

---

## 6. User Interface Design

### 6.1 Layout Structure

**Desktop Layout:**
- Hero section at top
- Search form in compact card
- Collapsible sections (Resource Types, Focus Topics, Exclude Sites)
- Full-width results table below form

**Mobile Layout:**
- Stacked vertical layout
- Collapsible form sections
- Full-width result cards

### 6.2 User Flow

1. **Landing Page:** User sees hero section and form, selects search type, fills in relevant fields
2. **Form Submission:** User clicks "Find Resources", form validates, job submitted, job ID received
3. **Status Polling:** Frontend polls status every 2 seconds, displays status message and loading indicator
4. **Results Display:** When completed, results table appears with resources, filtering, and actions
5. **Error Handling:** Error messages displayed if job fails, user can retry or modify inputs

### 6.3 UI Components

**Form Components:** Text inputs with labels, select dropdowns, checkboxes for resource types, optional field badges

**Status Components:** Loading spinner, status message display, progress indicators

**Results Components:** Resource cards with badges, filter dropdown, copy button, NotebookLM button

---

## 7. Testing

### 7.1 Testing Strategy

**Backend Testing:**
- Unit tests for business logic (markdown parsing, cache, models)
- Integration tests for API endpoints
- Mock Supabase and CrewAI for isolation

**Frontend Testing:**
- Component tests with React Testing Library
- API client tests with MSW (Mock Service Worker)
- User interaction tests

**Test Coverage Goals:**
- Markdown Parser: 90%+
- API Endpoints: 85%+
- Models: 80%+
- UI Components: 70%+

See `docs/TESTING_GUIDE.md` and `docs/TECHNICAL_DESIGN.md` for detailed test structure and implementation.

---

## 8. Design Decisions and Alternatives

### 8.1 Background Job Execution

**Decision:** Use Python threading with async event loops instead of task queue (Celery, RQ)

**Rationale:**
- Simpler architecture for MVP
- No additional infrastructure (Redis, message broker)
- Sufficient for current scale
- Railway supports long-running processes

**Alternative Considered:**
- Celery with Redis: More scalable but adds complexity
- AWS SQS / Google Cloud Tasks: Overkill for current needs

**Trade-offs:**
- ✅ Simpler deployment
- ✅ Fewer moving parts
- ❌ Limited horizontal scaling (single instance)
- ❌ No distributed task execution

### 8.2 Database Choice

**Decision:** Supabase PostgreSQL (standalone, not Railway add-on)

**Rationale:**
- Free tier available
- Better tooling (dashboard, SQL editor)
- Built-in auth for future features
- Independent scaling from backend

**Alternative Considered:**
- Railway PostgreSQL: More expensive, less tooling
- SQLite: Not suitable for production
- MongoDB: Overkill, relational data fits better

### 8.3 Caching Strategy

**Decision:** Database-backed caching in Supabase (no Redis)

**Rationale:**
- No additional infrastructure
- Persistent across restarts
- Simple TTL logic
- Config-based invalidation

**Alternative Considered:**
- Redis: Faster but adds infrastructure
- In-memory: Lost on restart
- CDN caching: Not applicable for dynamic content

### 8.4 Rate Limiting

**Decision:** slowapi with in-memory (single instance) or Redis (multi-instance)

**Rationale:**
- Flexible: works with or without Redis
- Simple implementation
- Good enough for current scale

**Alternative Considered:**
- Nginx rate limiting: Requires reverse proxy
- Cloudflare rate limiting: Adds dependency

### 8.5 Frontend Framework

**Decision:** React + Vite (not Next.js, not Svelte)

**Rationale:**
- Fast development with Vite
- Simple SPA (no SSR needed)
- Good component ecosystem
- Easy deployment to Cloudflare Pages

**Alternative Considered:**
- Next.js: SSR not needed, adds complexity

---

## 9. Assumptions and Dependencies

### 9.1 Assumptions

1. **Single Instance Deployment:**
   - Assumes single Railway instance (not horizontally scaled)
   - Rate limiting uses in-memory storage
   - Background jobs run in same process

2. **Job Duration:**
   - Jobs complete within 2-5 minutes
   - No timeout handling needed
   - Railway doesn't kill long-running processes

3. **User Behavior:**
   - Users poll status every 2 seconds
   - Users don't submit duplicate requests rapidly
   - Rate limits are sufficient (10/hour, 2/minute)

4. **External APIs:**
   - OpenAI API is available and reliable
   - Serper API is available and reliable
   - API keys are valid and have sufficient quota

5. **Data Volume:**
   - Moderate number of concurrent jobs (< 10)
   - Cache size manageable (< 1GB)
   - Database size manageable (Supabase free tier sufficient)

### 9.2 Dependencies

**Runtime Dependencies:**
- Python 3.10-3.12
- Node.js 18+
- Supabase PostgreSQL database
- OpenAI API access
- Serper API access

**Library Dependencies:**
- FastAPI (web framework)
- CrewAI (multi-agent framework)
- Supabase-py (database client)
- Pydantic (validation)
- slowapi (rate limiting)
- React (frontend framework)
- Vite (build tool)

**Infrastructure Dependencies:**
- Railway (backend hosting)
- Cloudflare Pages (frontend hosting)
- Supabase (database hosting)

**External Service Dependencies:**
- OpenAI API (LLM inference)
- Serper API (web search)

---

## 10. Security

### 10.1 Authentication and Authorization

**Current State:**
- No user authentication (public access)
- Row Level Security (RLS) enabled but permissive policy
- API keys stored in environment variables

**Future Considerations:**
- Add user authentication (Supabase Auth)
- Restrict RLS policies to user-owned data
- API key rotation

### 10.2 Data Security

**API Keys:**
- Stored in environment variables (not in code)
- Never exposed to frontend
- Rotated periodically

**Database:**
- Supabase connection uses HTTPS
- RLS policies prevent unauthorized access
- Anon key used (read-only for public data)

**Input Validation:**
- Pydantic models validate all inputs
- SQL injection prevented by parameterized queries (Supabase client)
- XSS prevented by React's automatic escaping

### 10.3 Rate Limiting

**Protection:**
- 10 requests/hour, 2 requests/minute on `/api/submit`
- 100 requests/minute on `/api/status`
- 20 requests/hour on `/api/cancel`
- IP-based rate limiting

**Mitigation:**
- Prevents abuse and API cost overruns
- Protects against DDoS (basic level)

### 10.4 CORS

**Configuration:**
- Whitelist of allowed origins
- Credentials allowed
- Specific methods (GET, POST, OPTIONS)

**Security:**
- Prevents unauthorized frontend access
- Only Cloudflare Pages and localhost allowed

---

## 11. Glossary of Terms

**Agent:** An AI agent in the CrewAI framework that performs a specific task (e.g., resource discovery)

**Crew:** A collection of agents and tasks orchestrated by CrewAI

**Job:** A single resource discovery request with unique ID and status

**Cache Key:** A unique identifier for cached results, based on inputs and config hash

**Config Hash:** SHA256 hash of agents.yaml and tasks.yaml files, used for cache invalidation

**Rate Limiter:** Component that restricts API request frequency per IP address

**RLS (Row Level Security):** PostgreSQL feature that restricts data access at the row level

**TTL (Time To Live):** Duration before cached data expires

**CrewAI:** Multi-agent orchestration framework for AI workflows

**Serper API:** Web search API service used by agents

**Supabase:** Backend-as-a-Service platform providing PostgreSQL database

**NotebookLM:** Google's AI-powered note-taking tool that accepts URLs for content import

---

## 12. References

### 12.1 Project Documentation

- `README.md` - Project overview and setup instructions
- `docs/TECHNICAL_DESIGN.md` - Detailed technical implementation specifications
- `docs/TESTING_GUIDE.md` - Testing documentation
- `docs/TESTING_PLAN.md` - Testing implementation plan
- `docs/CACHE_GUIDE.md` - Caching system documentation
- `docs/RATE_LIMITING_IMPLEMENTATION.md` - Rate limiting details

### 12.2 External Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)

### 12.3 API References

- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Serper API Documentation](https://serper.dev/docs)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)

### 12.4 Database Schema

- `supabase_schema.sql` - Complete database schema definition

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Author:** ScholarSource Development Team
