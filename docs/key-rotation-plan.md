# ScholarSource Key Rotation Plan

Railway security incident of October 20 to 21, 2026. Prepared October 23, 2026.

## What Happened and Why This Matters

Railway reported that an attacker queried the systems that store customer environment variables, and that a subset of those variables was decrypted. Railway says the attacker appeared to be hunting for AI provider API keys. Because the values were envelope encrypted, Railway cannot yet say which specific variables were exposed, so it is asking every customer who signed up before October 21 to rotate everything stored on Railway.

A few details from Railway's preliminary report change how this plan works.

- Running services stayed online the whole time. Builds and deployments were restored for all tiers on October 22, so new variables can be pushed now.
- Railway notified OpenAI and other providers to revoke keys proactively. The OpenAI key may already be dead, which would show up as failed crew jobs in production.
- Railway revoked all Railway access tokens, rolled its GitHub App installations, and invalidated user sessions. Log back in to Railway and re-authenticate the CLI.
- Railway recommends removing public network access to databases and reviewing GitHub audit logs.
- Nothing published so far says Railway rotated database or Redis passwords for customers, so treat Railway Redis as exposed.

## What the Repo Shows

Variable names were compared across `.env.local`, `.env.dev`, `.env.prod`, the `web/` env files, and `docs/Deployment_Plan.md`. Only fingerprints of the values were compared, never the values themselves.

