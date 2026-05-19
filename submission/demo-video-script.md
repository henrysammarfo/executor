# Executor Demo Video Script

Target length: 2 minutes.

## Opening, 10 seconds

Executor is an autonomous meeting-to-execution system. Most AI meeting tools summarize what happened. Executor keeps going until the work is assigned, monitored, followed up, and escalated when it stalls.

## Problem, 15 seconds

The real failure is not action-item extraction. It is the accountability gap after the meeting. Owners are unclear, deadlines slip, project tools are not updated, and managers find out too late.

## Product Demo, 70 seconds

1. Open the live app: https://executor.genesis-ai.workers.dev
2. Sign in and show the dashboard.
3. Go to Live meeting or New meeting.
4. Capture or paste a short meeting transcript.
5. Click Extract.
6. Show Gemini creating structured action items with owner, priority, deadline, source quote, and risk score.
7. Open the meeting detail page.
8. Show the transcript, action item editor, and external sync options.
9. Sync one item to Jira, Asana, or Notion.
10. Go to Follow-ups.
11. Show the AI-drafted follow-up or escalation waiting for human review.

## Architecture, 35 seconds

Executor uses Speechmatics for live transcription, Gemini for structured reasoning and follow-up drafting, Supabase for auth and database storage, Cloudflare Workers for the public app, and a Vultr Ubuntu VM for the autonomous monitor. The Vultr monitor runs every six hours with PM2 and checks overdue commitments through the production monitor endpoint.

## Closing, 20 seconds

Executor is built for teams that need more than meeting notes. It connects the decision to the task, watches execution risk over time, and creates accountable follow-through with human review gates. The result is simple: fewer dropped commitments and faster movement from decision to done.

## Recommended Recording Checklist

- Keep browser zoom at 100 percent.
- Record only the browser window.
- Avoid showing `.env`, terminal secrets, API keys, or Supabase service keys.
- Use a test account and test meeting data.
- If email sending is not demonstrated, say follow-up drafts are intentionally held for human review.
