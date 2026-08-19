import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '@/components/layout/PublicLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import MeetingTypeBookingPage from '@/pages/public/MeetingTypeBookingPage';
import RecurringBookingPage from '@/pages/public/RecurringBookingPage';
import ProposalBookingPage from '@/pages/public/ProposalBookingPage';
import ManageBookingPage from '@/pages/public/ManageBookingPage';
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import AvailabilityPage from '@/pages/admin/AvailabilityPage';
import BookingsPage from '@/pages/admin/BookingsPage';
import ManualBookingPage from '@/pages/admin/ManualBookingPage';
import MeetingTypesPage from '@/pages/admin/MeetingTypesPage';
import RecurringLinksPage from '@/pages/admin/RecurringLinksPage';
import ProposalLinksPage from '@/pages/admin/ProposalLinksPage';
import SettingsPage from '@/pages/admin/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/m/:token" element={<MeetingTypeBookingPage />} />
        <Route path="/book/:token" element={<RecurringBookingPage />} />
        <Route path="/p/:token" element={<ProposalBookingPage />} />
        <Route path="/manage/:token" element={<ManageBookingPage />} />
      </Route>

      <Route path="/admin/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/availability" element={<AvailabilityPage />} />
          <Route path="/admin/bookings" element={<BookingsPage />} />
          <Route path="/admin/bookings/new" element={<ManualBookingPage />} />
          <Route path="/admin/meeting-types" element={<MeetingTypesPage />} />
          <Route path="/admin/recurring-links" element={<RecurringLinksPage />} />
          <Route path="/admin/proposals" element={<ProposalLinksPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
