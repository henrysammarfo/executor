# EXECUTOR Judge Brief

## One-Line Summary

EXECUTOR is an autonomous meeting-to-execution system that turns meetings into tracked commitments, syncs work into project tools, monitors deadlines, and drafts follow-ups or manager escalations when execution stalls.

## Live Links

- Public demo: https://executor.genesis-ai.workers.dev
- Repository: https://github.com/henrysammarfo/executor
- Submission media: [submission/](./submission)
- Deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Best-Fit Tracks

- Google Track
- Vultr
- Speechmatics
- Enterprise Utility
- Agentic Workflows
- Intelligent Reasoning
- Collaborative Systems
- Multimodal Intelligence

## Sponsor Integration

- Gemini: structured action-item extraction, owner/deadline/priority detection, risk scoring, follow-up drafting, and escalation drafting.
- Speechmatics: live meeting transcription and transcript ingestion for voice-first meeting capture.
- Vultr: always-on monitor worker running under PM2 on an Ubuntu VM, calling the production monitor endpoint every six hours.

## Autonomous Agent Pipeline

1. Scribe: converts meeting audio or live speech into transcript text.
2. Extractor: uses Gemini to extract structured commitments with evidence quotes.
3. Assigner: stores commitments and syncs them to Jira, Asana, or Notion.
4. Monitor: checks status and deadlines on a schedule, updates overdue state, and writes audit events.
5. Executor: drafts owner follow-ups and manager escalations with human review gates.

## What Makes It Different

Most meeting AI products stop at summaries. EXECUTOR starts there and continues into execution: task creation, monitoring, risk scoring, follow-up drafting, escalation, and audit logging.

## Judging Criteria Mapping

- Application of technology: Gemini, Speechmatics, Vultr, Supabase, Cloudflare Workers, Jira, Asana, Notion, and Resend are connected in one working workflow.
- Presentation: submission includes a cover image, pitch deck, demo script, live URL, README, and this judge brief.
- Business value: targets the expensive accountability gap after enterprise meetings, where commitments are often lost after decisions are made.
- Originality: focuses on autonomous execution enforcement rather than passive summarization.

## Demo Path

1. Sign in to the live demo.
2. Create a meeting from pasted transcript or live Speechmatics capture.
3. Extract action items with Gemini.
4. Open a meeting detail page and inspect transcript, evidence quotes, owner, priority, deadline, and risk score.
5. Sync a commitment to Jira, Asana, or Notion.
6. Review drafted follow-ups and manager escalations in the Follow-ups screen.

## Safety And Compliance

- Secrets are environment-based and ignored from Git.
- Server-only Supabase service role usage.
- Public monitor endpoint is protected by `CRON_SECRET`.
- Public ingest endpoint requires HMAC through `INGEST_WEBHOOK_SECRET`.
- Human review is available before sensitive follow-up communications are sent.
- Every autonomous action is written to an audit log.

## Production Status

- Public app deployed on Cloudflare Workers.
- Vultr monitor worker running separately from the web app.
- Supabase handles auth and persistent data.
- Build and lint pass, with only existing shadcn Fast Refresh warnings.
