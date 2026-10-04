export type UserRole =
  | 'super_admin'
  | 'management'
  | 'finance'
  | 'hr'
  | 'project_manager'
  | 'team_member'
  | 'viewer';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface UserPermissions {
  projects: ModulePermissions;
  employees: ModulePermissions;
  finance: ModulePermissions;
  tasks: ModulePermissions;
  clients: ModulePermissions;
  reports: { view: boolean; export: boolean };
  settings: { view: boolean; edit: boolean };
  canViewSalaries: boolean;
  canViewFinancials: boolean;
  projectScope: 'all' | 'assigned_only';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  permissions: UserPermissions;
  avatarUrl?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  role: UserRole;
  joiningDate: string;
  salary: number; // in BDT (restricted)
  employmentStatus: 'Active' | 'On Leave' | 'Resigned';
  avatarUrl?: string;
}

export interface Client {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: 'Lead' | 'Active' | 'Inactive';
  followUpDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string; // e.g. SL-PRJ-101
  name: string;
  clientId: string;
  managerId: string; // Employee ID or User ID
  assignedEmployeeIds: string[];
  startDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  status: 'Planning' | 'In Progress' | 'Review' | 'Completed' | 'On Hold' | 'Cancelled';
  progress: number; // 0 - 100
  contractValue: number; // in BDT
  paymentsReceived: number; // in BDT (cash in)
  directCosts: number; // in BDT (direct project expenses)
  notes?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo: string[]; // employee IDs
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  progress: number; // 0 - 100
  startDate: string;
  dueDate: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  date: string; // YYYY-MM-DD
  projectId: string | null; // null for company overhead
  isCompanyOverhead: boolean;
  category: string;
  description: string;
  amount: number; // in BDT
  paymentMethod: string;
  reference: string;
  paymentStatus: 'Paid' | 'Received' | 'Pending' | 'Partial';
  invoiceNumber?: string;
  employeeId?: string; // If payroll
  clientName?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Partial' | 'Overdue';
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ROLE_CHANGE' | 'LOGIN' | 'SHEET_IMPORT' | 'PAYROLL_EXECUTE';
  resource: string;
  details: string;
}

export interface CompanySettings {
  name: string;
  tagline: string;
  logoUrl: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  statuses: string[];
  expenseCategories: string[];
  paymentMethods: string[];
  departments: string[];
}

export interface ManualPaymentOption {
  id: string;
  title: string;
  type: 'bank' | 'mfs' | 'cash' | 'card' | 'other';
  accountName?: string;
  accountNumber?: string;
  routingNumber?: string;
  branch?: string;
  instructions?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'public_channel' | 'project' | 'direct' | 'announcement';
  projectId?: string;
  members: string[]; // user IDs or '*' for public
  description?: string;
  isPrivate?: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  text: string;
  attachments?: { name: string; url: string; size?: string }[];
  replyToId?: string;
  createdAt: string;
}

export interface MessageRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  targetUserId: string; // e.g. Admin or PM
  subject: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  channelId?: string;
  createdAt: string;
}

export interface VaultCredential {
  id: string;
  title: string;
  category: 'AI Tools' | 'Cloud & Hosting' | 'Development & Git' | 'Design & Media' | 'Banking & Gateway' | 'General';
  serviceUrl?: string;
  username: string;
  password: string;
  recoveryNotes?: string;
  assignedUserIds: string[]; // Specific users permitted to view username/password
  accessScope: 'all' | 'restricted';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  settings: CompanySettings;
  users: User[];
  employees: Employee[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  transactions: Transaction[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  paymentOptions: ManualPaymentOption[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  messageRequests: MessageRequest[];
  vaultCredentials: VaultCredential[];
}
