import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';

export const settingsRouter = Router();

// GET settings and audit logs
settingsRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();

  res.json({
    settings: db.settings,
    auditLogs: user.role === 'super_admin' ? db.auditLogs : db.auditLogs.slice(0, 10),
  });
});

// PUT update company settings (Super Admin only)
settingsRouter.put('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin' && !user.permissions.settings.edit) {
    return res.status(403).json({ error: 'Permission denied: Super Admin privileges required' });
  }

  const db = dbManager.get();
  const {
    name,
    tagline,
    logoUrl,
    currency,
    currencySymbol,
    timezone,
    address,
    phone,
    email,
    taxId,
    statuses,
    expenseCategories,
    paymentMethods,
    departments,
  } = req.body;

  db.settings = {
    ...db.settings,
    name: name || db.settings.name,
    tagline: tagline !== undefined ? tagline : db.settings.tagline,
    logoUrl: logoUrl || db.settings.logoUrl,
    currency: currency || db.settings.currency,
    currencySymbol: currencySymbol || db.settings.currencySymbol,
    timezone: timezone || db.settings.timezone,
    address: address !== undefined ? address : db.settings.address,
    phone: phone !== undefined ? phone : db.settings.phone,
    email: email !== undefined ? email : db.settings.email,
    taxId: taxId !== undefined ? taxId : db.settings.taxId,
    statuses: Array.isArray(statuses) ? statuses : db.settings.statuses,
    expenseCategories: Array.isArray(expenseCategories) ? expenseCategories : db.settings.expenseCategories,
    paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : db.settings.paymentMethods,
    departments: Array.isArray(departments) ? departments : db.settings.departments,
  };

  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'Settings',
    details: 'Updated company system configurations and branding settings.',
  });

  res.json(db.settings);
});

// POST reset to defaults (Super Admin only)
settingsRouter.post('/reset-defaults', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can reset the database' });
  }

  const resetData = dbManager.resetToDefaults();

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'System',
    details: 'Reset entire platform database to default Satora Lab seed.',
  });

  res.json({ success: true, message: 'Database reset to initial sample data', data: resetData });
});

// POST offline sync queue
settingsRouter.post('/sync', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const { queue } = req.body;

  if (!Array.isArray(queue) || queue.length === 0) {
    return res.json({ syncedCount: 0, currentData: dbManager.get() });
  }

  const db = dbManager.get();
  let appliedCount = 0;

  for (const item of queue) {
    try {
      const { action, resource, payload } = item;
      if (resource === 'tasks') {
        if (action === 'UPDATE' && payload?.id) {
          const idx = db.tasks.findIndex((t) => t.id === payload.id);
          if (idx !== -1) {
            db.tasks[idx] = { ...db.tasks[idx], ...payload };
            appliedCount++;
          }
        } else if (action === 'CREATE' && payload) {
          db.tasks.unshift({
            ...payload,
            id: payload.id || `TSK-${Date.now().toString(36).toUpperCase()}`,
            createdAt: new Date().toISOString(),
          });
          appliedCount++;
        }
      } else if (resource === 'projects') {
        if (action === 'UPDATE' && payload?.id) {
          const idx = db.projects.findIndex((p) => p.id === payload.id);
          if (idx !== -1) {
            db.projects[idx] = { ...db.projects[idx], ...payload };
            appliedCount++;
          }
        }
      }
    } catch (err) {
      console.error('Failed to apply sync item:', err);
    }
  }

  if (appliedCount > 0) {
    dbManager.save(db);
    dbManager.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE',
      resource: 'Sync',
      details: `Processed offline sync batch: ${appliedCount} updates applied successfully`,
    });
  }

  res.json({ syncedCount: appliedCount, message: 'Sync completed successfully' });
});
