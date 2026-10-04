import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { Project, Employee, Client, Transaction, Task } from '../types.js';

export const migrationRouter = Router();

// Helper to parse simple CSV
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

// Migration documentation & schema mapping guide
migrationRouter.get('/docs', (_req: Request, res: Response) => {
  res.json({
    title: 'Satora Lab Google Sheets Migration Guide',
    description: 'Guidelines and column mappings for importing data from your existing Google Sheets tracking system.',
    supportedSheets: [
      {
        sheetName: 'Projects',
        requiredColumns: ['Name', 'Client', 'Manager', 'Deadline'],
        optionalColumns: ['Project ID', 'Start Date', 'Status', 'Progress', 'Contract Value', 'Direct Costs', 'Notes'],
        example: 'Name,Client,Manager,Deadline,Contract Value,Status\n"Portal Dev","CLI-101","EMP-005","2026-11-30",1500000,"In Progress"',
      },
      {
        sheetName: 'Transactions',
        requiredColumns: ['Date', 'Type', 'Amount', 'Category'],
        optionalColumns: ['Description', 'Payment Method', 'Reference', 'Project ID', 'Status'],
        example: 'Date,Type,Amount,Category,Description\n"2026-10-01","income",250000,"Client Payment","Initial deposit"',
      },
      {
        sheetName: 'Employees',
        requiredColumns: ['Name', 'Designation', 'Email'],
        optionalColumns: ['Department', 'Phone', 'Role', 'Joining Date', 'Salary', 'Status'],
        example: 'Name,Designation,Email,Salary\n"Rahim Uddin","Full Stack Dev","rahim@satoralab.com",90000',
      },
      {
        sheetName: 'Clients',
        requiredColumns: ['Company', 'Contact Person', 'Email'],
        optionalColumns: ['Phone', 'Address', 'Status', 'Notes'],
        example: 'Company,Contact Person,Email,Status\n"Acme Corp","John Doe","john@acme.com","Active"',
      },
      {
        sheetName: 'Tasks',
        requiredColumns: ['Title', 'Project ID', 'Due Date'],
        optionalColumns: ['Description', 'Priority', 'Status', 'Progress'],
        example: 'Title,Project ID,Due Date,Priority\n"API Integration","SL-PRJ-101","2026-10-15","High"',
      },
    ],
  });
});

