import {
  User,
  Project,
  Employee,
  Client,
  Task,
  Transaction,
  Invoice,
  CompanySettings,
  AuditLog,
  MonthlyReportData,
  ManualPaymentOption,
  ChatChannel,
  ChatMessage,
  MessageRequest,
  VaultCredential,
} from '../types';

let currentUserId: string = localStorage.getItem('satora_user_id') || 'USR-001';

export function setCurrentUserId(userId: string) {
  currentUserId = userId;
  localStorage.setItem('satora_user_id', userId);
}

export function getCurrentUserId(): string {
  return currentUserId;
}

// Offline queue management
interface QueuedItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: string;
  payload: any;
  timestamp: string;
}

export function getOfflineQueue(): QueuedItem[] {
  try {
    const raw = localStorage.getItem('satora_offline_queue');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: QueuedItem[]) {
  localStorage.setItem('satora_offline_queue', JSON.stringify(queue));
}

export function addToOfflineQueue(item: Omit<QueuedItem, 'id' | 'timestamp'>) {
  const queue = getOfflineQueue();
  queue.push({
    ...item,
    id: `QUEUE-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  saveOfflineQueue(queue);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-id', currentUserId);

  try {
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP error ${res.status}`);
    }

    return (await res.json()) as T;
  } catch (error: any) {
    // If offline and request is a mutation, buffer into queue
    if (!navigator.onLine && options.method && options.method !== 'GET') {
      const parts = endpoint.split('/');
      const resource = parts[1] || 'general';
      const action = options.method === 'POST' ? 'CREATE' : options.method === 'PUT' ? 'UPDATE' : 'DELETE';
      const payload = options.body ? JSON.parse(options.body as string) : {};

      addToOfflineQueue({
        action,
        resource,
        payload,
      });

      console.warn(`[Offline Mode] Queued ${action} on /${resource} for sync.`);
      // Return simulated success so UI stays responsive
      return payload as T;
    }
    throw error;
  }
}

