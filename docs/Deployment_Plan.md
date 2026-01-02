# ScholarSource Deployment Plan

This document provides step-by-step instructions for deploying ScholarSource to production.

---

## 📋 Deployment Overview

**Architecture:**
- **Frontend**: React/Vite app on Cloudflare Pages (Free)
- **Backend**: FastAPI on Railway ($5/month)
- **Database**: Supabase PostgreSQL (Free tier / $25/month Pro)

**Total Monthly Cost:** $5-$30/month depending on usage

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure you have:

- [✅] Git repository with all code committed
- [✅] OpenAI API key with Tier 2+ rate limits (450k TPM)
- [✅] Serper API key for web search
- [✅] Supabase account created
- [✅] Railway account created (free to sign up)
- [✅] Cloudflare account created (free to sign up)
- [✅] Domain name (optional, but recommended for production)

---

## Part 1: Database Setup (Supabase)

### [✅] 1.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `scholar-source-prod`
   - **Database Password**: Generate strong password (save in password manager!)
   - **Region**: Choose closest to your users (e.g., US East, EU West)
4. Click **"Create new project"** (takes ~2 minutes)

### [✅] 1.2 Create Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Paste the following SQL:

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
-- TODO: Restrict this in Phase 2 when adding user authentication
CREATE POLICY "Enable all access for jobs" ON jobs
    FOR ALL USING (true);
```

4. Click **"Run"** to execute

### [✅] 1.3 Get Supabase Credentials

1. In Supabase Dashboard, go to **Project Settings** → **API**
2. Copy and save these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

**Status:** ✅ Database configured and ready

---

## Part 2: Backend Deployment (Railway)

### 2.1 Prepare Backend for Deployment

1. [✅] **Create `Procfile` :**

```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

2. **Update `pyproject.toml` to ensure all dependencies are listed:**

```toml
[project]
name = "scholar-source"
version = "0.1.0"
requires-python = ">=3.10,<3.13"

dependencies = [
    "crewai[tools]>=0.120.1,<1.0.0",
    "lancedb<0.26",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "python-multipart>=0.0.9",
    "pydantic>=2.0.0",
    "supabase>=2.0.0",
    "python-dotenv>=1.0.0",
]
```
3. **Update `requirements.txt` for railway:**
Railway needed a requirements.txt so you have to run
```uv pip compile pyproject.toml -o requirements.txt```

4. **Update CORS origins in `backend/main.py`:**

```python
# Update to include your production frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Development
        "https://https://scholar-source.pages.dev/",  # Cloudflare Pages (temp URL)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### [✅] 2.2 Deploy to Railway

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your `scholar_source` repository
6. Railway will auto-detect Python and start building

### 2.3 Create Redis Database (Required for Scaling)

1. *[✅] *Sign up for Redis Cloud** (if not already done):
   - Go to https://redis.com/try-free/
   - Create account and verify email
   - Select "Fixed plan" → "Free" (30MB, perfect for getting started)

2. [✅] **Create Redis Database:**
   - Click "New database"
   - Name: `scholarsource-queue`
   - Region: Choose closest to your Railway deployment region
   - Click "Activate"

3. [✅] **Get Redis Connection URL:**
   - Go to database configuration
   - Copy the "Public endpoint" connection string
   - Format: `redis://default:PASSWORD@HOST:PORT`
   - **Save this URL** - you'll need it for Railway environment variables

###  [✅] 2.4 Configure Environment Variables

1. In Railway dashboard, click on your deployed service
2. Go to **"Variables"** tab
3. Add the following environment variables:

```bash
# API Keys
OPENAI_API_KEY=sk-proj-...your_key_here
SERPER_API_KEY=...your_serper_key_here

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your_anon_key_here

# Redis (Required for task queue and rate limiting)
REDIS_URL=redis://default:PASSWORD@HOST:PORT
```

4. Click **"Deploy"** to restart with new variables

### [✅] 2.5 Enable Worker Process

Railway will automatically detect the `Procfile` and start both `web` and `worker` processes.

**Verify both processes are running:**

1. Go to "Deployments" tab
2. Click on latest deployment
3. You should see logs from both:
   - `web` process: Uvicorn startup messages
   - `worker` process: Celery worker startup messages

**Expected worker logs:**
```
celery@... v5.3.x (...)
[config]
.> app:         scholar_source:0x...
.> transport:   redis://...
.> results:     redis://...
.> concurrency: 2 (prefork)

[queues]
.> crew_jobs        exchange=crew(direct) key=crew.jobs
.> default          exchange=default(direct) key=default

[tasks]
  . backend.tasks.run_crew_task

celery@... ready.
```

