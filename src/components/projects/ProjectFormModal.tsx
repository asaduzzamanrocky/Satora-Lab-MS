import React, { useState, useEffect } from 'react';
import { Project, Employee, Client, User } from '../../types';
import { X, Check } from 'lucide-react';

interface ProjectFormModalProps {
  isOpen: boolean;
  projectToEdit: Project | null;
  employees: Employee[];
  clients: Client[];
  currentUser: User | null;
  onSave: (data: Partial<Project>) => Promise<void>;
  onClose: () => void;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  projectToEdit,
  employees,
  clients,
  currentUser,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<Project['status']>('Planning');
  const [progress, setProgress] = useState(0);
  const [contractValue, setContractValue] = useState(0);
  const [directCosts, setDirectCosts] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canEditFinancials = currentUser?.permissions.canViewFinancials ?? false;

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name);
      setClientId(projectToEdit.clientId);
      setManagerId(projectToEdit.managerId);
      setAssignedEmployeeIds(projectToEdit.assignedEmployeeIds || []);
      setStartDate(projectToEdit.startDate);
      setDeadline(projectToEdit.deadline);
      setStatus(projectToEdit.status);
      setProgress(projectToEdit.progress);
      setContractValue(projectToEdit.contractValue || 0);
      setDirectCosts(projectToEdit.directCosts || 0);
      setNotes(projectToEdit.notes || '');
    } else {
      setName('');
      setClientId(clients[0]?.id || '');
      setManagerId(employees[0]?.id || '');
      setAssignedEmployeeIds(employees.slice(0, 2).map((e) => e.id));
      setStartDate(new Date().toISOString().split('T')[0]);
      setDeadline(new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]);
      setStatus('In Progress');
      setProgress(10);
      setContractValue(1500000);
      setDirectCosts(200000);
      setNotes('');
    }
    setError('');
  }, [projectToEdit, isOpen, clients, employees]);

  if (!isOpen) return null;

  const handleToggleAssignee = (empId: string) => {
    if (assignedEmployeeIds.includes(empId)) {
      setAssignedEmployeeIds(assignedEmployeeIds.filter((id) => id !== empId));
    } else {
      setAssignedEmployeeIds([...assignedEmployeeIds, empId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    if (!managerId) {
      setError('Please select a project manager');
      return;
    }
    if (!deadline) {
      setError('Please specify a project deadline');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSave({
        name,
        clientId,
        managerId,
        assignedEmployeeIds,
        startDate,
        deadline,
        status,
        progress: Number(progress),
        contractValue: canEditFinancials ? Number(contractValue) : projectToEdit?.contractValue ?? 0,
        directCosts: canEditFinancials ? Number(directCosts) : projectToEdit?.directCosts ?? 0,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {projectToEdit ? `Edit Project: ${projectToEdit.id}` : 'Create New Satora Lab Project'}
            </h2>
            <p className="text-xs text-slate-500">Configure deliverables, assignees, and BDT budgets</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. bKash Merchant Portal Revamp"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.contactPerson})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lead Project Manager *</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.designation}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Team Members (Multi-select) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Team Members ({assignedEmployeeIds.length} selected)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
              {employees.map((e) => {
                const isAssigned = assignedEmployeeIds.includes(e.id);
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => handleToggleAssignee(e.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                      isAssigned
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded border border-current flex items-center justify-center flex-shrink-0">
                      {isAssigned && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <span className="truncate">{e.name.split(' ')[0]} ({e.department.slice(0, 3)})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Deadline *</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Project Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Deliverable Progress</label>
                <span className="text-xs font-mono font-bold text-blue-600">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Financials in BDT (Restricted by Role) */}
          {canEditFinancials ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-900 block">Financial Budgets (BDT ৳)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contract / Total Value (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={contractValue}
                    onChange={(e) => setContractValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Direct Costs Budget (৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={directCosts}
                    onChange={(e) => setDirectCosts(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Note: Revenue received is tracked separately and updated automatically from signed transactions and invoices.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
              🔒 Contract value and financial budgeting is restricted to Finance, Management, and Super Admin.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project Notes & Architecture Milestones</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Phase 1 deployed to staging. Awaiting security audit..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            />
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
              {submitting ? 'Saving...' : projectToEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