**Five secrets are shared between dev and prod.** `OPENAI_API_KEY` (also reused as `CHROMA_OPENAI_API_KEY`), `SERPER_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, and `LANGSMITH_API_KEY` have the same value in local, dev, and prod. Regenerating one of those "for dev" breaks production at the same moment. The fix is to create a brand new key for each environment and only revoke the old shared key at the very end, after prod is verified.

**Supabase is already split by environment.** Dev and prod use different Supabase projects with different service role keys and JWT secrets, so Supabase is the one place where dev first, then prod works cleanly. Supabase's docs say the legacy anon key, service_role key, and JWT secret can no longer be rotated in place. The path forward is migrating to JWT signing keys plus the new publishable and secret API keys. `backend/auth.py` already verifies ES256 and RS256 tokens through the JWKS endpoint, so the backend is ready for that switch without a code change.

### Secrets Inventory

| Variable | Provider | Where it lives | Priority |
|---|---|---|---|
| `OPENAI_API_KEY`, `CHROMA_OPENAI_API_KEY` | OpenAI | Railway, all local env files. Shared dev and prod. | Critical. The attacker was targeting AI keys. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Railway backend and Celery. Separate per env. | Critical. Bypasses Row Level Security. |
| `SUPABASE_JWT_SECRET` | Supabase | Railway backend and Celery. Separate per env. | Critical. Can forge user tokens. |
| `REDIS_URL` | Railway Redis | Railway only. Not in local env files. | High. Celery broker and rate limiting. |
| `RESEND_API_KEY` | Resend | Railway, local env files. Shared dev and prod. | High. Can send mail as your domain. |
| `LANGSMITH_API_KEY` | LangSmith | Local env files, possibly Railway. Shared. | Medium. Traces can contain prompts and user input. |
| `SERPER_API_KEY` | Serper | Railway, local env files. Shared. | Medium. Billing abuse. |
| `RESEND_WEBHOOK_SECRET` | Resend | Env files. Shared. No code references it. | Low. Rotate or delete. |
| `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` | Supabase | Railway and Cloudflare Pages. | Low. Public by design, changes only as part of the migration. |
| Railway account, GitHub App | Railway, GitHub | Railway already revoked tokens. | Review access and audit logs. |

If the Railway dashboard shows any variable not on this list, such as a `DATABASE_URL` with the Supabase Postgres password, add it to the list and rotate it too.

## Phase 0. Prep and Damage Check

- [ ] Log back in to Railway, turn on two factor authentication if it is off, and review workspace members.
- [ ] Check for a direct email from Railway. They are contacting confirmed affected accounts.
- [ ] Re-authenticate the CLI and list variable names only for each service and environment. Piping through `cut` keeps secret values off disk.

  ```bash
  railway login
  railway variable list --service backend --environment production --kv | cut -d= -f1
  railway variable list --service celery --environment production --kv | cut -d= -f1
  ```

- [ ] Compare those names with the inventory table and note any extras.
- [ ] Look for abuse since October 20 in each provider. OpenAI usage page, Resend email logs and sending volume, Supabase auth and API logs, Serper usage, LangSmith usage.
- [ ] Check whether the OpenAI key still works by running one small local crew job or by looking for 401 errors in the production Celery logs. If it was already revoked, production AI jobs are down and the OpenAI part of Phase 2 should happen right away.
- [ ] In GitHub, open Settings, then Applications, then the Railway app, and confirm it only has access to the repos it needs. Skim the GitHub security log for anything unexpected.

## Phase 1. Dev

Goal is to give dev its own keys, prove the new Supabase key setup works end to end, and leave production untouched. Nothing in this phase revokes a shared key.

### OpenAI

- [ ] In the OpenAI dashboard, create a new secret key named `scholarsource-dev`. If possible, put it in its own OpenAI project with a monthly spend limit.
- [ ] Put it in `.env.dev` and `.env.local` for both `OPENAI_API_KEY` and `CHROMA_OPENAI_API_KEY`.
- [ ] Do not revoke the old key yet. Production still depends on it.

### Resend, LangSmith, Serper

- [ ] Resend. Create a new API key named `scholarsource-dev` with sending access limited to your domain. Update `.env.dev` and `.env.local`.
- [ ] LangSmith. Create a new dev API key and update the same files.
- [ ] Serper. If the dashboard allows two keys at once, create a dev key now. If it only offers a single regenerate button, skip Serper here, because regenerating would break prod instantly. Handle it in Phase 2 and update every env file in one go.
- [ ] `RESEND_WEBHOOK_SECRET`. Nothing in `backend/` or `src/` reads it. Confirm whether a webhook is configured in Resend. If not, delete the variable. If one exists, delete and recreate the webhook endpoint to get a new signing secret.

### Supabase Dev Project

- [ ] Project Settings, JWT Keys. Click **Migrate JWT secret**. This imports the legacy secret and creates a standby signing key. Pick ES256 (P-256), which Supabase recommends.
- [ ] Project Settings, API Keys. Create a publishable key, and create a secret key named `backend-dev`.
- [ ] Update values only, not variable names.
  - `.env.dev` and `.env.local` set `SUPABASE_ANON_KEY` to the `sb_publishable_` key.
  - `.env.dev` and `.env.local` set `SUPABASE_SERVICE_ROLE_KEY` to the `sb_secret_` key.
  - `web/.env.dev` and `web/.env.local` set `VITE_SUPABASE_ANON_KEY` to the publishable key.
- [ ] Start the backend, Celery worker, and frontend locally against dev. Confirm supabase-py 2.30 and supabase-js accept the new key formats (startup does not fail and admin queries through the service client work).
- [ ] Back in JWT Keys, click **Rotate keys** so the ES256 key becomes the active signer. Sign out and sign back in on the frontend. New tokens will be ES256 and will go through the JWKS branch in `auth.py`.
- [ ] Run the dev verification checklist below.
- [ ] In API Keys, check the "last used" indicators on the legacy anon and service_role keys. Once nothing uses them, disable both.
- [ ] Wait at least 1 hour 15 minutes after rotating (Supabase's guidance for a 1 hour token expiry), then revoke the legacy JWT secret. Supabase says revoking sooner is fine during an active incident, but dev can wait.
- [ ] Leave `SUPABASE_JWT_SECRET` set to its old value for now. `auth.py` raises an error at import if it is empty. Once legacy is revoked the value is harmless, and the code cleanup is listed under follow-ups.

### Railway Dev Environment (If One Exists)

- [ ] Update the same variables on both the backend and Celery services. Shared variables set at the project level can be overridden at the service level, so check both places.
- [ ] Rotate dev Redis using the same approach described for production below.
- [ ] Deploy once with all changes batched together.

### Dev Verification Checklist

- [ ] Sign up or sign in works, and authenticated API calls return 200, not 401.
- [ ] A full study resource search completes through the Celery worker (OpenAI, Serper, and Redis all exercised).
- [ ] An email notification arrives through Resend.
- [ ] A trace shows up in LangSmith under the dev key.
- [ ] Backend logs show no "Invalid API key" or "Token verification failed" errors.
- [ ] The Python test suite still passes.

  ```bash
  uv run pytest
  ```

## Phase 2. Production

Same pattern. Create the new key, set it, deploy, verify, and only then revoke the old one. Pick a quiet window, since the Redis swap drops any queued jobs.

### Create the New Production Credentials

- [ ] OpenAI. New key named `scholarsource-prod`, ideally in its own project with a spend limit.
- [ ] Resend. New key named `scholarsource-prod`, sending access only.
- [ ] LangSmith. New prod key, if prod tracing is turned on.
- [ ] Serper. New prod key, or regenerate now if Serper only supports one key, and update dev and local at the same time.
- [ ] Supabase prod project. Repeat the first two Supabase dev steps (migrate JWT secret with an ES256 standby, create a publishable key and a `backend-prod` secret key). Do not rotate yet.

### Redis on Railway

Railway's posts do not give a procedure for rotating managed Redis passwords. Since the data is only a queue and rate limit counters, the cleanest option is to replace the instance rather than try to change its password.

- [ ] Wait until no crew jobs are running.
- [ ] Add a new Redis service in the production environment.
- [ ] Point `REDIS_URL` on the backend and Celery services at it with a reference variable such as `${{Redis-2.REDIS_URL}}`, using the private `railway.internal` host. Confirm `CELERY_BROKER_USE_SSL` still matches how the new instance is reached.
- [ ] Make sure the new Redis has no public TCP proxy. Railway recommends removing public network access to databases.
- [ ] After verification, delete the old Redis service.

### Apply and Deploy

- [ ] In Railway, update these on both backend and Celery, and mark them as sealed variables.
  - `OPENAI_API_KEY`
  - `CHROMA_OPENAI_API_KEY`
  - `SERPER_API_KEY`
  - `RESEND_API_KEY`
  - `LANGSMITH_API_KEY`
  - `SUPABASE_ANON_KEY` (publishable key)
  - `SUPABASE_SERVICE_ROLE_KEY` (secret key)
  - `REDIS_URL`
- [ ] Deploy once with all changes batched.
- [ ] In Cloudflare Pages, set the production `VITE_SUPABASE_ANON_KEY` to the publishable key and redeploy the frontend.
- [ ] Update `.env.prod` and `web/.env.prod` locally so they match.
- [ ] In the Supabase prod project, click **Rotate keys** so ES256 becomes the active signer.

### Verify Production

- [ ] Sign in on the live site and run one real search end to end.
- [ ] Confirm an email sends, and check Railway logs for both services for auth or connection errors.
- [ ] Watch for a few minutes for 401 spikes. Existing HS256 tokens stay valid until they expire, then the frontend refreshes into ES256 tokens.

### Revoke the Old Credentials

- [ ] OpenAI. Revoke the old shared key (if Railway's notice did not already get it revoked).
- [ ] Resend, LangSmith, Serper. Revoke the old shared keys.
- [ ] Supabase prod. Once "last used" shows no traffic on the legacy anon and service_role keys, disable them. Then revoke the legacy JWT secret. Because this is an active incident, do this the same day rather than waiting.
- [ ] Repeat the "last used" check in the dev Supabase project if it is not finished there.

### Monitor for 48 Hours

- OpenAI usage on the new prod and dev keys looks like normal traffic.
- Resend sending volume is normal and no unfamiliar emails appear.
- Supabase auth logs show no unexpected admin activity.
- Watch Railway's blog for the final incident report, which will say whether source code was accessed.

## Rollback Notes

- Until an old key is revoked, rollback is just switching the variable back and redeploying.
- Disabled Supabase legacy API keys can be reactivated from the API Keys page.
- Revoking the legacy JWT secret is the step to be most careful with. Do it last, after "last used" shows the legacy keys idle.

## Follow-Ups After the Rotation

- [ ] Make `SUPABASE_JWT_SECRET` optional in `backend/auth.py` and drop the HS256 branch once both projects have revoked the legacy secret.
- [ ] Update `.env.example`, `README.md`, and `docs/Deployment_Plan.md` to describe the publishable and secret keys and per environment keys.
- [ ] Keep keys separate per environment from here on, so a dev leak never touches prod.
- [ ] Set spend limits on the OpenAI projects.
- [ ] Add a short note to `security-update.md` recording what was rotated and when.

## Sources

- [Railway, Security Disclosure Wednesday October 21st](https://blog.railway.com/p/security-disclosure-wednesday-october-21st)
- [Railway, Preliminary Report on the October 21st Security Incident](https://blog.railway.com/p/preliminary-report-october-security-incident)
- [GitGuardian, New Railway Incident](https://blog.gitguardian.com/railway-october-2026-incident-environment-variables/)
- [Supabase, JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase, Understanding API Keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase, Rotating Anon, Service, and JWT Secrets](https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd)
