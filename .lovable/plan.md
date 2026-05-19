# EXECUTOR — Build Plan

Autonomous multi-agent system that turns meeting decisions into tracked, enforced commitments. Marketing landing + full dashboard product, fully responsive.

## Scope for this build

Hackathon-grade, demo-ready app. Frontend + backend wired end-to-end in this TanStack Start project. Lovable Cloud will back the database/auth/storage instead of Supabase-by-hand, and Lovable AI Gateway (Gemini) will power extraction/risk/follow-up drafting. Speechmatics is wired via a server route using a user-provided API key.

## Tech mapping (adapted from the brief)

- Framework: TanStack Start (this template) instead of Next.js — same capabilities, native to project.
- DB/Auth/Storage: Lovable Cloud (Postgres + RLS + storage for audio uploads).
- AI: Lovable AI Gateway with `google/gemini-3-pro-preview` for extraction + risk + email drafting, `google/gemini-3-flash-preview` for lighter assigner step.
- Voice: Speechmatics batch API for uploaded audio; "Live" mode in v1 uses browser SpeechRecognition fallback + paste-transcript path (real-time WebSocket from browser → Speechmatics needs a JWT issuer route; included).
- Cron monitor: TanStack server route `/api/public/monitor` + `pg_cron` calling it every 6h on the stable preview/published URL.
- Email: Resend (user adds `RESEND_API_KEY`) — replaces Nodemailer (Nodemailer is Node-only, not Worker-safe).

## Pages (each its own route, SSR-friendly, unique head())

```
src/routes/
  __root.tsx              shared shell + nav + footer
  index.tsx               landing (hero with video, problem, 5-agent diagram, pricing, CTA)
  product.tsx             product deep-dive
  pricing.tsx             pricing tiers
  about.tsx               vision / why-now
  login.tsx               auth (email + password via Lovable Cloud)
  _authenticated.tsx      guard
  _authenticated/dashboard.tsx     kanban: In Progress | Overdue | Complete + risk + completion gauge
  _authenticated/upload.tsx        drag-drop audio OR paste transcript, organizer, title
  _authenticated/live.tsx          live transcription view + "Extract action items"
  _authenticated/meetings.$id.tsx  meeting detail + extracted items + follow-ups
  _authenticated/followups.tsx     pending drafts with 24h countdown + Send Now
  api/transcribe.ts                POST audio → Speechmatics batch → transcript
  api/speechmatics-token.ts        POST → short-lived JWT for browser live mode
  api/extract.ts                   POST transcript_id → Gemini JSON → action_items
  api/score-risk.ts                POST item_id → Gemini risk score
  api/draft-followup.ts            POST item_id → Gemini email draft
  api/send-followup.ts             POST followup_id → Resend send
  api/public/monitor.ts            cron entry: scan overdue, draft, auto-send >24h
```

## Database (Lovable Cloud)

- `profiles(id, email, full_name)`
- `meetings(id, owner_id, title, organizer_email, transcript_text, audio_path, created_at)`
- `action_items(id, meeting_id, what, who_name, who_email, due_date, priority, status['open'|'overdue'|'complete'], risk_score, risk_reason, verbatim_quote, created_at, completed_at)`
- `follow_ups(id, action_item_id, draft_email, status['pending_review'|'auto_send'|'sent'|'cancelled'], scheduled_send_at, sent_at)`
- `user_roles(user_id, role)` + `has_role()` SECURITY DEFINER (per template rules)
- RLS: owners see their meetings/items/follow-ups; service role used only by `/api/public/monitor`.

## 5-Agent pipeline (server-side)

1. **Scribe** — `/api/transcribe` uploads audio to Speechmatics batch, polls, stores transcript.
2. **Extractor** — `/api/extract` calls Gemini Pro in JSON mode with the structured-extraction prompt; inserts items.
3. **Assigner** — inside extract: matches `who` to emails (simple directory table for demo), inserts rows, sends assignment email via Resend.
4. **Monitor** — `/api/public/monitor` (cron, every 6h via `pg_cron`): marks overdue, triggers drafts.
5. **Executor** — `/api/draft-followup` (Gemini) writes the email; `/api/send-followup` sends; auto-sends after 24h via monitor; escalates to manager after 2 misses.

## Landing hero (per attached template)

Exact spec implemented: `min-h-screen`, `pt-[290px]`, `max-w-[1200px]`, `gap-y-8`, background video (the provided CloudFront mp4) with `object-cover [transform:scaleY(-1)]`, white gradient overlay `from-[26.416%] from-[rgba(255,255,255,0)] to-[66.943%] to-white`, Geist + Instrument Serif typography ("Simple [management] for your remote team" — we'll adapt to: "Turn meetings into [execution] for your team"), rounded email capture (40px, bg `#fcfcfc`, soft shadow), dark glossy CTA with the exact inset shadow string, "1,020+ Reviews" social proof row, Motion staggered fade+slide-up entrance. Fully responsive: padding/typography scale down at `md`/`sm` breakpoints (e.g. `pt-[290px] md:pt-40 pt-24`, heading `text-[80px] md:text-6xl text-4xl`).

## Design system

Light, editorial, premium. Add tokens to `src/styles.css`:

- `--background` near-white, `--foreground` slate `#373a46`, `--primary` near-black with subtle gradient utility `--gradient-cta`, `--shadow-soft` `0 10px 40px 5px rgba(194,194,194,0.25)`, accent for risk badges (green/amber/red).
- Fonts: load Geist + Instrument Serif via `<link>` in `__root.tsx` head.

## Secrets needed (will request after Cloud enable)

- `SPEECHMATICS_API_KEY`
- `RESEND_API_KEY`
- `LOVABLE_API_KEY` (auto)

## Build order

1. Enable Lovable Cloud → migrations for all tables + RLS + roles.
2. Landing page hero + nav/footer + responsive design system tokens + fonts.
3. Auth (login/signup) + `_authenticated` guard.
4. Upload page → `/api/transcribe` + `/api/extract` (Gemini JSON mode) → store items.
5. Dashboard (3-column kanban, completion gauge, risk badges).
6. Follow-ups page + draft/send routes.
7. Monitor cron route + pg_cron schedule.
8. Live page (Speechmatics JWT route + browser WS) — best-effort; falls back to paste mode.
9. Marketing pages (product / pricing / about) with unique `head()`.
10. Polish: Motion entrance animations, mobile pass, empty states, toasts.

## Out of scope for v1 (callable later)

- Real Jira/Asana/Notion webhook fan-out (DB is source of truth; assignment email covers the demo).
- Manager escalation tree beyond 2-strike rule.
- On-device Speechmatics self-host (uses hosted API).

Ready to build on approval.
