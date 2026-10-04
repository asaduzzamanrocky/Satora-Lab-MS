import React, { useState, useEffect } from 'react';
import { Employee, User, UserRole } from '../../types';
import { X } from 'lucide-react';

interface EmployeeFormModalProps {
  isOpen: boolean;
  employeeToEdit: Employee | null;
  currentUser: User | null;
  departments: string[];
  onSave: (data: Partial<Employee>) => Promise<void>;
  onClose: () => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  employeeToEdit,
  currentUser,
  departments,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState(departments[0] || 'Engineering');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('team_member');
  const [joiningDate, setJoiningDate] = useState('');
  const [salary, setSalary] = useState<number>(90000);
  const [employmentStatus, setEmploymentStatus] = useState<Employee['employmentStatus']>('Active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canViewSalaries = currentUser?.permissions.canViewSalaries ?? false;

  useEffect(() => {
    if (employeeToEdit) {
      setName(employeeToEdit.name);
      setDesignation(employeeToEdit.designation);
      setDepartment(employeeToEdit.department);
      setEmail(employeeToEdit.email);
      setPhone(employeeToEdit.phone);
      setRole(employeeToEdit.role);
      setJoiningDate(employeeToEdit.joiningDate);
      setSalary(employeeToEdit.salary || 0);
      setEmploymentStatus(employeeToEdit.employmentStatus);
    } else {
      setName('');
      setDesignation('');
      setDepartment(departments[0] || 'Engineering');
      setEmail('');
      setPhone('+880 17');
      setRole('team_member');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setSalary(100000);
      setEmploymentStatus('Active');
    }
    setError('');
  }, [employeeToEdit, isOpen, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !designation.trim() || !email.trim()) {
      setError('Name, designation, and email are required');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        name,
        designation,
        department,
        email,
        phone,
        role,
        joiningDate,
        salary: canViewSalaries ? Number(salary) : undefined,
        employmentStatus,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {employeeToEdit ? `Edit Staff Member (${employeeToEdit.id})` : 'Add New Satora Lab Team Member'}
          </h2>
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
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tanvir Hossain"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@satoralab.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Designation *</label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">System Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                <option value="super_admin">Super Admin</option>
                <option value="management">Management</option>
                <option value="finance">Finance Controller</option>
                <option value="hr">HR & People</option>
                <option value="project_manager">Project Manager</option>
                <option value="team_member">Team Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Employment Status</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>
          </div>

          {/* Salary Field - Strict Role Check */}
          {canViewSalaries ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1">
                Base Monthly Salary (BDT ৳) — Reference Rate
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Note: This reference rate does not duplicate paid payroll transactions automatically.
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-[11px]">
              🔒 Salary compensation is confidential and restricted from your role.
            </div>
          )}

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
              {submitting ? 'Saving...' : employeeToEdit ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
