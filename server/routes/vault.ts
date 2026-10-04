import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { VaultCredential } from '../types.js';

export const vaultRouter = Router();

// GET all credentials permitted to current active user
vaultRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();
  const allCredentials = db.vaultCredentials || [];

  if (user.role === 'super_admin') {
    // Super Admin has master key access to all credentials & assignments
    return res.json({
      credentials: allCredentials,
      canManage: true,
    });
  }

  // Filter so user only receives credentials explicitly assigned to them or marked 'all'
  const permitted = allCredentials.filter((c) => {
    if (c.accessScope === 'all') return true;
    return c.assignedUserIds.includes(user.id);
  });

  res.json({
    credentials: permitted,
    canManage: false,
  });
});

// POST create credential (Super Admin only or authorized manager)
vaultRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin' && !user.permissions.settings.edit) {
    return res.status(403).json({ error: 'Only Super Admin can store or assign vault credentials' });
  }

  const { title, category, serviceUrl, username, password, recoveryNotes, assignedUserIds, accessScope } = req.body;
  if (!title || !username || !password) {
    return res.status(400).json({ error: 'Title, username, and password are required' });
  }

  const db = dbManager.get();
  const nextId = `VLT-${(db.vaultCredentials?.length || 0) + 101}`;

  const assigned = Array.isArray(assignedUserIds) ? assignedUserIds : [user.id];
  // Ensure creator/admin is always included
  if (!assigned.includes(user.id)) assigned.push(user.id);

  const newCredential: VaultCredential = {
    id: nextId,
    title,
    category: category || 'AI Tools',
    serviceUrl: serviceUrl || '',
    username,
    password,
    recoveryNotes: recoveryNotes || '',
    assignedUserIds: assigned,
    accessScope: accessScope || 'restricted',
    createdBy: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.vaultCredentials) db.vaultCredentials = [];
  db.vaultCredentials.unshift(newCredential);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Vault',
    details: `Created credential "${newCredential.title}" with access assigned to ${assigned.length} user(s).`,
  });

  res.status(201).json(newCredential);
});

// PUT update credential or reassign access (Super Admin only)
vaultRouter.put('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin' && !user.permissions.settings.edit) {
    return res.status(403).json({ error: 'Only Super Admin can update credentials or modify user assignments' });
  }

  const db = dbManager.get();
  const idx = (db.vaultCredentials || []).findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  const existing = db.vaultCredentials[idx];
  const { title, category, serviceUrl, username, password, recoveryNotes, assignedUserIds, accessScope } = req.body;

  const updated: VaultCredential = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    category: category !== undefined ? category : existing.category,
    serviceUrl: serviceUrl !== undefined ? serviceUrl : existing.serviceUrl,
    username: username !== undefined ? username : existing.username,
    password: password !== undefined ? password : existing.password,
    recoveryNotes: recoveryNotes !== undefined ? recoveryNotes : existing.recoveryNotes,
    assignedUserIds: Array.isArray(assignedUserIds) ? assignedUserIds : existing.assignedUserIds,
    accessScope: accessScope !== undefined ? accessScope : existing.accessScope,
    updatedAt: new Date().toISOString(),
  };

  db.vaultCredentials[idx] = updated;
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'Vault',
    details: `Updated credential "${updated.title}" access permissions (${updated.assignedUserIds.length} users granted).`,
  });

  res.json(updated);
});

// DELETE credential
vaultRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete credentials' });
  }

  const db = dbManager.get();
  const idx = (db.vaultCredentials || []).findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  const removed = db.vaultCredentials.splice(idx, 1)[0];
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'Vault',
    details: `Permanently removed credential "${removed.title}" (${removed.id}).`,
  });

  res.json({ success: true, id: req.params.id });
});

// Audit password access/copy action
vaultRouter.post('/:id/audit-access', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();
  const cred = (db.vaultCredentials || []).find((c) => c.id === req.params.id);
  if (!cred) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'LOGIN',
    resource: 'Vault',
    details: `${user.name} viewed/copied password for "${cred.title}" (${cred.username})`,
  });

  res.json({ success: true });
});
