import { useState, useEffect } from 'react';
import { Save, Check, Mail, Settings2, RotateCcw, ChevronDown, Calendar, Video } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Select from '@/components/ui/Select';
import { classNames } from '@/lib/utils';
import type { EmailElements } from '@/lib/types';

const DEFAULT_INVITE_TEMPLATE = `Hi {{client_name}},

You're invited to book a meeting with {{business_name}}.

Use this link to choose a time: {{booking_link}}

We look forward to seeing you there.`;

const DEFAULT_CONFIRMATION_TEMPLATE = `Hi {{client_name}},

Your meeting with {{business_name}} has been confirmed.

Date: {{date}}
Time: {{time}}
Duration: {{duration}} minutes

Need to cancel or reschedule? Use the links below.`;

const DEFAULT_NOTIFICATION_TEMPLATE = `Hi {{client_name}},

This is a reminder for your upcoming meeting with {{business_name}}.

Date: {{date}}
Time: {{time}}
Duration: {{duration}} minutes

See you soon!`;

const DEFAULT_ANNOUNCEMENT_TEMPLATE = `Hi {{client_name}},

{{business_name}} has an announcement for you.

{{message}}

If you have any questions, please don't hesitate to reach out.`;

const DEFAULT_CANCELLATION_TEMPLATE = `Hi {{client_name}},

Your meeting with {{business_name}} scheduled for {{date}} at {{time}} has been cancelled.

If you believe this is an error, please contact us.`;

const DEFAULT_RESCHEDULE_TEMPLATE = `Hi {{client_name}},

Your meeting with {{business_name}} has been rescheduled.

Old date: {{old_date}}
Old time: {{old_time}}

New date: {{new_date}}
New time: {{new_time}}
Duration: {{duration}} minutes

Need to make another change? Use the links below.`;

const EMAIL_DEFAULTS: Record<string, string> = {
  invite: DEFAULT_INVITE_TEMPLATE,
  confirmation: DEFAULT_CONFIRMATION_TEMPLATE,
  notification: DEFAULT_NOTIFICATION_TEMPLATE,
  announcement: DEFAULT_ANNOUNCEMENT_TEMPLATE,
  cancellation: DEFAULT_CANCELLATION_TEMPLATE,
  reschedule: DEFAULT_RESCHEDULE_TEMPLATE,
};

type TabId = 'general' | 'emails' | 'integrations';

type EmailTypeKey = 'invite' | 'confirmation' | 'notification' | 'announcement' | 'cancellation' | 'reschedule';

const EMAIL_TYPES: { key: EmailTypeKey; label: string; description: string }[] = [
  { key: 'invite', label: 'Invite Email', description: 'Sent when a client is invited to book a meeting.' },
  { key: 'confirmation', label: 'Confirmation Email', description: 'Sent when a booking is confirmed.' },
  { key: 'notification', label: 'Notification Email', description: 'Sent as a reminder before a meeting.' },
  { key: 'announcement', label: 'Announcement Email', description: 'Sent for broadcast messages to clients.' },
  { key: 'cancellation', label: 'Cancellation Email', description: 'Sent when a booking is cancelled.' },
  { key: 'reschedule', label: 'Reschedule Email', description: 'Sent when a booking is rescheduled.' },
];

const DEFAULT_ELEMENTS: EmailElements = {
  company_info: true,
  zoom: true,
  phone: true,
  google_calendar: true,
};

