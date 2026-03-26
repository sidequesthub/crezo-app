-- Add scheduled_time column to content_slots
alter table content_slots add column if not exists scheduled_time time;
