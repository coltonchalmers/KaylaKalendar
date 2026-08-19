import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { formatTime, formatDisplayDate } from '@/lib/utils';

interface IntakeFormProps {
  date: string;
  time: string;
  durationMinutes: number;
  onSubmit: (data: IntakeFormData) => void;
  loading?: boolean;
  prefillName?: string;
  prefillEmail?: string;
}

export interface IntakeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isExistingClient: boolean | null;
  guests: string[];
  notes: string;
}

export default function IntakeForm({
  date,
  time,
  durationMinutes,
  onSubmit,
  loading,
  prefillName,
  prefillEmail,
}: IntakeFormProps) {
  const nameParts = prefillName?.split(' ') || [];
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [email, setEmail] = useState(prefillEmail || '');
  const [phone, setPhone] = useState('');
  const [isExistingClient, setIsExistingClient] = useState<string>('');
  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrors(prev => ({ ...prev, guest: 'Please enter a valid email' }));
      return;
    }
    if (guests.includes(trimmed)) {
      setErrors(prev => ({ ...prev, guest: 'This guest is already added' }));
      return;
    }
    setGuests(prev => [...prev, trimmed]);
    setGuestInput('');
    setErrors(prev => { const { guest, ...rest } = prev; return rest; });
  };

  const removeGuest = (email: string) => {
    setGuests(prev => prev.filter(g => g !== email));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email';
    if (phone.trim() && !/^[\d\s()+\-./]{7,}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      isExistingClient: isExistingClient === '' ? null : isExistingClient === 'yes',
      guests,
      notes: notes.trim(),
    });
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-jungo-green-50 rounded-lg p-4 mb-6 border border-jungo-green-200">
        <p className="text-sm font-medium text-jungo-green-800">
          {formatDisplayDate(date)} at {formatTime(time)}
        </p>
        <p className="text-sm text-jungo-green-600">{durationMinutes} minute meeting</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            required
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            error={errors.firstName}
            placeholder="Jane"
          />
          <Input
            label="Last Name"
            required
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            error={errors.lastName}
            placeholder="Doe"
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={errors.email}
          placeholder="jane@example.com"
        />

        <Input
          label="Contact Phone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          error={errors.phone}
          placeholder="(555) 123-4567"
        />

        <Select
          label="Are you an existing client of Jungo Solutions?"
          value={isExistingClient}
          onChange={e => setIsExistingClient(e.target.value)}
          options={[
            { value: '', label: 'Select...' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Add Guests (optional)</label>
          <div className="flex gap-2">
            <Input
              value={guestInput}
              onChange={e => setGuestInput(e.target.value)}
              placeholder="guest@example.com"
              error={errors.guest}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }}
            />
            <Button type="button" variant="outline" onClick={addGuest} icon={<UserPlus className="w-4 h-4" />} size="md">
              Add
            </Button>
          </div>
          {guests.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {guests.map(g => (
                <span key={g} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                  {g}
                  <button type="button" onClick={() => removeGuest(g)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Textarea
          label="Please share anything that will help prepare for our meeting"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Topics you'd like to discuss, questions, or context..."
        />

        <Button type="submit" loading={loading} size="lg" className="w-full">
          Book Appointment
        </Button>
      </form>
    </div>
  );
}
