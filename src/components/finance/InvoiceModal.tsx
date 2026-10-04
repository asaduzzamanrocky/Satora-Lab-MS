import React, { useState } from 'react';
import { Invoice, Project, Client, CompanySettings } from '../../types';
import { api } from '../../services/api';
import { formatBDT, formatDhakaDate, getStatusBadgeClass } from '../../utils/formatters';
import { X, Plus, Trash2, Printer, CheckCircle2 } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  invoiceToView: Invoice | null;
  projects: Project[];
  clients: Client[];
  settings: CompanySettings;
  onSave: (data: any) => Promise<void>;
  onPaymentRecorded: () => void;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  invoiceToView,
  projects,
  clients,
  settings,
  onSave,
  onPaymentRecorded,
  onClose,
}) => {
  // New invoice state
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [items, setItems] = useState<{ description: string; quantity: number; unitPrice: number; total: number }[]>([
    { description: 'Milestone Deliverable Implementation', quantity: 1, unitPrice: 350000, total: 350000 },
  ]);
  const [notes, setNotes] = useState('Payment due via Bank Transfer (BRAC Bank) or bKash Merchant.');

  // Partial Payment State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState(settings.paymentMethods[0] || 'Bank Transfer (BRAC Bank)');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 50000, total: 50000 }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...items];
    const item = { ...updated[idx], [field]: val };
    item.total = Number(item.quantity) * Number(item.unitPrice);
    updated[idx] = item;
    setItems(updated);
  };

  const totalInvoiceAmount = items.reduce((sum, it) => sum + (it.total || 0), 0);

  const handleSubmitNewInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !items[0].description) {
      setError('Please add at least one line item');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        projectId,
        clientId,
        issueDate,
        dueDate,
        items,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceToView) return;
    if (paymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setSubmitting(true);
    try {
      await api.recordInvoicePayment(invoiceToView.id, {
        amount: paymentAmount,
        paymentMethod,
        reference,
        notes: `Settlement for invoice ${invoiceToView.invoiceNumber}`,
      });
      setShowPaymentForm(false);
      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  // View Mode: Printable Invoice
  if (invoiceToView) {
    const project = projects.find((p) => p.id === invoiceToView.projectId);
    const client = clients.find((c) => c.id === invoiceToView.clientId);
    const balanceDue = invoiceToView.totalAmount - invoiceToView.paidAmount;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl border border-slate-200 my-6 print:border-none print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Satora Lab" className="w-10 h-10 rounded-xl" />
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">SATORA LAB</h1>
                <p className="text-xs text-slate-500 font-medium">Digital Product & Software Architecture</p>
                <p className="text-[11px] text-slate-400">Banani C/A, Dhaka-1213, Bangladesh • BIN: 00947219-0102</p>
              </div>
            </div>

            <div className="text-right">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(invoiceToView.status)}`}>
                {invoiceToView.status}
              </span>
              <p className="font-mono text-sm font-bold text-slate-900 mt-2">{invoiceToView.invoiceNumber}</p>
              <p className="text-[11px] text-slate-500">Date: {formatDhakaDate(invoiceToView.issueDate)}</p>
              <p className="text-[11px] text-rose-600 font-semibold">Due: {formatDhakaDate(invoiceToView.dueDate)}</p>
            </div>
          </div>

          {/* Client & Project Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Billed To:</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{client?.company || 'Enterprise Client'}</p>
              <p className="text-slate-600">{client?.contactPerson}</p>
              <p className="text-slate-500">{client?.address}</p>
              <p className="text-slate-500">{client?.email}</p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Project Assignment:</span>
              <p className="font-bold text-slate-900 mt-0.5">{project?.name || invoiceToView.projectId}</p>
              <p className="font-mono text-slate-500">ID: {project?.id}</p>
              <p className="text-slate-500 mt-1">Payment Currency: <strong>BDT (৳)</strong></p>
            </div>
          </div>

          {/* Line items table */}
          <div className="py-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceToView.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-medium text-slate-800">{it.description}</td>
                    <td className="py-2.5 text-center font-mono text-slate-600">{it.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-slate-600">{formatBDT(it.unitPrice)}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">{formatBDT(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Payments summary */}
          <div className="py-3 border-t border-slate-200 flex flex-col items-end gap-1.5 text-xs">
            <div className="flex justify-between w-56 text-slate-600">
              <span>Invoice Subtotal:</span>
              <span className="font-mono font-bold">{formatBDT(invoiceToView.totalAmount)}</span>
            </div>
            <div className="flex justify-between w-56 text-emerald-700 font-semibold">
              <span>Paid to Date:</span>
              <span className="font-mono">{formatBDT(invoiceToView.paidAmount)}</span>
            </div>
            <div className="flex justify-between w-56 text-slate-900 text-sm font-black pt-1 border-t border-slate-200">
              <span>Balance Due:</span>
              <span className="font-mono text-amber-700">{formatBDT(balanceDue)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoiceToView.notes && (
            <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-[11px] mb-4">
              <strong>Payment Instructions:</strong> {invoiceToView.notes}
            </div>
          )}

          {/* Record Partial Payment Section */}
          {showPaymentForm ? (
            <form onSubmit={handleRecordPayment} className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3 text-xs mb-4">
              <span className="font-bold text-blue-900 block">Record Payment (Partial or Full)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount Paid (৳) *</label>
                  <input
                    type="number"
                    min="100"
                    max={balanceDue}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium"
                  >
                    {settings.paymentMethods.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-sm"
                >
                  Confirm & Sync Payment
                </button>
              </div>
            </form>
          ) : (
            balanceDue > 0 && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentAmount(balanceDue);
                    setShowPaymentForm(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Record Payment Received</span>
                </button>
              </div>
            )
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create Mode: Form
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Satora Lab Invoice</h2>
            <p className="text-[11px] text-slate-500">Bill clients with auto-generated reference & BDT formatting</p>
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

        <form onSubmit={handleSubmitNewInvoice} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Project *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-medium"
              />
            </div>
          </div>

          {/* Line items builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">Invoice Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-blue-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Deliverable description"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center font-mono"
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    min="100"
                    step="5000"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                    className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono font-bold"
                    placeholder="Rate"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-bold">
              <span>Total Invoice Amount:</span>
              <span className="font-mono text-sm text-blue-600">{formatBDT(totalInvoiceAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Instructions & Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
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
              {submitting ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
