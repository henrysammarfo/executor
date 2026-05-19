# Executor Submission Fields

## Cover Image

Upload:

`submission/executor-cover.png`

## Video Presentation

Record a 2 minute screen demo using:

`submission/demo-video-script.md`

## Slide Presentation

Upload:

`submission/executor-pitch-deck.pdf`

## Short Description

Executor is an autonomous meeting-to-execution agent that extracts commitments, syncs them to Jira, Asana, and Notion, monitors deadlines, and drafts follow-ups or manager escalations when execution stalls.

## Long Description

Executor is an autonomous meeting-to-execution enforcement system built for enterprise teams that lose accountability after meetings. Most AI meeting tools stop at summaries, but Executor continues into execution by extracting commitments, identifying owners, deadlines, priorities, and source quotes, then turning those decisions into tracked work.

Users can upload transcripts or run live meetings with Speechmatics real-time transcription. Gemini analyzes the meeting, extracts structured action items, scores execution risk, and powers follow-up drafting. Each commitment can be synced directly into Jira, Asana, and Notion, connecting meeting decisions to the tools teams already use.

Executor also runs a background enforcement agent deployed on Vultr. The monitor checks deadlines every six hours, marks overdue commitments, drafts follow-up emails, retries failed sends, and escalates to managers after repeated missed follow-ups. Human review remains available before sensitive messages are sent, while every autonomous action is stored in an audit log.

The application is deployed publicly on Cloudflare Workers, uses Supabase for authentication and database storage, Gemini for reasoning, Speechmatics for voice transcription, and Vultr for the scheduled enforcement worker. Executor closes the gap between "we decided" and "it actually got done."

## Technologies Used

Gemini, Google AI Studio, Speechmatics, Vultr, Supabase, Cloudflare Workers, React, TanStack Start, TypeScript, Tailwind CSS, Jira API, Asana API, Notion API, Resend, PM2

## Event Tracks

Google Track, Vultr, Speechmatics, Enterprise Utility, Agentic Workflows, Intelligent Reasoning, Collaborative Systems, Multimodal Intelligence

## Demo Application Platform

Cloudflare Workers plus Vultr VM monitor

## Application URL

https://executor.genesis-ai.workers.dev