// Download sample CSV template for any resource
migrationRouter.get('/template/:resource', (req: Request, res: Response) => {
  const { resource } = req.params;
  let csv = '';

  switch (resource) {
    case 'projects':
      csv = 'Name,Client ID,Manager ID,Start Date,Deadline,Status,Progress,Contract Value (BDT),Direct Costs (BDT),Notes\n"E-Commerce Mobile App","CLI-101","EMP-005","2026-10-01","2026-12-31","In Progress",40,1800000,250000,"Migrated from legacy sheet"';
      break;
    case 'transactions':
      csv = 'Date,Type,Category,Description,Amount (BDT),Payment Method,Reference,Project ID,Status\n"2026-10-01","income","Client Payment","Milestone 1 Payment",500000,"Bank Transfer (BRAC Bank)","BRAC-0918","SL-PRJ-101","Received"\n"2026-10-02","expense","Software & Cloud Services","AWS Servers",45000,"Corporate Card","AWS-0012",,"Paid"';
      break;
    case 'employees':
      csv = 'Name,Designation,Department,Email,Phone,Role,Joining Date,Monthly Salary (BDT),Status\n"Al Amin","Frontend Engineer","Engineering","alamin@satoralab.com","+880 1711-112233","team_member","2025-06-01",95000,"Active"';
      break;
    case 'clients':
      csv = 'Company,Contact Person,Email,Phone,Address,Status,Notes\n"RoboTech Solutions","Sadik Hossain","sadik@robotech.bd","+880 1712-445566","Dhanmondi, Dhaka","Active","New enterprise partner"';
      break;
    case 'tasks':
      csv = 'Project ID,Title,Description,Priority,Status,Progress,Due Date\n"SL-PRJ-101","Design Database Schema","PostgreSQL architecture design","High","In Progress",60,"2026-10-15"';
      break;
    default:
      return res.status(400).send('Invalid resource type');
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="satora-${resource}-template.csv"`);
  res.send(csv);
});

// Import Google Sheets CSV data
migrationRouter.post('/import', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin' && !user.permissions.settings.edit) {
    return res.status(403).json({ error: 'Only Super Admin can import data' });
  }

  const { targetType, csvData } = req.body;
  if (!targetType || !csvData) {
    return res.status(400).json({ error: 'Target type and CSV data are required' });
  }

  const parsed = parseCSV(csvData);
  if (parsed.rows.length === 0) {
    return res.status(400).json({ error: 'No data rows found in CSV' });
  }

  const db = dbManager.get();
  let importedCount = 0;

  if (targetType === 'projects') {
    for (const r of parsed.rows) {
      const name = r.name || r.projectname || r.title;
      if (!name) continue;
      const nextId = `SL-PRJ-${db.projects.length + 101}`;
      const project: Project = {
        id: r.id || r.projectid || nextId,
        name,
        clientId: r.clientid || r.client || db.clients[0]?.id || 'CLI-101',
        managerId: r.managerid || r.manager || db.employees[0]?.id || 'EMP-001',
        assignedEmployeeIds: [db.employees[0]?.id || 'EMP-001'],
        startDate: r.startdate || new Date().toISOString().split('T')[0],
        deadline: r.deadline || r.duedate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: (r.status as any) || 'In Progress',
        progress: Number(r.progress) || 0,
        contractValue: Number(r.contractvalue || r.budget || r.value) || 0,
        paymentsReceived: Number(r.paymentsreceived || r.received) || 0,
        directCosts: Number(r.directcosts || r.costs || r.expenses) || 0,
        notes: r.notes || 'Imported from Google Sheets',
        createdAt: new Date().toISOString(),
      };
      db.projects.push(project);
      importedCount++;
    }
  } else if (targetType === 'transactions') {
    for (const r of parsed.rows) {
      const type = (r.type || 'expense').toLowerCase().includes('inc') ? 'income' : 'expense';
      const amount = Number(r.amount || r.value || r.total) || 0;
      if (amount <= 0) continue;

      const newTx: Transaction = {
        id: `TRX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        type,
        date: r.date || new Date().toISOString().split('T')[0],
        projectId: r.projectid || null,
        isCompanyOverhead: !r.projectid,
        category: r.category || (type === 'income' ? 'Client Payment' : 'Miscellaneous Overhead'),
        description: r.description || r.memo || 'Imported transaction',
        amount,
        paymentMethod: r.paymentmethod || db.settings.paymentMethods[0],
        reference: r.reference || r.ref || 'SHEET-IMPORT',
        paymentStatus: (r.status as any) || (type === 'income' ? 'Received' : 'Paid'),
        createdAt: new Date().toISOString(),
      };
      db.transactions.unshift(newTx);
      importedCount++;
    }
  } else if (targetType === 'employees') {
    for (const r of parsed.rows) {
      const name = r.name;
      if (!name) continue;
      const nextId = `EMP-${(db.employees.length + 1).toString().padStart(3, '0')}`;
      const emp: Employee = {
        id: r.id || nextId,
        name,
        designation: r.designation || r.title || 'Engineer',
        department: r.department || 'Engineering',
        email: r.email || `${name.toLowerCase().replace(/\s+/g, '.')}@satoralab.com`,
        phone: r.phone || '',
        role: (r.role as any) || 'team_member',
        joiningDate: r.joiningdate || new Date().toISOString().split('T')[0],
        salary: Number(r.salary) || 80000,
        employmentStatus: (r.status as any) || 'Active',
      };
      db.employees.push(emp);
      importedCount++;
    }
  } else if (targetType === 'clients') {
    for (const r of parsed.rows) {
      const company = r.company || r.name;
      if (!company) continue;
      const nextId = `CLI-${db.clients.length + 101}`;
      const client: Client = {
        id: r.id || nextId,
        company,
        contactPerson: r.contactperson || r.contact || company,
        email: r.email || `contact@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        phone: r.phone || '',
        address: r.address || 'Dhaka, Bangladesh',
        status: (r.status as any) || 'Active',
        notes: r.notes || 'Imported from Google Sheets',
        createdAt: new Date().toISOString(),
      };
      db.clients.push(client);
      importedCount++;
    }
  } else if (targetType === 'tasks') {
    for (const r of parsed.rows) {
      const title = r.title || r.name || r.task;
      if (!title) continue;
      const nextId = `TSK-${db.tasks.length + 101}`;
      const task: Task = {
        id: r.id || nextId,
        projectId: r.projectid || db.projects[0]?.id || 'SL-PRJ-101',
        title,
        description: r.description || '',
        assignedTo: r.assignedto ? [r.assignedto] : [db.employees[0]?.id || 'EMP-001'],
        priority: (r.priority as any) || 'Medium',
        status: (r.status as any) || 'To Do',
        progress: Number(r.progress) || 0,
        startDate: r.startdate || new Date().toISOString().split('T')[0],
        dueDate: r.duedate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: r.notes || '',
        createdAt: new Date().toISOString(),
      };
      db.tasks.push(task);
      importedCount++;
    }
  }

  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SHEET_IMPORT',
    resource: targetType.toUpperCase(),
    details: `Imported ${importedCount} records from Google Sheets CSV into ${targetType}`,
  });

  res.json({
    success: true,
    targetType,
    importedCount,
    message: `Successfully imported ${importedCount} records into ${targetType}`,
  });
});
