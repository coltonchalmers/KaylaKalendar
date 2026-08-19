/*
# Create meeting_types table and link to bookings + recurring_links

## Overview
Adds a `meeting_types` table so the admin can define distinct meeting types
(e.g. "Initial Consultation - 30 min", "Strategy Session - 60 min"), each with
its own shareable link. Clients book through a specific meeting-type link and
only see that meeting type. Recurring links can also be tied to a meeting type.

## New Tables
### meeting_types
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- token (text, unique) — used in the public booking URL /m/:token
- name (text) — display name shown to clients
- description (text, nullable) — shown on the booking page
- duration_minutes (integer) — fixed duration for this meeting type
- is_active (boolean, default true)
- created_at (timestamptz)

## Modified Tables
### bookings
- Added `meeting_type_id` (uuid, nullable, FK to meeting_types, ON DELETE SET NULL)
  so every booking records which meeting type it was scheduled under.

### recurring_links
- Added `meeting_type_id` (uuid, nullable, FK to meeting_types, ON DELETE SET NULL)
  so a recurring link can be tied to a specific meeting type.

## Security
- RLS enabled on meeting_types.
- anon: can SELECT active meeting_types (needed to load the public booking page).
- authenticated (admin): full CRUD on own meeting_types via auth.uid() = user_id.
- meeting_types.user_id defaults to auth.uid() so inserts from the admin work.
*/

CREATE TABLE IF NOT EXISTS meeting_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meeting_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_active_meeting_types" ON meeting_types;
CREATE POLICY "anon_select_active_meeting_types" ON meeting_types FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "auth_select_meeting_types" ON meeting_types;
CREATE POLICY "auth_select_meeting_types" ON meeting_types FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_insert_meeting_types" ON meeting_types;
CREATE POLICY "auth_insert_meeting_types" ON meeting_types FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_meeting_types" ON meeting_types;
CREATE POLICY "auth_update_meeting_types" ON meeting_types FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_meeting_types" ON meeting_types;
CREATE POLICY "auth_delete_meeting_types" ON meeting_types FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Add meeting_type_id to bookings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'meeting_type_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN meeting_type_id uuid REFERENCES meeting_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add meeting_type_id to recurring_links
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_links' AND column_name = 'meeting_type_id'
  ) THEN
    ALTER TABLE recurring_links ADD COLUMN meeting_type_id uuid REFERENCES meeting_types(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meeting_types_token ON meeting_types(token);
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_type ON bookings(meeting_type_id);
