-- Guard against transfers that would make stock negative

create or replace function public.guard_transfer_stock()
returns trigger as $$
declare
  current_qty numeric;
begin
  if new.type <> 'transfer' then
    return new;
  end if;

  -- Only validate for negative movements (from location)
  if new.qty < 0 then
    select qty_on_hand into current_qty
    from public.stock_levels
    where org_id = new.org_id
      and product_id = new.product_id
      and location_id = new.location_id
      and variant_id is null
    limit 1;

    if current_qty is null or current_qty + new.qty < 0 then
      raise exception 'Insufficient stock for transfer';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_transfer_stock on public.stock_movements;
create trigger guard_transfer_stock
  before insert on public.stock_movements
  for each row execute procedure public.guard_transfer_stock();

