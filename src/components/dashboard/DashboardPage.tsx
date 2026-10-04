import React, { useState, useEffect } from 'react';
import { Project, Task, Transaction, User, MonthlyReportData } from '../../types';
import { api } from '../../services/api';
import { formatBDT, formatDhakaDate, getStatusBadgeClass, getPriorityBadgeClass } from '../../utils/formatters';
import {
  FolderKanban,
  CheckCircle2,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  PiggyBank,
  Lock,
  ChevronRight,
  Calendar,
  Layers,
} from 'lucide-react';

interface DashboardPageProps {
  currentUser: User | null;
  onNavigateToProjects: () => void;
  onNavigateToTasks: () => void;
  onNavigateToFinance: () => void;
  onNavigateToReports: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  onNavigateToProjects,
  onNavigateToTasks,
  onNavigateToFinance,
  onNavigateToReports,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const canViewFinancials = currentUser?.permissions.canViewFinancials ?? false;

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [projList, taskList] = await Promise.all([
        api.getProjects().catch(() => []),
        api.getTasks().catch(() => []),
      ]);

      setProjects(projList);
      setTasks(taskList);

      if (canViewFinancials) {
        const [trxRes, repRes] = await Promise.all([
          api.getTransactions().catch(() => ({ transactions: [] })),
          api.getMonthlyReport().catch(() => null),
        ]);
        setTransactions(trxRes.transactions || []);
        setReportData(repRes);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics computation
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'In Progress' || p.status === 'Planning' || p.status === 'Review').length;
  const completedProjects = projects.filter((p) => p.status === 'Completed').length;

  const totalContractValue = projects.reduce((acc, p) => acc + (p.contractValue || 0), 0);
  const totalRevenueReceived = projects.reduce((acc, p) => acc + (p.paymentsReceived || 0), 0);
  const totalDirectCosts = projects.reduce((acc, p) => acc + (p.directCosts || 0), 0);
  const totalOutstandingPayments = projects.reduce((acc, p) => acc + (p.outstandingPayment || 0), 0);
  const totalOverpayments = projects.reduce((acc, p) => acc + (p.overpayment || 0), 0);

  // All-time company expenses from transactions or report data
  const companyExpenses = reportData?.companyAllTime?.allTimeExpenses ?? (totalDirectCosts + 1583000);
  const companyNetProfit = reportData?.companyAllTime?.companyNetCashProfit ?? (totalRevenueReceived - companyExpenses);

  // Monthly earnings for current month
  const monthlyEarnings = reportData?.monthly?.revenueReceived ?? 1500000;
  const monthlyExpenses = reportData?.monthly?.totalExpensesPaid ?? 305000;
  const monthlyCashProfit = reportData?.monthly?.monthlyCashProfit ?? (monthlyEarnings - monthlyExpenses);

