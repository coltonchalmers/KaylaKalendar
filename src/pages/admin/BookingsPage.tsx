import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Filter, CalendarDays } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { useMeetingTypes } from '@/hooks/useMeetingTypes';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BookingDetailsModal from '@/components/booking/BookingDetailsModal';
import { formatTime, formatDisplayDate } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export default function BookingsPage() {
  const { bookings, loading, fetchBookings } = useBookings();
  const { meetingTypes } = useMeetingTypes();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const meetingTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    meetingTypes.forEach(mt => { map[mt.id] = mt.name; });
    return map;
  }, [meetingTypes]);

  const doSearch = useCallback(() => {
    fetchBookings({ status: statusFilter, search: search || undefined });
  }, [fetchBookings, statusFilter, search]);

  useEffect(() => {
    const timeout = setTimeout(doSearch, 300);
    return () => clearTimeout(timeout);
  }, [doSearch]);

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Bookings</h1>
        <p className="text-gray-500 mt-1">Manage and track all appointments.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-jungo-green-200 focus:border-jungo-green-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'confirmed', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-jungo-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <Card className="text-center py-16">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No bookings found.</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'When clients book, their appointments will appear here!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {bookings.map(booking => (
            <Card key={booking.id} hover onClick={() => setSelectedBooking(booking)}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {booking.first_name} {booking.last_name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{booking.client_email}</p>
                  {booking.meeting_type_id && meetingTypeMap[booking.meeting_type_id] && (
                    <p className="text-xs text-jungo-green-600 mt-0.5">{meetingTypeMap[booking.meeting_type_id]}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-900">
                    {formatDisplayDate(booking.date).split(',').slice(0, 2).join(',')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <BookingDetailsModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
