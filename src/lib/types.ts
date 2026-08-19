export interface EmailElements {
  company_info: boolean;
  zoom: boolean;
  phone: boolean;
  google_calendar: boolean;
}

export interface AdminSettings {
  id: string;
  user_id: string;
  business_name: string;
  timezone: string;
  meeting_lengths: number[];
  default_meeting_length: number;
  booking_lead_hours: number;
  booking_window_days: number;
  contact_email: string;
  contact_phone: string;
  meeting_name: string;
  meeting_description: string;
  notification_enabled: boolean;
  notification_lead_hours: number;
  notification_email: string;
  buffer_minutes: number;
  email_invite_enabled: boolean;
  email_confirmation_enabled: boolean;
  email_notification_enabled: boolean;
  email_announcement_enabled: boolean;
  email_include_company_info: boolean;
  email_include_zoom: boolean;
  email_include_phone: boolean;
  email_include_google_calendar: boolean;
  email_invite_elements: EmailElements | null;
  email_confirmation_elements: EmailElements | null;
  email_notification_elements: EmailElements | null;
  email_announcement_elements: EmailElements | null;
  email_invite_template: string | null;
  email_confirmation_template: string | null;
  email_notification_template: string | null;
  email_announcement_template: string | null;
  email_from_name: string;
  zoom_enabled: boolean;
  client_reminder_lead_hours: number;
  admin_reminder_mode: 'individual' | 'daily';
  admin_daily_summary_time: string;
  admin_daily_summary_night_before: boolean;
  notify_client_on_admin_change: boolean;
  zoom_default_passcode: string | null;
  zoom_default_link: string | null;
  email_cancellation_enabled: boolean;
  email_cancellation_template: string | null;
  email_cancellation_elements: EmailElements | null;
  email_reschedule_enabled: boolean;
  email_reschedule_template: string | null;
  email_reschedule_elements: EmailElements | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface AvailabilityOverride {
  id: string;
  user_id: string;
  date: string;
  is_blocked: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface MeetingType {
  id: string;
  user_id: string;
  token: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  buffer_minutes: number | null;
  zoom_link: string | null;
  contact_email_override: string | null;
  contact_phone_override: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  first_name: string;
  last_name: string;
  client_email: string;
  client_phone: string | null;
  is_existing_client: boolean | null;
  guests: string[];
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  source: 'public' | 'admin' | 'recurring_link' | 'proposal_link';
  recurring_link_id: string | null;
  recurrence_group_id: string | null;
  client_timezone: string | null;
  meeting_type_id: string | null;
  proposal_link_id: string | null;
  zoom_link: string | null;
  booking_token: string | null;
  zoom_passcode: string | null;
  zoom_passcode_random: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProposalLink {
  id: string;
  user_id: string;
  token: string;
  client_name: string;
  client_email: string;
  label: string | null;
  meeting_type_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProposalSlot {
  id: string;
  proposal_link_id: string;
  date: string;
  start_time: string;
  is_claimed: boolean;
  created_at: string;
}

export interface RecurringLink {
  id: string;
  user_id: string;
  token: string;
  client_name: string;
  client_email: string;
  label: string | null;
  frequency: 'weekly' | 'biweekly' | 'monthly' | null;
  occurrences: number | null;
  end_date: string | null;
  allow_client_frequency: boolean;
  allow_client_end_date: boolean;
  is_active: boolean;
  meeting_type_id: string | null;
  is_ongoing: boolean;
  created_at: string;
}

export interface BookingChange {
  id: string;
  booking_id: string;
  change_type: 'rescheduled' | 'cancelled' | 'completed';
  old_date: string | null;
  old_start_time: string | null;
  new_date: string | null;
  new_start_time: string | null;
  changed_by: string | null;
  created_at: string;
}

interface NotificationLog {
  id: string;
  booking_id: string;
  type: 'email' | 'calendar' | 'zoom';
  status: 'pending' | 'sent' | 'failed';
  payload: Record<string, unknown>;
  created_at: string;
}

export type BookingStep = 'length' | 'calendar' | 'time' | 'form' | 'confirm';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
