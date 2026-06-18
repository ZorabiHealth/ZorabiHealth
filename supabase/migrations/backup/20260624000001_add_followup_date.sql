-- Add followup_date column to prescriptions table
alter table if exists prescriptions
  add column if not exists followup_date date;
