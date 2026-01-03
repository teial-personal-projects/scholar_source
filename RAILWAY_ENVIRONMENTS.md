# Railway Environment Detection Guide

## How to Know Which Environment is Running

Railway provides an environment variable that tells you which environment your code is running in.

---

## Environment Detection

### Built-in Railway Environment Variables

Railway automatically sets these variables:

```bash
# Environment name (development, production, staging, etc.)
RAILWAY_ENVIRONMENT_NAME=production

# Deployment-specific variables
RAILWAY_DEPLOYMENT_ID=...
RAILWAY_SERVICE_NAME=...
RAILWAY_PROJECT_NAME=...
RAILWAY_GIT_COMMIT_SHA=...
RAILWAY_GIT_BRANCH=...
```

### Check Current Environment in Code

Add this to your startup logging:

**In `backend/main.py`:**
```python
import os

# Log environment on startup
railway_env = os.getenv("RAILWAY_ENVIRONMENT_NAME", "local")
railway_branch = os.getenv("RAILWAY_GIT_BRANCH", "unknown")

logger.info("=" * 60)
logger.info(f"🚂 RAILWAY ENVIRONMENT: {railway_env}")
logger.info(f"🌿 GIT BRANCH: {railway_branch}")
logger.info(f"🔗 SERVICE: {os.getenv('RAILWAY_SERVICE_NAME', 'unknown')}")
logger.info("=" * 60)
```

**In `backend/celery_app.py`:**
```python
# Add after the existing logging
railway_env = os.getenv("RAILWAY_ENVIRONMENT_NAME", "local")
print(f"🚂 Railway Environment: {railway_env}", flush=True)
logger.info(f"Railway Environment: {railway_env}")
```

---

## Railway Dashboard - View Environments

### In Railway Web Dashboard:

1. Go to https://railway.app/dashboard
2. Click on your project
3. You'll see environments listed on the left sidebar:
   - **production** (typically from `main` branch)
   - **development** (typically from `develop` or `dev` branch)
   - Any custom environments you created

4. Each environment shows:
   - Active deployments
   - Environment variables
   - Service logs
   - Metrics

### Current Environment Indicator

Look at the top of the Railway dashboard - it shows:
```
[Your Project Name] > [Environment Name] > [Service Name]
```

---

## Setting Up Multiple Environments

### Method 1: Branch-Based Environments (Recommended)

Railway automatically creates environments based on your Git branches:

**Production Environment:**
- Branch: `main`
- Environment: `production`
- Auto-deploys on push to `main`

**Development Environment:**
- Branch: `develop` or `dev`
- Environment: `development`
- Auto-deploys on push to `develop`

**Configure in Railway:**
1. Go to Settings → Environments
2. Click "New Environment"
3. Name: `development`
4. Branch: `develop`
5. Click "Create"

### Method 2: Manual Environment Creation

1. Railway Dashboard → Your Project
2. Click "New Environment" (top right)
3. Name it (e.g., `staging`, `testing`)
4. Choose Git branch or manual deploys
5. Configure separate environment variables

---

## Environment-Specific Configuration

### Set Different Variables Per Environment

**In Railway Dashboard:**

1. Select your environment (e.g., `production`)
2. Go to Variables tab
3. Add environment-specific variables:

**Production:**
```
RAILWAY_ENVIRONMENT_NAME=production
LOG_LEVEL=INFO
REDIS_URL=redis://production-redis...
SUPABASE_URL=https://prod.supabase.co
DEBUG=false
```

**Development:**
```
RAILWAY_ENVIRONMENT_NAME=development
LOG_LEVEL=DEBUG
REDIS_URL=redis://dev-redis...
SUPABASE_URL=https://dev.supabase.co
DEBUG=true
```

### Environment-Specific Code Behavior

**In your Python code:**

```python
import os

RAILWAY_ENV = os.getenv("RAILWAY_ENVIRONMENT_NAME", "local")
IS_PRODUCTION = RAILWAY_ENV == "production"
IS_DEVELOPMENT = RAILWAY_ENV == "development"

# Different logging levels
if IS_PRODUCTION:
    LOG_LEVEL = "INFO"
    DEBUG_MODE = False
else:
    LOG_LEVEL = "DEBUG"
    DEBUG_MODE = True

# Different Celery concurrency
if IS_PRODUCTION:
    CELERY_CONCURRENCY = 4
else:
    CELERY_CONCURRENCY = 2

# Different rate limits
if IS_PRODUCTION:
    RATE_LIMIT_PER_HOUR = 100
else:
    RATE_LIMIT_PER_HOUR = 1000  # Higher for testing
```

---

## Check Environment via Railway CLI

### Install Railway CLI

```bash
# macOS (Homebrew)
brew install railway

# Linux/macOS (curl)
curl -fsSL https://railway.app/install.sh | sh

# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex
```

### Login
```bash
railway login
```

### Link Project
```bash
cd /path/to/scholar_source
railway link
```

### Check Current Environment
```bash
# Show current environment
railway status

# Output example:
# Project: scholar-source
# Environment: production
# Service: web
```

### Switch Environments
```bash
# List all environments
railway environment

# Switch to development
railway environment development

# Switch to production
railway environment production
```

