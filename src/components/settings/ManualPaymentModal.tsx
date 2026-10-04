import React, { useState, useEffect } from 'react';
import { ManualPaymentOption } from '../../types';
import { X, CreditCard, Building2, Smartphone, Banknote } from 'lucide-react';

interface ManualPaymentModalProps {
  isOpen: boolean;
  optionToEdit: ManualPaymentOption | null;
  onSave: (data: Partial<ManualPaymentOption>) => Promise<void>;
  onClose: () => void;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  isOpen,
  optionToEdit,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ManualPaymentOption['type']>('bank');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (optionToEdit) {
      setTitle(optionToEdit.title);
      setType(optionToEdit.type);
      setAccountName(optionToEdit.accountName || '');
      setAccountNumber(optionToEdit.accountNumber || '');
      setRoutingNumber(optionToEdit.routingNumber || '');
      setBranch(optionToEdit.branch || '');
      setInstructions(optionToEdit.instructions || '');
      setIsActive(optionToEdit.isActive);
    } else {
      setTitle('');
      setType('bank');
      setAccountName('Satora Lab Limited');
      setAccountNumber('');
      setRoutingNumber('');
      setBranch('Dhaka Branch');
      setInstructions('Please include Project ID in payment description.');
      setIsActive(true);
    }
    setError('');
  }, [optionToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Payment option title is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        title,
        type,
        accountName,
        accountNumber,
        routingNumber,
        branch,
        instructions,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save payment option');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              {optionToEdit ? `Edit Payment Method: ${optionToEdit.title}` : 'Add Manual Payment Option (Admin)'}
            </h3>
          </div>
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
              <label className="block font-bold text-slate-700 mb-1">Option Display Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dutch Bangla Bank Rocket"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                <option value="bank">Bank Account (BEFTN/RTGS/Wire)</option>
                <option value="mfs">Mobile Financial Service (bKash/Nagad/Rocket)</option>
                <option value="cash">Cash Desk / Vault</option>
                <option value="card">Corporate Card</option>
                <option value="other">Other Gateway</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Holder / Beneficiary</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Satora Lab Limited"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Number / MFS Wallet</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 15012048912001 or 01711..."
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {type === 'bank' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Routing Number</label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="e.g. 060271638"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Banani Branch, Dhaka"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Instructions for Client/Accountant</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Counter number, dial code, or reference remark requirements..."
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Active & available for selection in invoices and transaction logs</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : optionToEdit ? 'Save Changes' : 'Add Payment Option'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
