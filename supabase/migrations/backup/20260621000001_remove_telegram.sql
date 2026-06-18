-- Migration: Remove Telegram Integration
-- Drops the unused telegram_links table from the schema.

drop table if exists telegram_links cascade;
