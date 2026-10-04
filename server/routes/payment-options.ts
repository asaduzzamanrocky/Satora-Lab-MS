import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { ManualPaymentOption } from '../types.js';

export const paymentOptionsRouter = Router();

// GET all payment options
paymentOptionsRouter.get('/', (req: Request, res: Response) => {
  const db = dbManager.get();
  res.json(db.paymentOptions || []);
});

// POST create new manual payment option (Super Admin only)
paymentOptionsRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can add manual payment options' });
  }

  const { title, type, accountName, accountNumber, routingNumber, branch, instructions, isActive } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: 'Title and payment type are required' });
  }

  const db = dbManager.get();
  const nextId = `PAY-${(db.paymentOptions.length + 1).toString().padStart(3, '0')}`;

  const newOption: ManualPaymentOption = {
    id: nextId,
    title,
    type: type || 'bank',
    accountName: accountName || '',
    accountNumber: accountNumber || '',
    routingNumber: routingNumber || '',
    branch: branch || '',
    instructions: instructions || '',
    isActive: isActive !== undefined ? !!isActive : true,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };

  db.paymentOptions.push(newOption);

  // Also add title to settings.paymentMethods if not present
  if (!db.settings.paymentMethods.includes(newOption.title)) {
    db.settings.paymentMethods.push(newOption.title);
  }

  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'PaymentOptions',
    details: `Added manual payment option "${newOption.title}" (${newOption.type.toUpperCase()})`,
  });

  res.status(201).json(newOption);
});

// PUT update payment option (Super Admin only)
paymentOptionsRouter.put('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can modify payment options' });
  }

  const db = dbManager.get();
  const idx = db.paymentOptions.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Payment option not found' });
  }

  const existing = db.paymentOptions[idx];
  const { title, type, accountName, accountNumber, routingNumber, branch, instructions, isActive } = req.body;

  const updated: ManualPaymentOption = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    type: type !== undefined ? type : existing.type,
    accountName: accountName !== undefined ? accountName : existing.accountName,
    accountNumber: accountNumber !== undefined ? accountNumber : existing.accountNumber,
    routingNumber: routingNumber !== undefined ? routingNumber : existing.routingNumber,
    branch: branch !== undefined ? branch : existing.branch,
    instructions: instructions !== undefined ? instructions : existing.instructions,
    isActive: isActive !== undefined ? !!isActive : existing.isActive,
  };

  db.paymentOptions[idx] = updated;
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'PaymentOptions',
    details: `Updated payment option "${updated.title}"`,
  });

  res.json(updated);
});

// DELETE payment option (Super Admin only)
paymentOptionsRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete payment options' });
  }

  const db = dbManager.get();
  const idx = db.paymentOptions.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Payment option not found' });
  }

  const removed = db.paymentOptions.splice(idx, 1)[0];
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'PaymentOptions',
    details: `Removed payment option "${removed.title}"`,
  });

  res.json({ success: true, id: req.params.id });
});
