import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { Client } from '../types.js';

export const clientsRouter = Router();

// GET all clients with associated project stats
clientsRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.clients.view) {
    return res.status(403).json({ error: 'Permission denied: cannot view clients' });
  }

  const db = dbManager.get();
  const result = db.clients.map((client) => {
    const clientProjects = db.projects.filter((p) => p.clientId === client.id);
    const totalContractValue = clientProjects.reduce((sum, p) => sum + p.contractValue, 0);
    const totalPaymentsReceived = clientProjects.reduce((sum, p) => sum + p.paymentsReceived, 0);
    const outstanding = Math.max(0, totalContractValue - totalPaymentsReceived);

    return {
      ...client,
      projectCount: clientProjects.length,
      projectNames: clientProjects.map((p) => p.name),
      financialSummary: user.permissions.canViewFinancials
        ? {
            totalContractValue,
            totalPaymentsReceived,
            outstanding,
          }
        : null,
    };
  });

  res.json(result);
});

// GET single client
clientsRouter.get('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.clients.view) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const db = dbManager.get();
  const client = db.clients.find((c) => c.id === req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const clientProjects = db.projects.filter((p) => p.clientId === client.id);
  const clientInvoices = db.invoices.filter((i) => i.clientId === client.id);

  res.json({
    client,
    projects: clientProjects,
    invoices: user.permissions.canViewFinancials ? clientInvoices : [],
  });
});

// POST create client
clientsRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.clients.create) {
    return res.status(403).json({ error: 'Permission denied: cannot create clients' });
  }

  const { company, contactPerson, email, phone, address, status, followUpDate, notes } = req.body;
  if (!company || !contactPerson || !email) {
    return res.status(400).json({ error: 'Company name, contact person, and email are required' });
  }

  const db = dbManager.get();
  const nextId = `CLI-${(db.clients.length + 101).toString()}`;

  const newClient: Client = {
    id: nextId,
    company,
    contactPerson,
    email,
    phone: phone || '',
    address: address || '',
    status: status || 'Lead',
    followUpDate: followUpDate || '',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.clients.unshift(newClient);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Clients',
    details: `Added new client account "${newClient.company}" (${newClient.id})`,
  });

  res.status(201).json(newClient);
});

// PUT update client
clientsRouter.put('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.clients.edit) {
    return res.status(403).json({ error: 'Permission denied: cannot edit clients' });
  }

  const db = dbManager.get();
  const idx = db.clients.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const existing = db.clients[idx];
  const { company, contactPerson, email, phone, address, status, followUpDate, notes } = req.body;

  const updated: Client = {
    ...existing,
    company: company !== undefined ? company : existing.company,
    contactPerson: contactPerson !== undefined ? contactPerson : existing.contactPerson,
    email: email !== undefined ? email : existing.email,
    phone: phone !== undefined ? phone : existing.phone,
    address: address !== undefined ? address : existing.address,
    status: status !== undefined ? status : existing.status,
    followUpDate: followUpDate !== undefined ? followUpDate : existing.followUpDate,
    notes: notes !== undefined ? notes : existing.notes,
  };

  db.clients[idx] = updated;
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'Clients',
    details: `Updated client profile "${updated.company}" (${updated.id})`,
  });

  res.json(updated);
});

// DELETE client
clientsRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.clients.delete) {
    return res.status(403).json({ error: 'Permission denied: cannot delete clients' });
  }

  const db = dbManager.get();
  const idx = db.clients.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const removed = db.clients.splice(idx, 1)[0];
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'Clients',
    details: `Deleted client account "${removed.company}" (${removed.id})`,
  });

  res.json({ success: true, id: req.params.id });
});
