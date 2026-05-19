# EXECUTOR Deployment

## Recommended Free Setup

Use Cloudflare Workers for the app and Vultr for the monitor worker.

- App URL: free Cloudflare `workers.dev` URL, no paid domain required.
- Database/auth/storage: Supabase.
- AI: Google Gemini Agent Platform or AI Studio, using your existing credits/keys.
- Scheduled enforcement: Vultr VM running `npm run monitor` with PM2.

Vercel also gives free `*.vercel.app` URLs, but this repo is already built with the Cloudflare/TanStack Start adapter. Cloudflare is the lowest-risk deploy target for this codebase.

## 1. Deploy The App To Cloudflare Workers

Cloudflare Workers cannot use your local Google ADC login. For Cloudflare deploys, use either:

```env
AI_PROVIDER=google-ai-studio
GEMINI_API_KEY=...
```

or provide a deployable Agent Platform API key:

```env
AI_PROVIDER=agent-platform
GOOGLE_AGENT_PLATFORM_API_KEY=...
```

Create or log into a free Cloudflare account:

https://dash.cloudflare.com/sign-up

Install/login with Wrangler from this repo:

```bash
npx wrangler login
```

Build locally:

```bash
npm run build
```

Set production secrets. Do not paste secrets into `wrangler.jsonc`.

Fast path from your local `.env`:

```bash
npm run secrets:cloudflare
```

The script prints key names only, not values, then uploads them with `wrangler secret bulk`.

Manual path:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put AI_PROVIDER
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_API_KEY
npx wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY
npx wrangler secret put GOOGLE_CLOUD_PROJECT
npx wrangler secret put GOOGLE_CLOUD_LOCATION
npx wrangler secret put GOOGLE_GENAI_USE_ENTERPRISE
npx wrangler secret put GEMINI_PRO_MODEL
npx wrangler secret put GEMINI_FLASH_MODEL
npx wrangler secret put SPEECHMATICS_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
npx wrangler secret put ASANA_ACCESS_TOKEN
npx wrangler secret put ASANA_PROJECT_GID
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATABASE_ID
npx wrangler secret put JIRA_BASE_URL
npx wrangler secret put JIRA_EMAIL
npx wrangler secret put JIRA_API_TOKEN
npx wrangler secret put JIRA_PROJECT_KEY
npx wrangler secret put CRON_SECRET
npx wrangler secret put INGEST_WEBHOOK_SECRET
npx wrangler secret put PUBLIC_APP_URL
```

Deploy:

```bash
npm run deploy:cloudflare
```

Cloudflare will return a URL like:

```text
https://executor.<your-cloudflare-subdomain>.workers.dev
```

Current deployed URL:

```text
https://executor.genesis-ai.workers.dev
```

After deployment, set `PUBLIC_APP_URL` to that exact URL in Cloudflare secrets:

```bash
npx wrangler secret put PUBLIC_APP_URL
```

## 2. Configure Supabase Redirect URLs

In Supabase:

https://supabase.com/dashboard

Go to:

```text
Authentication -> URL Configuration
```

Set:

```text
Site URL: https://executor.genesis-ai.workers.dev
```

Add redirect URLs:

```text
https://executor.genesis-ai.workers.dev/dashboard
https://executor.genesis-ai.workers.dev/**
http://127.0.0.1:5174/**
```

## 3. Run The Monitor On Vultr

Create a small Ubuntu VM on Vultr. The cheapest instance is enough for the monitor because it only calls the deployed app every few hours.

On the VM:

```bash
sudo apt update
sudo apt install -y git
git clone <your-repo-url> executor
cd executor
bash scripts/setup-vultr-monitor.sh
```

Set only the monitor values in the VM `.env`:

```env
API_URL=https://executor.genesis-ai.workers.dev
CRON_SECRET=the-same-secret-used-in-cloudflare
MONITOR_CRON=0 */6 * * *
```

Start it:

```bash
pm2 start "npm run monitor" --name executor-monitor
pm2 save
pm2 startup
pm2 status
```

Manual monitor test:

```bash
curl -X POST "$API_URL/api/public/monitor" -H "Authorization: Bearer $CRON_SECRET"
```

Expected response:

```json
{"ok":true}
```

## 4. Email Reality Check

Resend requires a verified sending domain for real outbound email. Without a paid/custom domain, `onboarding@resend.dev` is only suitable for testing and may not deliver to arbitrary owners/managers.

For demo without a paid domain:

- keep follow-ups in review mode,
- show the drafted emails in EXECUTOR,
- manually send test emails only to addresses Resend allows,
- or use Gmail/Google Workspace later if real sending must work without buying a domain.

## 5. Production Smoke Test

Run this sequence after deployment:

1. Sign up/sign in on the `workers.dev` URL.
2. Create a meeting from transcript.
3. Extract action items.
4. Open the meeting detail page.
5. Sync one item to Jira, Asana, and Notion.
6. Add an owner email and manager email.
7. Make the item overdue.
8. Run the monitor endpoint manually.
9. Check Follow-ups for draft creation.
10. Mark the item complete and confirm pending follow-ups are cancelled.
