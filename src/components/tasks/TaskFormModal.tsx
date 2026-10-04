import React, { useState, useEffect } from 'react';
import { Task, Project, Employee, User } from '../../types';
import { X, Check } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  taskToEdit: Task | null;
  projects: Project[];
  employees: Employee[];
  currentUser: User | null;
  preselectedProjectId?: string;
  onSave: (data: Partial<Task>) => Promise<void>;
  onClose: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  taskToEdit,
  projects,
  employees,
  currentUser,
  preselectedProjectId,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [status, setStatus] = useState<Task['status']>('To Do');
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setProjectId(taskToEdit.projectId);
      setAssignedTo(taskToEdit.assignedTo || []);
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setProgress(taskToEdit.progress);
      setStartDate(taskToEdit.startDate);
      setDueDate(taskToEdit.dueDate);
      setNotes(taskToEdit.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setProjectId(preselectedProjectId || projects[0]?.id || '');
      setAssignedTo(currentUser?.employeeId ? [currentUser.employeeId] : [employees[0]?.id || '']);
      setPriority('Medium');
      setStatus('To Do');
      setProgress(0);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
      setNotes('');
    }
    setError('');
  }, [taskToEdit, isOpen, preselectedProjectId, projects, employees, currentUser]);

  if (!isOpen) return null;

  const handleToggleAssignee = (empId: string) => {
    if (assignedTo.includes(empId)) {
      setAssignedTo(assignedTo.filter((id) => id !== empId));
    } else {
      setAssignedTo([...assignedTo, empId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    if (!projectId) {
      setError('Please select a project');
      return;
    }
    if (!dueDate) {
      setError('Due date is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        title,
        description,
        projectId,
        assignedTo,
        priority,
        status,
        progress: status === 'Done' ? 100 : Number(progress),
        startDate,
        dueDate,
        notes,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            {taskToEdit ? `Edit Task (${taskToEdit.id})` : 'Create New Deliverable Task'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement webhook retry mechanism"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Associated Project *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical specs or acceptance criteria..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Assigned Members */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Assigned Engineers ({assignedTo.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
              {employees.map((e) => {
                const isSelected = assignedTo.includes(e.id);
                return (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => handleToggleAssignee(e.id)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left text-[11px] transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-3 h-3 rounded border border-current flex items-center justify-center flex-shrink-0">
                      {isSelected && <Check className="w-2 h-2" />}
                    </div>
                    <span className="truncate">{e.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Due Date (Dhaka BST) *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Completion: {progress}%</label>
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
              {submitting ? 'Saving...' : taskToEdit ? 'Save Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
