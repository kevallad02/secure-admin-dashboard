-- Purchase receipts

create table if not exists purchase_receipts (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  po_id uuid references purchase_orders(id) on delete set null,
  status text default 'received',
  total numeric default 0,
  received_at timestamp default now(),
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists purchase_receipt_lines (
  id uuid default gen_random_uuid(),
  receipt_id uuid references purchase_receipts(id) on delete cascade,
  product_id uuid references products(id),
  qty numeric not null,
  unit_cost numeric not null,
  created_at timestamp default now(),
  primary key (id)
);

alter table purchase_receipts enable row level security;
alter table purchase_receipt_lines enable row level security;

create policy "Members can read purchase_receipts"
on purchase_receipts for select
using (public.is_org_member(org_id));
create policy "Managers can write purchase_receipts"
on purchase_receipts for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read purchase_receipt_lines"
on purchase_receipt_lines for select
using (public.is_org_member((select pr.org_id from purchase_receipts pr where pr.id = receipt_id)));
create policy "Managers can write purchase_receipt_lines"
on purchase_receipt_lines for all
using (public.has_org_role((select pr.org_id from purchase_receipts pr where pr.id = receipt_id), array['owner','admin','manager']))
with check (public.has_org_role((select pr.org_id from purchase_receipts pr where pr.id = receipt_id), array['owner','admin','manager']));

