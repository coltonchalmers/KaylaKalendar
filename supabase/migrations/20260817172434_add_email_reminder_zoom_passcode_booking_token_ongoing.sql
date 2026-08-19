/*
# Add email reminder, daily summary, Zoom passcode, booking token, and ongoing recurring settings

## Summary
This migration adds comprehensive email notification, reminder, and booking management features:
- Client/admin reminder lead time settings
- Admin daily summary mode with configurable time and night-before option
- Zoom default passcode setting
- Cancellation and reschedule email type settings (enabled flag, template, element overrides)
- Booking token for secure client self-serve cancel/reschedule links
- Zoom passcode storage per booking (default or random)
- is_ongoing flag on recurring_links for indefinite series

## New Columns on admin_settings
- client_reminder_lead_hours (integer, default 24): hours before meeting to send client reminder
- admin_reminder_mode (text, default 'individual'): 'individual' or 'daily' summary mode
- admin_daily_summary_time (text, default '07:00'): time to send daily summary (HH:MM)
- admin_daily_summary_night_before (boolean, default false): send summary evening before instead of morning of
- zoom_default_passcode (text, nullable): default passcode for Zoom meetings
- email_cancellation_enabled (boolean, default true): whether cancellation emails are sent
- email_cancellation_template (text, nullable): custom template for cancellation emails
- email_cancellation_elements (jsonb, nullable): per-type element overrides for cancellation emails
- email_reschedule_enabled (boolean, default true): whether reschedule emails are sent
- email_reschedule_template (text, nullable): custom template for reschedule emails
- email_reschedule_elements (jsonb, nullable): per-type element overrides for reschedule emails

## New Columns on bookings
- booking_token (text, nullable): unique token for client self-serve cancel/reschedule links
- zoom_passcode (text, nullable): the passcode for this booking's Zoom meeting
- zoom_passcode_random (boolean, default false): whether this booking uses a random passcode

## New Columns on recurring_links
- is_ongoing (boolean, default false): when true, the recurring series has no end date or occurrence limit

## Security
- No RLS policy changes (existing policies remain in place).
- booking_token is generated client-side via crypto.randomUUID() and stored on insert.

## Important Notes
1. All new columns use IF NOT EXISTS to make the migration idempotent.
2. booking_token is nullable for backward compatibility with existing bookings.
3. zoom_passcode_random defaults to false so existing behavior (random) is opt-in per booking.
*/

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS client_reminder_lead_hours integer DEFAULT 24;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS admin_reminder_mode text DEFAULT 'individual';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS admin_daily_summary_time text DEFAULT '07:00';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS admin_daily_summary_night_before boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS zoom_default_passcode text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS email_cancellation_enabled boolean DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS email_cancellation_template text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS email_cancellation_elements jsonb;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS email_reschedule_enabled boolean DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS email_reschedule_template text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS email_reschedule_elements jsonb;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_token text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS zoom_passcode text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS zoom_passcode_random boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE recurring_links ADD COLUMN IF NOT EXISTS is_ongoing boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Backfill booking_token for existing bookings that don't have one
UPDATE bookings SET booking_token = gen_random_uuid()::text WHERE booking_token IS NULL;
