import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { Employee, Transaction } from '../types.js';

export const employeesRouter = Router();

function sanitizeEmployee(emp: Employee, canViewSalaries: boolean) {
  if (!canViewSalaries) {
    const { salary, ...rest } = emp;
    return {
      ...rest,
      salary: null,
      _salaryRedacted: true,
    };
  }
  return {
    ...emp,
    _salaryRedacted: false,
  };
}

// GET all employees
employeesRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.employees.view) {
    return res.status(403).json({ error: 'Permission denied: cannot view employee directory' });
  }

  const db = dbManager.get();
  const result = db.employees.map((e) => sanitizeEmployee(e, user.permissions.canViewSalaries));
  res.json(result);
});

// GET single employee
employeesRouter.get('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.employees.view) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const db = dbManager.get();
  const emp = db.employees.find((e) => e.id === req.params.id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json(sanitizeEmployee(emp, user.permissions.canViewSalaries));
});

// POST create employee
employeesRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.employees.create) {
    return res.status(403).json({ error: 'Permission denied: cannot create employee records' });
  }

  const { name, designation, department, email, phone, role, joiningDate, salary, employmentStatus } = req.body;
  if (!name || !designation || !email) {
    return res.status(400).json({ error: 'Name, designation, and email are required' });
  }

  const db = dbManager.get();
  const nextId = `EMP-${(db.employees.length + 1).toString().padStart(3, '0')}`;

  const newEmp: Employee = {
    id: nextId,
    name,
    designation,
    department: department || 'Engineering',
    email,
    phone: phone || '',
    role: role || 'team_member',
    joiningDate: joiningDate || new Date().toISOString().split('T')[0],
    salary: user.permissions.canViewSalaries && salary ? Number(salary) : 0,
    employmentStatus: employmentStatus || 'Active',
  };

  db.employees.push(newEmp);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Employees',
    details: `Added new employee ${newEmp.name} (${newEmp.id}) as ${newEmp.designation}`,
  });

  res.status(201).json(sanitizeEmployee(newEmp, user.permissions.canViewSalaries));
});

// PUT update employee
employeesRouter.put('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.employees.edit) {
    return res.status(403).json({ error: 'Permission denied: cannot edit employee records' });
  }

  const db = dbManager.get();
  const idx = db.employees.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const existing = db.employees[idx];
  const { name, designation, department, email, phone, role, joiningDate, salary, employmentStatus } = req.body;

  // Salary can only be modified if user has canViewSalaries
  const newSalary = user.permissions.canViewSalaries && salary !== undefined ? Number(salary) : existing.salary;

  const updated: Employee = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    designation: designation !== undefined ? designation : existing.designation,
    department: department !== undefined ? department : existing.department,
    email: email !== undefined ? email : existing.email,
    phone: phone !== undefined ? phone : existing.phone,
    role: role !== undefined ? role : existing.role,
    joiningDate: joiningDate !== undefined ? joiningDate : existing.joiningDate,
    salary: newSalary,
    employmentStatus: employmentStatus !== undefined ? employmentStatus : existing.employmentStatus,
  };

  db.employees[idx] = updated;
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'Employees',
    details: `Updated employee record for ${updated.name} (${updated.id})`,
  });

  res.json(sanitizeEmployee(updated, user.permissions.canViewSalaries));
});

// DELETE employee
employeesRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.employees.delete) {
    return res.status(403).json({ error: 'Permission denied: cannot delete employees' });
  }

  const db = dbManager.get();
  const idx = db.employees.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const removed = db.employees.splice(idx, 1)[0];
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'Employees',
    details: `Removed employee record ${removed.name} (${removed.id})`,
  });

  res.json({ success: true, id: req.params.id });
});

// Disburse individual salary payroll expense
employeesRouter.post('/:id/disburse-payroll', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.canViewSalaries || (!user.permissions.finance.create && user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Only authorized HR or Finance personnel can disburse payroll' });
  }

  const db = dbManager.get();
  const emp = db.employees.find((e) => e.id === req.params.id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const { monthYear, paymentMethod, reference } = req.body;
  const targetPeriod = monthYear || new Date().toISOString().slice(0, 7); // YYYY-MM

  const newTx: Transaction = {
    id: `TRX-${Date.now().toString(36).toUpperCase()}`,
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    projectId: null,
    isCompanyOverhead: true,
    category: 'Payroll',
    description: `Monthly salary payout for ${emp.name} (${targetPeriod})`,
    amount: emp.salary,
    paymentMethod: paymentMethod || 'Bank Transfer (BRAC Bank)',
    reference: reference || `SALARY-${emp.id}-${targetPeriod}`,
    paymentStatus: 'Paid',
    employeeId: emp.id,
    createdAt: new Date().toISOString(),
  };

  db.transactions.unshift(newTx);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'PAYROLL_EXECUTE',
    resource: 'Finance',
    details: `Disbursed monthly payroll ৳${emp.salary.toLocaleString()} to ${emp.name} (${targetPeriod})`,
  });

  res.status(201).json({ success: true, transaction: newTx });
});