const ELEMENT_LABELS: { key: keyof EmailElements; label: string }[] = [
  { key: 'company_info', label: 'Include company / business info' },
  { key: 'zoom', label: 'Include Zoom / meeting link' },
  { key: 'phone', label: 'Include phone number' },
  { key: 'google_calendar', label: 'Include Google Calendar link' },
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // General tab
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [leadHours, setLeadHours] = useState('2');
  const [windowDays, setWindowDays] = useState('90');
  const [bufferMinutes, setBufferMinutes] = useState('15');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLeadHours, setNotifLeadHours] = useState('24');
  const [notifEmail, setNotifEmail] = useState('');
  const [clientReminderLeadHours, setClientReminderLeadHours] = useState('24');
  const [adminReminderMode, setAdminReminderMode] = useState<'individual' | 'daily'>('individual');
  const [adminDailySummaryTime, setAdminDailySummaryTime] = useState('07:00');
  const [adminDailySummaryNightBefore, setAdminDailySummaryNightBefore] = useState(false);
  const [notifyClientOnAdminChange, setNotifyClientOnAdminChange] = useState(false);

  // Emails tab — global defaults
  const [emailInviteEnabled, setEmailInviteEnabled] = useState(true);
  const [emailConfirmationEnabled, setEmailConfirmationEnabled] = useState(true);
  const [emailNotificationEnabled, setEmailNotificationEnabled] = useState(true);
  const [emailAnnouncementEnabled, setEmailAnnouncementEnabled] = useState(true);
  const [emailCancellationEnabled, setEmailCancellationEnabled] = useState(true);
  const [emailRescheduleEnabled, setEmailRescheduleEnabled] = useState(true);
  const [emailIncludeCompanyInfo, setEmailIncludeCompanyInfo] = useState(true);
  const [emailIncludeZoom, setEmailIncludeZoom] = useState(true);
  const [emailIncludePhone, setEmailIncludePhone] = useState(true);
  const [emailIncludeGoogleCalendar, setEmailIncludeGoogleCalendar] = useState(true);

  // Per-email-type overrides
  const [emailElements, setEmailElements] = useState<Record<EmailTypeKey, EmailElements>>({
    invite: { ...DEFAULT_ELEMENTS },
    confirmation: { ...DEFAULT_ELEMENTS },
    notification: { ...DEFAULT_ELEMENTS },
    announcement: { ...DEFAULT_ELEMENTS },
    cancellation: { ...DEFAULT_ELEMENTS },
    reschedule: { ...DEFAULT_ELEMENTS },
  });

  // Templates
  const [emailTemplates, setEmailTemplates] = useState<Record<EmailTypeKey, string>>({
    invite: '',
    confirmation: '',
    notification: '',
    announcement: '',
    cancellation: '',
    reschedule: '',
  });

  // Integrations tab
  const [emailFromName, setEmailFromName] = useState('');
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [zoomDefaultPasscode, setZoomDefaultPasscode] = useState('');
  const [zoomDefaultLink, setZoomDefaultLink] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Collapsible state
  const [expandedEmail, setExpandedEmail] = useState<EmailTypeKey | null>(null);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business_name);
      setContactEmail(settings.contact_email);
      setContactPhone(settings.contact_phone);
      setLeadHours(settings.booking_lead_hours.toString());
      setWindowDays(settings.booking_window_days.toString());
      setBufferMinutes((settings.buffer_minutes ?? 15).toString());
      setNotifEnabled(settings.notification_enabled ?? false);
      setNotifLeadHours(settings.notification_lead_hours?.toString() || '24');
      setNotifEmail(settings.notification_email || '');
      setClientReminderLeadHours((settings.client_reminder_lead_hours ?? 24).toString());
      setAdminReminderMode((settings.admin_reminder_mode as 'individual' | 'daily') || 'individual');
      setAdminDailySummaryTime(settings.admin_daily_summary_time || '07:00');
      setAdminDailySummaryNightBefore(settings.admin_daily_summary_night_before ?? false);
      setNotifyClientOnAdminChange(settings.notify_client_on_admin_change ?? false);

      setEmailInviteEnabled(settings.email_invite_enabled ?? true);
      setEmailConfirmationEnabled(settings.email_confirmation_enabled ?? true);
      setEmailNotificationEnabled(settings.email_notification_enabled ?? true);
      setEmailAnnouncementEnabled(settings.email_announcement_enabled ?? true);
      setEmailCancellationEnabled(settings.email_cancellation_enabled ?? true);
      setEmailRescheduleEnabled(settings.email_reschedule_enabled ?? true);
      setEmailIncludeCompanyInfo(settings.email_include_company_info ?? true);
      setEmailIncludeZoom(settings.email_include_zoom ?? true);
      setEmailIncludePhone(settings.email_include_phone ?? true);
      setEmailIncludeGoogleCalendar(settings.email_include_google_calendar ?? true);

      const globalDefaults: EmailElements = {
        company_info: settings.email_include_company_info ?? true,
        zoom: settings.email_include_zoom ?? true,
        phone: settings.email_include_phone ?? true,
        google_calendar: settings.email_include_google_calendar ?? true,
      };

      setEmailElements({
        invite: settings.email_invite_elements ?? { ...globalDefaults },
        confirmation: settings.email_confirmation_elements ?? { ...globalDefaults },
        notification: settings.email_notification_elements ?? { ...globalDefaults },
        announcement: settings.email_announcement_elements ?? { ...globalDefaults },
        cancellation: settings.email_cancellation_elements ?? { ...globalDefaults },
        reschedule: settings.email_reschedule_elements ?? { ...globalDefaults },
      });

      setEmailTemplates({
        invite: settings.email_invite_template || DEFAULT_INVITE_TEMPLATE,
        confirmation: settings.email_confirmation_template || DEFAULT_CONFIRMATION_TEMPLATE,
        notification: settings.email_notification_template || DEFAULT_NOTIFICATION_TEMPLATE,
        announcement: settings.email_announcement_template || DEFAULT_ANNOUNCEMENT_TEMPLATE,
        cancellation: settings.email_cancellation_template || DEFAULT_CANCELLATION_TEMPLATE,
        reschedule: settings.email_reschedule_template || DEFAULT_RESCHEDULE_TEMPLATE,
      });

      setEmailFromName(settings.email_from_name || settings.business_name);
      setZoomEnabled(settings.zoom_enabled ?? false);
      setZoomDefaultPasscode(settings.zoom_default_passcode || '');
      setZoomDefaultLink(settings.zoom_default_link || '');
    }
  }, [settings]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (contactEmail && !isValidEmail(contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }
    if (notifEmail && !isValidEmail(notifEmail)) {
      newErrors.notifEmail = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings({
        business_name: businessName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        booking_lead_hours: parseInt(leadHours) || 2,
        booking_window_days: parseInt(windowDays) || 90,
        buffer_minutes: parseInt(bufferMinutes) || 0,
        notification_enabled: notifEnabled,
        notification_lead_hours: parseInt(notifLeadHours) || 24,
        notification_email: notifEmail.trim(),
        client_reminder_lead_hours: parseInt(clientReminderLeadHours) || 24,
        admin_reminder_mode: adminReminderMode,
        admin_daily_summary_time: adminDailySummaryTime,
        admin_daily_summary_night_before: adminDailySummaryNightBefore,
        notify_client_on_admin_change: notifyClientOnAdminChange,
        email_invite_enabled: emailInviteEnabled,
        email_confirmation_enabled: emailConfirmationEnabled,
        email_notification_enabled: emailNotificationEnabled,
        email_announcement_enabled: emailAnnouncementEnabled,
        email_cancellation_enabled: emailCancellationEnabled,
        email_reschedule_enabled: emailRescheduleEnabled,
        email_include_company_info: emailIncludeCompanyInfo,
        email_include_zoom: emailIncludeZoom,
        email_include_phone: emailIncludePhone,
        email_include_google_calendar: emailIncludeGoogleCalendar,
        email_invite_elements: emailElements.invite,
        email_confirmation_elements: emailElements.confirmation,
        email_notification_elements: emailElements.notification,
        email_announcement_elements: emailElements.announcement,
        email_cancellation_elements: emailElements.cancellation,
        email_reschedule_elements: emailElements.reschedule,
        email_invite_template: emailTemplates.invite,
        email_confirmation_template: emailTemplates.confirmation,
        email_notification_template: emailTemplates.notification,
        email_announcement_template: emailTemplates.announcement,
        email_cancellation_template: emailTemplates.cancellation,
        email_reschedule_template: emailTemplates.reschedule,
        email_from_name: emailFromName,
        zoom_enabled: zoomEnabled,
        zoom_default_passcode: zoomDefaultPasscode || null,
        zoom_default_link: zoomDefaultLink.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const enabledState: Record<EmailTypeKey, [boolean, (v: boolean) => void]> = {
    invite: [emailInviteEnabled, setEmailInviteEnabled],
    confirmation: [emailConfirmationEnabled, setEmailConfirmationEnabled],
    notification: [emailNotificationEnabled, setEmailNotificationEnabled],
    announcement: [emailAnnouncementEnabled, setEmailAnnouncementEnabled],
    cancellation: [emailCancellationEnabled, setEmailCancellationEnabled],
    reschedule: [emailRescheduleEnabled, setEmailRescheduleEnabled],
  };

  const updateElement = (emailKey: EmailTypeKey, elementKey: keyof EmailElements, value: boolean) => {
    setEmailElements(prev => ({
      ...prev,
      [emailKey]: { ...prev[emailKey], [elementKey]: value },
    }));
  };

  const updateTemplate = (emailKey: EmailTypeKey, value: string) => {
    setEmailTemplates(prev => ({ ...prev, [emailKey]: value }));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your scheduling preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={classNames(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'general'
              ? 'border-jungo-green-500 text-jungo-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Settings2 className="w-4 h-4" />
          General
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={classNames(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'emails'
              ? 'border-jungo-green-500 text-jungo-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Mail className="w-4 h-4" />
          Emails
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={classNames(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'integrations'
              ? 'border-jungo-green-500 text-jungo-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Video className="w-4 h-4" />
          Integrations
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-8">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Business Information</h2>
            <div className="space-y-4">
              <Input label="Business Name" value={businessName} onChange={e => setBusinessName(e.target.value)} />
              <Input label="Contact Email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="admin@jungosolutions.com" error={errors.contactEmail} />
              <Input label="Contact Phone" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Booking Rules</h2>
            <div className="space-y-4">
              <Input
                label="Minimum Lead Time (hours)"
                type="number"
                value={leadHours}
                onChange={e => setLeadHours(e.target.value)}
                min="0"
                hint="How far in advance clients must book. Also blocks clients from cancelling or rescheduling within this window."
              />
              <Input
                label="Booking Window (days)"
                type="number"
                value={windowDays}
                onChange={e => setWindowDays(e.target.value)}
                min="7"
                max="365"
                hint="How far ahead clients can see the calendar"
              />
              <Input
                label="Buffer Between Meetings (minutes)"
                type="number"
                value={bufferMinutes}
                onChange={e => setBufferMinutes(e.target.value)}
                min="0"
                max="120"
                hint="Padding time required between consecutive bookings"
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Admin Notifications</h2>
            <p className="text-sm text-gray-500 mb-5">Get notified about upcoming meetings before they happen.</p>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifEnabled}
                  onChange={e => setNotifEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable upcoming meeting notifications</span>
              </label>
              <Select
                label="Admin Reminder Mode"
                value={adminReminderMode}
                onChange={e => setAdminReminderMode(e.target.value as 'individual' | 'daily')}
                options={[
                  { value: 'individual', label: 'Individual Reminders (sent at lead time before each meeting)' },
                  { value: 'daily', label: 'Daily Summary (one email listing all meetings for the day)' },
                ]}
              />
              {adminReminderMode === 'individual' ? (
                <Input
                  label="Notify me this many hours before each meeting"
                  type="number"
                  value={notifLeadHours}
                  onChange={e => setNotifLeadHours(e.target.value)}
                  min="1"
                  max="168"
                  hint="e.g., 24 = notify 1 day before, 2 = notify 2 hours before"
                />
              ) : (
                <>
                  <Input
                    label="Daily Summary Time"
                    type="time"
                    value={adminDailySummaryTime}
                    onChange={e => setAdminDailySummaryTime(e.target.value)}
                    hint="When to send the daily summary (defaults to 7:00 AM)"
                  />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminDailySummaryNightBefore}
                      onChange={e => setAdminDailySummaryNightBefore(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Send the night before instead of the morning of</span>
                  </label>
                </>
              )}
              <Input
                label="Notification email"
                type="email"
                value={notifEmail}
                onChange={e => setNotifEmail(e.target.value)}
                placeholder="Leave blank to use contact email"
                hint="Where to send meeting reminders"
                error={errors.notifEmail}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Client Reminders</h2>
            <p className="text-sm text-gray-500 mb-5">Automatically remind clients about their upcoming meetings.</p>
            <Input
              label="Client Reminder Lead Time (hours)"
              type="number"
              value={clientReminderLeadHours}
              onChange={e => setClientReminderLeadHours(e.target.value)}
              min="1"
              max="168"
              hint="e.g., 24 = remind clients 1 day before, 2 = remind 2 hours before"
            />
          </Card>
        </div>
      )}

      {/* Emails Tab */}
      {activeTab === 'emails' && (
        <div className="space-y-8">
          {/* Global Element Defaults */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Email Element Defaults</h2>
            <p className="text-sm text-gray-500 mb-5">
              These are the global defaults for what to include in outgoing emails. Each email type below can override these individually.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailIncludeCompanyInfo}
                  onChange={e => setEmailIncludeCompanyInfo(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Include company / business info</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailIncludeZoom}
                  onChange={e => setEmailIncludeZoom(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Include Zoom / meeting link</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailIncludePhone}
                  onChange={e => setEmailIncludePhone(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Include phone number</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailIncludeGoogleCalendar}
                  onChange={e => setEmailIncludeGoogleCalendar(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                />
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  Include Google Calendar link
                </span>
              </label>
            </div>
          </Card>

          {/* Per-Email-Type Collapsible Dropdowns */}
          {EMAIL_TYPES.map(({ key, label, description }) => {
            const [enabled, setEnabled] = enabledState[key];
            const template = emailTemplates[key];
            const isExpanded = expandedEmail === key;
            const elements = emailElements[key];

            return (
              <Card key={key} padding="none">
                {/* Header / Toggle Row */}
                <button
                  onClick={() => setExpandedEmail(isExpanded ? null : key)}
                  className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{label}</h3>
                      <span
                        className={classNames(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          enabled ? 'bg-jungo-green-100 text-jungo-green-700' : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ChevronDown
                      className={classNames(
                        'w-5 h-5 text-gray-400 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-5">
                    {/* Enable Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={e => setEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Send this email type</span>
                    </label>

                    {/* Element Overrides */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Element Overrides</p>
                      <p className="text-xs text-gray-400 mb-3">
                        Uncheck to exclude an element from this email type only. Defaults match the global settings above.
                      </p>
                      <div className="space-y-2.5">
                        {ELEMENT_LABELS.map(({ key: elKey, label: elLabel }) => (
                          <label key={elKey} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={elements[elKey]}
                              onChange={e => updateElement(key, elKey, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
                            />
                            <span className="text-sm text-gray-600">{elLabel}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Template Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-700">Email Template</span>
                        <button
                          onClick={() => updateTemplate(key, EMAIL_DEFAULTS[key])}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-jungo-green-600 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset to default
                        </button>
                      </div>
                      <Textarea
                        value={template}
                        onChange={e => updateTemplate(key, e.target.value)}
                        rows={8}
                        placeholder="Write your email template here..."
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Use placeholders like {'{{client_name}}'}, {'{{date}}'}, {'{{time}}'}, {'{{duration}}'}, {'{{business_name}}'}.
                        {key === 'reschedule' && ' Reschedule emails also support {{old_date}}, {{old_time}}, {{new_date}}, {{new_time}}.'}
                        {key === 'invite' && ' Invite emails also support {{booking_link}}.'}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-8">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Email Service</h2>
            <p className="text-sm text-gray-500 mb-5">
              Configure how outgoing booking emails appear to recipients. Emails are sent via Resend.
            </p>
            <Input
              label="From Name"
              value={emailFromName}
              onChange={e => setEmailFromName(e.target.value)}
              hint="The display name shown in the From field of booking emails"
            />
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Zoom Integration</h2>
            <p className="text-sm text-gray-500 mb-5">
              When enabled, a Zoom meeting is automatically created for each booking and the join link is included in the confirmation email.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={zoomEnabled}
                onChange={e => setZoomEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable automatic Zoom meeting creation</span>
            </label>
            <div className="mt-4">
              <Input
                label="Default Zoom Link"
                value={zoomDefaultLink}
                onChange={e => setZoomDefaultLink(e.target.value)}
                placeholder="https://zoom.us/j/12345678901"
                hint="Your personal Zoom link, used for all meetings unless a meeting type or individual booking has its own link. Leave blank to auto-create a new meeting per booking instead."
              />
            </div>
            <div className="mt-4">
              <Input
                label="Default Zoom Passcode"
                value={zoomDefaultPasscode}
                onChange={e => setZoomDefaultPasscode(e.target.value)}
                placeholder="e.g., 123456"
                hint="Used for auto-created Zoom meetings unless 'randomly generate' is checked on a specific booking. Has no effect when using a default or manual Zoom link. Leave blank to let Zoom auto-generate."
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Meeting types with a manual Zoom link override will use that link instead of the default. If no link is set at any level and auto-creation is on, a new Zoom meeting is created per booking (requires Zoom Server-to-Server OAuth credentials).
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Google Calendar</h2>
            <p className="text-sm text-gray-500">
              Google Calendar links are automatically included in confirmation emails when the "Include Google Calendar link" toggle is enabled on the Emails tab. No setup required — this uses Google's public event URL format.
            </p>
          </Card>
        </div>
      )}

      {/* Notify client on admin change - shown on all tabs */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Admin Change Notifications</h2>
        <p className="text-sm text-gray-500 mb-5">Control whether clients are notified when you edit their bookings from the admin panel.</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyClientOnAdminChange}
            onChange={e => setNotifyClientOnAdminChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-jungo-green-500 focus:ring-jungo-green-500"
          />
          <span className="text-sm font-medium text-gray-700">Default to notifying clients when editing booking details</span>
        </label>
        <p className="text-xs text-gray-400 mt-2">Sets the default for the "Notify client" checkbox when editing bookings. You can still override per change.</p>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          loading={saving}
          icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          size="lg"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
        {saved && <span className="text-sm text-jungo-green-600">Changes saved successfully.</span>}
      </div>
    </div>
  );
}
