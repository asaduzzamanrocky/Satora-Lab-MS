import React, { useState, useEffect } from 'react';
import { Task, Project, Employee, User } from '../../types';
import { api } from '../../services/api';
import { formatDhakaDate, getStatusBadgeClass, getPriorityBadgeClass } from '../../utils/formatters';
import { TaskKanban } from './TaskKanban';
import { TaskCalendar } from './TaskCalendar';
import { TaskTimeline } from './TaskTimeline';
import { TaskFormModal } from './TaskFormModal';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Calendar,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

interface TasksPageProps {
  currentUser: User | null;
  initialProjectId?: string;
}

export const TasksPage: React.FC<TasksPageProps> = ({ currentUser, initialProjectId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Active View: 'list' | 'kanban' | 'calendar' | 'timeline'
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar' | 'timeline'>('kanban');

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState(initialProjectId || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const canCreate = currentUser?.permissions.tasks.create ?? false;
  const canEdit = currentUser?.permissions.tasks.edit ?? false;
  const canDelete = currentUser?.permissions.tasks.delete ?? false;

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskList, projList, empList] = await Promise.all([
        api.getTasks().catch(() => []),
        api.getProjects().catch(() => []),
        api.getEmployees().catch(() => []),
      ]);
      setTasks(taskList);
      setProjects(projList);
      setEmployees(empList);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (data: Partial<Task>) => {
    if (taskToEdit) {
      const updated = await api.updateTask(taskToEdit.id, data);
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await api.createTask(data);
      setTasks([created, ...tasks]);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      const updated = await api.updateTask(taskId, {
        status: newStatus,
        progress: newStatus === 'Done' ? 100 : undefined,
      });
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus, progress: updated.progress } : t)));
    } catch (err) {
      console.error('Failed status change:', err);
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.deleteTask(taskToDelete.id);
      setTasks(tasks.filter((t) => t.id !== taskToDelete.id));
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesProject = projectFilter === 'ALL' || t.projectId === projectFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesProject && matchesPriority;
  });

  const overdueCount = tasks.filter((t) => t.status !== 'Done' && t.dueDate < todayStr).length;

  return (
    <div className="space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Tasks & Timeline Board
            </h1>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {tasks.length} Deliverables
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time task assignments, sprint boards, due date tracking, and Gantt milestones.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
          </div>

          {canCreate && (
            <button
              onClick={() => {
                setTaskToEdit(null);
                setFormModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks by title, ID, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} ({p.name.slice(0, 20)}...)
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>

      {/* Overdue alert ribbon */}
      {overdueCount > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>
              <strong>{overdueCount} task{overdueCount > 1 ? 's are' : ' is'} overdue</strong> past their Dhaka scheduled due date.
            </span>
          </div>
          <span className="text-[11px] font-bold text-rose-700">Immediate Action Required</span>
        </div>
      )}

      {/* Main View Render */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading task records...</div>
      ) : viewMode === 'kanban' ? (
        <TaskKanban
          tasks={filteredTasks}
          currentUser={currentUser}
          onEditTask={(t) => {
            setTaskToEdit(t);
            setFormModalOpen(true);
          }}
          onDeleteTask={(t) => {
            setTaskToDelete(t);
            setDeleteConfirmOpen(true);
          }}
          onStatusChange={handleStatusChange}
        />
      ) : viewMode === 'calendar' ? (
        <TaskCalendar
          tasks={filteredTasks}
          onSelectTask={(t) => {
            setTaskToEdit(t);
            setFormModalOpen(true);
          }}
        />
      ) : viewMode === 'timeline' ? (
        <TaskTimeline
          tasks={filteredTasks}
          projects={projects}
          onSelectTask={(t) => {
            setTaskToEdit(t);
            setFormModalOpen(true);
          }}
        />
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Task Title & ID</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status & Progress</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((t) => {
                  const isOverdue = t.status !== 'Done' && t.dueDate < todayStr;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] text-slate-400 font-bold block">{t.id}</span>
                        <span className="font-bold text-slate-900">{t.title}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {t.projectId}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${getPriorityBadgeClass(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getStatusBadgeClass(t.status)}`}>
                            {t.status}
                          </span>
                          <span className="font-mono font-bold text-slate-600 text-[10px]">{t.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-mono ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          {formatDhakaDate(t.dueDate)}
                        </span>
                        {isOverdue && <span className="block text-[10px] text-rose-600 font-bold">OVERDUE</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setTaskToEdit(t);
                                setFormModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setTaskToDelete(t);
                                setDeleteConfirmOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* Modals */}
      <TaskFormModal
        isOpen={formModalOpen}
        taskToEdit={taskToEdit}
        projects={projects}
        employees={employees}
        currentUser={currentUser}
        preselectedProjectId={projectFilter !== 'ALL' ? projectFilter : undefined}
        onSave={handleSaveTask}
        onClose={() => setFormModalOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Task?"
        message={`Are you sure you want to permanently delete task "${taskToDelete?.title}" (${taskToDelete?.id})?`}
        confirmText="Delete Task"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setTaskToDelete(null);
        }}
      />
    </div>
  );
};
