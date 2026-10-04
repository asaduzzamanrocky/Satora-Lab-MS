import React from 'react';
import { Task, Project } from '../../types';
import { formatDhakaDate, getStatusBadgeClass } from '../../utils/formatters';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';

interface TaskTimelineProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({ tasks, projects, onSelectTask }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Project Delivery Timeline & Gantt Milestones
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Visual sequence of active deliverables and scheduled deadlines.
        </p>
      </div>

      <div className="space-y-6">
        {projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id);
          if (projectTasks.length === 0) return null;

          return (
            <div key={project.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {project.id}
                  </span>
                  <span className="font-bold text-slate-900 text-xs">{project.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>{formatDhakaDate(project.startDate)}</span>
                  <span>→</span>
                  <span className="font-bold text-slate-700">{formatDhakaDate(project.deadline)}</span>
                </div>
              </div>

              {/* Task Items in Project Timeline */}
              <div className="space-y-2">
                {projectTasks.map((task) => {
                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:border-blue-400 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{task.title}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[9px] border ${getStatusBadgeClass(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Start: {formatDhakaDate(task.startDate)}</span>
                          <span>•</span>
                          <span>Due: <strong className="text-slate-800">{formatDhakaDate(task.dueDate)}</strong></span>
                        </div>
                      </div>

                      {/* Progress Bar Display */}
                      <div className="w-full sm:w-48 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Milestone progress</span>
                          <span className="font-mono font-bold text-blue-600">{task.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              task.status === 'Done' ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
