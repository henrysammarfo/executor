ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS manager_email text,
  ADD COLUMN IF NOT EXISTS escalation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at timestamptz;

ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_reason text;

UPDATE public.follow_ups f
SET
  recipient_email = COALESCE(f.recipient_email, ai.who_email),
  recipient_name = COALESCE(f.recipient_name, ai.who_name)
FROM public.action_items ai
WHERE f.action_item_id = ai.id;

CREATE INDEX IF NOT EXISTS idx_action_items_escalation
  ON public.action_items(owner_id, status, escalation_count, last_escalated_at);

CREATE INDEX IF NOT EXISTS idx_followups_action_escalation
  ON public.follow_ups(action_item_id, escalation_level, status, sent_at DESC);
