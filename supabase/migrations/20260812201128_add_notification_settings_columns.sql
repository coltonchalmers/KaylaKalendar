/*
# Add admin notification settings columns

## Overview
Adds configurable notification columns to admin_settings so the admin can control
how far in advance to be notified of upcoming meetings, whether notifications are
enabled, and where to send them.

## Modified Tables
### admin_settings
New columns:
- notification_enabled (boolean, default false) -- master toggle for admin notifications
- notification_lead_hours (integer, default 24) -- how many hours before a meeting to send a reminder
- notification_email (text, default '') -- email address to send notifications to (falls back to contact_email if empty)

## Security
No new tables. Existing RLS policies on admin_settings already cover these columns
(anon can SELECT, authenticated owner can INSERT/UPDATE/DELETE).

## Notes
1. All columns have safe defaults so existing rows are unaffected.
2. The frontend will use notification_email if set, otherwise fall back to contact_email.
*/

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN notification_enabled boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN notification_lead_hours integer NOT NULL DEFAULT 24;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN notification_email text NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
