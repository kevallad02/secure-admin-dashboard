-- Set profile role to owner on signup

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  org_name text;
begin
  -- Create profile with owner role
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'owner');

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

