-- Inventory + Billing SaaS schema (multi-tenant)

-- Organizations (tenants)
create table if not exists organizations (
  id uuid default gen_random_uuid(),
  name text not null,
  plan text default 'free',
  created_at timestamp default now(),
  primary key (id)
);

-- Organization members and roles
create table if not exists org_members (
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',
  created_at timestamp default now(),
  primary key (org_id, user_id)
);

-- Add org_id to activity_logs for tenant scoping
alter table activity_logs
  add column if not exists org_id uuid references organizations(id) on delete set null;

-- Catalog
create table if not exists categories (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists units (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  symbol text,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists products (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  sku text,
  type text default 'stock', -- stock | serialized | perishable | rental_asset | service
  unit_id uuid references units(id),
  category_id uuid references categories(id),
  track_inventory boolean default true,
  is_active boolean default true,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists product_variants (
  id uuid default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  name text not null,
  sku text,
  attributes jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists custom_fields (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  entity text not null, -- product | asset | customer | vendor | etc
  name text not null,
  field_type text not null, -- text | number | date | select | boolean
  required boolean default false,
  options jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists custom_field_values (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  field_id uuid references custom_fields(id) on delete cascade,
  value jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  primary key (id)
);

-- Inventory
create table if not exists locations (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  type text default 'warehouse',
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists stock_levels (
  org_id uuid references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  location_id uuid references locations(id) on delete cascade,
  qty_on_hand numeric default 0,
  qty_reserved numeric default 0,
  updated_at timestamp default now(),
  primary key (org_id, product_id, location_id, variant_id)
);

create table if not exists stock_movements (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  qty numeric not null,
  type text not null, -- receipt | sale | adjustment | transfer | return
  ref_type text,
  ref_id uuid,
  created_at timestamp default now(),
  primary key (id)
);

-- Purchases
create table if not exists vendors (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  contact jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists purchase_orders (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  vendor_id uuid references vendors(id),
  status text default 'draft',
  total numeric default 0,
  ordered_at timestamp,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists purchase_order_lines (
  id uuid default gen_random_uuid(),
  po_id uuid references purchase_orders(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  qty numeric not null,
  unit_cost numeric not null,
  created_at timestamp default now(),
  primary key (id)
);

-- Sales & Billing
create table if not exists customers (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  name text not null,
  contact jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists sales_orders (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  status text default 'draft',
  total numeric default 0,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists sales_order_lines (
  id uuid default gen_random_uuid(),
  sales_order_id uuid references sales_orders(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  qty numeric not null,
  unit_price numeric not null,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists invoices (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  status text default 'open',
  due_date date,
  total numeric default 0,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists invoice_lines (
  id uuid default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  qty numeric not null,
  unit_price numeric not null,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists payments (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  amount numeric not null,
  method text,
  paid_at timestamp default now(),
  created_at timestamp default now(),
  primary key (id)
);

-- Rentals
create table if not exists assets (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  product_id uuid references products(id),
  serial text,
  status text default 'available', -- available | rented | service | retired
  condition text,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists rental_contracts (
  id uuid default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  start_date date not null,
  end_date date,
  billing_cycle text default 'monthly',
  total numeric default 0,
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists rental_lines (
  id uuid default gen_random_uuid(),
  contract_id uuid references rental_contracts(id) on delete cascade,
  asset_id uuid references assets(id),
  rate numeric not null,
  frequency text default 'monthly',
  created_at timestamp default now(),
  primary key (id)
);

create table if not exists rental_events (
  id uuid default gen_random_uuid(),
  contract_id uuid references rental_contracts(id) on delete cascade,
  asset_id uuid references assets(id),
  event_type text not null, -- checkout | checkin | service | replacement
  event_date timestamp default now(),
  notes text,
  created_at timestamp default now(),
  primary key (id)
);

-- Enable RLS
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table categories enable row level security;
alter table units enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;
alter table locations enable row level security;
alter table stock_levels enable row level security;
alter table stock_movements enable row level security;
alter table vendors enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_lines enable row level security;
alter table customers enable row level security;
alter table sales_orders enable row level security;
alter table sales_order_lines enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table payments enable row level security;
alter table assets enable row level security;
alter table rental_contracts enable row level security;
alter table rental_lines enable row level security;
alter table rental_events enable row level security;

-- Helper functions for RLS
create or replace function public.is_org_member(target_org uuid)
returns boolean as $$
  select exists (
    select 1 from public.org_members om
    where om.org_id = target_org
      and om.user_id = auth.uid()
  );
$$ language sql stable security definer;

create or replace function public.has_org_role(target_org uuid, roles text[])
returns boolean as $$
  select exists (
    select 1 from public.org_members om
    where om.org_id = target_org
      and om.user_id = auth.uid()
      and om.role = any(roles)
  );
$$ language sql stable security definer;

-- Organizations policies
create policy "Org members can read org"
on organizations for select
using (public.is_org_member(id));

create policy "Org owners/admins can update org"
on organizations for update
using (public.has_org_role(id, array['owner','admin']))
with check (public.has_org_role(id, array['owner','admin']));

create policy "Users can create org"
on organizations for insert
with check (auth.uid() is not null);

-- Org members policies
create policy "Org members can read members"
on org_members for select
using (public.is_org_member(org_id));

create policy "Org owners/admins can manage members"
on org_members for insert
with check (public.has_org_role(org_id, array['owner','admin']));

create policy "Org owners/admins can update members"
on org_members for update
using (public.has_org_role(org_id, array['owner','admin']))
with check (public.has_org_role(org_id, array['owner','admin']));

create policy "Org owners/admins can delete members"
on org_members for delete
using (public.has_org_role(org_id, array['owner','admin']));

-- Shared policies for org-scoped tables
-- Read: any org member
-- Write: owner/admin/manager
create policy "Members can read categories"
on categories for select
using (public.is_org_member(org_id));
create policy "Managers can write categories"
on categories for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read units"
on units for select
using (public.is_org_member(org_id));
create policy "Managers can write units"
on units for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read products"
on products for select
using (public.is_org_member(org_id));
create policy "Managers can write products"
on products for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read product_variants"
on product_variants for select
using (public.is_org_member((select p.org_id from products p where p.id = product_id)));
create policy "Managers can write product_variants"
on product_variants for all
using (public.has_org_role((select p.org_id from products p where p.id = product_id), array['owner','admin','manager']))
with check (public.has_org_role((select p.org_id from products p where p.id = product_id), array['owner','admin','manager']));

create policy "Members can read custom_fields"
on custom_fields for select
using (public.is_org_member(org_id));
create policy "Managers can write custom_fields"
on custom_fields for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read custom_field_values"
on custom_field_values for select
using (public.is_org_member(org_id));
create policy "Managers can write custom_field_values"
on custom_field_values for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read locations"
on locations for select
using (public.is_org_member(org_id));
create policy "Managers can write locations"
on locations for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read stock_levels"
on stock_levels for select
using (public.is_org_member(org_id));
create policy "Managers can write stock_levels"
on stock_levels for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read stock_movements"
on stock_movements for select
using (public.is_org_member(org_id));
create policy "Managers can write stock_movements"
on stock_movements for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read vendors"
on vendors for select
using (public.is_org_member(org_id));
create policy "Managers can write vendors"
on vendors for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read purchase_orders"
on purchase_orders for select
using (public.is_org_member(org_id));
create policy "Managers can write purchase_orders"
on purchase_orders for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read purchase_order_lines"
on purchase_order_lines for select
using (public.is_org_member((select po.org_id from purchase_orders po where po.id = po_id)));
create policy "Managers can write purchase_order_lines"
on purchase_order_lines for all
using (public.has_org_role((select po.org_id from purchase_orders po where po.id = po_id), array['owner','admin','manager']))
with check (public.has_org_role((select po.org_id from purchase_orders po where po.id = po_id), array['owner','admin','manager']));

create policy "Members can read customers"
on customers for select
using (public.is_org_member(org_id));
create policy "Managers can write customers"
on customers for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read sales_orders"
on sales_orders for select
using (public.is_org_member(org_id));
create policy "Managers can write sales_orders"
on sales_orders for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read sales_order_lines"
on sales_order_lines for select
using (public.is_org_member((select so.org_id from sales_orders so where so.id = sales_order_id)));
create policy "Managers can write sales_order_lines"
on sales_order_lines for all
using (public.has_org_role((select so.org_id from sales_orders so where so.id = sales_order_id), array['owner','admin','manager']))
with check (public.has_org_role((select so.org_id from sales_orders so where so.id = sales_order_id), array['owner','admin','manager']));

create policy "Members can read invoices"
on invoices for select
using (public.is_org_member(org_id));
create policy "Managers can write invoices"
on invoices for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read invoice_lines"
on invoice_lines for select
using (public.is_org_member((select i.org_id from invoices i where i.id = invoice_id)));
create policy "Managers can write invoice_lines"
on invoice_lines for all
using (public.has_org_role((select i.org_id from invoices i where i.id = invoice_id), array['owner','admin','manager']))
with check (public.has_org_role((select i.org_id from invoices i where i.id = invoice_id), array['owner','admin','manager']));

create policy "Members can read payments"
on payments for select
using (public.is_org_member(org_id));
create policy "Managers can write payments"
on payments for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read assets"
on assets for select
using (public.is_org_member(org_id));
create policy "Managers can write assets"
on assets for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read rental_contracts"
on rental_contracts for select
using (public.is_org_member(org_id));
create policy "Managers can write rental_contracts"
on rental_contracts for all
using (public.has_org_role(org_id, array['owner','admin','manager']))
with check (public.has_org_role(org_id, array['owner','admin','manager']));

create policy "Members can read rental_lines"
on rental_lines for select
using (public.is_org_member((select rc.org_id from rental_contracts rc where rc.id = contract_id)));
create policy "Managers can write rental_lines"
on rental_lines for all
using (public.has_org_role((select rc.org_id from rental_contracts rc where rc.id = contract_id), array['owner','admin','manager']))
with check (public.has_org_role((select rc.org_id from rental_contracts rc where rc.id = contract_id), array['owner','admin','manager']));

create policy "Members can read rental_events"
on rental_events for select
using (public.is_org_member((select rc.org_id from rental_contracts rc where rc.id = contract_id)));
create policy "Managers can write rental_events"
on rental_events for all
using (public.has_org_role((select rc.org_id from rental_contracts rc where rc.id = contract_id), array['owner','admin','manager']))
with check (public.has_org_role((select rc.org_id from rental_contracts rc where rc.id = contract_id), array['owner','admin','manager']));

-- Activity logs scoped by org membership
create policy "Members can read activity_logs by org"
on activity_logs for select
using (org_id is null or public.is_org_member(org_id));
