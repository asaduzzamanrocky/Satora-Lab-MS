import React, { useState, useEffect } from 'react';
import { MonthlyReportData, User } from '../../types';
import { api } from '../../services/api';
import { formatBDT } from '../../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Printer,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Building2,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface MonthlyReportsPageProps {
  currentUser: User | null;
}

export const MonthlyReportsPage: React.FC<MonthlyReportsPageProps> = ({ currentUser }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const canExport = currentUser?.permissions.reports.export ?? false;
  const canViewFinancials = currentUser?.permissions.canViewFinancials ?? false;

  useEffect(() => {
    if (canViewFinancials) {
      loadReport();
    }
  }, [selectedYear, selectedMonth, canViewFinancials]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.getMonthlyReport(selectedMonth, selectedYear);
      setReport(data);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/reports/export-csv?month=${selectedMonth}&year=${selectedYear}`;
  };

  if (!canViewFinancials) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <Lock className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-base font-bold text-slate-800">Financial Reports Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Monthly financial statements are reserved for Super Admin, Management, and Finance personas.
        </p>
      </div>
    );
  }

  const m = report?.monthly;
  const allTime = report?.companyAllTime;

  return (
    <div className="space-y-6">
      {/* Top Header & Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Monthly Financial Statement
            </h1>
            <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
              {report?.period.monthFormatted || 'Monthly'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dhaka BST accounting ledger • Revenue received, direct costs, payroll, and cash profit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Month / Year Selectors */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl text-xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent px-2 py-1 font-semibold text-slate-800 focus:outline-hidden"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent px-2 py-1 font-semibold text-slate-800 border-l border-slate-200 focus:outline-hidden"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          {canExport && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading monthly financial data...</div>
      ) : (
        <>
          {/* Monthly KPI Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Received */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Monthly Revenue Received</span>
              <span className="text-2xl font-black text-emerald-600 mt-2 block">
                {formatBDT(m?.revenueReceived)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Direct cash collections in BDT</p>
            </div>

            {/* Total Expenses Paid */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Total Expenses Paid</span>
              <span className="text-2xl font-black text-rose-600 mt-2 block">
                {formatBDT(m?.totalExpensesPaid)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Direct costs + Payroll + Overhead</p>
            </div>

            {/* Monthly Cash Profit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Monthly Net Cash Profit</span>
              <span
                className={`text-2xl font-black mt-2 block ${
                  (m?.monthlyCashProfit ?? 0) >= 0 ? 'text-purple-700' : 'text-rose-600'
                }`}
              >
                {formatBDT(m?.monthlyCashProfit)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Cash Margin: {m?.marginPercent}%</p>
            </div>

            {/* Payroll Paid */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Payroll Paid (Single entry)</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">
                {formatBDT(m?.payrollPaid)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Staff compensation disbursed</p>
            </div>
          </div>

          {/* Statement Breakdown Table (Satora Lab Formal Statement) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Income Statement Breakdown — {report?.period.monthFormatted}
                </h2>
                <p className="text-xs text-slate-500">
                  Strict cash-accounting definition: Cash In (Payments) − Cash Out (Expenses Paid)
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-semibold self-start sm:self-auto">
                Timezone: Asia/Dhaka
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Income Section */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-slate-800 text-sm border-b border-slate-100 pb-1.5">
                  <span className="text-emerald-700">1. Total Revenue Received (Cash In)</span>
                  <span className="font-mono text-emerald-700">{formatBDT(m?.revenueReceived)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pl-4">
                  <span>Client Milestone Payments Received:</span>
                  <span className="font-mono">{formatBDT(m?.revenueReceived)}</span>
                </div>
              </div>

              {/* Expense Section */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between font-bold text-slate-800 text-sm border-b border-slate-100 pb-1.5">
                  <span className="text-rose-700">2. Operating Expenses Paid (Cash Out)</span>
                  <span className="font-mono text-rose-700">{formatBDT(m?.totalExpensesPaid)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pl-4">
                  <span>Direct Project Costs:</span>
                  <span className="font-mono">{formatBDT(m?.directExpensesPaid)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pl-4">
                  <span>Payroll Disbursement:</span>
                  <span className="font-mono">{formatBDT(m?.payrollPaid)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pl-4">
                  <span>Company Overheads (Office rent, servers, utilities):</span>
                  <span className="font-mono">{formatBDT(m?.overheadExpensesPaid)}</span>
                </div>
              </div>

              {/* Net Cash Profit Calculation */}
              <div className="pt-3 border-t-2 border-slate-800 flex justify-between font-black text-base text-slate-900">
                <span>Monthly Net Cash Profit / (Loss):</span>
                <span className={`font-mono ${(m?.monthlyCashProfit ?? 0) >= 0 ? 'text-purple-700' : 'text-rose-600'}`}>
                  {formatBDT(m?.monthlyCashProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Categories Breakdown for this Month */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Expense Category Distribution (This Month)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(m?.categoryBreakdown || {}).map(([cat, amount]) => (
                <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">{cat}</span>
                  <span className="font-mono font-bold text-slate-900">{formatBDT(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Company All-Time Cumulative Balances */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Company Cumulative Metrics (All-Time)</h3>
                <p className="text-xs text-slate-400">Total contracts, lifetime collections, and receivables in BDT</p>
              </div>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono">
                Dhaka Operations
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Contract Value</span>
                <span className="text-lg font-black text-white mt-1 block font-mono">
                  {formatBDT(allTime?.totalContractValue)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Project Collections</span>
                <span className="text-lg font-black text-emerald-400 mt-1 block font-mono">
                  {formatBDT(allTime?.totalProjectPaymentsReceived)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Outstanding Client Payments</span>
                <span className="text-lg font-black text-amber-400 mt-1 block font-mono">
                  {formatBDT(allTime?.totalOutstandingPayments)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lifetime Net Cash Profit</span>
                <span className="text-lg font-black text-purple-300 mt-1 block font-mono">
                  {formatBDT(allTime?.companyNetCashProfit)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
