# Railway Quick Reference Card

## 🚂 Check Current Environment

### Method 1: Railway Dashboard (Easiest)
1. Go to https://railway.app/dashboard
2. Look at top-left breadcrumb: `[Project] > [Environment] > [Service]`
3. Environment dropdown shows: `production`, `development`, etc.

### Method 2: Service Logs
Look for this in your Railway service logs:
```
🚂 RAILWAY ENVIRONMENT DETECTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: production
Git Branch: main
Service: web
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Method 3: API Endpoint (After adding to your code)
```bash
curl https://your-app.railway.app/api/environment
```

Response:
```json
{
  "environment": "production",
  "git_branch": "main",
  "git_commit": "abc123d",
  "service": "web"
}
```

### Method 4: Railway CLI
```bash
railway status
```

---

## 🌿 Typical Setup

| Environment | Branch | Auto-Deploy | Usage |
|-------------|--------|-------------|-------|
| **production** | `main` | ✅ Yes | Live users |
| **development** | `develop` | ✅ Yes | Testing |
| **local** | - | ❌ No | Your machine |

---

## 🔑 Environment Variables Railway Sets

```bash
RAILWAY_ENVIRONMENT_NAME=production   # or development, staging, etc.
RAILWAY_GIT_BRANCH=main              # Git branch deployed
RAILWAY_GIT_COMMIT_SHA=abc123...     # Full commit hash
RAILWAY_SERVICE_NAME=web             # Service name (web, worker)
```

---

## 📋 Check Which Environment You're In

### In Logs (Worker)
```
🚀 CELERY WORKER STARTUP ON RAILWAY
🚂 RAILWAY ENVIRONMENT DETECTION:
Environment: production    ← THIS TELLS YOU
Git Branch: main
```

### In Logs (Web)
Look for FastAPI startup logs showing environment.

---

## 🔄 Switch Environments in Dashboard

1. Railway Dashboard
2. Click environment dropdown (top-left)
3. Select `production` or `development`
4. View different logs/variables for each

---

## ⚙️ Different Variables Per Environment

### Production Variables
```
RAILWAY_ENVIRONMENT_NAME=production
LOG_LEVEL=INFO
REDIS_URL=redis://prod-redis...
DEBUG=false
```

### Development Variables
```
RAILWAY_ENVIRONMENT_NAME=development
LOG_LEVEL=DEBUG
REDIS_URL=redis://dev-redis...
DEBUG=true
```

**Set in:** Railway Dashboard → [Select Environment] → Variables tab

---

## 🚨 Common Confusion Points

### "Which environment is my code running in?"
👉 Check the Railway dashboard environment dropdown or logs

### "Why are my changes not deploying?"
👉 Make sure you're looking at the right environment in the dashboard
👉 Check that the Git branch matches (production = main, dev = develop)

### "My variables aren't working"
👉 Variables are **per-environment**
👉 Select the correct environment in dashboard before viewing variables

### "I see two deployments"
👉 You have two environments (production + development)
👉 Each has its own deployment

---

## 📍 Quick Commands

```bash
# Install Railway CLI
brew install railway  # macOS
# OR
curl -fsSL https://railway.app/install.sh | sh

# Login
railway login

# Link project
cd /path/to/scholar_source
railway link

# Check status
railway status

# Switch environment
railway environment production
railway environment development

# View logs
railway logs --follow

# View variables
railway variables
```

---

## 💡 Pro Tips

1. **Always check environment dropdown** before changing variables
2. **Each environment is isolated** - separate databases, Redis, etc.
3. **Production = main branch** (typically)
4. **Development = develop branch** (typically)
5. **Look for environment in startup logs** - always logged at the top

---

## 🆘 Still Confused?

**Quick Test:**
1. Go to Railway dashboard
2. Look at top-left corner
3. You'll see: `scholar-source > production > web` (or similar)
4. The middle part (`production`) is your environment!

**In Logs:**
Look for lines starting with `🚂 RAILWAY ENVIRONMENT DETECTION:`

**Via API:**
Add this endpoint and call it:
```python
@app.get("/api/env")
def get_env():
    return {"env": os.getenv("RAILWAY_ENVIRONMENT_NAME", "unknown")}
```

Then: `curl https://your-app.railway.app/api/env`
