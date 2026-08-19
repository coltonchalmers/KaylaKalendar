import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Clock, CalendarClock, Check } from 'lucide-react';
import IntakeForm from '@/components/booking/IntakeForm';
import type { IntakeFormData } from '@/components/booking/IntakeForm';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useProposalLinks } from '@/hooks/useProposalLinks';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import { formatTime, formatDisplayDate, classNames } from '@/lib/utils';
import { triggerBookingEmails } from '@/lib/bookingEmails';
import type { Booking, MeetingType, ProposalSlot, BookingStep } from '@/lib/types';
import type { ProposalLinkWithSlots } from '@/hooks/useProposalLinks';

type ProposalStep = BookingStep | 'slots';

export default function ProposalBookingPage() {
  const { token } = useParams<{ token: string }>();
  const { fetchByToken, claimSlot } = useProposalLinks();
  const { createBooking } = useBookings({ autoFetch: false });
  const { settings, loading: settingsLoading } = useSettings();

  const [proposal, setProposal] = useState<ProposalLinkWithSlots | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [step, setStep] = useState<ProposalStep>('slots');
  const [selectedSlot, setSelectedSlot] = useState<ProposalSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await fetchByToken(token);
        if (!data) {
          setError(true);
        } else {
          setProposal(data);
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
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, fetchByToken]);

  const isExpired = useMemo(() => {
    if (!proposal?.expires_at) return false;
    return new Date(proposal.expires_at) < new Date();
  }, [proposal]);

  const availableSlots = useMemo(() => {
    if (!proposal) return [];
    return proposal.slots.filter(s => !s.is_claimed);
  }, [proposal]);

  const slotsByDate = useMemo(() => {
    const groups: Record<string, ProposalSlot[]> = {};
    for (const slot of availableSlots) {
      if (!groups[slot.date]) groups[slot.date] = [];
      groups[slot.date].push(slot);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [availableSlots]);

  const durationMinutes = meetingType?.duration_minutes || settings?.default_meeting_length || 30;

  const handleSlotSelect = (slot: ProposalSlot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleSubmit = async (formData: IntakeFormData) => {
    if (!selectedSlot || !proposal) return;
    setSubmitting(true);
    try {
      await claimSlot(selectedSlot.id);

      const booking = await createBooking({
        first_name: formData.firstName,
        last_name: formData.lastName,
        client_email: formData.email,
        client_phone: formData.phone || undefined,
        is_existing_client: formData.isExistingClient ?? undefined,
        guests: formData.guests,
        date: selectedSlot.date,
        start_time: selectedSlot.start_time,
        duration_minutes: durationMinutes,
        notes: formData.notes || undefined,
        source: 'proposal_link',
        proposal_link_id: proposal.id,
        meeting_type_id: meetingType?.id || null,
      });

      setConfirmedBooking(booking);
      setStep('confirm');
      triggerBookingEmails(booking.id);
    } catch (err) {
      console.error('Booking error:', err);
      alert('This slot may have just been booked by someone else, or something went wrong. Please try another slot.');
      setStep('slots');
      setSelectedSlot(null);
      const refreshed = await fetchByToken(token!);
      if (refreshed) setProposal(refreshed);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('slots');
    setSelectedSlot(null);
    setConfirmedBooking(null);
  };

  if (loading || settingsLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" message="Loading booking page..." />
      </div>
    );
  }

  if (error || !proposal) {
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

  if (isExpired) {
    return (
      <Card className="text-center py-16 max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Proposal Expired</h2>
        <p className="text-gray-500 mb-6">This proposal link has expired. Please contact us to schedule your appointment.</p>
        <Link to="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </Card>
    );
  }

  if (step !== 'confirm' && availableSlots.length === 0) {
    return (
      <Card className="text-center py-16 max-w-lg mx-auto">
        <CalendarClock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Slots Available</h2>
        <p className="text-gray-500 mb-6">All the offered time slots have been booked. Please contact us to schedule.</p>
        <Link to="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </Card>
    );
  }

  const stepOrder: ProposalStep[] = ['slots', 'form'];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6 text-jungo-green-600">
        <CalendarClock className="w-5 h-5" />
        <span className="text-sm font-medium">
          {meetingType?.name || 'Meeting Proposal'}
        </span>
      </div>

      {step !== 'slots' && step !== 'confirm' && (
        <button
          onClick={() => {
            if (step === 'form') { setStep('slots'); setSelectedSlot(null); }
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
        {step === 'slots' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {meetingType?.name || 'Choose a Time'}
            </h2>
            {meetingType?.description && (
              <p className="text-sm text-gray-500 mb-4">{meetingType.description}</p>
            )}
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-jungo-green-500" />
              <span>{durationMinutes} minutes</span>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Please choose from the available times below:
            </p>

            <div className="space-y-5">
              {slotsByDate.map(([date, slots]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {formatDisplayDate(date)}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotSelect(slot)}
                        className={classNames(
                          'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          'border-gray-200 text-gray-700 hover:border-jungo-green-500 hover:bg-jungo-green-50 hover:text-jungo-green-700',
                          'active:scale-95'
                        )}
                      >
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'form' && selectedSlot && (
          <IntakeForm
            date={selectedSlot.date}
            time={selectedSlot.start_time}
            durationMinutes={durationMinutes}
            onSubmit={handleSubmit}
            loading={submitting}
            prefillName={proposal.client_name}
            prefillEmail={proposal.client_email}
          />
        )}

        {step === 'confirm' && confirmedBooking && (
          <BookingConfirmation
            booking={confirmedBooking}
            onBookAnother={reset}
          />
        )}
      </Card>
    </div>
  );
}
