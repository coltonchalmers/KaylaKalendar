/*
# Add global default Zoom link and pg_cron reminder schedule

## Summary
1. Adds a zoom_default_link column to admin_settings so the admin can set one
   personal Zoom link used for all meetings by default. The edge function checks
   this after booking-level and meeting-type-level links, before auto-creating.
2. Enables the pg_cron and pg_net extensions and creates a scheduled job that
   pings the send-reminders edge function every 15 minutes so client reminders,
   admin reminders, and the daily summary fire on time without manual triggers.

## New Columns
- admin_settings.zoom_default_link (text, nullable): a personal Zoom join URL
  used as the default for every meeting unless overridden by a meeting type or
  individual booking.

## Scheduled Jobs
- ping-send-reminders: runs every 15 minutes, sends an authenticated POST to
  the project send-reminders edge function using the anon key. The function
  is idempotent (dedupes via notification_log), so repeated pings are safe.

## Security
- No RLS policy changes.
- The cron job uses net.http_post with the anon key, which is safe because the
  reminder function only reads data and sends emails.

## Important Notes
1. pg_cron and pg_net are Supabase-managed extensions; enabling them is safe
   and idempotent.
2. The cron schedule runs every 15 minutes at minutes 0, 15, 30, and 45.
3. The job posts to the project send-reminders edge function with the anon
   key in the Authorization header.
*/

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS zoom_default_link text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Enable pg_cron (Supabase-managed)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net for outbound HTTP from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop existing job if re-running (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('ping-send-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule the job. The request posts to the send-reminders edge function.
-- The function is idempotent (dedupes via notification_log), so repeated
-- invocations are safe.
SELECT cron.schedule(
  'ping-send-reminders',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://fddcjmvhzqyiyolthplp.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZGNqbXZoenF5aXlvbHRocGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Nzc5OTksImV4cCI6MjEwMjA1Mzk5OX0.djcjzmvPzl4Ga9Z-waYCQdlZx2Rd72VL8JPMhRc-8I8'
      ),
      body := '{}'::jsonb
    );
  $$
);
