import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, XCircle, CalendarClock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAvailability } from '@/hooks/useAvailability';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { generateTimeSlots, formatTime, formatDisplayDate, minutesToTime, timeToMinutes } from '@/lib/utils';
import { triggerBookingEmails } from '@/lib/bookingEmails';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import TimeSlotPicker from '@/components/calendar/TimeSlotPicker';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Booking } from '@/lib/types';

export default function ManageBookingPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');

  const { rules, overrides, loading: availLoading } = useAvailability();
  const { fetchBookingByToken, rescheduleBooking, cancelBooking, fetchBookingsForDate } = useBookings({ autoFetch: false });
  const { settings, loading: settingsLoading } = useSettings();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<'cancelled' | 'rescheduled' | null>(null);
  const [showReschedule, setShowReschedule] = useState(action === 'reschedule');
  const [cancelling, setCancelling] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const data = await fetchBookingByToken(token);
      if (!data) {
        setError('This booking link is invalid or has expired.');
      } else {
        setBooking(data);
      }
      setPageLoading(false);
    })();
  }, [token, fetchBookingByToken]);

  const leadHours = settings?.booking_lead_hours ?? 2;

  const isWithinLeadTime = useCallback(() => {
    if (!booking) return false;
    const meetingStart = new Date(`${booking.date}T${booking.start_time}`);
    const cutoff = new Date(Date.now() + leadHours * 60 * 60 * 1000);
    return meetingStart <= cutoff;
  }, [booking, leadHours]);

  const loadSlots = useCallback(async (dateStr: string) => {
    if (!booking) return;
    setSlotsLoading(true);
    const existing = await fetchBookingsForDate(dateStr);
    const othersOnDay = existing.filter((b: Booking) => b.id !== booking.id);
    const date = new Date(dateStr + 'T00:00:00');
    const available = generateTimeSlots(
      date, rules, overrides, othersOnDay,
      booking.duration_minutes, leadHours,
      settings?.buffer_minutes ?? 0
    );
    setSlots(available);
    setSlotsLoading(false);
  }, [rules, overrides, booking, fetchBookingsForDate, leadHours, settings?.buffer_minutes]);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    loadSlots(dateStr);
  };

  const handleNavigate = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      await cancelBooking(booking.id, true);
      setSuccess('cancelled');
    } catch {
      setError('Could not cancel the booking. Please try again or contact us.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!booking || !selectedDate || !selectedSlot) return;
    setRescheduling(true);
    try {
      await rescheduleBooking(booking.id, selectedDate, selectedSlot, booking.duration_minutes, true);
      setSuccess('rescheduled');
    } catch {
      setError('Could not reschedule the booking. Please try again or contact us.');
    } finally {
      setRescheduling(false);
    }
  };

  if (pageLoading || availLoading || settingsLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (error && !booking) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link Not Found</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16 animate-scale-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {success === 'cancelled' ? 'Booking Cancelled' : 'Booking Rescheduled'}
        </h2>
        <p className="text-gray-500">
          {success === 'cancelled'
            ? 'Your meeting has been cancelled. You will receive a confirmation email shortly.'
            : `Your meeting has been rescheduled to ${formatDisplayDate(selectedDate!)} at ${formatTime(selectedSlot!)}. You will receive a confirmation email shortly.`}
        </p>
      </div>
    );
  }

  if (!booking) return null;

  const withinLeadTime = isWithinLeadTime();
  const isAlreadyCancelled = booking.status === 'cancelled';
  const isAlreadyCompleted = booking.status === 'completed';
  const canModify = !withinLeadTime && !isAlreadyCancelled && !isAlreadyCompleted;

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (settings?.booking_window_days ?? 90));

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {settings?.business_name ? `Your Booking with ${settings.business_name}` : 'Manage Your Booking'}
        </h1>
      </div>

      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Date</p>
              <p className="font-medium text-gray-900">{formatDisplayDate(booking.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Time</p>
              <p className="font-medium text-gray-900">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Duration</p>
            <p className="text-sm text-gray-900">{booking.duration_minutes} minutes</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
            <p className="text-sm text-gray-900 capitalize">{booking.status}</p>
          </div>
        </div>
        {booking.zoom_link && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">Zoom Meeting</p>
            <a href={booking.zoom_link} className="text-sm text-green-700 underline break-all" target="_blank" rel="noopener noreferrer">{booking.zoom_link}</a>
            {booking.zoom_passcode && <p className="text-sm text-green-700 mt-1">Passcode: {booking.zoom_passcode}</p>}
          </div>
        )}
      </Card>

      {isAlreadyCancelled && (
        <Card className="text-center py-8">
          <XCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">This booking has been cancelled.</p>
        </Card>
      )}

      {isAlreadyCompleted && (
        <Card className="text-center py-8">
          <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">This meeting has already taken place.</p>
        </Card>
      )}

      {withinLeadTime && !isAlreadyCancelled && !isAlreadyCompleted && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Changes are no longer available</p>
              <p className="text-sm text-amber-700 mt-1">
                This meeting is within the {leadHours}-hour minimum notice period.
                {settings?.contact_email ? ` Please contact us at ${settings.contact_email}` : ' Please contact us directly'}
                {settings?.contact_phone ? ` or call ${settings.contact_phone}` : ''}.
              </p>
            </div>
          </div>
        </Card>
      )}

      {canModify && !showReschedule && (
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="secondary" icon={<CalendarClock className="w-4 h-4" />} onClick={() => setShowReschedule(true)}>Reschedule</Button>
          <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={handleCancel} loading={cancelling}>Cancel Booking</Button>
        </div>
      )}

      {canModify && showReschedule && (
        <Card padding="lg" className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a new time</h2>

          {booking.source === 'recurring_link' && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">This will reschedule only this session, not the entire recurring series.</p>
            </div>
          )}

          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            onNavigate={handleNavigate}
            canGoBack={viewMonth > now.getMonth() || viewYear > now.getFullYear()}
            canGoForward={true}
            rules={rules}
            overrides={overrides}
            maxDate={maxDate}
          />

          {selectedDate && (
            <div className="mt-6 pt-6 border-t">
              <TimeSlotPicker
                date={selectedDate}
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                loading={slotsLoading}
              />
            </div>
          )}

          {selectedDate && selectedSlot && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-green-800">{formatDisplayDate(selectedDate)}</p>
              <p className="text-green-600">
                {formatTime(selectedSlot)} - {formatTime(minutesToTime(timeToMinutes(selectedSlot) + booking.duration_minutes))}
                {' '}({booking.duration_minutes} min)
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowReschedule(false)}>Back</Button>
            <Button onClick={handleReschedule} loading={rescheduling} disabled={!selectedDate || !selectedSlot} icon={<CalendarClock className="w-4 h-4" />}>Confirm Reschedule</Button>
          </div>
        </Card>
      )}

      {error && booking && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
