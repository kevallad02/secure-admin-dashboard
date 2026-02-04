-- Rental recurring charges

create table if not exists rental_charges (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  contract_id uuid references rental_contracts(id) on delete cascade,
  asset_id uuid references assets(id) on delete set null,
  amount numeric not null,
  status text default 'open',
  due_date date,
  paid_at timestamp,
  created_at timestamp default now(),
  primary key (id)
);

alter table rental_charges enable row level security;

create policy "Members can read rental_charges"
on rental_charges for select
using (public.is_org_member(org_id));
create policy "Managers can write rental_charges"
on rental_charges for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

