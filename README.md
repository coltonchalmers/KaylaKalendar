# Jungo Solutions Scheduling App

An appointment scheduling platform (internally "Kayla Kalendar"). Clients book meetings through shareable tokenized links; an admin manages availability, bookings, meeting types, recurring links, proposal links, and automated email notifications.

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, react-router-dom 7, lucide-react
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, pg_cron)
- **Path alias:** `@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json` — keep in sync)
- **Theme:** Custom Tailwind colors `jungo-green` and `jungo-brown` (see `tailwind.config.js`). Never use purple/indigo/violet hues.

## Project Structure

```
src/
  App.tsx                      # Route definitions
  components/
    layout/                    # AdminLayout, PublicLayout, ProtectedRoute
    ui/                        # Button, Card, Input, Select, Modal, Badge, Textarea, LoadingSpinner
    booking/                   # BookingConfirmation, BookingDetailsModal, IntakeForm
    calendar/                  # CalendarGrid, TimeSlotPicker
  hooks/                       # useAuth, useSettings, useAvailability, useBookings, useMeetingTypes, useRecurringLinks, useProposalLinks
  lib/
    supabase.ts                # Supabase client (reads VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    types.ts                   # All TypeScript interfaces
    utils.ts                   # Time slot generation, date formatting, timezone helpers
    validation.ts              # Email/phone validators
    bookingEmails.ts           # Triggers send-booking-emails edge function
  pages/
    admin/                     # Dashboard, Availability, Bookings, ManualBooking, MeetingTypes, RecurringLinks, Proposals, Settings, Login
    public/                    # MeetingTypeBooking, RecurringBooking, ProposalBooking, ManageBooking
supabase/
  migrations/                  # 12 SQL migrations (schema is built incrementally)
  functions/                   # Edge functions (deployed separately, not in repo)
public/                        # Jungo logo
```

## Routes

**Public** (wrapped in `PublicLayout`):
- `/m/:token` — Book via a meeting-type link
- `/book/:token` — Book via a recurring link
- `/p/:token` — Claim a proposed time slot
- `/manage/:token` — Cancel or reschedule an existing booking (token is the booking's `booking_token`)

**Admin** (wrapped in `ProtectedRoute` + `AdminLayout`):
- `/admin` — Dashboard
- `/admin/availability` — Weekly recurring hours + date overrides
- `/admin/bookings` — All bookings
- `/admin/bookings/new` — Manual booking
- `/admin/meeting-types` — Create/edit meeting types
- `/admin/recurring-links` — Generate recurring booking links
- `/admin/proposals` — Generate proposal links with time slots
- `/admin/settings` — Business profile, email templates, Zoom, reminders

## Database Schema

All tables have RLS enabled. See `supabase/migrations/` for full DDL.

| Table | Purpose |
|-------|---------|
| `admin_settings` | Singleton per admin (UNIQUE on `user_id`). Business name, timezone, meeting lengths, lead hours, booking window, buffer, contact info, email templates/element toggles per type, Zoom defaults, reminder settings. |
| `availability_rules` | Weekly recurring availability windows (day_of_week 0–6). |
| `availability_overrides` | Date-specific blocks or custom hours. |
| `meeting_types` | Tokenized meeting types with duration, buffer, optional Zoom link and contact overrides. |
| `bookings` | All appointments. `source`: public/admin/recurring_link/proposal_link. `status`: confirmed/cancelled/completed. Includes `booking_token`, `zoom_link`, `zoom_passcode`, `client_timezone`, `recurrence_group_id`. |
| `recurring_links` | Tokenized links for recurring flows. Supports weekly/biweekly/monthly, occurrence counts, end dates, and `is_ongoing` flag. |
| `proposal_links` | Tokenized links where admin proposes specific slots. |
| `proposal_slots` | Individual time slots attached to a proposal link. `is_claimed` boolean. |
| `booking_changes` | Append-only audit trail of reschedules, cancellations, completions. Never update or delete rows. |
| `notification_log` | Tracks email/calendar/zoom notification attempts. Deduplicates reminder sends. |

### RLS Summary
- **anon:** Read access to `admin_settings`, `availability_rules`, `availability_overrides`, active `recurring_links`, `meeting_types`, `proposal_links`, `proposal_slots`, and confirmed `bookings` (for conflict checking). Insert access to `bookings` and `notification_log`.
- **authenticated:** Full CRUD on own data across all tables.

## Edge Functions

### send-booking-emails
Triggered by `src/lib/bookingEmails.ts`. Sends confirmation, invite, cancellation, reschedule, and same-day alert emails. Reads templates and element toggles from `admin_settings`. Builds manage links using `PUBLIC_SITE_URL` env var.

### send-reminders
Triggered every 15 minutes by a pg_cron job (migration `20260817191919`). Sends client reminders, admin reminders (individual or daily summary mode), and daily summaries. Idempotent — deduplicates via `notification_log`.

### Required Secrets (Supabase dashboard)
- `PUBLIC_SITE_URL` — Public URL for email links
- SMTP/Resend credentials for outgoing email
- Zoom Server-to-Server OAuth credentials (if auto-creation enabled)

## Environment Variables

`.env`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public key

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint
npm run preview    # Preview production build
```

## Critical Design Decisions (do not undo)

1. **admin_settings is a singleton.** A UNIQUE constraint on `user_id` prevents duplicates (migration `20260813215449` fixed a prior bug with 258 duplicate rows). Use `upsert` or `update`, never blind `insert`.

2. **booking_token is generated client-side** via `crypto.randomUUID()` in `useBookings.createBooking` and stored on every booking. It is the only way clients access `/manage/:token`. Never create a booking without one.

3. **booking_lead_hours does double duty.** It controls both minimum booking lead time AND blocks clients from cancelling/rescheduling within that window. The manage page enforces this via `isWithinLeadTime()`.

4. **Client reschedule from the manage page is per-session only.** Even for recurring bookings, the client only moves that single session. The page shows a notice about this. Admin-side `cancelRecurringGroup` and `rescheduleRecurringGroup` in `useBookings` operate on the whole group — keep these separate.

5. **Zoom link resolution has a three-level fallback:** booking-level `zoom_link` → meeting-type `zoom_link` → `admin_settings.zoom_default_link` → auto-create if `zoom_enabled`. The `zoom_default_passcode` only applies to auto-created meetings.

6. **Time slot generation is client-side** in `src/lib/utils.ts` `generateTimeSlots`. The anon role can read confirmed bookings specifically so this conflict checking works. Do not move this server-side without updating RLS.

7. **Email templates use `{{placeholder}}` syntax.** Supported placeholders: `client_name`, `date`, `time`, `duration`, `business_name`, `booking_link`. Reschedule emails also support `old_date`, `old_time`, `new_date`, `new_time`. Default templates are hardcoded in `SettingsPage.tsx`.

8. **Per-email-type element overrides fall back to global defaults.** Each email type has its own `EmailElements` JSONB in `admin_settings`. If null, the global defaults (`email_include_*` columns) are used.

9. **The pg_cron job has the project URL and anon key hardcoded in SQL** (migration `20260817191919`). If either changes, update the cron job.

10. **The `source` field CHECK constraint must be updated** if adding a new booking source type. It currently allows `public`, `admin`, `recurring_link`, `proposal_link`.

11. **`is_ongoing` on recurring_links** means the series has no end date or occurrence cap. Do not treat null `end_date` + null `occurrences` as an error without checking this flag first.

12. **booking_changes is append-only.** Never update or delete rows. The admin views history via `fetchBookingChanges`.

13. **All imports use `@/` path alias**, not relative paths. Maintain this convention.
