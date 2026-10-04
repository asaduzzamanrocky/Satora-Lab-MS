import React from 'react';
import { Task, User } from '../../types';
import { formatDhakaDate, getPriorityBadgeClass } from '../../utils/formatters';
import { Clock, AlertCircle, Edit2, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';

interface TaskKanbanProps {
  tasks: Task[];
  currentUser: User | null;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

const COLUMNS: { id: Task['status']; label: string; headerColor: string }[] = [
  { id: 'To Do', label: 'To Do', headerColor: 'border-slate-400 text-slate-700 bg-slate-100' },
  { id: 'In Progress', label: 'In Progress', headerColor: 'border-blue-500 text-blue-700 bg-blue-50' },
  { id: 'Review', label: 'In Review', headerColor: 'border-purple-500 text-purple-700 bg-purple-50' },
  { id: 'Done', label: 'Completed', headerColor: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
];

export const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  currentUser,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const canEdit = currentUser?.permissions.tasks.edit ?? false;
  const canDelete = currentUser?.permissions.tasks.delete ?? false;
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200/80 flex flex-col min-w-[270px]"
          >
            {/* Column Header */}
            <div className={`p-2.5 rounded-xl border-l-4 font-bold text-xs flex items-center justify-between mb-3 ${col.headerColor}`}>
              <span>{col.label}</span>
              <span className="bg-white/80 px-2 py-0.5 rounded-full text-[11px] font-mono shadow-xs">
                {columnTasks.length}
              </span>
            </div>

            {/* Task Cards List */}
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {columnTasks.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-xl bg-white/40">
                  No tasks in {col.label}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isOverdue = task.status !== 'Done' && task.dueDate < todayStr;

                  return (
                    <div
                      key={task.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-2.5 group"
                    >
                      {/* Priority & ID */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 font-bold">
                          {task.projectId}
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Progress</span>
                          <span className="font-mono font-bold text-slate-700">{task.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${task.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Due date & Assignees */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                          <span className={`font-mono text-[10px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                            {formatDhakaDate(task.dueDate)}
                          </span>
                        </div>

                        {/* Assignee badges */}
                        <div className="flex items-center -space-x-1.5">
                          {task.assigneeDetails?.slice(0, 3).map((a) => (
                            <div
                              key={a.id}
                              title={a.name}
                              className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white"
                            >
                              {a.name.charAt(0)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Move / Edit Actions */}
                      <div className="pt-1 flex items-center justify-between text-slate-400">
                        {canEdit && (
                          <select
                            value={task.status}
                            onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
                            className="text-[10px] bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700 focus:outline-hidden cursor-pointer"
                          >
                            <option value="To Do">Move: To Do</option>
                            <option value="In Progress">Move: In Progress</option>
                            <option value="Review">Move: Review</option>
                            <option value="Done">Move: Done</option>
                          </select>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          {canEdit && (
                            <button
                              onClick={() => onEditTask(task)}
                              className="p-1 hover:text-blue-600 rounded"
                              title="Edit Task"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => onDeleteTask(task)}
                              className="p-1 hover:text-rose-600 rounded"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
