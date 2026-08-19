/*
# Create Kayla Kalendar Schema

## Overview
Initial schema for the Kayla Kalendar appointment scheduling app.

## New Tables

### admin_settings
Stores business configuration (singleton per admin).
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- business_name (text)
- timezone (text)
- meeting_lengths (integer array - available duration options)
- default_meeting_length (integer)
- booking_lead_hours (integer - minimum hours ahead to book)
- booking_window_days (integer - how far ahead calendar shows)
- contact_email (text)
- contact_phone (text)
- meeting_name (text)
- meeting_description (text)

### availability_rules
Weekly recurring availability windows.
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- day_of_week (integer, 0=Sunday..6=Saturday)
- start_time (time)
- end_time (time)
- is_active (boolean)

### availability_overrides
Date-specific blocks or custom hours.
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- date (date)
- is_blocked (boolean)
- start_time (time, nullable)
- end_time (time, nullable)
- reason (text, nullable)

### bookings
All appointments (public, admin, recurring).
- id (uuid, PK)
- first_name (text)
- last_name (text)
- client_email (text)
- client_phone (text, nullable)
- is_existing_client (boolean, nullable)
- guests (text array)
- date (date)
- start_time (time)
- end_time (time)
- duration_minutes (integer)
- status (text: confirmed/cancelled/completed)
- notes (text, nullable)
- source (text: public/admin/recurring_link)
- recurring_link_id (uuid, nullable, FK to recurring_links)
- recurrence_group_id (uuid, nullable - groups recurring bookings)

### recurring_links
Admin-generated links for recurring booking flows.
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- token (text, unique)
- client_name (text)
- client_email (text)
- label (text, nullable)
- frequency (text, nullable)
- occurrences (integer, nullable)
- end_date (date, nullable)
- allow_client_frequency (boolean)
- allow_client_end_date (boolean)
- is_active (boolean)

### notification_log
Tracks notification attempts (stub for v1).
- id (uuid, PK)
- booking_id (uuid, FK to bookings)
- type (text: email/calendar/zoom)
- status (text: pending/sent/failed)
- payload (jsonb)

## Security
- RLS enabled on ALL tables
- Admin (authenticated): full CRUD on own data
- Public (anon): read availability + settings, insert bookings, read active recurring_links by token
- 4 separate policies per table (SELECT/INSERT/UPDATE/DELETE)
*/

-- admin_settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT 'Jungo Solutions',
  timezone text NOT NULL DEFAULT 'America/New_York',
  meeting_lengths integer[] NOT NULL DEFAULT '{30,60}',
  default_meeting_length integer NOT NULL DEFAULT 30,
  booking_lead_hours integer NOT NULL DEFAULT 2,
  booking_window_days integer NOT NULL DEFAULT 90,
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  meeting_name text NOT NULL DEFAULT 'Meeting with Jungo Solutions',
  meeting_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON admin_settings;
CREATE POLICY "anon_select_settings" ON admin_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_settings" ON admin_settings;
CREATE POLICY "auth_insert_settings" ON admin_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_settings" ON admin_settings;
CREATE POLICY "auth_update_settings" ON admin_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_settings" ON admin_settings;
CREATE POLICY "auth_delete_settings" ON admin_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- availability_rules
CREATE TABLE IF NOT EXISTS availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_availability" ON availability_rules;
CREATE POLICY "anon_select_availability" ON availability_rules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_availability" ON availability_rules;
CREATE POLICY "auth_insert_availability" ON availability_rules FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_availability" ON availability_rules;
CREATE POLICY "auth_update_availability" ON availability_rules FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_availability" ON availability_rules;
CREATE POLICY "auth_delete_availability" ON availability_rules FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_availability_rules_day ON availability_rules(day_of_week);

-- availability_overrides
CREATE TABLE IF NOT EXISTS availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_blocked boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_overrides" ON availability_overrides;
CREATE POLICY "anon_select_overrides" ON availability_overrides FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_overrides" ON availability_overrides;
CREATE POLICY "auth_insert_overrides" ON availability_overrides FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_overrides" ON availability_overrides;
CREATE POLICY "auth_update_overrides" ON availability_overrides FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_overrides" ON availability_overrides;
CREATE POLICY "auth_delete_overrides" ON availability_overrides FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_overrides_date ON availability_overrides(date);

-- recurring_links (must be created before bookings due to FK)
CREATE TABLE IF NOT EXISTS recurring_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  client_name text NOT NULL,
  client_email text NOT NULL,
  label text,
  frequency text CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  occurrences integer,
  end_date date,
  allow_client_frequency boolean NOT NULL DEFAULT true,
  allow_client_end_date boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_active_links" ON recurring_links;
CREATE POLICY "anon_select_active_links" ON recurring_links FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "auth_select_links" ON recurring_links;
CREATE POLICY "auth_select_links" ON recurring_links FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_insert_links" ON recurring_links;
CREATE POLICY "auth_insert_links" ON recurring_links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_links" ON recurring_links;
CREATE POLICY "auth_update_links" ON recurring_links FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_links" ON recurring_links;
CREATE POLICY "auth_delete_links" ON recurring_links FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  is_existing_client boolean,
  guests text[] NOT NULL DEFAULT '{}',
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes text,
  source text NOT NULL DEFAULT 'public' CHECK (source IN ('public', 'admin', 'recurring_link')),
  recurring_link_id uuid REFERENCES recurring_links(id) ON DELETE SET NULL,
  recurrence_group_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_bookings" ON bookings;
CREATE POLICY "auth_select_bookings" ON bookings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_bookings" ON bookings;
CREATE POLICY "auth_update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_bookings" ON bookings;
CREATE POLICY "auth_delete_bookings" ON bookings FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(client_email);
CREATE INDEX IF NOT EXISTS idx_bookings_recurrence ON bookings(recurrence_group_id);

-- For public slot checking: anon needs to see existing bookings to avoid conflicts
DROP POLICY IF EXISTS "anon_select_bookings_for_slots" ON bookings;
CREATE POLICY "anon_select_bookings_for_slots" ON bookings FOR SELECT
  TO anon USING (status = 'confirmed');

-- notification_log
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'calendar', 'zoom')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_notifications" ON notification_log;
CREATE POLICY "auth_select_notifications" ON notification_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notifications" ON notification_log;
CREATE POLICY "anon_insert_notifications" ON notification_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_notifications" ON notification_log;
CREATE POLICY "auth_update_notifications" ON notification_log FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_notifications" ON notification_log;
CREATE POLICY "auth_delete_notifications" ON notification_log FOR DELETE
  TO authenticated USING (true);
