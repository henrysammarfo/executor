
-- Add failed status to followup_status enum
ALTER TYPE followup_status ADD VALUE IF NOT EXISTS 'failed';

-- Retry tracking on follow_ups
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- Unique guard: only one active follow-up per action item
CREATE UNIQUE INDEX IF NOT EXISTS follow_ups_active_unique
  ON public.follow_ups (action_item_id)
  WHERE status IN ('pending_review', 'auto_send');

-- Meetings: source label (manual | webhook)
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Execution audit log
CREATE TABLE IF NOT EXISTS public.execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'info',
  message text,
  meeting_id uuid,
  action_item_id uuid,
  follow_up_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS execution_log_owner_created ON public.execution_log (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS execution_log_event ON public.execution_log (event_type, created_at DESC);

ALTER TABLE public.execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_select_own" ON public.execution_log
  FOR SELECT USING (auth.uid() = owner_id);
