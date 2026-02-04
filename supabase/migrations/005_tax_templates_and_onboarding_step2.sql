-- Tax templates by country + org settings country code

alter table org_settings
  add column if not exists country_code text;

create table if not exists org_tax_templates (
  id uuid default gen_random_uuid(),
  country_code text not null,
  name text not null,
  rate numeric default 0,
  tax_included boolean default false,
  is_default boolean default false,
  created_at timestamp default now(),
  primary key (id)
);

alter table org_tax_templates enable row level security;

create policy "Members can read tax templates"
on org_tax_templates for select
using (auth.uid() is not null);

create policy "Admins can manage tax templates"
on org_tax_templates for all
using (public.has_org_role((select om.org_id from public.org_members om where om.user_id = auth.uid() order by om.created_at asc limit 1), array['owner','admin']))
with check (public.has_org_role((select om.org_id from public.org_members om where om.user_id = auth.uid() order by om.created_at asc limit 1), array['owner','admin']));

insert into org_tax_templates (country_code, name, rate, tax_included, is_default)
values
  ('US', 'US Sales Tax (Avg)', 7.25, false, true),
  ('GB', 'UK VAT (Standard)', 20, true, true),
  ('PK', 'Pakistan GST (Standard)', 18, false, true),
  ('IN', 'India GST (Standard)', 18, false, true),
  ('AE', 'UAE VAT (Standard)', 5, true, true),
  ('DE', 'Germany VAT (Standard)', 19, true, true),
  ('FR', 'France VAT (Standard)', 20, true, true);

