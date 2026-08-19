/*
# Create proposal_links and proposal_slots tables

## Overview
Adds a new booking channel: "Proposal Links". The admin hand-picks a list of
specific date/time slots (which can include off-hours and blocked-off days),
bundles them with a meeting type, and sends a shareable link to a client.
The client sees only those exact slots, picks one, fills out the intake form,
and a booking is created. The chosen slot is marked as claimed so no one else
can book it.

## New Tables

### proposal_links
Stores the shareable proposal link and its metadata.
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- token (text, unique) — used in the public URL /p/:token
- client_name (text) — who the proposal is for
- client_email (text) — client email, used to prefill the intake form
- label (text, nullable) — internal note for the admin
- meeting_type_id (uuid, nullable, FK to meeting_types) — the meeting type for this proposal
- expires_at (timestamptz, nullable) — optional expiry date for the link
- is_active (boolean, default true)
- created_at (timestamptz)

### proposal_slots
Stores the individual date/time options the admin curated for a proposal link.
- id (uuid, PK)
- proposal_link_id (uuid, FK to proposal_links, ON DELETE CASCADE)
- date (date) — the specific date offered
- start_time (time) — the specific start time offered
- is_claimed (boolean, default false) — true once a client books this slot
- created_at (timestamptz)

## Modified Tables

### bookings
- Added `proposal_link_id` (uuid, nullable, FK to proposal_links, ON DELETE SET NULL)
  so a booking records which proposal it came from.
- Extended the `source` CHECK constraint to include 'proposal_link'.

## Security
- RLS enabled on both new tables.
- proposal_links:
  - anon: can SELECT active proposal_links (needed to load the public page).
  - authenticated (admin): full CRUD on own proposal_links via auth.uid() = user_id.
- proposal_slots:
  - anon: can SELECT slots that belong to an active proposal_link (needed for the public page).
  - authenticated (admin): full CRUD on slots that belong to their own proposal_links
    (checked via EXISTS subquery against proposal_links).
- proposal_links.user_id defaults to auth.uid() so admin inserts work.
- An anon INSERT policy on proposal_slots allows the public booking flow to
  mark a slot as claimed (is_claimed = true) when a client books it.
*/

-- proposal_links
CREATE TABLE IF NOT EXISTS proposal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  client_name text NOT NULL,
  client_email text NOT NULL,
  label text,
  meeting_type_id uuid REFERENCES meeting_types(id) ON DELETE SET NULL,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_active_proposals" ON proposal_links;
CREATE POLICY "anon_select_active_proposals" ON proposal_links FOR SELECT
  TO anon USING (is_active = true);

DROP POLICY IF EXISTS "auth_select_proposals" ON proposal_links;
CREATE POLICY "auth_select_proposals" ON proposal_links FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_insert_proposals" ON proposal_links;
CREATE POLICY "auth_insert_proposals" ON proposal_links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_proposals" ON proposal_links;
CREATE POLICY "auth_update_proposals" ON proposal_links FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_proposals" ON proposal_links;
CREATE POLICY "auth_delete_proposals" ON proposal_links FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- proposal_slots
CREATE TABLE IF NOT EXISTS proposal_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_link_id uuid NOT NULL REFERENCES proposal_links(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  is_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_slots ENABLE ROW LEVEL SECURITY;

-- anon can SELECT slots belonging to active proposal links (public booking page)
DROP POLICY IF EXISTS "anon_select_proposal_slots" ON proposal_slots;
CREATE POLICY "anon_select_proposal_slots" ON proposal_slots FOR SELECT
  TO anon USING (
    EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.is_active = true
    )
  );

-- authenticated admin can SELECT slots for their own proposals
DROP POLICY IF EXISTS "auth_select_proposal_slots" ON proposal_slots;
CREATE POLICY "auth_select_proposal_slots" ON proposal_slots FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.user_id = auth.uid()
    )
  );

-- authenticated admin can INSERT slots for their own proposals
DROP POLICY IF EXISTS "auth_insert_proposal_slots" ON proposal_slots;
CREATE POLICY "auth_insert_proposal_slots" ON proposal_slots FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.user_id = auth.uid()
    )
  );

-- authenticated admin can UPDATE slots for their own proposals
DROP POLICY IF EXISTS "auth_update_proposal_slots" ON proposal_slots;
CREATE POLICY "auth_update_proposal_slots" ON proposal_slots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.user_id = auth.uid()
    )
  );

-- authenticated admin can DELETE slots for their own proposals
DROP POLICY IF EXISTS "auth_delete_proposal_slots" ON proposal_slots;
CREATE POLICY "auth_delete_proposal_slots" ON proposal_slots FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.user_id = auth.uid()
    )
  );

-- anon can UPDATE a slot to claim it (set is_claimed = true) during booking
DROP POLICY IF EXISTS "anon_claim_proposal_slot" ON proposal_slots;
CREATE POLICY "anon_claim_proposal_slot" ON proposal_slots FOR UPDATE
  TO anon
  USING (
    is_claimed = false
    AND EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.is_active = true
    )
  )
  WITH CHECK (
    is_claimed = true
    AND EXISTS (
      SELECT 1 FROM proposal_links
      WHERE proposal_links.id = proposal_slots.proposal_link_id
        AND proposal_links.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_proposal_links_token ON proposal_links(token);
CREATE INDEX IF NOT EXISTS idx_proposal_slots_link ON proposal_slots(proposal_link_id);
CREATE INDEX IF NOT EXISTS idx_proposal_slots_date ON proposal_slots(date);

-- Add proposal_link_id to bookings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'proposal_link_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN proposal_link_id uuid REFERENCES proposal_links(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Extend source CHECK constraint to include 'proposal_link'
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_source_check' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_source_check;
  END IF;
  ALTER TABLE bookings ADD CONSTRAINT bookings_source_check
    CHECK (source IN ('public', 'admin', 'recurring_link', 'proposal_link'));
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_proposal_link ON bookings(proposal_link_id);
