import React, { useState, useEffect } from 'react';
import { Project, ManualPaymentOption } from '../../types';
import { X, DollarSign, Calendar, Hash, CreditCard, ArrowDownRight, ArrowUpRight, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ManualPaymentEntryModalProps {
  isOpen: boolean;
  projects: Project[];
  paymentOptions: ManualPaymentOption[];
  categories: string[];
  onSave: (data: {
    date: string;
    amount: number;
    reference: string;
    paymentMethod: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    projectId?: string;
    clientName?: string;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const ManualPaymentEntryModal: React.FC<ManualPaymentEntryModalProps> = ({
  isOpen,
  projects,
  paymentOptions,
  categories,
  onSave,
  onClose,
}) => {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(150000);
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [category, setCategory] = useState('Client Payment');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [isCompanyOverhead, setIsCompanyOverhead] = useState(false);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Default active payment method
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setReference(`OFF-${Date.now().toString().slice(-6)}`);
      const defaultMethod = paymentOptions.find((p) => p.isActive)?.title || 'Bank Transfer (BRAC Bank)';
      setPaymentMethod(defaultMethod);
      if (type === 'income') {
        setCategory('Client Payment');
        setDescription('Direct client milestone payment received off-platform');
      } else {
        setCategory('Marketing & Brand');
        setDescription('Vendor or operating expense paid off-platform');
      }
      setError('');
    }
  }, [isOpen, type, paymentOptions]);

  // Sync category when type toggles
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    if (newType === 'income') {
      setCategory('Client Payment');
      setDescription('Direct client milestone payment received off-platform');
    } else {
      setCategory('Marketing & Brand');
      setDescription('Vendor or operating expense paid off-platform');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please specify a positive payment amount in BDT (৳)');
      return;
    }
    if (!reference.trim()) {
      setError('Reference / Voucher number is required for off-platform audit trail');
      return;
    }
    if (!paymentMethod.trim()) {
      setError('Payment method is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSave({
        date,
        amount: Number(amount),
        reference: reference.trim(),
        paymentMethod: paymentMethod.trim(),
        type,
        category: category || (type === 'income' ? 'Client Payment' : 'Miscellaneous Overhead'),
        description: description.trim(),
        projectId: !isCompanyOverhead && projectId ? projectId : undefined,
        clientName: clientName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record manual payment entry');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOptionDetails = paymentOptions.find((p) => p.title === paymentMethod);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {type === 'income' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Off-Platform Manual Payment</h3>
              <p className="text-[11px] text-slate-500">
                Log external bank wires, direct cash vouchers, or MFS receipts to update monthly profit.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Payment Type Toggle */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Payment Flow Direction *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Income Received (Inflow)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-50 text-rose-800 border-rose-500 ring-2 ring-rose-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Expense Disbursed (Outflow)</span>
              </button>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Amount (BDT ৳) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="e.g. 250000"
                  className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2 font-mono font-bold text-slate-900 focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Transaction Date *</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Reference Number & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reference Number *</label>
              <input
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. CHQ-991204 / TR-88219"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono font-bold text-slate-900 focus:outline-hidden focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Bank slip, check #, or TrxID</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method / Channel *</label>
              <select
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-blue-600 bg-white"
              >
                {paymentOptions.length > 0 ? (
                  paymentOptions.map((opt) => (
                    <option key={opt.id} value={opt.title}>
                      {opt.title} ({opt.type.toUpperCase()})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Bank Transfer (BRAC Bank)">Bank Transfer (BRAC Bank)</option>
                    <option value="Bank Transfer (City Bank)">Bank Transfer (City Bank)</option>
                    <option value="bKash Merchant">bKash Merchant</option>
                    <option value="Nagad Business">Nagad Business</option>
                    <option value="Petty Cash">Petty Cash</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Account Details Callout */}
          {selectedOptionDetails && selectedOptionDetails.accountNumber && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">{selectedOptionDetails.title}:</span>{' '}
                <span className="font-mono">A/C: {selectedOptionDetails.accountNumber}</span>
                {selectedOptionDetails.branch && <span> ({selectedOptionDetails.branch})</span>}
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                Verified Method
              </span>
            </div>
          )}

          {/* Category & Project Allocation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Financial Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-blue-600 bg-white"
              >
                {type === 'income' ? (
                  <>
                    <option value="Client Payment">Client Payment</option>
                    <option value="Retainer Fee">Retainer Fee</option>
                    <option value="Consulting Services">Consulting Services</option>
                    <option value="Startup Investment / Equity">Startup Investment / Equity</option>
                    <option value="Other Income">Other Income</option>
                  </>
                ) : (
                  <>
                    <option value="Marketing & Brand">Marketing & Brand</option>
                    <option value="Software & Cloud Services">Software & Cloud Services</option>
                    <option value="Hardware & Equipment">Hardware & Equipment</option>
                    <option value="Office Rent">Office Rent</option>
                    <option value="Direct Project Cost">Direct Project Cost</option>
                    <option value="Payroll">Payroll</option>
                    <option value="Utilities & Internet">Utilities & Internet</option>
                    <option value="Legal & Professional Fees">Legal & Professional Fees</option>
                    <option value="Miscellaneous Overhead">Miscellaneous Overhead</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Client / Payee Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. bKash Limited or Google Workspace"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-blue-600"
              />
            </div>
          </div>

          {/* Project linkage */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Project Allocation</span>
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompanyOverhead}
                  onChange={(e) => setIsCompanyOverhead(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-[11px]">General Company Overhead (No project)</span>
              </label>
            </div>

            {!isCompanyOverhead && (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 focus:outline-hidden"
              >
                <option value="">-- Select Linked Project (Optional) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Description / Memo *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Direct cash advance collected at client head office"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Audit Notes / Verification Memo</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deposited to corporate account slip #4901; verified by finance team."
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-slate-900 focus:outline-hidden focus:border-blue-600 resize-none"
            />
          </div>

          {/* Live Calculation Notice */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Automatic Monthly Profit Integration</span>
              <span>
                Saving this entry will immediately adjust current monthly cash revenue/expenses, update company net cash flow, and recalculate remaining bank treasury funds.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 font-bold text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Recording...' : `Record Manual ${type === 'income' ? 'Income' : 'Expense'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
