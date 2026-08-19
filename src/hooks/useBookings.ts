import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking, BookingChange } from '@/lib/types';
import { minutesToTime, timeToMinutes } from '@/lib/utils';
import { triggerBookingEmails } from '@/lib/bookingEmails';

interface BookingInput {
  first_name: string;
  last_name: string;
  client_email: string;
  client_phone?: string;
  is_existing_client?: boolean | null;
  guests?: string[];
  date: string;
  start_time: string;
  duration_minutes: number;
  notes?: string;
  source?: 'public' | 'admin' | 'recurring_link' | 'proposal_link';
  recurring_link_id?: string;
  recurrence_group_id?: string;
  client_timezone?: string;
  meeting_type_id?: string;
  proposal_link_id?: string;
  zoom_passcode_random?: boolean;
}

export interface ConflictResult {
  hasConflict: boolean;
  hasBufferOverlap: boolean;
  conflictingBooking?: Booking;
}

export function useBookings(options?: { autoFetch?: boolean }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async (filters?: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    let query = supabase
      .from('bookings')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo);
    }
    if (filters?.search) {
      const s = filters.search;
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,client_email.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
    return data || [];
  }, []);

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [fetchBookings, options?.autoFetch]);

  const createBooking = useCallback(async (input: BookingInput) => {
    const endMinutes = timeToMinutes(input.start_time) + input.duration_minutes;
    const end_time = minutesToTime(endMinutes);
    const bookingToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        first_name: input.first_name,
        last_name: input.last_name,
        client_email: input.client_email,
        client_phone: input.client_phone || null,
        is_existing_client: input.is_existing_client ?? null,
        guests: input.guests || [],
        date: input.date,
        start_time: input.start_time,
        end_time,
        duration_minutes: input.duration_minutes,
        notes: input.notes || null,
        source: input.source || 'public',
        recurring_link_id: input.recurring_link_id || null,
        recurrence_group_id: input.recurrence_group_id || null,
        client_timezone: input.client_timezone || null,
        meeting_type_id: input.meeting_type_id || null,
        proposal_link_id: input.proposal_link_id || null,
        booking_token: bookingToken,
        zoom_passcode_random: input.zoom_passcode_random ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    setBookings(prev => [...prev, data]);
    return data;
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: Booking['status']) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setBookings(prev => prev.map(b => b.id === id ? data : b));

    if (status === 'cancelled' || status === 'completed') {
      await supabase.from('booking_changes').insert({
        booking_id: id,
        change_type: status,
      });
    }

    return data;
  }, []);

  const cancelBooking = useCallback(async (id: string, sendEmail: boolean = true) => {
    const booking = bookings.find(b => b.id === id);
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setBookings(prev => prev.map(b => b.id === id ? data : b));

    await supabase.from('booking_changes').insert({
      booking_id: id,
      change_type: 'cancelled',
    });

    if (sendEmail) {
      await triggerBookingEmails(id, { emailType: 'cancellation' });
    }

    return data;
  }, [bookings]);

  const rescheduleBooking = useCallback(async (id: string, newDate: string, newStartTime: string, durationMinutes: number, sendEmail: boolean = true) => {
    const oldBooking = bookings.find(b => b.id === id);
    if (!oldBooking) throw new Error('Booking not found');

    const endMinutes = timeToMinutes(newStartTime) + durationMinutes;
    const newEndTime = minutesToTime(endMinutes);

    const { data, error } = await supabase
      .from('bookings')
      .update({
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setBookings(prev => prev.map(b => b.id === id ? data : b));

    await supabase.from('booking_changes').insert({
      booking_id: id,
      change_type: 'rescheduled',
      old_date: oldBooking.date,
      old_start_time: oldBooking.start_time,
      new_date: newDate,
      new_start_time: newStartTime,
    });

    if (sendEmail) {
      await triggerBookingEmails(id, {
        emailType: 'reschedule',
        oldDate: oldBooking.date,
        oldTime: oldBooking.start_time,
        newDate,
        newTime: newStartTime,
      });
    }

    return data;
  }, [bookings]);

  const cancelRecurringGroup = useCallback(async (groupId: string, sendEmails: boolean = true) => {
    const { data: groupBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('recurrence_group_id', groupId)
      .eq('status', 'confirmed');

    if (fetchError) throw fetchError;
    const toCancel = groupBookings || [];

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('recurrence_group_id', groupId)
      .eq('status', 'confirmed');

    if (updateError) throw updateError;

    const cancelledIds = toCancel.map(b => b.id);
    setBookings(prev => prev.map(b =>
      cancelledIds.includes(b.id) ? { ...b, status: 'cancelled' } : b
    ));

    if (cancelledIds.length > 0) {
      const changeRows = cancelledIds.map(id => ({
        booking_id: id,
        change_type: 'cancelled' as const,
      }));
      await supabase.from('booking_changes').insert(changeRows);

      if (sendEmails) {
        for (const id of cancelledIds) {
          await triggerBookingEmails(id, { emailType: 'cancellation' });
        }
      }
    }

    return toCancel.length;
  }, []);

  const rescheduleRecurringGroup = useCallback(async (groupId: string, shiftDays: number, sendEmails: boolean = true) => {
    const { data: groupBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('recurrence_group_id', groupId)
      .neq('status', 'cancelled')
      .order('date', { ascending: true });

    if (fetchError) throw fetchError;
    const toShift = groupBookings || [];

    for (const booking of toShift) {
      const oldDate = booking.date;
      const [y, m, d] = oldDate.split('-').map(Number);
      const oldJsDate = new Date(y, m - 1, d);
      oldJsDate.setDate(oldJsDate.getDate() + shiftDays);
      const newDate = `${oldJsDate.getFullYear()}-${String(oldJsDate.getMonth() + 1).padStart(2, '0')}-${String(oldJsDate.getDate()).padStart(2, '0')}`;

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ date: newDate, updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      await supabase.from('booking_changes').insert({
        booking_id: booking.id,
        change_type: 'rescheduled',
        old_date: oldDate,
        old_start_time: booking.start_time,
        new_date: newDate,
        new_start_time: booking.start_time,
      });

      if (sendEmails) {
        await triggerBookingEmails(booking.id, {
          emailType: 'reschedule',
          oldDate,
          oldTime: booking.start_time,
          newDate,
          newTime: booking.start_time,
        });
      }
    }

    setBookings(prev => prev.map(b => {
      if (b.recurrence_group_id !== groupId || b.status === 'cancelled') return b;
      const [y, m, d] = b.date.split('-').map(Number);
      const oldJsDate = new Date(y, m - 1, d);
      oldJsDate.setDate(oldJsDate.getDate() + shiftDays);
      const newDate = `${oldJsDate.getFullYear()}-${String(oldJsDate.getMonth() + 1).padStart(2, '0')}-${String(oldJsDate.getDate()).padStart(2, '0')}`;
      return { ...b, date: newDate };
    }));

    return toShift.length;
  }, []);

  const checkMeetingTypeConflict = useCallback(async (
    bookingId: string,
    date: string,
    startTime: string,
    newDurationMinutes: number,
    bufferMinutes: number
  ): Promise<ConflictResult> => {
    const { data: dayBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .neq('status', 'cancelled')
      .neq('id', bookingId);

    if (error) throw error;

    const newStart = timeToMinutes(startTime);
    const newEnd = newStart + newDurationMinutes;

    for (const b of dayBookings || []) {
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);

      if (newStart < bEnd + bufferMinutes && newEnd + bufferMinutes > bStart) {
        const hasHardConflict = newStart < bEnd && newEnd > bStart;
        if (hasHardConflict) {
          return { hasConflict: true, hasBufferOverlap: false, conflictingBooking: b };
        }
        return { hasConflict: false, hasBufferOverlap: true, conflictingBooking: b };
      }
    }

    return { hasConflict: false, hasBufferOverlap: false };
  }, []);

  const updateBookingMeetingType = useCallback(async (
    id: string,
    meetingTypeId: string,
    newDurationMinutes: number,
    bufferMinutes: number,
    sendEmail: boolean = false
  ) => {
    const booking = bookings.find(b => b.id === id);
    if (!booking) throw new Error('Booking not found');

    const conflictCheck = await checkMeetingTypeConflict(
      id,
      booking.date,
      booking.start_time,
      newDurationMinutes,
      bufferMinutes
    );

    if (conflictCheck.hasConflict) {
      throw new Error(
        `Cannot change meeting type: this would overlap with another booking (${conflictCheck.conflictingBooking?.first_name} ${conflictCheck.conflictingBooking?.last_name} at ${conflictCheck.conflictingBooking?.start_time}).`
      );
    }

    const endMinutes = timeToMinutes(booking.start_time) + newDurationMinutes;
    const newEndTime = minutesToTime(endMinutes);

    const { data, error } = await supabase
      .from('bookings')
      .update({
        meeting_type_id: meetingTypeId,
        duration_minutes: newDurationMinutes,
        end_time: newEndTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setBookings(prev => prev.map(b => b.id === id ? data : b));

    if (sendEmail) {
      await triggerBookingEmails(id, { emailType: 'confirmation' });
    }

    return { data, bufferWarning: conflictCheck.hasBufferOverlap };
  }, [bookings, checkMeetingTypeConflict]);

  const updateBookingDetails = useCallback(async (
    id: string,
    updates: {
      zoom_link?: string | null;
      client_email?: string;
      client_phone?: string | null;
      zoom_passcode_random?: boolean;
    },
    sendEmail: boolean = false
  ) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setBookings(prev => prev.map(b => b.id === id ? data : b));

    if (sendEmail) {
      await triggerBookingEmails(id, { emailType: 'confirmation' });
    }

    return data;
  }, []);

  const fetchBookingByToken = useCallback(async (token: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_token', token)
      .maybeSingle();

    if (error) {
      console.error('Error fetching booking by token:', error);
      return null;
    }
    return data as Booking | null;
  }, []);

  const fetchBookingsForDate = useCallback(async (date: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching bookings for date:', error);
      return [];
    }
    return data || [];
  }, []);

  const fetchRecurringGroup = useCallback(async (groupId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('recurrence_group_id', groupId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching recurring group:', error);
      return [];
    }
    return data || [];
  }, []);

  const fetchBookingChanges = useCallback(async (bookingId: string) => {
    const { data, error } = await supabase
      .from('booking_changes')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching booking changes:', error);
      return [];
    }
    return data || [];
  }, []);

  return {
    bookings,
    loading,
    fetchBookings,
    createBooking,
    updateBookingStatus,
    cancelBooking,
    rescheduleBooking,
    cancelRecurringGroup,
    rescheduleRecurringGroup,
    checkMeetingTypeConflict,
    updateBookingMeetingType,
    updateBookingDetails,
    fetchBookingByToken,
    fetchBookingsForDate,
    fetchRecurringGroup,
    fetchBookingChanges,
  };
}
