import React, { useState, useEffect } from 'react';
import { Transaction, Invoice, Project, Client, CompanySettings, User, ManualPaymentOption, InvestmentEntry, TreasurySummary } from '../../types';
import { api } from '../../services/api';
import { formatBDT, formatDhakaDate, getStatusBadgeClass } from '../../utils/formatters';
import { TransactionFormModal } from './TransactionFormModal';
import { InvoiceModal } from './InvoiceModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ManualPaymentModal } from '../settings/ManualPaymentModal';
import { ManualPaymentEntryModal } from './ManualPaymentEntryModal';
import { InvestmentModal } from './InvestmentModal';
import {
  BadgePercent,
  Plus,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Receipt,
  FileText,
  PiggyBank,
  Edit2,
  Trash2,
  Lock,
  Calendar,
  Building2,
  CreditCard,
  CheckCircle2,
  Coins,
  TrendingUp,
  Sparkles,
  PieChart,
  Layers,
  ShieldCheck,
  Megaphone,
  Laptop,
} from 'lucide-react';

interface FinancePageProps {
  currentUser: User | null;
}

export const FinancePage: React.FC<FinancePageProps> = ({ currentUser }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<ManualPaymentOption[]>([]);
  const [investments, setInvestments] = useState<InvestmentEntry[]>([]);
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'transactions' | 'invoices' | 'payment_options' | 'treasury'
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices' | 'payment_options' | 'treasury'>('transactions');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'income' | 'expense'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [invToView, setInvToView] = useState<Invoice | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentOptionToEdit, setPaymentOptionToEdit] = useState<ManualPaymentOption | null>(null);
  const [manualPaymentModalOpen, setManualPaymentModalOpen] = useState(false);
  const [investmentModalOpen, setInvestmentModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const canCreate = currentUser?.permissions.finance.create ?? false;
  const canEdit = currentUser?.permissions.finance.edit ?? false;
  const canDelete = currentUser?.permissions.finance.delete ?? false;
  const canViewFinancials = currentUser?.permissions.canViewFinancials ?? false;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    loadFinanceData();
  }, [currentUser]);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [txRes, projList, clientList, setRes, payList, invRes] = await Promise.all([
        api.getTransactions().catch(() => ({ transactions: [], invoices: [], categories: [], paymentMethods: [] })),
        api.getProjects().catch(() => []),
        api.getClients().catch(() => []),
        api.getSettings().catch(() => null),
        api.getPaymentOptions().catch(() => []),
        api.getInvestments().catch(() => ({ investments: [], treasury: null as any })),
      ]);

      setTransactions(txRes.transactions || []);
      setInvoices(txRes.invoices || []);
      setCategories(txRes.categories || []);
      setPaymentMethods(txRes.paymentMethods || []);
      setProjects(projList);
      setClients(clientList);
      setPaymentOptions(payList || []);
      if (invRes) {
        setInvestments(invRes.investments || []);
        setTreasury(invRes.treasury || null);
      }
      if (setRes) setSettings(setRes.settings);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordManualPayment = async (data: any) => {
    const newTx = await api.recordManualPayment(data);
    setSuccessToast(`Manual payment logged: ৳${newTx.amount.toLocaleString()} [${newTx.reference}]. Monthly profit updated.`);
    setTimeout(() => setSuccessToast(''), 5000);
    loadFinanceData();
  };

  const handleSaveInvestment = async (data: Partial<InvestmentEntry>) => {
    await api.createInvestment(data);
    setSuccessToast(`Injected startup capital of ৳${Number(data.amount).toLocaleString()}. Company account balance updated.`);
    setTimeout(() => setSuccessToast(''), 5000);
    loadFinanceData();
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this investment entry?')) return;
    try {
      await api.deleteInvestment(id);
      setSuccessToast('Investment capital entry removed.');
      setTimeout(() => setSuccessToast(''), 4000);
      loadFinanceData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete investment');
    }
  };

  const handleSavePaymentOption = async (data: Partial<ManualPaymentOption>) => {
    if (paymentOptionToEdit) {
      const updated = await api.updatePaymentOption(paymentOptionToEdit.id, data);
      setPaymentOptions(paymentOptions.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await api.createPaymentOption(data);
      setPaymentOptions([...paymentOptions, created]);
    }
    loadFinanceData();
  };

  const handleDeletePaymentOption = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this payment option?')) return;
    try {
      await api.deletePaymentOption(id);
      setPaymentOptions(paymentOptions.filter((p) => p.id !== id));
      loadFinanceData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove payment option');
    }
  };

  const handleSaveTransaction = async (data: Partial<Transaction>) => {
    if (txToEdit) {
      const updated = await api.updateTransaction(txToEdit.id, data);
      setTransactions(transactions.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await api.createTransaction(data);
      setTransactions([created, ...transactions]);
    }
  };

  const handleSaveInvoice = async (data: any) => {
    const created = await api.createInvoice(data);
    setInvoices([created, ...invoices]);
  };

  const confirmDeleteTx = async () => {
    if (!txToDelete) return;
    try {
      await api.deleteTransaction(txToDelete.id);
      setTransactions(transactions.filter((t) => t.id !== txToDelete.id));
      setDeleteConfirmOpen(false);
      setTxToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  if (!canViewFinancials) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <Lock className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-base font-bold text-slate-800">Financial Ledger Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Access to transactions, invoices, and cash balances is restricted to Finance, Management, and Super Admin accounts.
        </p>
      </div>
    );
  }

  // Financial Metrics
  const totalIncome = transactions
    .filter((t) => t.type === 'income' && (t.paymentStatus === 'Received' || t.paymentStatus === 'Paid'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && (t.paymentStatus === 'Paid' || t.paymentStatus === 'Received'))
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalUnpaidInvoices = invoices.reduce((sum, i) => sum + Math.max(0, i.totalAmount - i.paidAmount), 0);

  // Startup Investment & Treasury Calculations
  const totalInvestmentInjected = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const companyAccountRemaining = treasury?.companyAccountRemaining ?? (totalInvestmentInjected + totalIncome - totalExpense);
  const marketingSpend = treasury?.marketingCostTotal ?? transactions.filter(t => t.type === 'expense' && (t.category.toLowerCase().includes('marketing') || t.category.toLowerCase().includes('brand'))).reduce((s, t) => s + t.amount, 0);
  const subscriptionsSpend = treasury?.subscriptionsCostTotal ?? transactions.filter(t => t.type === 'expense' && (t.category.toLowerCase().includes('software') || t.category.toLowerCase().includes('cloud') || t.category.toLowerCase().includes('subscription'))).reduce((s, t) => s + t.amount, 0);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchesCat = categoryFilter === 'ALL' || t.category === categoryFilter;

    return matchesSearch && matchesType && matchesCat;
  });

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-3 bg-emerald-900 text-white text-xs font-semibold rounded-2xl flex items-center justify-between border border-emerald-500 shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="text-emerald-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Finance, Accounts & Treasury
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              BDT (৳) Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cash journal, off-platform manual payments, startup capital allocations, and live company treasury balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {canCreate && (
            <>
              {/* Manual Payment Entry Button */}
              <button
                onClick={() => setManualPaymentModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                title="Record off-platform receipt/payment with date, amount, reference, and payment method"
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Manual Payment</span>
              </button>

              {/* Startup Investment Button */}
              {isSuperAdmin && (
                <button
                  onClick={() => setInvestmentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                  title="Record Startup Capital or Investor Equity Injection"
                >
                  <Coins className="w-4 h-4" />
                  <span>+ Startup Capital</span>
                </button>
              )}

              <button
                onClick={() => {
                  setInvToView(null);
                  setInvModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>New Invoice</span>
              </button>

              <button
                onClick={() => {
                  setTxToEdit(null);
                  setTxModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Transaction</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards: Live Company Account Balance & Capital Runway */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Remaining in Company Account */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-4.5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Company Account Remaining
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-emerald-400 mt-2 block font-mono">
            {formatBDT(companyAccountRemaining)}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Net Remaining in Dhaka Bank & Cash
          </span>
        </div>

        {/* Startup Investment Injected */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Startup Investment Injected</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-purple-700 mt-2 block font-mono">
            {formatBDT(totalInvestmentInjected)}
          </span>
          <span className="text-[11px] text-slate-400">
            {investments.length} funding round(s) / seed capital
          </span>
        </div>

        {/* Marketing Cost */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Marketing & Brand Spend</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-blue-600 mt-2 block font-mono">
            {formatBDT(marketingSpend)}
          </span>
          <span className="text-[11px] text-slate-400">Ads, lead gen & sponsorships</span>
        </div>

        {/* Software Subscriptions Cost */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Software & Subscriptions</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Laptop className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-black text-indigo-700 mt-2 block font-mono">
            {formatBDT(subscriptionsSpend)}
          </span>
          <span className="text-[11px] text-slate-400">ChatGPT, AWS, Figma & SaaS tools</span>
        </div>

        {/* Net Monthly Operating Cash Profit */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Operating Net Cash Profit</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <span className={`text-xl font-black mt-2 block font-mono ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatBDT(netCashFlow)}
          </span>
          <span className="text-[11px] text-slate-400">
            Client In: {formatBDT(totalIncome)} | Out: {formatBDT(totalExpense)}
          </span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Transactions Ledger ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Invoices & Billing ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('treasury')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'treasury'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Investment & Treasury ({investments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payment_options')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'payment_options'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Manual Payment Options ({paymentOptions.length})</span>
          </button>
        </div>

        {activeTab === 'transactions' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search memo, ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Types</option>
              <option value="income">Cash In (Income)</option>
              <option value="expense">Cash Out (Expense)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Table Views */}
      {activeTab === 'transactions' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description / Reference</th>
                  <th className="py-3 px-4">Allocation</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount (BDT)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] text-slate-400 block">{tx.id}</span>
                      <span className="font-semibold text-slate-800">{formatDhakaDate(tx.date)}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {tx.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{tx.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Ref: {tx.reference}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.isCompanyOverhead ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          Company Overhead
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 font-mono">
                          {tx.projectId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'} {formatBDT(tx.amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadgeClass(tx.paymentStatus)}`}>
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setTxToEdit(tx);
                              setTxModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              setTxToDelete(tx);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Invoices Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Issue & Due Date</th>
                  <th className="py-3 px-4 text-right">Total (BDT)</th>
                  <th className="py-3 px-4 text-right">Paid to Date</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId);
                  const balanceDue = inv.totalAmount - inv.paidAmount;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => {
                        setInvToView(inv);
                        setInvModalOpen(true);
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {client?.company || inv.clientId}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {inv.projectId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 block">{formatDhakaDate(inv.issueDate)}</span>
                        <span className="text-[10px] text-slate-400">Due: {formatDhakaDate(inv.dueDate)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatBDT(inv.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {formatBDT(inv.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                        {formatBDT(balanceDue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadgeClass(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-blue-600 font-semibold text-[11px] group-hover:underline">
                          View Invoice →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Treasury & Startup Investments Tab */}
      {activeTab === 'treasury' && (
        <div className="space-y-5">
          {/* Main Treasury Account Overview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-purple-400" />
                  Live Corporate Treasury Ledger (Dhaka BST)
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-2 font-mono text-emerald-400 tracking-tight">
                  {formatBDT(companyAccountRemaining)}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Current remaining balance in company accounts across corporate bank deposits & petty cash.
                </p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setInvestmentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer self-start lg:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Record Capital Injection</span>
                </button>
              )}
            </div>

            {/* Inflow vs Outflow Equation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <span className="text-[11px] text-slate-400 block">Total Startup Investment Injected</span>
                <span className="text-lg font-bold text-purple-300 font-mono block">
                  {formatBDT(totalInvestmentInjected)}
                </span>
                <span className="text-[10px] text-slate-400">Founder seed capital + angel rounds</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <span className="text-[11px] text-slate-400 block">Total Client Revenue Received</span>
                <span className="text-lg font-bold text-emerald-400 font-mono block">
                  {formatBDT(totalIncome)}
                </span>
                <span className="text-[10px] text-slate-400">Paid invoices & milestones</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <span className="text-[11px] text-slate-400 block">Total All-Time Operating Expenses Paid</span>
                <span className="text-lg font-bold text-rose-400 font-mono block">
                  {formatBDT(totalExpense)}
                </span>
                <span className="text-[10px] text-slate-400">Marketing + Subscriptions + Payroll + Direct</span>
              </div>
            </div>
          </div>

          {/* Cost Breakdown Analysis: Marketing vs Software Subscriptions vs Hardware */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Marketing & Inbound Growth Costs */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Marketing & Brand Acquisition Costs</h3>
                    <p className="text-[11px] text-slate-500">Paid from startup investment budget</p>
                  </div>
                </div>
                <span className="font-mono text-base font-black text-blue-600">
                  {formatBDT(marketingSpend)}
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
                {transactions
                  .filter((t) => t.type === 'expense' && (t.category.toLowerCase().includes('marketing') || t.category.toLowerCase().includes('brand')))
                  .map((t) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">{t.description}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDhakaDate(t.date)} • Ref: {t.reference}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-600 text-xs">
                        {formatBDT(t.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Software Subscriptions & Tools Costs */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Software & SaaS Subscriptions</h3>
                    <p className="text-[11px] text-slate-500">ChatGPT, AWS, GitHub, Figma, Fastly licenses</p>
                  </div>
                </div>
                <span className="font-mono text-base font-black text-indigo-700">
                  {formatBDT(subscriptionsSpend)}
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
                {transactions
                  .filter((t) => t.type === 'expense' && (t.category.toLowerCase().includes('software') || t.category.toLowerCase().includes('cloud') || t.category.toLowerCase().includes('subscription')))
                  .map((t) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">{t.description}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDhakaDate(t.date)} • Ref: {t.reference}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-600 text-xs">
                        {formatBDT(t.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Investment Capital Rounds Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-purple-600" />
                  Recorded Startup Investment Capital Rounds
                </h3>
                <p className="text-xs text-slate-500">
                  Documented equity investments, angel contributions, and capital injections.
                </p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setInvestmentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Investment Round</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Investment ID & Round</th>
                    <th className="py-3 px-4">Contributor / Investor</th>
                    <th className="py-3 px-4">Deposit Date</th>
                    <th className="py-3 px-4">Account / Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Injected Capital</th>
                    <th className="py-3 px-4">Target Allocations</th>
                    {isSuperAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {investments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-bold block w-max">
                          {inv.id}
                        </span>
                        <span className="font-bold text-slate-900 mt-1 block">{inv.source}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{inv.investorName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{formatDhakaDate(inv.date)}</td>
                      <td className="py-3.5 px-4 text-slate-600">{inv.paymentMethod}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-bold">{inv.reference}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700 text-sm">
                        {formatBDT(inv.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[10px]">
                          <span className="block text-slate-600">
                            Marketing: <strong>{formatBDT(inv.allocations?.marketing)}</strong>
                          </span>
                          <span className="block text-slate-600">
                            Subscriptions: <strong>{formatBDT(inv.allocations?.subscriptions)}</strong>
                          </span>
                          <span className="block text-slate-600">
                            Hardware: <strong>{formatBDT(inv.allocations?.hardwareOffice)}</strong>
                          </span>
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteInvestment(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Investment Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment Options Tab */}
      {activeTab === 'payment_options' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Office Manual Payment Methods & Receiving Accounts
              </h2>
              <p className="text-xs text-slate-500">
                Official corporate bank accounts, MFS numbers (bKash/Nagad/Rocket), and cash options available for vouchers & client invoices.
              </p>
            </div>

            {currentUser?.role === 'super_admin' && (
              <button
                onClick={() => {
                  setPaymentOptionToEdit(null);
                  setPaymentModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Manual Payment Option</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paymentOptions.map((opt) => (
              <div
                key={opt.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3 text-xs"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">
                        {opt.type}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-1 text-sm">{opt.title}</h4>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        opt.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {opt.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {opt.accountName && (
                    <p className="text-xs text-slate-700 mt-2">
                      A/C Name: <strong>{opt.accountName}</strong>
                    </p>
                  )}
                  {opt.accountNumber && (
                    <p className="font-mono text-xs text-slate-800 mt-0.5">
                      Account / Mobile: <strong>{opt.accountNumber}</strong>
                    </p>
                  )}
                  {opt.routingNumber && (
                    <p className="font-mono text-[11px] text-slate-500">
                      Routing: {opt.routingNumber}
                    </p>
                  )}
                  {opt.branch && (
                    <p className="text-[11px] text-slate-500">Branch: {opt.branch}</p>
                  )}
                  {opt.instructions && (
                    <div className="mt-2 p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 italic">
                      "{opt.instructions}"
                    </div>
                  )}
                </div>

                {currentUser?.role === 'super_admin' && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setPaymentOptionToEdit(opt);
                        setPaymentModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-200/50"
                      title="Edit Option"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePaymentOption(opt.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-200/50"
                      title="Delete Option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <TransactionFormModal
        isOpen={txModalOpen}
        transactionToEdit={txToEdit}
        projects={projects}
        categories={categories}
        paymentMethods={paymentMethods}
        onSave={handleSaveTransaction}
        onClose={() => setTxModalOpen(false)}
      />

      {settings && (
        <InvoiceModal
          isOpen={invModalOpen}
          invoiceToView={invToView}
          projects={projects}
          clients={clients}
          settings={settings}
          onSave={handleSaveInvoice}
          onPaymentRecorded={loadFinanceData}
          onClose={() => setInvModalOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Transaction?"
        message={`Are you sure you want to permanently delete transaction "${txToDelete?.id}" (${txToDelete?.description})? This will alter project cost/revenue calculations and be logged in the audit trail.`}
        confirmText="Delete Transaction"
        isDanger={true}
        onConfirm={confirmDeleteTx}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTxToDelete(null);
        }}
      />

      <ManualPaymentModal
        isOpen={paymentModalOpen}
        optionToEdit={paymentOptionToEdit}
        onSave={handleSavePaymentOption}
        onClose={() => setPaymentModalOpen(false)}
      />

      <ManualPaymentEntryModal
        isOpen={manualPaymentModalOpen}
        projects={projects}
        paymentOptions={paymentOptions}
        categories={categories}
        onSave={handleRecordManualPayment}
        onClose={() => setManualPaymentModalOpen(false)}
      />

      <InvestmentModal
        isOpen={investmentModalOpen}
        onSave={handleSaveInvestment}
        onClose={() => setInvestmentModalOpen(false)}
      />
    </div>
  );
};