### [✅] 2.6 Configure Railway Service

1. [✅] **Set up custom domain (optional):**
   - Go to **"Settings"** → **"Domains"**
   - Add custom domain (e.g., `api.yourdomain.com`)
   - Update your DNS records as instructed

2. [✅] **Configure health checks:**
   - Go to **"Settings"** → **"Health Checks"**
   - Set health check path: `/api/health`
   - Set timeout: 30 seconds

3. [✅] **Enable always-on service:**
   - Go to **"Settings"** → **"Service"**
   - Ensure service is on **"Always On"** plan ($5/month)
   - This prevents cold starts and ensures 24/7 availability

4. **Configure resource limits (optional):**
   - Go to **"Settings"** → **"Resources"**
   - Set memory limit: 512MB-1GB (should be sufficient)
   - Set CPU limit: 1-2 vCPUs
   NOTE: FREE VERSION ONLY LETS YOU GET 8MB MAX

### 2.7 Configure Scaling (Optional)

**Scale the Worker Process:**

By default, Railway runs 1 instance of each process. To scale:

1. Go to your service settings
2. Click on "Settings" tab
3. Under "Replicas", you can set:
   - **Horizontal scaling:** Number of instances (costs more)
   - **Vertical scaling:** CPU/Memory per instance

**Recommended Starter Configuration:**
- **Web instances:** 1 (scale up if API becomes slow)
- **Worker instances:** 1-2 (scale based on queue depth)
- **Memory:** 512MB - 1GB per instance
- **CPU:** Shared (upgrade to dedicated if needed)

**Auto-scaling (Pro plan):**
- Railway Pro supports auto-scaling based on CPU/memory
- Configure min/max instances
- Automatically scales workers based on load

### 2.8 Verify Backend Deployment

1. Copy your Railway deployment URL (e.g., `https://scholarsource-dev.up.railway.app`)
2. Test the health endpoint:

```bash
curl https://scholarsource-dev.up.railway.app/api/health
```

**Expected response:**
```json
{"status": "healthy"}
```

3. **Submit Test Job:**
   ```bash
   curl -X POST https://scholarsource-dev.up.railway.app/api/submit \
     -H "Content-Type: application/json" \
     -d '{
       "course_name": "Test Course",
       "university_name": "Test University",
       "book_title": "Test Book",
       "book_author": "Test Author"
     }'
   ```
   Expected: Returns `job_id`

4. **Check Job Status:**
   ```bash
   curl https://scholarsource-dev.up.railway.app/api/status/{job_id}
   ```
   Expected: Returns job status (`queued`, `running`, `completed`, or `failed`)

5. **Monitor Worker Logs:**
   - Go to Railway dashboard → Deployments → Latest
   - Filter logs by `worker` process
   - You should see Celery processing the job

**Check Redis Connection:**

In Railway logs, verify:
- ✅ No Redis connection errors
- ✅ Worker successfully connected to Redis
- ✅ Tasks are being enqueued and consumed

**Status:** ✅ Backend deployed and running on Railway

---

## Part 3: Frontend Deployment (Cloudflare Pages)

### 3.1 Prepare Frontend for Deployment

1. **Update `web/.env.production` (create if doesn't exist):**

```bash
VITE_API_URL=https://scholarsource-dev.up.railway.app
```

2. **Update `web/vite.config.js` for production:**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for production
  }
})
```

3. **Test production build locally:**

```bash
cd web
npm run build
npm run preview
```

### [✅] 3.2 Deploy to Cloudflare Pages

1. Go to https://dash.cloudflare.com
2. Navigate to **"Workers & Pages"**
3. Click **"Create application"** → **"Pages"** → **"Connect to Git"**
4. Authorize Cloudflare to access your GitHub account
5. Select your `scholar_source` repository

### 3.3[✅] Configure Build Settings

1. **Framework preset**: Select **"Vite"** (or None)
2. **Build command**:
   ```bash
   cd web && npm install && npm run build
   ```
3. **Build output directory**:
   ```
   web/dist
   ```
4. **Root directory**: Leave empty (or set to `/`)

### 3.4 [✅] Add Environment Variables

1. Click **"Environment variables"**
2. Add the following:

```bash
VITE_API_URL=https://scholarsource-dev-app.up.railway.app
```

3. Select **"Production"** environment
4. Click **"Save"**

### [✅] 3.5 Deploy

1. Click **"Save and Deploy"**
2. Wait for build to complete (~2-5 minutes)
3. Cloudflare will provide a temporary URL: `https://scholar_source.pages.dev`

