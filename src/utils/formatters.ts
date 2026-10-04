export function formatBDT(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '৳0';
  }
  // Format as Bangladesh Taka
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatDhakaDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Dhaka',
    });
  } catch {
    return dateStr;
  }
}

export function formatDhakaTime(dateStr?: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka',
    });
  } catch {
    return '';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'paid':
    case 'done':
    case 'active':
    case 'received':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    case 'in progress':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
    case 'review':
    case 'partial':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800';
    case 'planning':
    case 'to do':
    case 'pending':
    case 'lead':
    case 'sent':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    case 'on hold':
    case 'on leave':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 'cancelled':
    case 'overdue':
    case 'resigned':
    case 'inactive':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

export function getPriorityBadgeClass(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'bg-red-500 text-white font-semibold';
    case 'high':
      return 'bg-orange-500 text-white font-medium';
    case 'medium':
      return 'bg-blue-500 text-white font-medium';
    case 'low':
      return 'bg-slate-500 text-white font-normal';
    default:
      return 'bg-slate-400 text-white';
  }
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'bg-indigo-600 text-white font-semibold';
    case 'management':
      return 'bg-cyan-700 text-white font-medium';
    case 'finance':
      return 'bg-emerald-600 text-white font-medium';
    case 'hr':
      return 'bg-pink-600 text-white font-medium';
    case 'project_manager':
      return 'bg-blue-600 text-white font-medium';
    case 'team_member':
      return 'bg-slate-700 text-white font-medium';
    case 'viewer':
      return 'bg-gray-500 text-white font-medium';
    default:
      return 'bg-gray-600 text-white';
  }
}

export function roleDisplay(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'management':
      return 'Management';
    case 'finance':
      return 'Finance Controller';
    case 'hr':
      return 'People & HR';
    case 'project_manager':
      return 'Project Manager';
    case 'team_member':
      return 'Team Member';
    case 'viewer':
      return 'Viewer (Auditor)';
    default:
      return role;
  }
}