  // Tasks & Deadlines
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter((t) => t.status !== 'Done' && t.dueDate < todayStr);
  const upcomingDeadlines = tasks
    .filter((t) => t.status !== 'Done' && t.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  // Projects by status counts
  const statusCounts = {
    'In Progress': projects.filter((p) => p.status === 'In Progress').length,
    'Review': projects.filter((p) => p.status === 'Review').length,
    'Planning': projects.filter((p) => p.status === 'Planning').length,
    'Completed': projects.filter((p) => p.status === 'Completed').length,
    'On Hold': projects.filter((p) => p.status === 'On Hold').length,
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">Loading Satora Lab Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              DHAKA HQ
            </span>
            <span className="text-xs text-slate-300">Operations Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Welcome back, {currentUser?.name?.split(' ')[0] || 'Team'}
          </h1>
          <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
            Satora Lab office command center. Track projects, cash collections in BDT (৳), team deadlines, and client deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-400/30 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <button
            onClick={onNavigateToProjects}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-blue-900/40 transition active:scale-95 cursor-pointer text-white"
          >
            <span>View All Projects</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Projects</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{totalProjects}</span>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-blue-600 font-semibold">{activeProjects} Active</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-600 font-semibold">{completedProjects} Done</span>
            </div>
          </div>
        </div>

        {/* Contract Value Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Contract Value</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {canViewFinancials ? (
              <>
                <span className="text-2xl font-black text-slate-900">{formatBDT(totalContractValue)}</span>
                <p className="text-[11px] text-slate-400 mt-1">Total committed project budget</p>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 py-1">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">Restricted Access</span>
              </div>
            )}
          </div>
        </div>

        {/* Cash In: Revenue Received Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Revenue Received (Cash In)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {canViewFinancials ? (
              <>
                <span className="text-2xl font-black text-emerald-600">{formatBDT(totalRevenueReceived)}</span>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Collected: {totalContractValue > 0 ? Math.round((totalRevenueReceived / totalContractValue) * 100) : 0}%</span>
                  {totalOverpayments > 0 && (
                    <span className="text-amber-600 font-semibold">+{formatBDT(totalOverpayments)} over</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 py-1">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">Restricted Access</span>
              </div>
            )}
          </div>
        </div>

        {/* Company Net Profit Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Company Net Cash Profit</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {canViewFinancials ? (
              <>
                <span className={`text-2xl font-black ${companyNetProfit >= 0 ? 'text-purple-700' : 'text-rose-600'}`}>
                  {formatBDT(companyNetProfit)}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Income minus all expenses & payroll</p>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 py-1">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-medium">Restricted Access</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Financial Ribbon (Outstanding, Monthly Earnings, Overdue) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outstanding Payments */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Outstanding Receivables</span>
              <p className="text-lg font-black text-amber-400">
                {canViewFinancials ? formatBDT(totalOutstandingPayments) : '৳••••••'}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-md font-mono">
            BDT Due
          </span>
        </div>

        {/* Current Month Cash Earnings */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">This Month Cash Profit</span>
              <p className="text-lg font-black text-emerald-400">
                {canViewFinancials ? formatBDT(monthlyCashProfit) : '৳••••••'}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToReports}
            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-md font-semibold cursor-pointer"
          >
            Report
          </button>
        </div>

        {/* Overdue Tasks Alert Card */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${overdueTasks.length > 0 ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Overdue Items</span>
              <p className="text-lg font-black text-rose-400">
                {overdueTasks.length} {overdueTasks.length === 1 ? 'Task' : 'Tasks'}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToTasks}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-md font-semibold cursor-pointer"
          >
            Resolve
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue vs Expenses Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Monthly Revenue vs Expenses & Cash Profit
              </h2>
              <p className="text-xs text-slate-500">6-Month historical cash flow comparisons in BDT (৳)</p>
            </div>
            {canViewFinancials && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Expenses
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Cash Profit
                </span>
              </div>
            )}
          </div>

          {canViewFinancials && reportData?.monthlyTrends ? (
            <div className="h-64 flex flex-col justify-end pt-4">
              <div className="grid grid-cols-6 gap-3 h-48 items-end px-2">
                {reportData.monthlyTrends.map((trend) => {
                  const maxVal = Math.max(
                    ...reportData.monthlyTrends.map((t) => Math.max(t.income, t.expenses)),
                    1000000
                  );
                  const incomeH = Math.max(12, Math.round((trend.income / maxVal) * 160));
                  const expenseH = Math.max(8, Math.round((trend.expenses / maxVal) * 160));

                  return (
                    <div key={trend.monthYear} className="flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl pointer-events-none whitespace-nowrap">
                        <span>Rev: {formatBDT(trend.income)}</span>
                        <span>Exp: {formatBDT(trend.expenses)}</span>
                        <span className="text-emerald-400 font-bold">Net: {formatBDT(trend.profit)}</span>
                      </div>

                      <div className="flex items-end gap-1.5 w-full justify-center">
                        <div
                          style={{ height: `${incomeH}px` }}
                          className="w-4 sm:w-6 bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all shadow-xs"
                          title={`Income: ${formatBDT(trend.income)}`}
                        />
                        <div
                          style={{ height: `${expenseH}px` }}
                          className="w-4 sm:w-6 bg-rose-400 hover:bg-rose-500 rounded-t-md transition-all shadow-xs"
                          title={`Expense: ${formatBDT(trend.expenses)}`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 font-mono">
                        {trend.monthYear.slice(5)}/{trend.monthYear.slice(2, 4)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Calculated under strict definition: Cash In − Cash Out</span>
                <button
                  onClick={onNavigateToReports}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Full Monthly Statement →
                </button>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl">
              <Lock className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs font-medium">Financial charts are restricted for your active role.</p>
              <p className="text-[11px] text-slate-400">Switch to Super Admin, Management, or Finance to review.</p>
            </div>
          )}
        </div>

        {/* Projects By Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Projects by Status
              </h2>
              <span className="text-xs font-semibold text-slate-500">{totalProjects} Total</span>
            </div>

            <div className="space-y-3.5 mt-4">
              {Object.entries(statusCounts).map(([status, count]) => {
                const percent = totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0;
                let colorBar = 'bg-blue-600';
                if (status === 'Completed') colorBar = 'bg-emerald-500';
                if (status === 'Review') colorBar = 'bg-purple-500';
                if (status === 'Planning') colorBar = 'bg-amber-500';
                if (status === 'On Hold') colorBar = 'bg-slate-400';

                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">{status}</span>
                      <span className="text-slate-500 font-mono">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorBar} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Live Workspace Status</span>
            <button
              onClick={onNavigateToProjects}
              className="text-blue-600 font-semibold hover:underline"
            >
              Manage Projects →
            </button>
          </div>
        </div>
      </div>

      {/* Lower Row: Deadlines & Overdue Tasks vs Project Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines & Overdue Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Upcoming Deadlines & Critical Tasks</h2>
            </div>
            <button
              onClick={onNavigateToTasks}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Task Board
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {overdueTasks.length > 0 && (
              <div className="pb-3 mb-2">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Attention Needed: Overdue Tasks
                </span>
                {overdueTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="text-[10px] text-slate-500">
                        {task.projectName} • Due: <strong className="text-rose-600">{formatDhakaDate(task.dueDate)}</strong>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${getPriorityBadgeClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Upcoming Schedules
              </span>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No upcoming pending tasks found.</p>
              ) : (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{task.title}</p>
                      <p className="text-[10px] text-slate-500">
                        {task.projectName} • Due {formatDhakaDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadgeClass(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Project Profitability Rankings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Project Cash Profitability</h2>
            </div>
            <span className="text-[11px] text-slate-500">Cash In vs Direct Costs</span>
          </div>

          {canViewFinancials ? (
            <div className="divide-y divide-slate-100">
              {projects.slice(0, 5).map((project) => {
                const profit = project.cashProfit ?? (project.paymentsReceived - project.directCosts);
                const margin = project.profitMargin ?? (project.paymentsReceived > 0 ? ((profit / project.paymentsReceived) * 100).toFixed(0) : 0);

                return (
                  <div key={project.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{project.name}</p>
                      <p className="text-[10px] text-slate-500">
                        Contract: {formatBDT(project.contractValue)} • Direct Costs: {formatBDT(project.directCosts)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatBDT(profit)}
                      </p>
                      <span className="text-[10px] text-slate-400">Margin: {margin}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl">
              <Lock className="w-6 h-6 mb-1 text-slate-300" />
              <p className="text-xs">Direct financial margin data is restricted for this role.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
