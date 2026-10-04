import React, { useState } from 'react';
import { Task } from '../../types';
import { getStatusBadgeClass, getPriorityBadgeClass } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface TaskCalendarProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export const TaskCalendar: React.FC<TaskCalendarProps> = ({ tasks, onSelectTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Compute days in month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: { day: number | null; dateStr: string }[] = [];

  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ day: null, dateStr: '' });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = (month + 1).toString().padStart(2, '0');
    const dStr = d.toString().padStart(2, '0');
    calendarDays.push({
      day: d,
      dateStr: `${year}-${mStr}-${dStr}`,
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">{monthName}</h2>
          <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
            Asia/Dhaka
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase py-1">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((item, idx) => {
          if (!item.day) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[90px] rounded-xl bg-slate-50/50 border border-transparent"
              />
            );
          }

          const dayTasks = tasks.filter((t) => t.dueDate === item.dateStr);
          const isToday = item.dateStr === todayStr;

          return (
            <div
              key={item.dateStr}
              className={`min-h-[90px] p-1.5 rounded-xl border flex flex-col justify-between transition ${
                isToday
                  ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded-full font-bold text-[11px] ${
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                  }`}
                >
                  {item.day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono font-semibold">
                    {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Task Chips */}
              <div className="space-y-1 overflow-y-auto max-h-[70px]">
                {dayTasks.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="w-full text-left p-1 rounded-md text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-800 truncate block border border-slate-200 transition cursor-pointer font-medium"
                    title={t.title}
                  >
                    • {t.title}
                  </button>
                ))}
                {dayTasks.length > 2 && (
                  <span className="text-[9px] text-blue-600 font-semibold block px-1">
                    +{dayTasks.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
