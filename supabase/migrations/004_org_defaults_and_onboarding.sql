-- Org defaults, onboarding settings, and activity log org scoping

-- Add onboarding flag to organizations
alter table organizations
  add column if not exists onboarding_completed_at timestamp;

-- Org settings
create table if not exists org_settings (
  org_id uuid references organizations(id) on delete cascade,
  currency_code text default 'USD',
  tax_rate numeric default 0,
  tax_included boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  primary key (org_id)
);

alter table org_settings enable row level security;

create policy "Members can read org_settings"
on org_settings for select
using (public.is_org_member(org_id));

create policy "Managers can write org_settings"
on org_settings for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

-- Update signup trigger to seed defaults
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  org_name text;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  org_name := coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'My Organization');

  insert into public.organizations (name)
  values (org_name)
  returning id into new_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  -- Seed default units
  insert into public.units (org_id, name, symbol)
  values
    (new_org_id, 'Pieces', 'pcs'),
    (new_org_id, 'Kilogram', 'kg'),
    (new_org_id, 'Box', 'box');

  -- Seed default categories
  insert into public.categories (org_id, name)
  values
    (new_org_id, 'General'),
    (new_org_id, 'Electronics'),
    (new_org_id, 'Frozen');

  return new;
end;
$$ language plpgsql security definer;

-- Auto-assign org_id to activity logs
create or replace function public.set_activity_log_org()
returns trigger as $$
begin
  if new.org_id is null and new.user_id is not null then
    select om.org_id into new.org_id
    from public.org_members om
    where om.user_id = new.user_id
    order by om.created_at asc
    limit 1;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_activity_log_org on public.activity_logs;
create trigger set_activity_log_org
  before insert on public.activity_logs
  for each row execute procedure public.set_activity_log_org();

