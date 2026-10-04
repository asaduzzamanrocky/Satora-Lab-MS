import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { Project } from '../types.js';

export const projectsRouter = Router();

// Helper to format financial project metrics
function decorateProject(p: Project, canViewFinancials: boolean) {
  const outstanding = Math.max(0, p.contractValue - p.paymentsReceived);
  const overpayment = Math.max(0, p.paymentsReceived - p.contractValue);
  const cashProfit = p.paymentsReceived - p.directCosts;
  const profitMargin = p.paymentsReceived > 0 ? ((cashProfit / p.paymentsReceived) * 100).toFixed(1) : 0;

  if (!canViewFinancials) {
    return {
      ...p,
      contractValue: 0,
      paymentsReceived: 0,
      directCosts: 0,
      outstandingPayment: 0,
      overpayment: 0,
      cashProfit: 0,
      profitMargin: 0,
      _financialsRedacted: true,
    };
  }

  return {
    ...p,
    outstandingPayment: outstanding,
    overpayment: overpayment,
    cashProfit: cashProfit,
    profitMargin: Number(profitMargin),
    _financialsRedacted: false,
  };
}

// GET all projects with server-enforced role restrictions
projectsRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.projects.view) {
    return res.status(403).json({ error: 'You do not have permission to view projects' });
  }

  const db = dbManager.get();
  let projects = db.projects;

  // Enforce projectScope
  if (user.permissions.projectScope === 'assigned_only' && user.employeeId) {
    projects = projects.filter(
      (p) => p.managerId === user.employeeId || p.assignedEmployeeIds.includes(user.employeeId!)
    );
  }

  const result = projects.map((p) => decorateProject(p, user.permissions.canViewFinancials));
  res.json(result);
});

// GET single project detail
projectsRouter.get('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.projects.view) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const db = dbManager.get();
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (
    user.permissions.projectScope === 'assigned_only' &&
    user.employeeId &&
    project.managerId !== user.employeeId &&
    !project.assignedEmployeeIds.includes(user.employeeId)
  ) {
    return res.status(403).json({ error: 'You do not have access to this project' });
  }

  const linkedTasks = db.tasks.filter((t) => t.projectId === project.id);
  const linkedTransactions = user.permissions.canViewFinancials
    ? db.transactions.filter((t) => t.projectId === project.id)
    : [];

  res.json({
    project: decorateProject(project, user.permissions.canViewFinancials),
    tasks: linkedTasks,
    transactions: linkedTransactions,
  });
});

// POST create project
projectsRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.projects.create) {
    return res.status(403).json({ error: 'Permission denied: cannot create projects' });
  }

  const {
    name,
    clientId,
    managerId,
    assignedEmployeeIds,
    startDate,
    deadline,
    status,
    progress,
    contractValue,
    directCosts,
    notes,
  } = req.body;

  if (!name || !clientId || !managerId || !deadline) {
    return res.status(400).json({ error: 'Project name, client, manager, and deadline are required' });
  }

  const db = dbManager.get();
  const nextNum = db.projects.length + 101;
  const newProject: Project = {
    id: `SL-PRJ-${nextNum}`,
    name,
    clientId,
    managerId,
    assignedEmployeeIds: Array.isArray(assignedEmployeeIds) ? assignedEmployeeIds : [managerId],
    startDate: startDate || new Date().toISOString().split('T')[0],
    deadline,
    status: status || 'Planning',
    progress: Number(progress) || 0,
    contractValue: Number(contractValue) || 0,
    paymentsReceived: 0,
    directCosts: Number(directCosts) || 0,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.projects.unshift(newProject);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Projects',
    details: `Created project "${newProject.name}" (ID: ${newProject.id}) with budget ৳${newProject.contractValue.toLocaleString()}`,
  });

  res.status(201).json(decorateProject(newProject, user.permissions.canViewFinancials));
});

// PUT update project
projectsRouter.put('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.projects.edit) {
    return res.status(403).json({ error: 'Permission denied: cannot edit projects' });
  }

  const db = dbManager.get();
  const idx = db.projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const existing = db.projects[idx];

  // If project manager with assigned_only, ensure they are assigned
  if (
    user.permissions.projectScope === 'assigned_only' &&
    user.employeeId &&
    existing.managerId !== user.employeeId &&
    !existing.assignedEmployeeIds.includes(user.employeeId)
  ) {
    return res.status(403).json({ error: 'Access denied to this project' });
  }

  const {
    name,
    clientId,
    managerId,
    assignedEmployeeIds,
    startDate,
    deadline,
    status,
    progress,
    contractValue,
    directCosts,
    notes,
  } = req.body;

  const updated: Project = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    clientId: clientId !== undefined ? clientId : existing.clientId,
    managerId: managerId !== undefined ? managerId : existing.managerId,
    assignedEmployeeIds: Array.isArray(assignedEmployeeIds) ? assignedEmployeeIds : existing.assignedEmployeeIds,
    startDate: startDate !== undefined ? startDate : existing.startDate,
    deadline: deadline !== undefined ? deadline : existing.deadline,
    status: status !== undefined ? status : existing.status,
    progress: progress !== undefined ? Number(progress) : existing.progress,
    // Only allow editing financials if user has financial view/edit rights
    contractValue: user.permissions.canViewFinancials && contractValue !== undefined ? Number(contractValue) : existing.contractValue,
    directCosts: user.permissions.canViewFinancials && directCosts !== undefined ? Number(directCosts) : existing.directCosts,
    notes: notes !== undefined ? notes : existing.notes,
  };

  db.projects[idx] = updated;
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'Projects',
    details: `Updated project "${updated.name}" (${updated.id}) - Status: ${updated.status}, Progress: ${updated.progress}%`,
  });

  res.json(decorateProject(updated, user.permissions.canViewFinancials));
});

// DELETE project (Admin only)
projectsRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.projects.delete) {
    return res.status(403).json({ error: 'Permission denied: cannot delete projects' });
  }

  const db = dbManager.get();
  const idx = db.projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const removed = db.projects.splice(idx, 1)[0];
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'Projects',
    details: `Deleted project "${removed.name}" (${removed.id})`,
  });

  res.json({ success: true, id: req.params.id });
});
