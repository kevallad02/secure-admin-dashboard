-- Create org + owner membership on signup

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  org_name text;
begin
  -- Create profile
  insert into public.profiles (id, email)
  values (new.id, new.email);

  -- Determine org name from user metadata (fallback)
  org_name := coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'My Organization');

  -- Create organization
  insert into public.organizations (name)
  values (org_name)
  returning id into new_org_id;

  -- Create owner membership
  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

