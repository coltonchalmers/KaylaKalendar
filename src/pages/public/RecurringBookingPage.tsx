import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Repeat, Clock } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import TimeSlotPicker from '@/components/calendar/TimeSlotPicker';
import IntakeForm from '@/components/booking/IntakeForm';
import type { IntakeFormData } from '@/components/booking/IntakeForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAvailability } from '@/hooks/useAvailability';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { useRecurringLinks } from '@/hooks/useRecurringLinks';
import { generateTimeSlots, formatDate, formatDisplayDate, formatTime, addDays, detectTimezone, getTimezoneOptions, classNames } from '@/lib/utils';
import { triggerBookingEmails } from '@/lib/bookingEmails';
import type { Booking, RecurringLink, MeetingType, BookingStep } from '@/lib/types';

export default function RecurringBookingPage() {
  const { token } = useParams<{ token: string }>();
  const { fetchLinkByToken } = useRecurringLinks();
  const { rules, overrides, loading: availLoading } = useAvailability();
  const { createBooking, fetchBookingsForDate } = useBookings({ autoFetch: false });
  const { settings, loading: settingsLoading } = useSettings();

  const [link, setLink] = useState<RecurringLink | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [linkError, setLinkError] = useState(false);

  const [step, setStep] = useState<BookingStep | 'recurrence'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [clientTimezone, setClientTimezone] = useState(detectTimezone);

  const [frequency, setFrequency] = useState('weekly');
  const [occurrences, setOccurrences] = useState('4');
  const [endDate, setEndDate] = useState('');

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const windowDays = settings?.booking_window_days || 90;
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + windowDays);
    return d;
  }, [windowDays]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await fetchLinkByToken(token);
        if (!data) {
          setLinkError(true);
        } else {
          setLink(data);
          if (data.frequency) setFrequency(data.frequency);
          if (data.occurrences) setOccurrences(data.occurrences.toString());
          if (data.end_date) setEndDate(data.end_date);
          if (data.meeting_type_id) {
            const { data: mt } = await supabase
              .from('meeting_types')
              .select('*')
              .eq('id', data.meeting_type_id)
              .maybeSingle();
            if (mt) setMeetingType(mt);
          }
        }
      } catch {
        setLinkError(true);
      } finally {
        setLinkLoading(false);
      }
    })();
  }, [token, fetchLinkByToken]);

  const durationMinutes = meetingType?.duration_minutes || settings?.default_meeting_length || 30;

  const loadSlots = useCallback(async (dateStr: string) => {
    setSlotsLoading(true);
    const existing = await fetchBookingsForDate(dateStr);
    const date = new Date(dateStr + 'T00:00:00');
    const available = generateTimeSlots(date, rules, overrides, existing, durationMinutes, settings?.booking_lead_hours || 2, meetingType?.buffer_minutes ?? settings?.buffer_minutes ?? 0);
    setSlots(available);
    setSlotsLoading(false);
  }, [rules, overrides, settings, fetchBookingsForDate, durationMinutes]);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setStep('time');
    loadSlots(dateStr);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep('recurrence');
  };

  const recurringDates = useMemo(() => {
    if (!selectedDate) return [];
    const dates: string[] = [selectedDate];
    const start = new Date(selectedDate + 'T00:00:00');
    const intervalDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
    const maxOccurrences = parseInt(occurrences) || 0;

    if (link.is_ongoing) {
      for (let i = 1; ; i++) {
        const next = addDays(start, intervalDays * i);
        if (next > maxDate) break;
        dates.push(formatDate(next));
      }
      return dates;
    }

    for (let i = 1; ; i++) {
      const next = addDays(start, intervalDays * i);
      if (next > maxDate) break;
      const nextStr = formatDate(next);
      if (endDate && nextStr > endDate) break;
      if (maxOccurrences > 0 && dates.length >= maxOccurrences) break;
      dates.push(nextStr);
    }
    return dates;
  }, [selectedDate, frequency, occurrences, endDate, maxDate, link.is_ongoing]);

  const handleSubmit = async (formData: IntakeFormData) => {
    if (!selectedDate || !selectedSlot || !link) return;
    setSubmitting(true);

    const groupId = crypto.randomUUID();

    try {
      let firstBooking: Booking | null = null;
      const allBookings: Booking[] = [];
      for (const date of recurringDates) {
        const booking = await createBooking({
          first_name: formData.firstName,
          last_name: formData.lastName,
          client_email: formData.email,
          client_phone: formData.phone || undefined,
          is_existing_client: formData.isExistingClient ?? undefined,
          guests: formData.guests,
          date,
          start_time: selectedSlot,
          duration_minutes: durationMinutes,
          notes: formData.notes || undefined,
          source: 'recurring_link',
          recurring_link_id: link.id,
          recurrence_group_id: groupId,
          client_timezone: clientTimezone,
          meeting_type_id: meetingType?.id || null,
        });
        if (!firstBooking) firstBooking = booking;
        allBookings.push(booking);
      }
      setConfirmedBooking(firstBooking);
      setStep('confirm');
      for (const b of allBookings) {
        triggerBookingEmails(b.id);
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigate = (dir: -1 | 1) => {
    let newMonth = viewMonth + dir;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const canGoBack = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());
  const canGoForward = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  if (linkLoading || availLoading || settingsLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" message="Loading booking page..." />
      </div>
    );
  }

  if (linkError || !link) {
    return (
      <Card className="text-center py-16 max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Not Found</h2>
        <p className="text-gray-500 mb-6">This booking link is no longer active or does not exist.</p>
        <Link to="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </Card>
    );
  }

  const stepOrder: (BookingStep | 'recurrence')[] = ['calendar', 'time', 'recurrence', 'form'];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6 text-jungo-green-600">
        <Repeat className="w-5 h-5" />
        <span className="text-sm font-medium">Recurring Booking for {link.client_name}</span>
      </div>

      {step !== 'calendar' && step !== 'confirm' && (
        <button
          onClick={() => {
            if (step === 'form') setStep('recurrence');
            else if (step === 'recurrence') { setStep('time'); setSelectedSlot(null); }
            else if (step === 'time') { setStep('calendar'); setSelectedDate(null); }
          }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      {step !== 'confirm' && (
        <div className="flex items-center gap-2 mb-8">
          {stepOrder.map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={classNames(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                stepOrder.indexOf(s) <= stepOrder.indexOf(step) ? 'bg-jungo-green-500' : 'bg-gray-200'
              )} />
            </div>
          ))}
        </div>
      )}

      <Card padding="lg">
        {step === 'calendar' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {meetingType?.name || settings?.meeting_name || 'Schedule a Recurring Meeting'}
            </h2>
            {meetingType?.description && (
              <p className="text-sm text-gray-500 mb-4">{meetingType.description}</p>
            )}
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-jungo-green-500" />
              <span>{durationMinutes} minutes</span>
            </div>

            <div className="mb-6">
              <Select
                label="Timezone"
                value={clientTimezone}
                onChange={e => setClientTimezone(e.target.value)}
                options={getTimezoneOptions()}
              />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Start Date</h3>
            <p className="text-sm text-gray-500 mb-6">Choose when your recurring meetings begin.</p>
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              onNavigate={handleNavigate}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              rules={rules}
              overrides={overrides}
              maxDate={maxDate}
            />
          </>
        )}

        {step === 'time' && selectedDate && (
          <TimeSlotPicker
            date={selectedDate}
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSlotSelect}
            loading={slotsLoading}
            timezone={clientTimezone}
          />
        )}

        {step === 'recurrence' && selectedDate && selectedSlot && (
          <div className="animate-slide-up space-y-5">
            <h3 className="text-lg font-semibold text-gray-900">Recurrence Details</h3>

            {(link.allow_client_frequency || !link.frequency) && (
              <Select
                label="Frequency"
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'biweekly', label: 'Every 2 weeks' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            )}

            {link.is_ongoing ? (
              <div className="bg-jungo-green-50 border border-jungo-green-200 rounded-lg p-3 text-sm text-jungo-green-700">
                This is an ongoing recurring series with no end date. Sessions will continue until you stop booking.
              </div>
            ) : (link.allow_client_end_date || (!link.occurrences && !link.end_date)) && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Number of Sessions"
                  type="number"
                  min="2"
                  max="52"
                  value={occurrences}
                  onChange={e => setOccurrences(e.target.value)}
                />
                <Input
                  label="Or End By Date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm font-medium text-gray-700 mb-2">Schedule Preview ({recurringDates.length} sessions)</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {recurringDates.map((d, i) => (
                  <p key={d} className="text-sm text-gray-600">
                    <span className="text-gray-400 mr-2">#{i + 1}</span>
                    {formatDisplayDate(d)} at {formatTime(selectedSlot)}
                  </p>
                ))}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={() => setStep('form')}>
              Continue to Details
            </Button>
          </div>
        )}

        {step === 'form' && selectedDate && selectedSlot && (
          <IntakeForm
            date={selectedDate}
            time={selectedSlot}
            durationMinutes={durationMinutes}
            onSubmit={handleSubmit}
            loading={submitting}
            prefillName={link.client_name}
            prefillEmail={link.client_email}
          />
        )}

        {step === 'confirm' && confirmedBooking && (
          <div className="animate-scale-in text-center">
            <BookingConfirmation
              booking={confirmedBooking}
              onBookAnother={() => {
                setStep('calendar');
                setSelectedDate(null);
                setSelectedSlot(null);
                setConfirmedBooking(null);
              }}
            />
            <p className="text-sm text-gray-500 mt-4">
              {recurringDates.length} sessions have been booked.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
