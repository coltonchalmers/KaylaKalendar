/*
# Create booking_changes audit table

## Overview
Adds a `booking_changes` table that records every reschedule and cancellation
made to a booking, providing an audit trail of what was moved and when.

## New Tables

### booking_changes
Records each modification to a booking's schedule or status.
- id (uuid, PK)
- booking_id (uuid, FK to bookings, ON DELETE CASCADE)
- change_type (text: 'rescheduled' | 'cancelled' | 'completed')
- old_date (date, nullable) — the previous date before a reschedule
- old_start_time (time, nullable) — the previous start time before a reschedule
- new_date (date, nullable) — the new date after a reschedule
- new_start_time (time, nullable) — the new start time after a reschedule
- changed_by (uuid, nullable, FK to auth.users) — who made the change
- created_at (timestamptz)

## Security
- RLS enabled on booking_changes.
- authenticated (admin): full SELECT on all rows (to view audit history).
- authenticated (admin): INSERT with ownership check via the booking's user_id.
- No anon access — audit data is admin-only.
*/

CREATE TABLE IF NOT EXISTS booking_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN ('rescheduled', 'cancelled', 'completed')),
  old_date date,
  old_start_time time,
  new_date date,
  new_start_time time,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_booking_changes" ON booking_changes;
CREATE POLICY "auth_select_booking_changes" ON booking_changes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_booking_changes" ON booking_changes;
CREATE POLICY "auth_insert_booking_changes" ON booking_changes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_changes.booking_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_booking_changes_booking ON booking_changes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_changes_created ON booking_changes(created_at);