### 3.6 Configure Custom Domain (Optional)

1. Go to **"Custom domains"** tab
2. Click **"Set up a custom domain"**
3. Enter your domain (e.g., `app.yourdomain.com` or `yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate to provision (~5-10 minutes)

### [✅]3.7 Verify Frontend Deployment

1. Visit your Cloudflare Pages URL: `https://scholar_source.pages.dev`
2. Test the form submission workflow:
   - Fill in course information
   - Submit the form
   - Wait for job to complete
   - Verify results display correctly
3. Test copy and export buttons

**Status:** ✅ Frontend deployed and accessible via Cloudflare Pages

---

## Part 4: Post-Deployment Configuration

### [✅] 4.1 Update Backend CORS

Now that you have the production frontend URL, update the backend CORS configuration:

1. [✅] Edit `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Development
        "https://scholar_source.pages.dev",  # Cloudflare Pages
        "https://yourdomain.com",  # Custom domain
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)
```

3. Railway will auto-deploy the update (~1-2 minutes)

### [ ] 4.2 Set Up Monitoring

#### 4.2.1 Railway (Backend Monitoring)

1. Go to Railway dashboard → **"Observability"**
2. Enable metrics collection (Enabled by default). But you can't see alerts unless you're on the pro plan.
3. Set up alerts for:
   - High error rates (>5% of requests)
   - High memory usage (>80%)
   - Service downtime

#### 4.2.2 Supabase (Database Monitoring)

1. Go to Supabase dashboard → **"Reports"**
2. Monitor:
   - Database size (stay under 500MB for free tier)
   - API requests (stay under limits)
   - Active connections

#### 4.2.3 Cloudflare (Frontend Monitoring)

1. Go to Cloudflare dashboard → **"Analytics"**
2. Monitor:
   - Page views
   - Bandwidth usage (unlimited on free tier)
   - Error rates

### 4.3 Configure Backups

#### [ ] Supabase Database Backups

1. Go to Supabase dashboard → **"Database"** → **"Backups"**
2. Verify automatic daily backups are enabled
3. Free tier: 7 days of backups
4. Pro tier: 30 days of backups + point-in-time recovery

**Manual backup (optional):**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Backup database
supabase db dump -f backup_$(date +%Y%m%d).sql
```

---

## Part 5: Testing in Production

### 5.1 End-to-End Testing

Test the complete workflow in production:

1. **Submit a job:**
   - Go to your production URL
   - Fill in course information
   - Submit the form
   - Note the job ID

2. **Monitor job execution:**
   - Watch the loading status updates
   - Verify status polling works (every 2 seconds)
   - Wait for job completion (2-5 minutes)

3. **Verify results:**
   - Check that results display correctly
   - Test "Copy" buttons

4. **Test error handling:**
   - Submit form with no inputs → should show validation error
   - Visit invalid job ID → should show 404
   - Turn off Railway service → frontend should handle gracefully

### 5.2 Performance Testing

1. **Test concurrent users:**
   - Have 2-3 people submit jobs simultaneously
   - Verify all jobs complete successfully
   - Check Railway metrics for resource usage

2. **Test rate limits:**
   - Submit multiple jobs in quick succession
   - Monitor OpenAI API usage
   - Verify retry logic handles rate limits

3. **Test database persistence:**
   - Submit a job and get results
   - Restart Railway service

### 5.3 Security Testing

1. **Test CORS:**
   - Try accessing API from unauthorized origin → should be blocked
   - Verify only allowed origins can make requests

2. **Test SQL injection:**
   - Try malicious inputs in form fields
   - Verify Supabase safely handles all inputs (JSONB fields are safe)

3. **Test rate limiting (if implemented):**
   - Submit many requests quickly
   - Verify rate limiting works

---

## Part 6: Going Live

### 6.1 Final Checklist

Before announcing to users:

- [ ] All environment variables set correctly
- [ ] CORS configured with production URLs
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates active (automatic with Cloudflare/Railway)
- [ ] End-to-end testing passed
- [ ] Error tracking configured
- [ ] Monitoring dashboards set up
- [ ] Backup strategy in place
- [ ] Documentation updated with production URLs

### 6.2 Soft Launch

1. Share with 5-10 beta testers
2. Monitor error logs closely
3. Gather feedback on:
   - User experience
   - Resource quality
   - Performance issues
   - Bugs or errors

### 6.3 Full Launch

Once beta testing is successful:

1. Announce to target audience (students, educators)
2. Share production URL
3. Monitor usage metrics:
   - Jobs submitted per day
   - Completion rate
   - Error rate
   - User retention

---

## Part 7: Maintenance & Operations

### 7.1 Daily Operations

**Monitor (5-10 minutes/day):**
- Railway dashboard for backend errors
- Supabase dashboard for database usage
- Cloudflare analytics for frontend traffic

**Alert thresholds:**
- Backend error rate >5%
- Database size approaching limits
- OpenAI API costs exceeding budget

### 7.2 Weekly Maintenance

**Tasks (30 minutes/week):**
- Review error logs and fix critical issues
- Check database size and clean up old jobs if needed
- Review OpenAI API usage and costs
- Update dependencies if security patches available

### 7.3 Monthly Review

**Tasks (1-2 hours/month):**
- Analyze usage metrics and trends
- Review and optimize costs
- Plan feature improvements based on feedback
- Update documentation

### 7.4 Scaling Considerations

**When to upgrade:**

| Metric | Free/Starter | Upgrade Trigger | Recommended Action |
|--------|--------------|-----------------|-------------------|
| Database size | <500MB | >400MB | Upgrade Supabase to Pro ($25/mo) or implement job cleanup |
| API requests | <500K/month | >400K/month | Upgrade Supabase to Pro |
| Railway usage | $5/mo | Backend slow | Upgrade Railway plan or optimize code |
| OpenAI costs | Variable | >$100/mo | Review token usage, optimize prompts, or implement caching |
| Concurrent users | ~10 | >50 | Add Redis caching, optimize database queries |

---

## Part 8: Rollback Plan

If deployment fails or critical issues arise:

### 8.1 Backend Rollback

**Option 1: Railway rollback**
1. Go to Railway dashboard → **"Deployments"**
2. Find previous successful deployment
3. Click **"Redeploy"**

**Option 2: Git rollback**
```bash
git revert HEAD
git push origin main
# Railway auto-deploys
```

### 8.2 Frontend Rollback

**Option 1: Cloudflare Pages rollback**
1. Go to Cloudflare Pages dashboard → **"Deployments"**
2. Find previous deployment
3. Click **"Rollback"**

**Option 2: Git rollback**
```bash
git revert HEAD
git push origin main
# Cloudflare auto-deploys
```


## Part 9: Cost Optimization

### 9.1 Current Costs (MVP)

| Service | Plan | Cost/Month |
|---------|------|------------|
| Railway (Backend) | Starter | $5 |
| Supabase (Database) | Free | $0 |
| Cloudflare Pages (Frontend) | Free | $0 |
| OpenAI API | Usage-based | ~$10-50 |
| Serper API | Free tier | $0 |
| **Total** | | **$15-55/month** |

### 9.2 Cost Optimization Strategies

**Reduce OpenAI costs:**
- Use GPT-4o-mini for non-critical agents ✅ (already doing this)
- Implement response caching for repeated queries
- Optimize prompts to reduce token usage
- Set monthly spending limits in OpenAI dashboard

**Reduce database costs:**
- Implement job cleanup (delete jobs >30 days old)
- Optimize JSONB fields to reduce size

**Monitor and alert:**
- Set up billing alerts in OpenAI (e.g., alert at $50)
- Monitor Railway usage (alert if approaching next tier)
- Track Supabase database size (alert at 450MB)

---

## Part 11: Security Hardening (Production Checklist)

### 11.1 Environment Security

- [ ] All API keys stored in environment variables (never in code)
- [ ] `.env` file in `.gitignore` (verify with `git status`)
- [ ] Separate credentials for dev/staging/prod environments
- [ ] Rotate API keys quarterly

### 11.2 Database Security

- [ ] Row Level Security (RLS) enabled on Supabase
- [ ] Database credentials never exposed to frontend
- [ ] Regular backups configured
- [ ] SQL injection prevention (using Supabase client ✅)

### 11.3 API Security

- [✅] CORS restricted to known origins only
- [ ] Rate limiting implemented (add in Phase 2)
- [✅] Input validation on all endpoints
- [✅] HTTPS enforced (automatic with Railway/Cloudflare)

### 11.4 Frontend Security

- [ ] Content Security Policy (CSP) headers configured
- [✅] No sensitive data in localStorage
- [ ] XSS prevention (React handles this ✅)
- [✅] No API keys in frontend code

---

## Part 12: Success Metrics

Track these metrics to measure deployment success:

### Technical Metrics

- **Uptime**: Target >99% (use UptimeRobot or similar)
- **Error rate**: Target <2% of requests
- **Response time**: Target <2 seconds for API calls
- **Job completion rate**: Target >95% of jobs complete successfully
- **Job completion time**: Target 2-5 minutes per job

### Business Metrics

- **Daily active users**: Track growth over time
- **Jobs submitted per day**: Measure engagement
- **User retention**: % of users who return within 7 days

### Cost Metrics

- **Cost per job**: Total monthly costs ÷ jobs submitted
- **OpenAI cost per job**: OpenAI costs ÷ jobs submitted
- **Infrastructure cost per user**: Fixed costs ÷ monthly active users

---

## Part 10: Railway Deployment Troubleshooting

### 10.1 Common Deployment Issues

#### Issue 1: Worker Not Starting

**Symptoms:**
- Only see `web` process logs
- No Celery startup messages
- Jobs stay in `queued` status forever

**Causes:**
- Procfile not detected
- Worker process crashed during startup
- Missing dependencies

**Fixes:**
1. Verify `Procfile` exists in repository root
2. Check Railway deployment logs for errors
3. Ensure `celery` is in `requirements.txt`
4. Verify `REDIS_URL` is set correctly

#### Issue 2: Redis Connection Failed

**Symptoms:**
```
celery.exceptions.ImproperlyConfigured: CELERY_BROKER_URL is not set
```
or
```
redis.exceptions.ConnectionError: Error connecting to Redis
```

**Fixes:**
1. Verify `REDIS_URL` environment variable is set
2. Check Redis Cloud database is active
3. Verify Redis URL format: `redis://default:PASSWORD@HOST:PORT`
4. Check Redis Cloud firewall allows Railway IPs (usually not an issue)
5. Test Redis connection:
   ```bash
   railway run python -c "from redis import Redis; r=Redis.from_url('$REDIS_URL'); print(r.ping())"
   ```

#### Issue 3: Environment Variables Not Loading

**Symptoms:**
- Missing API keys errors
- Database connection failed
- Application crashes on startup

**Fixes:**
1. Go to Railway Variables tab
2. Verify all required variables are set
3. Check for typos in variable names
4. Redeploy after adding variables (click "Deploy" → "Redeploy")

#### Issue 4: Port Binding Error

**Symptoms:**
```
Error binding to 0.0.0.0:8000
```

**Cause:**
- Using hardcoded port instead of `$PORT`

**Fix:**
- Procfile should use `$PORT`, not `8000`:
  ```
  web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  ```

#### Issue 5: Jobs Not Being Processed

**Symptoms:**
- Jobs stuck in `queued` status
- Worker logs show "ready" but no task execution

**Fixes:**
1. Check worker logs for errors
2. Verify queue names match:
   - `backend/celery_app.py` defines queues
   - Procfile worker listens to correct queues
3. Manually test task:
   ```python
   from backend.tasks import run_crew_task
   result = run_crew_task.delay("test-job-id", {...})
   ```

### 10.2 Useful Railway CLI Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# View logs (live)
railway logs

# View logs (worker only)
railway logs --filter worker

# Run command in Railway environment
railway run python scripts/test.py --redis

# SSH into Railway container (Pro plan)
railway shell
```

### 10.3 Monitoring and Maintenance

#### Monitoring Checklist

**Daily:**
- [ ] Check Railway dashboard for any crashed processes
- [ ] Monitor error rate in logs
- [ ] Check queue depth (jobs waiting to be processed)

**Weekly:**
- [ ] Review worker processing times
- [ ] Check Redis memory usage
- [ ] Monitor Railway resource usage (CPU, memory)
- [ ] Review cost dashboard

**Monthly:**
- [ ] Optimize worker count based on traffic patterns
- [ ] Review and optimize database queries
- [ ] Update dependencies (`pip list --outdated`)

#### Key Metrics to Track

1. **Queue Depth:** How many jobs waiting
   - Check Redis: `LLEN crew_jobs` command
   - Goal: Keep under 10-20 for good latency

2. **Worker Utilization:** Are workers busy or idle?
   - Check Celery logs for task start/complete messages
   - Scale up if workers constantly busy
   - Scale down if workers mostly idle

3. **Job Duration:** How long jobs take
   - Add logging in `backend/tasks.py`
   - Track P50, P95, P99 durations
   - Optimize slow jobs

4. **Error Rate:** Failed jobs
   - Monitor Railway logs for exceptions
   - Check job status distribution in database
   - Investigate and fix failed job patterns

### 10.4 Scaling Strategy

#### When to Scale UP (More Resources per Instance)

**Symptoms:**
- High CPU usage (>80% sustained)
- High memory usage (>80%)
- API response times increasing
- Worker tasks timing out

**Actions:**
1. Go to Railway Settings → Resources
2. Increase CPU/Memory allocation
3. Monitor performance improvement

#### When to Scale OUT (More Instances)

**Symptoms:**
- Queue depth consistently high (>20 jobs)
- API response time high despite low CPU
- Workers can't keep up with job submissions

**Actions:**

**Scale Workers:**
1. Go to Railway service settings
2. Increase replica count for worker process
3. Start with +1 worker, monitor queue depth
4. Continue scaling until queue depth is healthy

**Scale API:**
1. Less common to need multiple API instances initially
2. Scale when API CPU/memory is high
3. Ensure Redis-backed rate limiting is active
4. Railway will load balance across API instances

#### Cost-Effective Scaling Tips

1. **Scale workers first** - Usually the bottleneck
2. **Use autoscaling** (Pro plan) - Only pay for what you need
3. **Monitor queue depth** - Scale based on data, not guesses
4. **Optimize job duration** - Faster jobs = need fewer workers
5. **Use caching** - Reduce redundant work
6. **Schedule heavy tasks** - Run during off-peak hours if possible

### 10.5 Deployment Checklist

Before going live with production traffic:

**Pre-Deployment:**
- [ ] All tests pass locally (`python scripts/test.py --all`)
- [ ] Redis Cloud database created and accessible
- [ ] All environment variables documented
- [ ] Frontend updated with Railway API URL
- [ ] CORS settings updated in `backend/main.py` (if needed)

**Deployment:**
- [ ] Railway project created from GitHub
- [ ] All environment variables set in Railway
- [ ] Both `web` and `worker` processes running
- [ ] Health check endpoint returns 200 OK
- [ ] Test job submission and completion works
- [ ] Redis connection successful (check logs)

**Post-Deployment:**
- [ ] Monitor logs for 1 hour for any errors
- [ ] Submit real test job and verify completion
- [ ] Check worker is processing jobs correctly
- [ ] Verify rate limiting works across requests
- [ ] Set up alerts for critical errors
- [ ] Document Railway dashboard access for team

**Ongoing:**
- [ ] Weekly: Review error logs and performance metrics
- [ ] Monthly: Check Railway costs and optimize
- [ ] As needed: Scale workers based on queue depth
- [ ] As needed: Update dependencies and redeploy

---

## Next Steps After Deployment

Once deployed and stable:

1. **Gather user feedback** (surveys, analytics, support tickets)
3. **Optimize performance** based on real usage data
4. **Scale infrastructure** as user base grows
5. **Consider monetization** if costs increase significantly

---

## Support & Resources

**Documentation:**
- [Railway Docs](https://docs.railway.app)
- [Supabase Docs](https://supabase.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [FastAPI Deployment Docs](https://fastapi.tiangolo.com/deployment/)

**Monitoring Tools:**
- [Railway Dashboard](https://railway.app) - Backend monitoring
- [Supabase Dashboard](https://supabase.com/dashboard) - Database monitoring

**Community:**
- Railway Discord: https://discord.gg/railway
- Supabase Discord: https://discord.supabase.com
- CrewAI Discord: https://discord.com/invite/X4JWnZnxPb

---

## Appendix: Deployment Commands Reference

### Railway Deployment

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy manually (auto-deploy via GitHub is recommended)
railway up

# View logs
railway logs

# Set environment variable
railway variables set OPENAI_API_KEY=sk-proj-...
```

### Cloudflare Pages Deployment

```bash
# Install Wrangler CLI (optional)
npm install -g wrangler

# Login
wrangler login

# Deploy manually (auto-deploy via GitHub is recommended)
cd web && npm run build
wrangler pages deploy dist --project-name=scholar-source

# View deployment logs
wrangler pages deployment list
```

### Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Run migrations (for future schema updates)
supabase db push

# Backup database
supabase db dump -f backup.sql
```

---

**Deployment Plan Version:** 1.1
**Last Updated:** December 2024
**Status:** Ready for production deployment with scaling support
