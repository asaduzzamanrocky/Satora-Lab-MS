import React, { useState, useEffect } from 'react';
import { Project, Task, Transaction, Employee, Client, User } from '../../types';
import { api } from '../../services/api';
import { formatBDT, formatDhakaDate, getStatusBadgeClass, getPriorityBadgeClass } from '../../utils/formatters';
import {
  X,
  Edit2,
  Calendar,
  Users,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  TrendingUp,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  MessageSquare,
} from 'lucide-react';

interface ProjectDetailModalProps {
  project: Project | null;
  employees: Employee[];
  clients: Client[];
  currentUser: User | null;
  onEdit: (project: Project) => void;
  onClose: () => void;
  onAddNewTask?: (projectId: string) => void;
  onOpenProjectChat?: (projectId: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  employees,
  clients,
  currentUser,
  onEdit,
  onClose,
  onAddNewTask,
  onOpenProjectChat,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const canViewFinancials = currentUser?.permissions.canViewFinancials ?? false;

  useEffect(() => {
    if (project) {
      setLoading(true);
      api
        .getProject(project.id)
        .then((res) => {
          setTasks(res.tasks || []);
          setTransactions(res.transactions || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [project]);

  if (!project) return null;

  const client = clients.find((c) => c.id === project.clientId);
  const manager = employees.find((e) => e.id === project.managerId);
  const assigned = employees.filter((e) => project.assignedEmployeeIds?.includes(e.id));

  // Financial calculations
  const outstanding = project.outstandingPayment ?? Math.max(0, project.contractValue - project.paymentsReceived);
  const overpayment = project.overpayment ?? Math.max(0, project.paymentsReceived - project.contractValue);
  const cashProfit = project.cashProfit ?? (project.paymentsReceived - project.directCosts);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-100 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-slate-900 p-6 text-white flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                {project.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs border ${getStatusBadgeClass(project.status)}`}>
                {project.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-2 tracking-tight text-white">{project.name}</h1>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Client: <strong>{client?.company || project.clientId}</strong></span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Deadline: <strong>{formatDhakaDate(project.deadline)}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenProjectChat && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProjectChat(project.id);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer"
                title="Open Project Discussion & Chat Hub"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Project Chat</span>
              </button>
            )}
            {currentUser?.permissions.projects.edit && (
              <button
                onClick={() => onEdit(project)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Progress Bar & Deliverables Status */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Project Execution Progress</span>
              <span className="font-mono font-bold text-blue-600">{project.progress}% Complete</span>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* Key Metrics: Financials Card Grid */}
          {canViewFinancials ? (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Cash Flow & Balance (BDT ৳)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 block">Contract Value</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">
                    {formatBDT(project.contractValue)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-emerald-800 block">Payments Received</span>
                  <span className="text-base font-black text-emerald-700 mt-1 block">
                    {formatBDT(project.paymentsReceived)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-rose-800 block">Direct Project Costs</span>
                  <span className="text-base font-black text-rose-700 mt-1 block">
                    {formatBDT(project.directCosts)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 shadow-xs">
                  <span className="text-[11px] font-semibold text-purple-800 block">Project Cash Profit</span>
                  <span className="text-base font-black text-purple-700 mt-1 block">
                    {formatBDT(cashProfit)}
                  </span>
                </div>
              </div>

              {/* Outstanding vs Overpayment Ribbon */}
              <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <span className="text-slate-600">
                  <strong>Outstanding Balance:</strong>{' '}
                  <span className={outstanding > 0 ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                    {formatBDT(outstanding)}
                  </span>
                </span>
                {overpayment > 0 && (
                  <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                    Overpayment Collected: +{formatBDT(overpayment)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <span>🔒 Financial details are restricted to authorized management & finance accounts.</span>
            </div>
          )}

          {/* Project Details: Manager, Assignees, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="font-bold text-slate-700 block">Project Team & Management</span>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-semibold text-slate-500">Lead Manager:</span>
                <span className="font-bold text-slate-900">{manager?.name || 'Unassigned'}</span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="font-semibold text-slate-500 block">Assigned Engineers & Designers:</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {assigned.map((e) => (
                    <span
                      key={e.id}
                      className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-200 text-[11px]"
                    >
                      {e.name} ({e.designation})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="font-bold text-slate-700 block">Schedule & Timeline (Asia/Dhaka)</span>
              <div className="flex items-center justify-between text-slate-600">
                <span>Start Date:</span>
                <span className="font-mono font-medium text-slate-900">{formatDhakaDate(project.startDate)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Delivery Deadline:</span>
                <span className="font-mono font-bold text-slate-900">{formatDhakaDate(project.deadline)}</span>
              </div>
              {project.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 block">Notes:</span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">{project.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Linked Tasks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Linked Deliverables & Tasks ({tasks.length})
              </h3>
              {onAddNewTask && currentUser?.permissions.tasks.create && (
                <button
                  onClick={() => onAddNewTask(project.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-3">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl text-center">
                No tasks linked yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {tasks.map((task) => (
                  <div key={task.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="text-[10px] text-slate-500">
                        Due: {formatDhakaDate(task.dueDate)} • Progress: {task.progress}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${getPriorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadgeClass(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Transactions (if permitted) */}
          {canViewFinancials && transactions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Logged Transactions for this Project ({transactions.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{tx.description}</span>
                      <p className="text-[10px] text-slate-500">
                        {formatDhakaDate(tx.date)} • {tx.paymentMethod} • Ref: {tx.reference}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'} {formatBDT(tx.amount)}
                      </span>
                      <span className="block text-[10px] text-slate-400 capitalize">{tx.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
