import React, { useState, useEffect } from 'react';
import { InvestmentEntry } from '../../types';
import { X, Coins, Sparkles, Building2, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatBDT } from '../../utils/formatters';

interface InvestmentModalProps {
  isOpen: boolean;
  onSave: (data: Partial<InvestmentEntry>) => Promise<void>;
  onClose: () => void;
}

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onSave,
  onClose,
}) => {
  const [source, setSource] = useState('Founders Strategic Capital Injection');
  const [investorName, setInvestorName] = useState('Asaduzzaman Rocky (Lead Founder)');
  const [amount, setAmount] = useState<number>(2000000);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (BRAC Bank)');
  const [reference, setReference] = useState(`CAP-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('');

  // Allocations percentages
  const [marketingPercent, setMarketingPercent] = useState<number>(25);
  const [subscriptionsPercent, setSubscriptionsPercent] = useState<number>(20);
  const [hardwareOfficePercent, setHardwareOfficePercent] = useState<number>(25);
  const [operatingRunwayPercent, setOperatingRunwayPercent] = useState<number>(30);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setReference(`CAP-${Date.now().toString().slice(-6)}`);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid investment capital amount');
      return;
    }

    const marketing = Math.round((amount * marketingPercent) / 100);
    const subscriptions = Math.round((amount * subscriptionsPercent) / 100);
    const hardwareOffice = Math.round((amount * hardwareOfficePercent) / 100);
    const operatingRunway = Math.round((amount * operatingRunwayPercent) / 100);

    setSubmitting(true);
    try {
      await onSave({
        source: source.trim(),
        investorName: investorName.trim(),
        amount: Number(amount),
        date,
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
        allocations: {
          marketing,
          subscriptions,
          hardwareOffice,
          operatingRunway,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record investment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Startup Investment & Capital</h3>
              <p className="text-[11px] text-slate-500">
                Inject capital runway for marketing, software subscriptions, and operations.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Investment Source / Funding Round *</label>
            <input
              type="text"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Founders Seed Capital, Angel Round, Tech Grant"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Investor / Contributor *</label>
              <input
                type="text"
                required
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
                placeholder="e.g. Asaduzzaman Rocky"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Capital Amount (BDT ৳) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  required
                  min="1000"
                  step="10000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="2000000"
                  className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2 font-mono font-bold text-purple-700 text-sm focus:outline-hidden focus:border-purple-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deposit Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Receiving Bank Account *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-slate-900 focus:outline-hidden focus:border-purple-600 bg-white"
              >
                <option value="Bank Transfer (BRAC Bank)">BRAC Bank Corporate</option>
                <option value="Bank Transfer (City Bank)">City Bank Corporate</option>
                <option value="Direct Cash Vault">Petty Cash / Corporate Safe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Reference Voucher / Transaction ID *</label>
            <input
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. BRAC-DEP-884192"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono font-bold text-slate-900 focus:outline-hidden focus:border-purple-600"
            />
          </div>

          {/* Allocation Breakdown Preview */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Target Budget Allocation (Runway)</span>
              <span className="font-mono text-[11px] text-purple-700 font-bold">
                Total: {formatBDT(amount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Marketing & Ads (25%)</span>
                <span className="font-bold text-blue-600 font-mono">
                  {formatBDT(Math.round((amount * 25) / 100))}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Software & SaaS Subscriptions (20%)</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {formatBDT(Math.round((amount * 20) / 100))}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Hardware & Office Setup (25%)</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {formatBDT(Math.round((amount * 25) / 100))}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Operating Buffer / Runway (30%)</span>
                <span className="font-bold text-amber-600 font-mono">
                  {formatBDT(Math.round((amount * 30) / 100))}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Notes & Investment Agreement Memo</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Investment terms, dilution or equity grant details, board resolution reference."
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium text-slate-900 focus:outline-hidden focus:border-purple-600 resize-none"
            />
          </div>

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
              className="px-5 py-2 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Injecting...' : 'Record Capital Injection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
