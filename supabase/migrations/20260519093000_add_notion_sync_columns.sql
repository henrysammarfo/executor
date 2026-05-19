ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS notion_page_id text,
  ADD COLUMN IF NOT EXISTS notion_page_url text;

CREATE INDEX IF NOT EXISTS idx_action_items_notion_page_id
  ON public.action_items(notion_page_id)
  WHERE notion_page_id IS NOT NULL;
