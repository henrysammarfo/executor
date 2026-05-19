# EXECUTOR

Autonomous meeting-to-execution enforcement. EXECUTOR turns meeting audio or transcripts into owned commitments, monitors whether they are completed, and drafts or sends follow-ups when deadlines slip.

## Architecture

- Scribe: Speechmatics batch transcription for uploads and Speechmatics realtime transcription for live meetings.
- Extractor: Gemini extracts structured action items with owner, deadline, priority, and source quote.
- Assigner: current app stores commitments and owner metadata, with Jira, Asana, and Notion sync from each action item.
- Monitor: secured cron endpoint marks overdue items, drafts follow-ups, retries failed sends, escalates to managers after repeated misses, and writes audit events.
- Executor: reviewable follow-up drafts with a 24-hour send window, retry/failure tracking, and manager escalation.

## Stack

- TanStack Start, React 19, Vite, Tailwind CSS
- Supabase Auth, Postgres, Storage, and RLS
- Speechmatics batch and realtime APIs
- Gemini models via direct Google AI Studio API keys or Gemini Enterprise Agent Platform with Google Cloud project billing
- Resend API for outbound follow-up email
- Vultr VM or any Node host for the scheduled monitor worker

## Required Environment

Copy `.env.example` to `.env` and set:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `AI_PROVIDER`
- `GEMINI_API_KEY` for AI Studio mode
- `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` for Agent Platform mode
- `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_AGENT_PLATFORM_API_KEY` for Agent Platform auth
- `SPEECHMATICS_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `CRON_SECRET`
- `INGEST_WEBHOOK_SECRET`
- `PUBLIC_APP_URL`

Use the same `CRON_SECRET` in the deployed app and the Vultr monitor worker.

For Google Cloud trial credits, prefer Gemini Enterprise Agent Platform mode:

```bash
AI_PROVIDER=agent-platform
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_USE_ENTERPRISE=true
GEMINI_PRO_MODEL=gemini-3.1-pro-preview
GEMINI_FLASH_MODEL=gemini-3-flash-preview
```

Then authenticate with Application Default Credentials locally:

```bash
gcloud auth application-default login
```

For a deployed VM, set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file path, or use the platform's default service account when running on Google Cloud.

## Local Development

```bash
npm install --no-audit --no-fund
npm run dev
```

## Verification

```bash
npm run lint
npm run build
npm run deploy:cloudflare:dry
```

Current lint status: passes with warnings from generated shadcn UI components that export helper constants alongside components.

## Monitor Worker

The app exposes `POST /api/public/monitor`, protected by `CRON_SECRET` through either:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-key: <CRON_SECRET>`

The worker script lives at `scripts/monitor.mjs` and defaults to every 6 hours.

```bash
API_URL=https://your-deployed-app.example
CRON_SECRET=replace-me
MONITOR_CRON="0 */6 * * *"
npm run monitor
```

## Production Deployment

Use Cloudflare Workers for the free public app URL and Vultr for the always-on monitor worker. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Vultr Deployment For Monitor

On a Vultr Ubuntu VM:

```bash
sudo apt update
sudo apt install -y git
git clone <your-repo-url> executor
cd executor
bash scripts/setup-vultr-monitor.sh
```

Set at least:

```bash
API_URL=https://executor.genesis-ai.workers.dev
CRON_SECRET=the-same-secret-as-the-app
MONITOR_CRON=0 */6 * * *
```

Start the worker:

```bash
pm2 start "npm run monitor" --name executor-monitor
pm2 save
pm2 startup
pm2 status
```

Manual smoke test:

```bash
curl -X POST "$API_URL/api/public/monitor" -H "Authorization: Bearer $CRON_SECRET"
```

## Demo Flow

1. Sign in.
2. Use New meeting to paste a transcript or upload audio.
3. EXECUTOR transcribes if needed, extracts commitments, and risk-scores them.
4. Open Dashboard to show In Progress, Overdue, and Complete.
5. Run the monitor endpoint or wait for the Vultr worker.
6. Open Follow-ups to review, send, cancel, or retry follow-up emails.
7. Use Live meeting to stream microphone audio through Speechmatics realtime, then extract the captured transcript.

## Security Notes

- `.env` is intentionally ignored and must not be committed.
- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side.
- Public ingest requires HMAC via `INGEST_WEBHOOK_SECRET`.
- Public monitor requires `CRON_SECRET`.
- All autonomous actions write to `execution_log` for auditability.
