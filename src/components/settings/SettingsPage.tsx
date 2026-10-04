import React, { useState, useEffect } from 'react';
import { CompanySettings, AuditLog, User, Employee, ManualPaymentOption } from '../../types';
import { api } from '../../services/api';
import { formatDhakaDate, formatDhakaTime, roleDisplay, getRoleBadgeClass } from '../../utils/formatters';
import { UserManagementModal } from './UserManagementModal';
import { SheetsMigrationModal } from './SheetsMigrationModal';
import { ManualPaymentModal } from './ManualPaymentModal';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  RotateCcw,
  Building2,
  Clock,
  Coins,
  History,
  UserPlus,
  Edit2,
  CheckCircle2,
  Lock,
  CreditCard,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';

interface SettingsPageProps {
  currentUser: User | null;
  onRefreshAllData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onRefreshAllData }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<ManualPaymentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentOptionToEdit, setPaymentOptionToEdit] = useState<ManualPaymentOption | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    loadSettingsData();
  }, [currentUser]);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const [setRes, usersList, empList, payList] = await Promise.all([
        api.getSettings(),
        api.getUsers().catch(() => []),
        api.getEmployees().catch(() => []),
        api.getPaymentOptions().catch(() => []),
      ]);
      setSettings(setRes.settings);
      setAuditLogs(setRes.auditLogs || []);
      setUsers(usersList);
      setEmployees(empList);
      setPaymentOptions(payList);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
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
    setSaveSuccessMsg('Payment option successfully saved!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
    loadSettingsData();
  };

  const handleDeletePaymentOption = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this payment option?')) return;
    try {
      await api.deletePaymentOption(id);
      setPaymentOptions(paymentOptions.filter((p) => p.id !== id));
      setSaveSuccessMsg('Payment option removed.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment option');
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaveSuccessMsg('Company configurations successfully updated!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleSaveUser = async (data: any) => {
    if (userToEdit) {
      const updated = await api.updateUser(userToEdit.id, data);
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
    } else {
      const created = await api.inviteUser(data);
      setUsers([...users, created]);
    }
    loadSettingsData();
  };

  const handleResetToDefaults = async () => {
    try {
      await api.resetDefaults();
      setResetConfirmOpen(false);
      onRefreshAllData();
      loadSettingsData();
      setSaveSuccessMsg('System reset to original Satora Lab sample dataset.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to reset database');
    }
  };

  if (!currentUser?.permissions.settings.view && !isSuperAdmin) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <Lock className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-base font-bold text-slate-800">Settings Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          System settings and role assignments can only be accessed by authorized Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Settings & Access Control (RBAC)
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              Dhaka Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Company profile, server-enforced roles, Google Sheets migration, and chronological audit trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setMigrationModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Migrate Google Sheets</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold px-3 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              title="Reset sample database for testing"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Sample DB</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* User Access Management (RBAC) Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Role-Based Access Control & User Directory
            </h2>
            <p className="text-xs text-slate-500">
              Assign roles and backend-enforced permissions for each team member.
            </p>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => {
                setUserToEdit(null);
                setUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite User</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-2 px-3">Name & Email</th>
                <th className="py-2 px-3">Assigned Role</th>
                <th className="py-2 px-3">Salary Visibility</th>
                <th className="py-2 px-3">Financials Visibility</th>
                <th className="py-2 px-3">Project Scope</th>
                <th className="py-2 px-3 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900 block">{u.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${getRoleBadgeClass(u.role)}`}>
                      {roleDisplay(u.role)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {u.permissions?.canViewSalaries ? (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                        Visible
                      </span>
                    ) : (
                      <span className="text-slate-400">Redacted</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {u.permissions?.canViewFinancials ? (
                      <span className="text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                        Visible
                      </span>
                    ) : (
                      <span className="text-slate-400">Restricted</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700 capitalize">
                    {u.permissions?.projectScope === 'all' ? 'All Company' : 'Assigned Only'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setUserToEdit(u);
                          setUserModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold p-1"
                        title="Edit Permissions"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Profile Settings Form */}
      {settings && (
        <form onSubmit={handleSaveCompanySettings} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Company Profile & Regional Standards
              </h2>
              <p className="text-xs text-slate-500">Official office information in Dhaka, Bangladesh</p>
            </div>
            {isSuperAdmin && (
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Save Settings
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Currency</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={`${settings.currency} (${settings.currencySymbol})`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">System Timezone</label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Address</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tax Identification / BIN</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={settings.taxId}
                onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-mono disabled:bg-slate-50"
              />
            </div>
          </div>
        </form>
      )}

      {/* Audit Trail Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Security Audit Trail (Chronological Log)
            </h2>
            <p className="text-xs text-slate-500">Immutable ledger of sensitive role changes, transactions, and project modifications.</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">{auditLogs.length} events logged</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                    {log.action}
                  </span>
                  <span className="font-bold text-slate-900">{log.resource}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium">{log.userName} ({log.userRole})</span>
                </div>
                <p className="text-slate-600 text-[11px]">{log.details}</p>
              </div>

              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                {formatDhakaDate(log.timestamp)} {formatDhakaTime(log.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Payment Methods Configuration (Super Admin) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Configured Manual Payment Options
            </h2>
            <p className="text-xs text-slate-500">
              Manage bank accounts, MFS wallets (bKash/Nagad/Rocket), and cash vaults available in vouchers & invoices.
            </p>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => {
                setPaymentOptionToEdit(null);
                setPaymentModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Payment Option</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paymentOptions.map((opt) => (
            <div
              key={opt.id}
              className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2 text-xs"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded uppercase">
                      {opt.type}
                    </span>
                    <h4 className="font-bold text-slate-900 mt-1">{opt.title}</h4>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${opt.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    title={opt.isActive ? 'Active' : 'Inactive'}
                  />
                </div>

                {opt.accountNumber && (
                  <p className="font-mono text-[11px] text-slate-600 mt-1">
                    A/C: <strong>{opt.accountNumber}</strong>
                  </p>
                )}
                {opt.branch && (
                  <p className="text-[10px] text-slate-500">{opt.branch}</p>
                )}
                {opt.instructions && (
                  <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-2">
                    "{opt.instructions}"
                  </p>
                )}
              </div>

              {isSuperAdmin && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-1">
                  <button
                    onClick={() => {
                      setPaymentOptionToEdit(opt);
                      setPaymentModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Edit Option"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePaymentOption(opt.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
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

      {/* Modals */}
      <ManualPaymentModal
        isOpen={paymentModalOpen}
        optionToEdit={paymentOptionToEdit}
        onSave={handleSavePaymentOption}
        onClose={() => setPaymentModalOpen(false)}
      />

      <UserManagementModal
        isOpen={userModalOpen}
        userToEdit={userToEdit}
        employees={employees}
        onSave={handleSaveUser}
        onClose={() => setUserModalOpen(false)}
      />

      <SheetsMigrationModal
        isOpen={migrationModalOpen}
        onImportComplete={() => {
          setMigrationModalOpen(false);
          onRefreshAllData();
          loadSettingsData();
        }}
        onClose={() => setMigrationModalOpen(false)}
      />

      <ConfirmModal
        isOpen={resetConfirmOpen}
        title="Reset Entire Database?"
        message="This will wipe all custom additions and restore the original Satora Lab sample projects, employees, transactions, and tasks in Dhaka BST. This action cannot be undone."
        confirmText="Reset Sample Database"
        isDanger={true}
        onConfirm={handleResetToDefaults}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
};
