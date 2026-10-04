import React, { useState, useEffect } from 'react';
import { Employee, User } from '../../types';
import { api } from '../../services/api';
import { formatBDT, formatDhakaDate, getStatusBadgeClass, getRoleBadgeClass, roleDisplay } from '../../utils/formatters';
import { EmployeeFormModal } from './EmployeeFormModal';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Users,
  Plus,
  Search,
  Lock,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit2,
  Trash2,
  Send,
} from 'lucide-react';

interface EmployeesPageProps {
  currentUser: User | null;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>(['Engineering', 'Design & UI/UX', 'Operations', 'Finance & HR']);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Disburse Payroll Modal
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [disburseTarget, setDisburseTarget] = useState<Employee | null>(null);
  const [disburseMonth, setDisburseMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [disbursing, setDisbursing] = useState(false);
  const [disburseSuccessMsg, setDisburseSuccessMsg] = useState('');

  const canCreate = currentUser?.permissions.employees.create ?? false;
  const canEdit = currentUser?.permissions.employees.edit ?? false;
  const canDelete = currentUser?.permissions.employees.delete ?? false;
  const canViewSalaries = currentUser?.permissions.canViewSalaries ?? false;

  useEffect(() => {
    loadEmployees();
  }, [currentUser]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async (data: Partial<Employee>) => {
    if (employeeToEdit) {
      const updated = await api.updateEmployee(employeeToEdit.id, data);
      setEmployees(employees.map((e) => (e.id === updated.id ? updated : e)));
    } else {
      const created = await api.createEmployee(data);
      setEmployees([...employees, created]);
    }
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await api.deleteEmployee(employeeToDelete.id);
      setEmployees(employees.filter((e) => e.id !== employeeToDelete.id));
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete employee');
    }
  };

  const handleExecuteDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseTarget) return;

    setDisbursing(true);
    try {
      await api.disbursePayroll(disburseTarget.id, {
        monthYear: disburseMonth,
        paymentMethod: 'Bank Transfer (BRAC Bank)',
      });
      setDisburseSuccessMsg(`Recorded monthly salary payout for ${disburseTarget.name} (${disburseMonth})`);
      setDisburseModalOpen(false);
      setDisburseTarget(null);
      setTimeout(() => setDisburseSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record payroll payout');
    } finally {
      setDisbursing(false);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Team Directory & HR
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {employees.length} Staff
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Satora Lab engineers, designers, project leads, and personnel roles.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setEmployeeToEdit(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {disburseSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{disburseSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search team member by name, role, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
        >
          <option value="ALL">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Design & UI/UX">Design & UI/UX</option>
          <option value="Product Management">Product Management</option>
          <option value="Quality Assurance">Quality Assurance</option>
          <option value="Operations">Operations</option>
          <option value="Finance & HR">Finance & HR</option>
        </select>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading directory...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">No staff members found.</div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-700 text-sm">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{emp.name}</h3>
                      <p className="text-xs text-blue-600 font-semibold">{emp.designation}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{emp.id}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(emp.employmentStatus)}`}>
                    {emp.employmentStatus}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Joined: {formatDhakaDate(emp.joiningDate)}</span>
                  </div>
                </div>
              </div>

              {/* Salary info & action bottom bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Monthly Rate</span>
                  {canViewSalaries && emp.salary !== null ? (
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {formatBDT(emp.salary)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Lock className="w-3 h-3" />
                      Confidential
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {canViewSalaries && (
                    <button
                      onClick={() => {
                        setDisburseTarget(emp);
                        setDisburseModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                      title="Disburse payroll entry into finance transactions"
                    >
                      Pay Salary
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => {
                        setEmployeeToEdit(emp);
                        setFormModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => {
                        setEmployeeToDelete(emp);
                        setDeleteConfirmOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Disburse Payroll Confirmation Modal */}
      {disburseModalOpen && disburseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-xs">
            <h3 className="text-base font-bold text-slate-900">Disburse Monthly Payroll Entry</h3>
            <p className="text-slate-500 mt-1">
              Record a single payroll disbursement transaction for <strong>{disburseTarget.name}</strong>.
            </p>

            <form onSubmit={handleExecuteDisburse} className="mt-4 space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Payroll Month</label>
                <input
                  type="month"
                  required
                  value={disburseMonth}
                  onChange={(e) => setDisburseMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500">Disbursement Amount (BDT)</span>
                <p className="font-mono text-base font-black text-slate-900">
                  {formatBDT(disburseTarget.salary)}
                </p>
                <span className="text-[10px] text-slate-400 block">
                  Method: Bank Transfer (BRAC Bank Corporate)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisburseModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disbursing}
                  className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {disbursing ? 'Recording...' : 'Disburse Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <EmployeeFormModal
        isOpen={formModalOpen}
        employeeToEdit={employeeToEdit}
        currentUser={currentUser}
        departments={departments}
        onSave={handleSaveEmployee}
        onClose={() => setFormModalOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Employee Record?"
        message={`Are you sure you want to remove ${employeeToDelete?.name} (${employeeToDelete?.id})? This will be recorded in the audit trail.`}
        confirmText="Delete Record"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setEmployeeToDelete(null);
        }}
      />
    </div>
  );
};
