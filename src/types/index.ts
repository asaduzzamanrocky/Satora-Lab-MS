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
  salary: number | null; // null if redacted for unauthorized role
  employmentStatus: 'Active' | 'On Leave' | 'Resigned';
  avatarUrl?: string;
  _salaryRedacted?: boolean;
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
  projectCount?: number;
  projectNames?: string[];
  financialSummary?: {
    totalContractValue: number;
    totalPaymentsReceived: number;
    outstanding: number;
  } | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  managerId: string;
  assignedEmployeeIds: string[];
  startDate: string;
  deadline: string;
  status: 'Planning' | 'In Progress' | 'Review' | 'Completed' | 'On Hold' | 'Cancelled';
  progress: number;
  contractValue: number;
  paymentsReceived: number;
  directCosts: number;
  outstandingPayment?: number;
  overpayment?: number;
  cashProfit?: number;
  profitMargin?: number;
  notes?: string;
  _financialsRedacted?: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description: string;
  assignedTo: string[];
  assigneeDetails?: { id: string; name: string; designation: string; avatarUrl?: string }[];
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  progress: number;
  startDate: string;
  dueDate: string;
  isOverdue?: boolean;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  date: string;
  projectId: string | null;
  isCompanyOverhead: boolean;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  paymentStatus: 'Paid' | 'Received' | 'Pending' | 'Partial';
  invoiceNumber?: string;
  employeeId?: string;
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
  action: string;
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

export interface MonthlyReportData {
  period: {
    year: number;
    month: number;
    monthFormatted: string;
  };
  monthly: {
    revenueReceived: number;
    directExpensesPaid: number;
    overheadExpensesPaid: number;
    payrollPaid: number;
    totalExpensesPaid: number;
    monthlyCashProfit: number;
    marginPercent: number | string;
    transactionsCount: number;
    categoryBreakdown: Record<string, number>;
  };
  companyAllTime: {
    allTimeRevenue: number;
    allTimeExpenses: number;
    companyNetCashProfit: number;
    totalContractValue: number;
    totalProjectPaymentsReceived: number;
    totalOutstandingPayments: number;
    totalOverpayments: number;
    totalOutstandingInvoices: number;
  };
  monthlyTrends: {
    monthYear: string;
    income: number;
    expenses: number;
    profit: number;
  }[];
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
  members: string[];
  description?: string;
  isPrivate?: boolean;
  createdBy: string;
  createdAt: string;
  messageCount?: number;
  lastMessage?: ChatMessage | null;
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
  targetUserId: string;
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
  assignedUserIds: string[];
  accessScope: 'all' | 'restricted';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
