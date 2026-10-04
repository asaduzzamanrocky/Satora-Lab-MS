import React, { useState, useEffect } from 'react';
import { Project, Employee, Client, User } from '../../types';
import { api } from '../../services/api';
import { formatBDT, formatDhakaDate, getStatusBadgeClass } from '../../utils/formatters';
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

interface ProjectsPageProps {
  currentUser: User | null;
  onOpenTaskModalWithProject?: (projectId: string) => void;
  onOpenProjectChat?: (projectId: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  currentUser,
  onOpenTaskModalWithProject,
  onOpenProjectChat,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const canCreate = currentUser?.permissions.projects.create ?? false;
  const canEdit = currentUser?.permissions.projects.edit ?? false;
  const canDelete = currentUser?.permissions.projects.delete ?? false;
  const canViewFinancials = currentUser?.permissions.canViewFinancials ?? false;

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, empData, clientData] = await Promise.all([
        api.getProjects().catch(() => []),
        api.getEmployees().catch(() => []),
        api.getClients().catch(() => []),
      ]);
      setProjects(projData);
      setEmployees(empData);
      setClients(clientData);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async (data: Partial<Project>) => {
    if (projectToEdit) {
      const updated = await api.updateProject(projectToEdit.id, data);
      setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await api.createProject(data);
      setProjects([created, ...projects]);
    }
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await api.deleteProject(projectToDelete.id);
      setProjects(projects.filter((p) => p.id !== projectToDelete.id));
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  // Filter logic
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clients.find((c) => c.id === p.clientId)?.company || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesClient = clientFilter === 'ALL' || p.clientId === clientFilter;
    const isOverdue = p.status !== 'Completed' && p.deadline < todayStr;
    const matchesOverdue = !showOverdueOnly || isOverdue;

    return matchesSearch && matchesStatus && matchesClient && matchesOverdue;
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Projects Management
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {projects.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track deliverable milestones, multiple assignees, budgets, cash profits, and deadlines.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setProjectToEdit(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, name, client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Planning">Planning</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>

          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>

          {/* Overdue Toggle */}
          <button
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
              showOverdueOnly
                ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Overdue Only</span>
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading projects data...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FolderKanban className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No matching projects found</p>
            <p className="text-[11px] text-slate-400">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Project ID & Name</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Lead & Team</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Status & Progress</th>
                  {canViewFinancials ? (
                    <>
                      <th className="py-3 px-4 text-right">Contract Value</th>
                      <th className="py-3 px-4 text-right">Cash In (Received)</th>
                      <th className="py-3 px-4 text-right">Direct Costs</th>
                      <th className="py-3 px-4 text-right">Cash Profit</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                    </>
                  ) : (
                    <th className="py-3 px-4 text-slate-400 text-center">Budgets (Restricted)</th>
                  )}
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const client = clients.find((c) => c.id === p.clientId);
                  const manager = employees.find((e) => e.id === p.managerId);
                  const isOverdue = p.status !== 'Completed' && p.deadline < todayStr;
                  const cashProfit = p.cashProfit ?? (p.paymentsReceived - p.directCosts);
                  const outstanding = p.outstandingPayment ?? Math.max(0, p.contractValue - p.paymentsReceived);
                  const overpayment = p.overpayment ?? Math.max(0, p.paymentsReceived - p.contractValue);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedProject(p);
                        setDetailModalOpen(true);
                      }}
                    >
                      {/* Project ID & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] font-bold text-blue-600">{p.id}</span>
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                            {p.name}
                          </span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {client?.company || p.clientId}
                      </td>

                      {/* Lead & Assigned Team */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800">{manager?.name?.split(' ')[0] || 'Unassigned'}</span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span>+{p.assignedEmployeeIds?.length || 0} team</span>
                          </div>
                        </div>
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                          <span className={`font-mono ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                            {formatDhakaDate(p.deadline)}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-rose-600 block mt-0.5">OVERDUE</span>
                        )}
                      </td>

                      {/* Status & Progress */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadgeClass(p.status)}`}>
                              {p.status}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-600">{p.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Financials in BDT */}
                      {canViewFinancials ? (
                        <>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatBDT(p.contractValue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                            {formatBDT(p.paymentsReceived)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-rose-600">
                            {formatBDT(p.directCosts)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700">
                            {formatBDT(cashProfit)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`font-mono font-bold ${outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                              {formatBDT(outstanding)}
                            </span>
                            {overpayment > 0 && (
                              <span className="block text-[10px] text-emerald-600 font-semibold">
                                +{formatBDT(overpayment)}
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Lock className="w-3 h-3" />
                            Redacted
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedProject(p);
                              setDetailModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            title="View Project Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onOpenProjectChat && (
                            <button
                              onClick={() => onOpenProjectChat(p.id)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Open Project Chat Hub"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => {
                                setProjectToEdit(p);
                                setFormModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Edit Project"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(p)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete Project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProjectFormModal
        isOpen={formModalOpen}
        projectToEdit={projectToEdit}
        employees={employees}
        clients={clients}
        currentUser={currentUser}
        onSave={handleSaveProject}
        onClose={() => setFormModalOpen(false)}
      />

      <ProjectDetailModal
        project={selectedProject}
        employees={employees}
        clients={clients}
        currentUser={currentUser}
        onEdit={(proj) => {
          setDetailModalOpen(false);
          setProjectToEdit(proj);
          setFormModalOpen(true);
        }}
        onClose={() => setDetailModalOpen(false)}
        onAddNewTask={(projId) => {
          setDetailModalOpen(false);
          if (onOpenTaskModalWithProject) {
            onOpenTaskModalWithProject(projId);
          }
        }}
        onOpenProjectChat={(projId) => {
          setDetailModalOpen(false);
          if (onOpenProjectChat) {
            onOpenProjectChat(projId);
          }
        }}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Project?"
        message={`Are you sure you want to permanently delete project "${projectToDelete?.name}" (${projectToDelete?.id})? This will be recorded in the audit trail.`}
        confirmText="Delete Project"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setProjectToDelete(null);
        }}
      />
    </div>
  );
};
