# ScholarSource Implementation Roadmap

This document tracks the implementation plan for the ScholarSource web application.

---

## Phase 1: MVP Web Application (Current Implementation)

Full-stack web application with React/Vite frontend and FastAPI backend that integrates with the existing ScholarSource CrewAI implementation. The API handles long-running crew executions asynchronously with job status polling, and parses markdown output into structured JSON for display in a table.

### User Decisions
- **Frontend:** React + Vite (modern framework)
- **Async Strategy:** Background jobs with status polling
- **Output Format:** Parse markdown into structured table data
- **Storage:** Supabase (PostgreSQL) - Production-ready persistence
- **MVP Feature:** Save/share result links included

### Project Structure (After Implementation)

```
/Users/teial/Tutorials/AI/scholar_source/
├── backend/                      # NEW - FastAPI backend
│   ├── __init__.py
│   ├── main.py                   # FastAPI app entry point
│   ├── models.py                 # Pydantic models for requests/responses
│   ├── database.py               # Supabase client and DB operations
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
└── README.md                     # UPDATE - Add web app documentation
```

### Implementation Tasks

#### Part 0: Supabase Setup
- [ ] Create Supabase project
- [ ] Create jobs table in database
- [ ] Set up Row Level Security policies
- [ ] Get API credentials (URL and anon key)
- [ ] Add credentials to .env file

#### Part 1: Backend (FastAPI) Implementation
- [ ] Update pyproject.toml with FastAPI dependencies
- [ ] Create backend directory structure
- [ ] Implement backend/database.py (Supabase client)
- [ ] Implement backend/models.py (Pydantic models)
- [ ] Implement backend/jobs.py (job management with Supabase)
- [ ] Implement backend/crew_runner.py (CrewAI integration)
- [ ] Implement backend/markdown_parser.py (parse markdown to JSON)
- [ ] Implement backend/main.py (FastAPI app with 4 endpoints)
- [ ] Test backend API locally

#### Part 2: Frontend (React/Vite) Implementation
- [ ] Initialize React/Vite project
- [ ] Install react-router-dom dependency
- [ ] Implement web/src/api/client.js (API client)
- [ ] Implement web/src/components/CourseForm.jsx
- [ ] Implement web/src/components/LoadingStatus.jsx
- [ ] Implement web/src/components/ResultsTable.jsx
- [ ] Implement web/src/pages/HomePage.jsx
- [ ] Implement web/src/pages/ResultsPage.jsx (shareable results)
- [ ] Implement web/src/App.jsx (routing)
- [ ] Port CSS from mockup to web/src/styles/App.css
- [ ] Create web/.env.local configuration
- [ ] Create web/vite.config.js
- [ ] Test frontend locally

#### Part 3: Integration & Testing
- [ ] Test full workflow (form submission → job polling → results display)
- [ ] Test shareable results links
- [ ] Test error handling (network errors, invalid inputs, etc.)
- [ ] Test persistence (jobs survive server restarts)
- [ ] Validate CORS configuration
- [ ] Test copy and export buttons

#### Part 4: Documentation
- [ ] Update README.md with web app setup instructions
- [ ] Create backend/README.md (API documentation)
- [ ] Create web/README.md (frontend documentation)

#### Part 5: Deployment
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Cloudflare Pages
- [ ] Configure production environment variables
- [ ] Test production deployment
- [ ] Verify shareable links work in production

### Success Criteria
- [ ] Supabase database configured with jobs table
- [ ] Jobs persisted to Supabase (survive restarts)
- [ ] Backend API running on port 8000
- [ ] Frontend dev server running on port 5173
- [ ] Form accepts course inputs and validates at least one field
- [ ] API creates background job and returns job_id
- [ ] Frontend polls job status every 2 seconds
- [ ] Crew executes and generates resources
- [ ] Markdown parsed into structured JSON
- [ ] Results displayed in table matching mockup design
- [ ] Copy buttons functional
- [ ] Share Results button copies shareable URL
- [ ] Shareable link `/results/{job_id}` works
- [ ] Results page loads from shared link
- [ ] Shared links persist after server restart
- [ ] Export to NotebookLM button functional
- [ ] Error states handled gracefully

---

## Phase 2: Future Enhancements

Post-MVP features to enhance functionality, scalability, and user experience.

