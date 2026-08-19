import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Users, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBookings } from '@/hooks/useBookings';
import { useSettings } from '@/hooks/useSettings';
import Card from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BookingDetailsModal from '@/components/booking/BookingDetailsModal';
import { formatTime, formatDate, formatDisplayDate } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { bookings, loading } = useBookings();
  const { ensureSettings } = useSettings();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (user) ensureSettings(user.id);
  }, [user, ensureSettings]);

  const today = formatDate(new Date());

  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const todayBookings = confirmed.filter(b => b.date === today);

    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = formatDate(weekFromNow);
    const thisWeek = confirmed.filter(b => b.date >= today && b.date <= weekStr);

    const upcoming = confirmed
      .filter(b => b.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

    return { todayCount: todayBookings.length, weekCount: thisWeek.length, upcoming, total: bookings.length };
  }, [bookings, today]);

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const statCards = [
    { label: "Today's Meetings", value: stats.todayCount, icon: CalendarDays, color: 'text-jungo-green-500 bg-jungo-green-50' },
    { label: 'This Week', value: stats.weekCount, icon: Clock, color: 'text-blue-500 bg-blue-50' },
    { label: 'Total Bookings', value: stats.total, icon: Users, color: 'text-jungo-brown-500 bg-jungo-brown-50' },
    { label: 'Upcoming', value: stats.upcoming.length, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's your scheduling overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <Button variant="ghost" size="sm" onClick={() => window.location.hash = '#/admin/bookings'} icon={<ArrowRight className="w-4 h-4" />}>
            View All
          </Button>
        </div>

        {stats.upcoming.length === 0 ? (
          <Card className="text-center py-12">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No scheduled appointments yet.</p>
            <p className="text-sm text-gray-400 mt-1">When a client books, they'll appear here!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {stats.upcoming.slice(0, 8).map(booking => (
              <Card key={booking.id} hover onClick={() => setSelectedBooking(booking)}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {booking.first_name} {booking.last_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{booking.client_email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDisplayDate(booking.date).split(',')[0]}
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
      </div>

      <BookingDetailsModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