export const api = {
  // Auth & RBAC
  getMe: () => request<{ user: User; allUsers: { id: string; name: string; email: string; role: string; avatarUrl?: string }[] }>('/auth/me'),
  switchUser: (userId: string) => {
    setCurrentUserId(userId);
    return request<{ user: User }>('/auth/switch', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
  getUsers: () => request<User[]>('/auth/users'),
  inviteUser: (data: { name: string; email: string; role: string; employeeId?: string; customPermissions?: any }) =>
    request<User>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User>) =>
    request<User>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<{ project: Project; tasks: Task[]; transactions: Transaction[] }>(`/projects/${id}`),
  createProject: (data: Partial<Project>) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<{ success: boolean; id: string }>(`/projects/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: () => request<Employee[]>('/employees'),
  getEmployee: (id: string) => request<Employee>(`/employees/${id}`),
  createEmployee: (data: Partial<Employee>) => request<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<Employee>) => request<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) => request<{ success: boolean; id: string }>(`/employees/${id}`, { method: 'DELETE' }),
  disbursePayroll: (id: string, data: { monthYear?: string; paymentMethod?: string; reference?: string }) =>
    request<{ success: boolean; transaction: Transaction }>(`/employees/${id}/disburse-payroll`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Clients
  getClients: () => request<Client[]>('/clients'),
  getClient: (id: string) => request<{ client: Client; projects: Project[]; invoices: Invoice[] }>(`/clients/${id}`),
  createClient: (data: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<Client>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: string) => request<{ success: boolean; id: string }>(`/clients/${id}`, { method: 'DELETE' }),

  // Transactions & Finance
  getTransactions: () =>
    request<{
      transactions: Transaction[];
      invoices: Invoice[];
      categories: string[];
      paymentMethods: string[];
    }>('/transactions'),
  createTransaction: (data: Partial<Transaction>) => request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: Partial<Transaction>) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => request<{ success: boolean; id: string }>(`/transactions/${id}`, { method: 'DELETE' }),
  createInvoice: (data: any) => request<Invoice>('/transactions/invoices', { method: 'POST', body: JSON.stringify(data) }),
  recordInvoicePayment: (invoiceId: string, data: { amount: number; paymentMethod?: string; reference?: string; date?: string; notes?: string }) =>
    request<{ invoice: Invoice; transaction: Transaction }>(`/transactions/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: () => request<Task[]>('/tasks'),
  createTask: (data: Partial<Task>) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) => request<{ success: boolean; id: string }>(`/tasks/${id}`, { method: 'DELETE' }),

  // Reports
  getMonthlyReport: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month.toString());
    if (year) params.set('year', year.toString());
    return request<MonthlyReportData>(`/reports/monthly?${params.toString()}`);
  },

  // Settings & System
  getSettings: () => request<{ settings: CompanySettings; auditLogs: AuditLog[] }>('/settings'),
  updateSettings: (data: Partial<CompanySettings>) => request<CompanySettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  resetDefaults: () => request<{ success: boolean; message: string }>('/settings/reset-defaults', { method: 'POST' }),

  // Offline Sync
  syncOfflineQueue: async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return { syncedCount: 0 };
    const res = await request<{ syncedCount: number; message: string }>('/settings/sync', {
      method: 'POST',
      body: JSON.stringify({ queue }),
    });
    saveOfflineQueue([]);
    return res;
  },

  // Migration & CSV
  getMigrationDocs: () => request<any>('/migrate/docs'),
  importSheetCSV: (targetType: string, csvData: string) =>
    request<{ success: boolean; importedCount: number; message: string }>('/migrate/import', {
      method: 'POST',
      body: JSON.stringify({ targetType, csvData }),
    }),

  // Manual Payment Options (Super Admin)
  getPaymentOptions: () => request<ManualPaymentOption[]>('/payment-options'),
  createPaymentOption: (data: Partial<ManualPaymentOption>) =>
    request<ManualPaymentOption>('/payment-options', { method: 'POST', body: JSON.stringify(data) }),
  updatePaymentOption: (id: string, data: Partial<ManualPaymentOption>) =>
    request<ManualPaymentOption>(`/payment-options/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePaymentOption: (id: string) => request<{ success: boolean; id: string }>(`/payment-options/${id}`, { method: 'DELETE' }),

  // Chat & Messaging (Slack + HubSpot style)
  getChannels: () => request<ChatChannel[]>('/chat/channels'),
  createChannel: (data: Partial<ChatChannel>) =>
    request<ChatChannel>('/chat/channels', { method: 'POST', body: JSON.stringify(data) }),
  getMessages: (channelId: string) => request<ChatMessage[]>(`/chat/channels/${channelId}/messages`),
  sendMessage: (channelId: string, data: { text: string; attachments?: any[]; replyToId?: string }) =>
    request<ChatMessage>(`/chat/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  getMessageRequests: () => request<MessageRequest[]>('/chat/requests'),
  createMessageRequest: (data: { targetUserId?: string; subject: string; message: string }) =>
    request<MessageRequest>('/chat/requests', { method: 'POST', body: JSON.stringify(data) }),
  respondMessageRequest: (id: string, status: 'accepted' | 'declined') =>
    request<MessageRequest>(`/chat/requests/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Password / Credentials Vault (Bitwarden style with assigned permissions)
  getVaultCredentials: () => request<{ credentials: VaultCredential[]; canManage: boolean }>('/vault'),
  createVaultCredential: (data: Partial<VaultCredential>) =>
    request<VaultCredential>('/vault', { method: 'POST', body: JSON.stringify(data) }),
  updateVaultCredential: (id: string, data: Partial<VaultCredential>) =>
    request<VaultCredential>(`/vault/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVaultCredential: (id: string) =>
    request<{ success: boolean; id: string }>(`/vault/${id}`, { method: 'DELETE' }),
  auditVaultAccess: (id: string) =>
    request<{ success: boolean }>(`/vault/${id}/audit-access`, { method: 'POST' }),
};
