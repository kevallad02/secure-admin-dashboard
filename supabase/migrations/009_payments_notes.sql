-- Add notes to payments for audit trail (refund reasons, etc.)

alter table payments
  add column if not exists notes text;

