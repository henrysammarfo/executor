
ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS jira_issue_key text,
  ADD COLUMN IF NOT EXISTS jira_issue_url text,
  ADD COLUMN IF NOT EXISTS asana_task_gid text,
  ADD COLUMN IF NOT EXISTS asana_task_url text;

CREATE INDEX IF NOT EXISTS idx_action_items_jira_key ON public.action_items(jira_issue_key) WHERE jira_issue_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_asana_gid ON public.action_items(asana_task_gid) WHERE asana_task_gid IS NOT NULL;
