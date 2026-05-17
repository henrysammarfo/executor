
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Roles
create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create policy "user_roles_select_own" on public.user_roles for select using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Status enums
create type public.action_status as enum ('open', 'overdue', 'complete');
create type public.priority_level as enum ('high', 'medium', 'low');
create type public.followup_status as enum ('pending_review', 'auto_send', 'sent', 'cancelled');

-- Meetings
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  organizer_email text,
  transcript_text text,
  audio_path text,
  created_at timestamptz not null default now()
);
alter table public.meetings enable row level security;
create policy "meetings_select_own" on public.meetings for select using (auth.uid() = owner_id);
create policy "meetings_insert_own" on public.meetings for insert with check (auth.uid() = owner_id);
create policy "meetings_update_own" on public.meetings for update using (auth.uid() = owner_id);
create policy "meetings_delete_own" on public.meetings for delete using (auth.uid() = owner_id);

-- Action items
create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  what text not null,
  who_name text,
  who_email text,
  due_date timestamptz,
  priority priority_level not null default 'medium',
  status action_status not null default 'open',
  risk_score integer,
  risk_reason text,
  verbatim_quote text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.action_items enable row level security;
create policy "items_select_own" on public.action_items for select using (auth.uid() = owner_id);
create policy "items_insert_own" on public.action_items for insert with check (auth.uid() = owner_id);
create policy "items_update_own" on public.action_items for update using (auth.uid() = owner_id);
create policy "items_delete_own" on public.action_items for delete using (auth.uid() = owner_id);
create index on public.action_items(owner_id, status);
create index on public.action_items(meeting_id);

-- Follow-ups
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft_subject text not null,
  draft_email text not null,
  status followup_status not null default 'pending_review',
  scheduled_send_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.follow_ups enable row level security;
create policy "followups_select_own" on public.follow_ups for select using (auth.uid() = owner_id);
create policy "followups_insert_own" on public.follow_ups for insert with check (auth.uid() = owner_id);
create policy "followups_update_own" on public.follow_ups for update using (auth.uid() = owner_id);

-- Audio bucket
insert into storage.buckets (id, name, public) values ('audio', 'audio', false)
on conflict (id) do nothing;
create policy "audio_select_own" on storage.objects for select using (
  bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "audio_insert_own" on storage.objects for insert with check (
  bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]
);
