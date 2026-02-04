-- Rental lines scheduling + charge generation

alter table rental_lines
  add column if not exists next_charge_date date;

create or replace function public.next_charge_date_for(freq text, base_date date)
returns date as $$
begin
  if freq = 'weekly' then
    return base_date + interval '7 days';
  elsif freq = 'yearly' then
    return base_date + interval '1 year';
  else
    return base_date + interval '1 month';
  end if;
end;
$$ language plpgsql immutable;

create or replace function public.generate_rental_charges(target_org uuid)
returns int as $$
declare
  created_count int := 0;
  line_record record;
  next_date date;
  contract_start date;
begin
  for line_record in
    select rl.id, rl.contract_id, rl.asset_id, rl.rate, rl.frequency, rl.next_charge_date
    from rental_lines rl
    join rental_contracts rc on rc.id = rl.contract_id
    where rc.org_id = target_org
  loop
    select rc.start_date into contract_start from rental_contracts rc where rc.id = line_record.contract_id;
    next_date := coalesce(line_record.next_charge_date, contract_start);

    while next_date is not null and next_date <= current_date loop
      insert into rental_charges (org_id, contract_id, asset_id, amount, status, due_date)
      values (target_org, line_record.contract_id, line_record.asset_id, line_record.rate, 'open', next_date);
      created_count := created_count + 1;
      next_date := public.next_charge_date_for(line_record.frequency, next_date);
    end loop;

    update rental_lines
      set next_charge_date = next_date
      where id = line_record.id;
  end loop;

  return created_count;
end;
$$ language plpgsql security definer;

