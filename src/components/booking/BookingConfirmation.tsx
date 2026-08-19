import { CheckCircle, Calendar, Clock, Mail, ArrowLeft } from 'lucide-react';
import { formatTime, formatDisplayDate } from '@/lib/utils';
import type { Booking } from '@/lib/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface BookingConfirmationProps {
  booking: Booking;
  onBookAnother: () => void;
}

export default function BookingConfirmation({ booking, onBookAnother }: BookingConfirmationProps) {
  return (
    <div className="animate-scale-in text-center max-w-md mx-auto">
      <div className="mb-6">
        <div className="w-16 h-16 bg-jungo-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-jungo-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're booked!</h2>
        <p className="text-gray-500">A confirmation email will be sent to {booking.client_email}</p>
      </div>

      <Card className="text-left mb-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-jungo-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">{formatDisplayDate(booking.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-jungo-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </p>
              <p className="text-sm text-gray-500">{booking.duration_minutes} minutes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-jungo-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">{booking.first_name} {booking.last_name}</p>
              <p className="text-sm text-gray-500">{booking.client_email}</p>
              {booking.guests.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  +{booking.guests.length} guest{booking.guests.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Button
        variant="outline"
        onClick={onBookAnother}
        icon={<ArrowLeft className="w-4 h-4" />}
      >
        Book Another Appointment
      </Button>
    </div>
  );
}
