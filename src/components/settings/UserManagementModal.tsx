import React, { useState, useEffect } from 'react';
import { User, UserRole, Employee, UserPermissions } from '../../types';
import { X, ShieldCheck, Check } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  userToEdit: User | null;
  employees: Employee[];
  onSave: (data: {
    name: string;
    email: string;
    role: UserRole;
    employeeId?: string;
    customPermissions?: UserPermissions;
  }) => Promise<void>;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  userToEdit,
  employees,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('team_member');
  const [employeeId, setEmployeeId] = useState('');
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setEmployeeId(userToEdit.employeeId || '');
      setPermissions(userToEdit.permissions);
    } else {
      setName('');
      setEmail('');
      setRole('team_member');
      setEmployeeId(employees[0]?.id || '');
      setPermissions(null);
    }
    setError('');
  }, [userToEdit, isOpen, employees]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        name,
        email,
        role,
        employeeId: employeeId || undefined,
        customPermissions: permissions || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleModulePerm = (module: 'projects' | 'employees' | 'finance' | 'tasks' | 'clients', action: 'view' | 'create' | 'edit' | 'delete') => {
    if (!permissions) return;
    setPermissions({
      ...permissions,
      [module]: {
        ...permissions[module],
        [action]: !permissions[module][action],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {userToEdit ? `Manage User & Permissions: ${userToEdit.name}` : 'Invite New Team Member / Admin'}
            </h2>
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
              <label className="block font-bold text-slate-700 mb-1">User Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asaduzzaman Rocky"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@satoralab.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">System Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-semibold"
              >
                <option value="super_admin">Super Admin (Full Access)</option>
                <option value="management">Management (Dashboard & Reports)</option>
                <option value="finance">Finance (Ledgers & Salaries)</option>
                <option value="hr">HR (Staff & Salaries)</option>
                <option value="project_manager">Project Manager (Assigned Projects)</option>
                <option value="team_member">Team Member (Personal Tasks)</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Linked Employee Record</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                <option value="">None / External</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id}: {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Granular Permissions Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
              className="text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>{showAdvancedPerms ? 'Hide' : 'Customize'} Granular RBAC Permissions</span>
            </button>

            {showAdvancedPerms && permissions && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 block text-[11px]">
                  Resource Permissions (Server-Enforced):
                </span>

                {(['projects', 'finance', 'employees', 'tasks', 'clients'] as const).map((mod) => (
                  <div key={mod} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100">
                    <span className="capitalize font-bold text-slate-700 w-24">{mod}</span>
                    <div className="flex items-center gap-4">
                      {(['view', 'create', 'edit', 'delete'] as const).map((act) => (
                        <label key={act} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions[mod][act]}
                            onChange={() => handleToggleModulePerm(mod, act)}
                            className="rounded text-blue-600"
                          />
                          <span className="capitalize text-slate-600 text-[10px]">{act}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={permissions.canViewSalaries}
                      onChange={(e) => setPermissions({ ...permissions, canViewSalaries: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Authorized to View Employee Salaries</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={permissions.canViewFinancials}
                      onChange={(e) => setPermissions({ ...permissions, canViewFinancials: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Authorized to View Financial Budgets & Cash Profits</span>
                  </label>
                </div>
              </div>
            )}
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
              {submitting ? 'Saving...' : userToEdit ? 'Save Permissions' : 'Invite User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
