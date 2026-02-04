-- Prevent negative stock values

alter table stock_levels
  add constraint stock_levels_non_negative
  check (qty_on_hand >= 0 and qty_reserved >= 0);