### View Variables
```bash
# Show all variables for current environment
railway variables

# Show specific variable
railway variables | grep RAILWAY_ENVIRONMENT_NAME
```

### View Logs
```bash
# View logs for current environment
railway logs

# Follow logs in real-time
railway logs --follow
```

---

## Logs: Identifying Environment

### In Railway Dashboard Logs

Look for these indicators in your service logs:

```
✅ Production:
[2024-01-03 10:00:00] 🚂 RAILWAY ENVIRONMENT: production
[2024-01-03 10:00:00] 🌿 GIT BRANCH: main

✅ Development:
[2024-01-03 10:00:00] 🚂 RAILWAY ENVIRONMENT: development
[2024-01-03 10:00:00] 🌿 GIT BRANCH: develop
```

### In Your Application

Add an environment info endpoint:

**In `backend/main.py`:**
```python
@app.get("/api/environment")
async def environment_info():
    """Return current environment information."""
    return {
        "environment": os.getenv("RAILWAY_ENVIRONMENT_NAME", "local"),
        "git_branch": os.getenv("RAILWAY_GIT_BRANCH", "unknown"),
        "git_commit": os.getenv("RAILWAY_GIT_COMMIT_SHA", "unknown")[:7],
        "service": os.getenv("RAILWAY_SERVICE_NAME", "unknown"),
        "deployment_id": os.getenv("RAILWAY_DEPLOYMENT_ID", "unknown")[:8],
    }
```

Test it:
```bash
# Production
curl https://your-prod-app.railway.app/api/environment

# Development
curl https://your-dev-app.railway.app/api/environment
```

---

## Best Practices

### 1. Use Environment Names Consistently

```python
# Good - Use Railway's environment variable
ENVIRONMENT = os.getenv("RAILWAY_ENVIRONMENT_NAME", "local")

# Bad - Custom inconsistent naming
ENVIRONMENT = os.getenv("MY_ENV", "dev")
```

### 2. Set Environment in Variables

In Railway dashboard, explicitly set:
```
RAILWAY_ENVIRONMENT_NAME=production  # or development
```

Even though Railway sets this automatically, being explicit helps.

### 3. Log Environment on Startup

Always log which environment you're in:
```python
logger.info(f"Starting in {ENVIRONMENT} environment")
```

### 4. Use Different Resources Per Environment

- **Production:** Separate Redis, Supabase, databases
- **Development:** Shared or cheaper resources
- **Local:** Local Redis, local databases

### 5. Protect Production Data

```python
if RAILWAY_ENV == "production":
    # Strict rate limiting
    # Real email notifications
    # Production error tracking
else:
    # Relaxed limits
    # Mock emails
    # Verbose logging
```

---

## Troubleshooting

### Issue: Can't Tell Which Environment is Running

**Solution 1: Check Railway Dashboard URL**
- Production: Usually has no environment prefix
- Development: Usually has `-dev` or similar suffix

**Solution 2: Add Banner to Logs**
```python
railway_env = os.getenv("RAILWAY_ENVIRONMENT_NAME", "UNKNOWN")
print("=" * 60, flush=True)
print(f"RUNNING IN: {railway_env.upper()} ENVIRONMENT", flush=True)
print("=" * 60, flush=True)
```

**Solution 3: Check Git Branch**
```python
git_branch = os.getenv("RAILWAY_GIT_BRANCH", "unknown")
logger.info(f"Deployed from branch: {git_branch}")
```

### Issue: Wrong Environment Variables Being Used

**Cause:** Looking at wrong environment in Railway dashboard

**Solution:**
1. Railway Dashboard → Select correct environment (top dropdown)
2. Variables tab → Verify variables match expectations
3. Redeploy if needed

### Issue: Changes Not Deploying to Correct Environment

**Cause:** Git branch not linked to environment

**Solution:**
1. Railway Dashboard → Environments
2. Click environment → Settings
3. Verify "Branch" is set correctly
4. Enable "Auto-deploy" if desired

---

## Quick Reference

### Environment Variables Set by Railway

| Variable | Description | Example |
|----------|-------------|---------|
| `RAILWAY_ENVIRONMENT_NAME` | Environment name | `production`, `development` |
| `RAILWAY_GIT_BRANCH` | Git branch deployed | `main`, `develop` |
| `RAILWAY_GIT_COMMIT_SHA` | Full commit SHA | `abc123def456...` |
| `RAILWAY_SERVICE_NAME` | Service name | `web`, `worker` |
| `RAILWAY_PROJECT_NAME` | Project name | `scholar-source` |
| `RAILWAY_DEPLOYMENT_ID` | Unique deployment ID | `d-abc123` |

### Common Commands

```bash
# Check current status
railway status

# Switch environment
railway environment production
railway environment development

# View logs
railway logs --follow

# Open dashboard
railway open

# Deploy manually
railway up
```

---

## Summary

**To know which environment you're in:**

1. **Check Railway Dashboard** - Look at environment selector (top-left)
2. **Check Logs** - Look for `RAILWAY_ENVIRONMENT_NAME` in startup logs
3. **Use Railway CLI** - Run `railway status`
4. **Call API endpoint** - Create `/api/environment` endpoint
5. **Check Git Branch** - Production usually from `main`, dev from `develop`

**Best practice:** Always log the environment prominently on application startup! 🚂
