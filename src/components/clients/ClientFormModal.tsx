import React, { useState, useEffect } from 'react';
import { Client } from '../../types';
import { X } from 'lucide-react';

interface ClientFormModalProps {
  isOpen: boolean;
  clientToEdit: Client | null;
  onSave: (data: Partial<Client>) => Promise<void>;
  onClose: () => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  clientToEdit,
  onSave,
  onClose,
}) => {
  const [company, setCompany] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<Client['status']>('Active');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (clientToEdit) {
      setCompany(clientToEdit.company);
      setContactPerson(clientToEdit.contactPerson);
      setEmail(clientToEdit.email);
      setPhone(clientToEdit.phone);
      setAddress(clientToEdit.address);
      setStatus(clientToEdit.status);
      setFollowUpDate(clientToEdit.followUpDate || '');
      setNotes(clientToEdit.notes || '');
    } else {
      setCompany('');
      setContactPerson('');
      setEmail('');
      setPhone('+880 17');
      setAddress('Dhaka, Bangladesh');
      setStatus('Active');
      setFollowUpDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
      setNotes('');
    }
    setError('');
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !contactPerson.trim() || !email.trim()) {
      setError('Company name, contact person, and email are required');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        company,
        contactPerson,
        email,
        phone,
        address,
        status,
        followUpDate,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {clientToEdit ? `Edit Client: ${clientToEdit.company}` : 'Add New Client Partner'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Organization *</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Grameenphone Ltd"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Muntasir Billah"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Office Address (Dhaka / Global)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shadhinata Bhaban, Tejgaon, Dhaka"
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Relationship Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                <option value="Lead">Lead</option>
                <option value="Active">Active Client</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Notes & Contract Specs</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key stakeholders, payment terms, or expansion leads..."
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : clientToEdit ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
