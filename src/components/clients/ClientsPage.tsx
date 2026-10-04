import React, { useState, useEffect } from 'react';
import { Client, User } from '../../types';
import { api } from '../../services/api';
import { formatBDT, formatDhakaDate, getStatusBadgeClass } from '../../utils/formatters';
import { ClientFormModal } from './ClientFormModal';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  FolderKanban,
  Receipt,
  Calendar,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface ClientsPageProps {
  currentUser: User | null;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ currentUser }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const canCreate = currentUser?.permissions.clients.create ?? false;
  const canEdit = currentUser?.permissions.clients.edit ?? false;
  const canDelete = currentUser?.permissions.clients.delete ?? false;
  const canViewFinancials = currentUser?.permissions.canViewFinancials ?? false;

  useEffect(() => {
    loadClients();
  }, [currentUser]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (data: Partial<Client>) => {
    if (clientToEdit) {
      const updated = await api.updateClient(clientToEdit.id, data);
      setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      const created = await api.createClient(data);
      setClients([created, ...clients]);
    }
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      await api.deleteClient(clientToDelete.id);
      setClients(clients.filter((c) => c.id !== clientToDelete.id));
      setDeleteConfirmOpen(false);
      setClientToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
    }
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Clients & CRM
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {clients.length} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise client relationships, project associations, payment summaries, and follow-ups.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setClientToEdit(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client Account</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by company, contact person, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
        >
          <option value="ALL">All Statuses</option>
          <option value="Active">Active Clients</option>
          <option value="Lead">Sales Leads</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">Loading accounts...</div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">No client accounts found.</div>
        ) : (
          filteredClients.map((client) => {
            const fin = client.financialSummary;

            return (
              <div
                key={client.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-blue-600 font-bold block">{client.id}</span>
                      <h3 className="font-bold text-slate-900 text-sm">{client.company}</h3>
                      <p className="text-xs text-slate-500 font-medium">Contact: {client.contactPerson}</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(client.status)}`}>
                      {client.status}
                    </span>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.followUpDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>Next Follow-up: <strong>{formatDhakaDate(client.followUpDate)}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Associated Projects Badge */}
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                        Associated Projects
                      </span>
                      <span className="font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {client.projectCount || 0}
                      </span>
                    </div>
                    {client.projectNames && client.projectNames.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {client.projectNames.slice(0, 2).map((pn) => (
                          <span key={pn} className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            • {pn}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Financial Payment Summary */}
                  {canViewFinancials && fin && (
                    <div className="mt-2.5 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Contract Value:</span>
                        <span className="font-mono font-bold text-slate-900">{formatBDT(fin.totalContractValue)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-800">
                        <span>Paid to Date:</span>
                        <span className="font-mono font-bold">{formatBDT(fin.totalPaymentsReceived)}</span>
                      </div>
                      <div className="flex justify-between text-amber-800 font-bold pt-1 border-t border-emerald-200/50">
                        <span>Outstanding Due:</span>
                        <span className="font-mono">{formatBDT(fin.outstanding)}</span>
                      </div>
                    </div>
                  )}

                  {client.notes && (
                    <p className="mt-2.5 text-[11px] text-slate-500 italic line-clamp-2">
                      "{client.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setClientToEdit(client);
                        setFormModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                      title="Edit Account"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        setClientToDelete(client);
                        setDeleteConfirmOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <ClientFormModal
        isOpen={formModalOpen}
        clientToEdit={clientToEdit}
        onSave={handleSaveClient}
        onClose={() => setFormModalOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Client Account?"
        message={`Are you sure you want to permanently delete client "${clientToDelete?.company}"? Associated projects will remain.`}
        confirmText="Delete Client"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setClientToDelete(null);
        }}
      />
    </div>
  );
};
