import { supabase } from '@/lib/supabase';

type EmailType =
  | 'confirmation'
  | 'invite'
  | 'cancellation'
  | 'reschedule'
  | 'sameday_alert';

interface TriggerOptions {
  emailType?: EmailType;
  inviteLink?: string;
  inviteClientName?: string;
  inviteClientEmail?: string;
  oldDate?: string;
  oldTime?: string;
  newDate?: string;
  newTime?: string;
}

export async function triggerBookingEmails(
  bookingId: string,
  options?: TriggerOptions
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-emails`;

    const body: Record<string, unknown> = { bookingId, ...options };

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Booking email trigger failed:', response.status);
      return;
    }

    const data = await response.json();
    if (data.error) {
      console.error('Booking email trigger error:', data.error);
    }
  } catch (err) {
    console.error('Failed to trigger booking emails:', err);
  }
}

export async function triggerInviteEmail(
  clientName: string,
  clientEmail: string,
  inviteLink: string
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-emails`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        emailType: 'invite',
        inviteClientName: clientName,
        inviteClientEmail: clientEmail,
        inviteLink,
      }),
    });

    if (!response.ok) {
      console.error('Invite email trigger failed:', response.status);
      return;
    }

    const data = await response.json();
    if (data.error) {
      console.error('Invite email trigger error:', data.error);
    }
  } catch (err) {
    console.error('Failed to trigger invite email:', err);
  }
}