### Authentication & User Management
- [ ] User authentication (login/signup)
- [ ] User-specific job history
- [ ] Personal dashboard with past searches
- [ ] User profile management
- [ ] OAuth integration (Google, GitHub)

### Real-time Features
- [ ] WebSocket support for real-time progress updates
- [ ] Live progress streaming instead of polling
- [ ] Real-time notifications when job completes

### Advanced Features
- [ ] Job history page (view all past jobs)
- [ ] Advanced filtering and sorting of results
- [ ] Search within results
- [ ] Favorite/bookmark resources
- [ ] Custom tags for organizing searches
- [ ] Export results to multiple formats (CSV, JSON, PDF)
- [ ] Direct NotebookLM API integration (auto-import resources)

### Sharing & Collaboration
- [ ] Custom shareable URLs (e.g., `/results/mit-cs-algorithms` instead of UUID)
- [ ] Public vs private results (visibility control)
- [ ] Share results via email
- [ ] Embed results in other websites
- [ ] Social media sharing (Twitter, LinkedIn)

### Analytics & Monitoring
- [ ] Analytics dashboard (popular courses, completion rates)
- [ ] Job success/failure metrics
- [ ] Resource quality tracking
- [ ] User engagement metrics
- [ ] Error tracking and monitoring (Sentry, LogRocket)
- [ ] Performance monitoring (response times, uptime)

### Resource Management
- [ ] Job deletion/cleanup (automatic or manual)
- [ ] Archive old jobs (move to cold storage)
- [ ] Batch job operations (delete multiple, export multiple)
- [ ] Job expiration policies (auto-delete after 30/60/90 days)
- [ ] Resource deduplication
- [ ] Resource quality voting/feedback

### Performance & Scalability
- [ ] Caching of results (Redis)
- [ ] CDN for static assets
- [ ] Database query optimization
- [ ] Database backups and replication
- [ ] Load balancing for backend
- [ ] Horizontal scaling support
- [ ] Rate limiting and API quotas
- [ ] Request throttling for heavy users

### AI & Intelligence
- [ ] Model fine-tuning for better resource discovery
- [ ] A/B testing for agent prompts
- [ ] Personalized resource recommendations
- [ ] Smart suggestions based on user history
- [ ] Automatic quality scoring improvements
- [ ] Multi-language support for international textbooks

### Integration & Extensibility
- [ ] Export to other platforms (Anki, Quizlet, Notion)
- [ ] Browser extension for one-click search
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations
- [ ] Webhook support for external notifications
- [ ] Zapier/Make integration

### Communication
- [ ] Email notifications when job completes
- [ ] SMS notifications (Twilio)
- [ ] Push notifications
- [ ] Weekly digest emails (popular searches, new features)

### Content & Resources
- [ ] Support for more book formats (EPUB, MOBI)
- [ ] OCR for scanned PDFs
- [ ] Support for non-English textbooks
- [ ] Course syllabus parsing
- [ ] Automatic textbook ISBN detection from images

### DevOps & Infrastructure
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing (unit, integration, e2e)
- [ ] Staging environment
- [ ] Blue-green deployment
- [ ] Database migration tooling
- [ ] Infrastructure as code (Terraform)
- [ ] Monitoring dashboards (Grafana)

### Security & Compliance
- [ ] Enhanced Row Level Security (RLS) policies
- [ ] GDPR compliance tools (data export, deletion)
- [ ] Content Security Policy (CSP)
- [ ] API key rotation
- [ ] Audit logging
- [ ] Penetration testing
- [ ] Security headers implementation

---

## Technical Debt & Improvements

Ongoing improvements to code quality, maintainability, and developer experience.

- [ ] Refactor markdown parser for better accuracy
- [ ] Add TypeScript to frontend
- [ ] Add type hints to all Python code
- [ ] Improve error messages and user feedback
- [ ] Add logging throughout backend
- [ ] Create comprehensive test suite
- [ ] Document API with OpenAPI/Swagger
- [ ] Add code comments and docstrings
- [ ] Set up pre-commit hooks (linting, formatting)
- [ ] Standardize code formatting (Black, Prettier)

---

## Notes

- Phase 1 is the current focus and must be completed before Phase 2
- Phase 2 items are unordered and can be prioritized based on user feedback
- Check off items with `[x]` as they are completed
- Add new items as needed with a new checkbox `[ ]`
