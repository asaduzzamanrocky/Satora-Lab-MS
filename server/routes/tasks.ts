import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { Task } from '../types.js';

export const tasksRouter = Router();

// GET tasks with project & overdue metadata
tasksRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.tasks.view) {
    return res.status(403).json({ error: 'Permission denied: cannot view tasks' });
  }

  const db = dbManager.get();
  let tasks = db.tasks;

  // Filter if user has assigned_only project scope
  if (user.permissions.projectScope === 'assigned_only' && user.employeeId) {
    const userProjects = db.projects
      .filter((p) => p.managerId === user.employeeId || p.assignedEmployeeIds.includes(user.employeeId!))
      .map((p) => p.id);

    tasks = tasks.filter(
      (t) => t.assignedTo.includes(user.employeeId!) || userProjects.includes(t.projectId)
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const enrichedTasks = tasks.map((t) => {
    const project = db.projects.find((p) => p.id === t.projectId);
    const isOverdue = t.status !== 'Done' && t.dueDate < todayStr;
    const assignees = db.employees
      .filter((e) => t.assignedTo.includes(e.id))
      .map((e) => ({ id: e.id, name: e.name, designation: e.designation, avatarUrl: e.avatarUrl }));

    return {
      ...t,
      projectName: project ? project.name : 'Unknown Project',
      isOverdue,
      assigneeDetails: assignees,
    };
  });

  res.json(enrichedTasks);
});

// POST create task
tasksRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.tasks.create) {
    return res.status(403).json({ error: 'Permission denied: cannot create tasks' });
  }

  const { projectId, title, description, assignedTo, priority, status, progress, startDate, dueDate, notes } = req.body;
  if (!projectId || !title || !dueDate) {
    return res.status(400).json({ error: 'Project, title, and due date are required' });
  }

  const db = dbManager.get();
  const nextId = `TSK-${(db.tasks.length + 101).toString()}`;

  const newTask: Task = {
    id: nextId,
    projectId,
    title,
    description: description || '',
    assignedTo: Array.isArray(assignedTo) ? assignedTo : (user.employeeId ? [user.employeeId] : []),
    priority: priority || 'Medium',
    status: status || 'To Do',
    progress: Number(progress) || 0,
    startDate: startDate || new Date().toISOString().split('T')[0],
    dueDate,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.tasks.unshift(newTask);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Tasks',
    details: `Created task "${newTask.title}" for project ${newTask.projectId}`,
  });

  res.status(201).json(newTask);
});

// PUT update task
tasksRouter.put('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.tasks.edit) {
    return res.status(403).json({ error: 'Permission denied: cannot edit tasks' });
  }

  const db = dbManager.get();
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const existing = db.tasks[idx];
  const { projectId, title, description, assignedTo, priority, status, progress, startDate, dueDate, notes } = req.body;

  const newProgress = status === 'Done' ? 100 : (progress !== undefined ? Number(progress) : existing.progress);

  const updated: Task = {
    ...existing,
    projectId: projectId !== undefined ? projectId : existing.projectId,
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    assignedTo: Array.isArray(assignedTo) ? assignedTo : existing.assignedTo,
    priority: priority !== undefined ? priority : existing.priority,
    status: status !== undefined ? status : existing.status,
    progress: newProgress,
    startDate: startDate !== undefined ? startDate : existing.startDate,
    dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
    notes: notes !== undefined ? notes : existing.notes,
  };

  db.tasks[idx] = updated;
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'Tasks',
    details: `Updated task "${updated.title}" -> Status: ${updated.status} (${updated.progress}%)`,
  });

  res.json(updated);
});

// DELETE task
tasksRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.tasks.delete) {
    return res.status(403).json({ error: 'Permission denied: cannot delete tasks' });
  }

  const db = dbManager.get();
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const removed = db.tasks.splice(idx, 1)[0];
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'Tasks',
    details: `Deleted task "${removed.title}" (${removed.id})`,
  });

  res.json({ success: true, id: req.params.id });
});
