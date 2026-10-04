import React, { useState, useEffect } from 'react';
import { VaultCredential, User } from '../../types';
import { api } from '../../services/api';
import { formatDhakaDate, roleDisplay } from '../../utils/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Key,
  Shield,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
  ExternalLink,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';

interface VaultPageProps {
  currentUser: User | null;
  allUsers: { id: string; name: string; email: string; role: string; avatarUrl?: string }[];
}

export const VaultPage: React.FC<VaultPageProps> = ({ currentUser, allUsers }) => {
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Password Visibility state per card
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, string>>({});

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [credentialToEdit, setCredentialToEdit] = useState<VaultCredential | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<VaultCredential | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VaultCredential['category']>('AI Tools');
  const [serviceUrl, setServiceUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryNotes, setRecoveryNotes] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [accessScope, setAccessScope] = useState<'all' | 'restricted'>('restricted');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVault();
  }, [currentUser]);

  const loadVault = async () => {
    setLoading(true);
    try {
      const res = await api.getVaultCredentials();
      setCredentials(res.credentials || []);
      setCanManage(res.canManage);
    } catch (err) {
      console.error('Failed to load vault credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReveal = async (credId: string) => {
    const isCurrentlyRevealed = !!revealedPasswords[credId];
    setRevealedPasswords({ ...revealedPasswords, [credId]: !isCurrentlyRevealed });

    if (!isCurrentlyRevealed) {
      // Audit log password view
      try {
        await api.auditVaultAccess(credId);
      } catch {
        // silent
      }
    }
  };

  const handleCopyText = async (credId: string, text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [`${credId}-${type}`]: 'Copied!' });
      if (type === 'password') {
        await api.auditVaultAccess(credId);
      }
      setTimeout(() => {
        setCopiedStates((prev) => {
          const next = { ...prev };
          delete next[`${credId}-${type}`];
          return next;
        });
      }, 2500);
    } catch {
      alert('Unable to copy to clipboard');
    }
  };

  const handleOpenAddModal = () => {
    setCredentialToEdit(null);
    setTitle('');
    setCategory('AI Tools');
    setServiceUrl('');
    setUsername('');
    setPassword('');
    setRecoveryNotes('');
    setAssignedUserIds([currentUser?.id || 'USR-001']);
    setAccessScope('restricted');
    setError('');
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (cred: VaultCredential) => {
    setCredentialToEdit(cred);
    setTitle(cred.title);
    setCategory(cred.category);
    setServiceUrl(cred.serviceUrl || '');
    setUsername(cred.username);
    setPassword(cred.password);
    setRecoveryNotes(cred.recoveryNotes || '');
    setAssignedUserIds(cred.assignedUserIds || []);
    setAccessScope(cred.accessScope);
    setError('');
    setFormModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()_+';
    let generated = '';
    for (let i = 0; i < 18; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !username.trim() || !password.trim()) {
      setError('Title, username, and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (credentialToEdit) {
        const updated = await api.updateVaultCredential(credentialToEdit.id, {
          title,
          category,
          serviceUrl,
          username,
          password,
          recoveryNotes,
          assignedUserIds,
          accessScope,
        });
        setCredentials(credentials.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.createVaultCredential({
          title,
          category,
          serviceUrl,
          username,
          password,
          recoveryNotes,
          assignedUserIds,
          accessScope,
        });
        setCredentials([created, ...credentials]);
      }
      setFormModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save credential');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!credentialToDelete) return;
    try {
      await api.deleteVaultCredential(credentialToDelete.id);
      setCredentials(credentials.filter((c) => c.id !== credentialToDelete.id));
      setDeleteConfirmOpen(false);
      setCredentialToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete credential');
    }
  };

  const handleToggleUserAssignment = (uId: string) => {
    if (assignedUserIds.includes(uId)) {
      setAssignedUserIds(assignedUserIds.filter((id) => id !== uId));
    } else {
      setAssignedUserIds([...assignedUserIds, uId]);
    }
  };

  const filteredCredentials = credentials.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Password & Credentials Vault
            </h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-600" />
              Role-Controlled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Store shared company subscriptions (ChatGPT, AWS, GitHub) and assign exact user access permissions.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Store New Password</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search credentials (e.g. ChatGPT, AWS, GitHub)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
        >
          <option value="ALL">All Categories</option>
          <option value="AI Tools">AI Tools (ChatGPT, Claude)</option>
          <option value="Cloud & Hosting">Cloud & Hosting (AWS, GCP)</option>
          <option value="Development & Git">Development & Git (GitHub)</option>
          <option value="Design & Media">Design & Media (Figma)</option>
          <option value="Banking & Gateway">Banking & Payment Gateway</option>
          <option value="General">General Accounts</option>
        </select>
      </div>

      {/* Vault Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading secure vault...</div>
        ) : filteredCredentials.length === 0 ? (
          <div className="col-span-full p-12 text-center space-y-2">
            <Key className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No permitted passwords found.</p>
            <p className="text-[11px] text-slate-400">
              Only credentials specifically assigned to your active account are displayed here.
            </p>
          </div>
        ) : (
          filteredCredentials.map((cred) => {
            const isRevealed = !!revealedPasswords[cred.id];
            const usernameCopied = copiedStates[`${cred.id}-username`];
            const passwordCopied = copiedStates[`${cred.id}-password`];

            return (
              <div
                key={cred.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-block mb-1">
                        {cred.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{cred.title}</h3>
                    </div>

                    {cred.serviceUrl && (
                      <a
                        href={cred.serviceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-blue-600"
                        title="Open Login Portal"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Username Row */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Username / Email</span>
                      <span className="font-mono font-bold text-slate-800 select-all truncate block max-w-[200px]">
                        {cred.username}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyText(cred.id, cred.username, 'username')}
                      className="p-1 text-slate-400 hover:text-blue-600 text-[10px] flex items-center gap-1 font-semibold"
                      title="Copy Username"
                    >
                      {usernameCopied ? (
                        <span className="text-emerald-600 font-bold">{usernameCopied}</span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Password Row */}
                  <div className="mt-2 p-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Password</span>
                      <span className="font-mono font-bold text-sm select-all tracking-wider text-emerald-400">
                        {isRevealed ? cred.password : '••••••••••••••••'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleReveal(cred.id)}
                        className="p-1 text-slate-400 hover:text-white"
                        title={isRevealed ? 'Hide Password' : 'Show Password'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopyText(cred.id, cred.password, 'password')}
                        className="p-1 text-slate-400 hover:text-emerald-400 text-[10px] flex items-center gap-1"
                        title="Copy Password"
                      >
                        {passwordCopied ? (
                          <span className="text-emerald-400 font-bold">{passwordCopied}</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {cred.recoveryNotes && (
                    <p className="mt-2 text-[11px] text-slate-500 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50">
                      <strong>Notes:</strong> {cred.recoveryNotes}
                    </p>
                  )}
                </div>

                {/* Assigned Users Badge & Management Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    {cred.accessScope === 'all' ? (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Shared with All Staff
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-700">
                        Granted to <strong>{cred.assignedUserIds?.length || 1}</strong> members
                      </span>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(cred)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Credential & User Access"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setCredentialToDelete(cred);
                          setDeleteConfirmOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Credential"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Credential Modal (Super Admin Access Assigner) */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {credentialToEdit ? `Edit Password & Access: ${credentialToEdit.title}` : 'Store New Tool Password & Assign Access'}
                </h3>
              </div>
              <button onClick={() => setFormModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveCredential} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service / Tool Name *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ChatGPT Plus Team Workspace"
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-medium"
                  >
                    <option value="AI Tools">AI Tools (ChatGPT, Claude)</option>
                    <option value="Cloud & Hosting">Cloud & Hosting (AWS, GCP)</option>
                    <option value="Development & Git">Development & Git (GitHub)</option>
                    <option value="Design & Media">Design & Media (Figma)</option>
                    <option value="Banking & Gateway">Banking & Payment Gateway</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Login URL</label>
                <input
                  type="url"
                  value={serviceUrl}
                  onChange={(e) => setServiceUrl(e.target.value)}
                  placeholder="https://chatgpt.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username / Login Email *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="account@satoralab.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-1 text-[10px]"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Strong password..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Access Assignment (Whom can see this password) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Access Permission Assignment (Who can see this password)
                  </label>
                  <select
                    value={accessScope}
                    onChange={(e) => setAccessScope(e.target.value as any)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="restricted">Specific Team Members Only</option>
                    <option value="all">All Satora Lab Staff</option>
                  </select>
                </div>

                {accessScope === 'restricted' && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 block">
                      Select users permitted to view and copy this password ({assignedUserIds.length} selected):
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                      {allUsers.map((u) => {
                        const isChecked = assignedUserIds.includes(u.id);
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => handleToggleUserAssignment(u.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                              isChecked
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="w-3.5 h-3.5 rounded border border-current flex items-center justify-center flex-shrink-0">
                              {isChecked && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span className="truncate">{u.name} ({roleDisplay(u.role)})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">2FA / Recovery Notes / Usage Rules</label>
                <textarea
                  rows={2}
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  placeholder="e.g. 2FA is on Rocky's Authenticator app. Please log out after completing tasks."
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : credentialToEdit ? 'Save Credential' : 'Store & Assign Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Stored Password?"
        message={`Are you sure you want to delete credential "${credentialToDelete?.title}"? All team member access will be permanently revoked.`}
        confirmText="Delete Credential"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setCredentialToDelete(null);
        }}
      />
    </div>
  );
};
