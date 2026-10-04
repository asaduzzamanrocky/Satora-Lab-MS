import React, { useState, useEffect } from 'react';
import { Transaction, Project } from '../../types';
import { X } from 'lucide-react';

interface TransactionFormModalProps {
  isOpen: boolean;
  transactionToEdit: Transaction | null;
  projects: Project[];
  categories: string[];
  paymentMethods: string[];
  onSave: (data: Partial<Transaction>) => Promise<void>;
  onClose: () => void;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  transactionToEdit,
  projects,
  categories,
  paymentMethods,
  onSave,
  onClose,
}) => {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [date, setDate] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [isCompanyOverhead, setIsCompanyOverhead] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<Transaction['paymentStatus']>('Received');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setDate(transactionToEdit.date);
      setProjectId(transactionToEdit.projectId || '');
      setIsCompanyOverhead(transactionToEdit.isCompanyOverhead);
      setCategory(transactionToEdit.category);
      setDescription(transactionToEdit.description);
      setAmount(transactionToEdit.amount);
      setPaymentMethod(transactionToEdit.paymentMethod);
      setReference(transactionToEdit.reference);
      setPaymentStatus(transactionToEdit.paymentStatus);
    } else {
      setType('income');
      setDate(new Date().toISOString().split('T')[0]);
      setProjectId(projects[0]?.id || '');
      setIsCompanyOverhead(false);
      setCategory('Client Payment');
      setDescription('');
      setAmount(250000);
      setPaymentMethod(paymentMethods[0] || 'Bank Transfer (BRAC Bank)');
      setReference(`REF-${Date.now().toString().slice(-6)}`);
      setPaymentStatus('Received');
    }
    setError('');
  }, [transactionToEdit, isOpen, projects, categories, paymentMethods]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        type,
        date,
        projectId: isCompanyOverhead ? null : (projectId || null),
        isCompanyOverhead,
        category,
        description,
        amount: Number(amount),
        paymentMethod,
        reference,
        paymentStatus,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {transactionToEdit ? `Edit Transaction (${transactionToEdit.id})` : 'Record Financial Transaction (BDT)'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Income vs Expense toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setPaymentStatus('Received');
                setCategory('Client Payment');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                type === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Cash In (Income)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setPaymentStatus('Paid');
                setCategory('Direct Project Cost');
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                type === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              - Cash Out (Expense)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Transaction Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (BDT ৳) *</label>
              <input
                type="number"
                required
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description / Memo *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Milestone 2 payment for bKash or Banani Office Rent"
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Allocation: Direct Project vs Company Overhead */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">Cost Allocation</label>
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompanyOverhead}
                  onChange={(e) => setIsCompanyOverhead(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-[11px]">Company Overhead / Non-Project</span>
              </label>
            </div>

            {!isCompanyOverhead && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Linked Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium focus:outline-hidden"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium focus:outline-hidden"
              >
                {type === 'income' ? (
                  <>
                    <option value="Client Payment">Client Payment</option>
                    <option value="Retainer Fee">Retainer Fee</option>
                    <option value="Consulting Services">Consulting Services</option>
                    <option value="Other Income">Other Income</option>
                  </>
                ) : (
                  categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium focus:outline-hidden"
              >
                {paymentMethods.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Voucher / Bank Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. BRAC-TX-849201"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-mono text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium focus:outline-hidden"
              >
                <option value="Received">Received</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : transactionToEdit ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
