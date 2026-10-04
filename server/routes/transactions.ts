import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { Transaction, Invoice } from '../types.js';

export const transactionsRouter = Router();

// Recompute project paymentsReceived & directCosts from logged transactions
function syncProjectFinancials() {
  const db = dbManager.get();
  const projectMap: Record<string, { paymentsReceived: number; directCosts: number }> = {};

  for (const p of db.projects) {
    projectMap[p.id] = { paymentsReceived: 0, directCosts: 0 };
  }

  for (const tx of db.transactions) {
    if (tx.projectId && projectMap[tx.projectId]) {
      if (tx.type === 'income' && (tx.paymentStatus === 'Received' || tx.paymentStatus === 'Paid')) {
        projectMap[tx.projectId].paymentsReceived += tx.amount;
      } else if (tx.type === 'expense' && !tx.isCompanyOverhead && (tx.paymentStatus === 'Paid' || tx.paymentStatus === 'Received')) {
        projectMap[tx.projectId].directCosts += tx.amount;
      }
    }
  }

  // Update projects without mutating contractValue
  for (const p of db.projects) {
    if (projectMap[p.id]) {
      p.paymentsReceived = projectMap[p.id].paymentsReceived;
      p.directCosts = projectMap[p.id].directCosts;
    }
  }
}

// GET transactions
transactionsRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.view) {
    return res.status(403).json({ error: 'Permission denied: cannot access financial records' });
  }

  const db = dbManager.get();
  res.json({
    transactions: db.transactions,
    invoices: db.invoices,
    categories: db.settings.expenseCategories,
    paymentMethods: db.settings.paymentMethods,
  });
});

// POST transaction (Income or Expense)
transactionsRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.create) {
    return res.status(403).json({ error: 'Permission denied: cannot create transactions' });
  }

  const {
    type,
    date,
    projectId,
    isCompanyOverhead,
    category,
    description,
    amount,
    paymentMethod,
    reference,
    paymentStatus,
    invoiceNumber,
    clientName,
    employeeId,
  } = req.body;

  if (!type || !date || !amount || !category) {
    return res.status(400).json({ error: 'Type, date, amount, and category are required' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const db = dbManager.get();
  const newTx: Transaction = {
    id: `TRX-${new Date().getFullYear()}-${(db.transactions.length + 1).toString().padStart(3, '0')}`,
    type: type === 'income' ? 'income' : 'expense',
    date,
    projectId: projectId || null,
    isCompanyOverhead: !!isCompanyOverhead,
    category,
    description: description || '',
    amount: numAmount,
    paymentMethod: paymentMethod || db.settings.paymentMethods[0],
    reference: reference || `REF-${Date.now().toString().slice(-6)}`,
    paymentStatus: paymentStatus || (type === 'income' ? 'Received' : 'Paid'),
    invoiceNumber: invoiceNumber || undefined,
    clientName: clientName || undefined,
    employeeId: employeeId || undefined,
    createdAt: new Date().toISOString(),
  };

  db.transactions.unshift(newTx);
  syncProjectFinancials();
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Transactions',
    details: `Recorded ${newTx.type.toUpperCase()}: ৳${newTx.amount.toLocaleString()} [${newTx.category}] - ${newTx.description}`,
  });

  res.status(201).json(newTx);
});

// POST record manual / off-platform payment (Admin / Finance)
transactionsRouter.post('/manual-payment', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.create) {
    return res.status(403).json({ error: 'Permission denied: cannot record manual payments' });
  }

  const {
    type,
    date,
    amount,
    reference,
    paymentMethod,
    category,
    description,
    projectId,
    clientName,
    notes,
  } = req.body;

  if (!date || !amount || !reference || !paymentMethod) {
    return res.status(400).json({
      error: 'Date, amount, reference number, and payment method are required for manual payment entries',
    });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const isIncome = type !== 'expense';
  const defaultCategory = isIncome ? 'Client Payment' : 'Miscellaneous Overhead';
  const finalCategory = category || defaultCategory;

  const db = dbManager.get();
  const nextId = `MAN-TRX-${new Date().getFullYear()}-${(db.transactions.length + 1).toString().padStart(3, '0')}`;

  const baseDesc = description?.trim() ||
    (isIncome ? `Manual off-platform payment received via ${paymentMethod}` : `Manual off-platform payment disbursed via ${paymentMethod}`);
  const finalDesc = notes?.trim() ? `${baseDesc} (${notes.trim()})` : baseDesc;

  const newTx: Transaction = {
    id: nextId,
    type: isIncome ? 'income' : 'expense',
    date,
    projectId: projectId || null,
    isCompanyOverhead: !projectId,
    category: finalCategory,
    description: finalDesc,
    amount: numAmount,
    paymentMethod,
    reference: reference.trim(),
    paymentStatus: isIncome ? 'Received' : 'Paid',
    clientName: clientName || undefined,
    createdAt: new Date().toISOString(),
  };

  db.transactions.unshift(newTx);
  syncProjectFinancials();
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Transactions',
    details: `Manual Off-Platform Payment (${newTx.type.toUpperCase()}): ৳${newTx.amount.toLocaleString()} | Ref: ${newTx.reference} | Method: ${newTx.paymentMethod}`,
  });

  res.status(201).json(newTx);
});

// PUT update transaction
transactionsRouter.put('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.edit) {
    return res.status(403).json({ error: 'Permission denied: cannot edit transactions' });
  }

  const db = dbManager.get();
  const idx = db.transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const existing = db.transactions[idx];
  const {
    type,
    date,
    projectId,
    isCompanyOverhead,
    category,
    description,
    amount,
    paymentMethod,
    reference,
    paymentStatus,
    invoiceNumber,
  } = req.body;

  const updated: Transaction = {
    ...existing,
    type: type !== undefined ? type : existing.type,
    date: date !== undefined ? date : existing.date,
    projectId: projectId !== undefined ? projectId : existing.projectId,
    isCompanyOverhead: isCompanyOverhead !== undefined ? isCompanyOverhead : existing.isCompanyOverhead,
    category: category !== undefined ? category : existing.category,
    description: description !== undefined ? description : existing.description,
    amount: amount !== undefined ? Number(amount) : existing.amount,
    paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
    reference: reference !== undefined ? reference : existing.reference,
    paymentStatus: paymentStatus !== undefined ? paymentStatus : existing.paymentStatus,
    invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : existing.invoiceNumber,
  };

  db.transactions[idx] = updated;
  syncProjectFinancials();
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'UPDATE',
    resource: 'Transactions',
    details: `Updated transaction ${updated.id}: ৳${updated.amount.toLocaleString()}`,
  });

  res.json(updated);
});

// DELETE transaction
transactionsRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.delete) {
    return res.status(403).json({ error: 'Permission denied: cannot delete transactions' });
  }

  const db = dbManager.get();
  const idx = db.transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const removed = db.transactions.splice(idx, 1)[0];
  syncProjectFinancials();
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'Transactions',
    details: `Deleted transaction ${removed.id} of ৳${removed.amount.toLocaleString()}`,
  });

  res.json({ success: true, id: req.params.id });
});

// Create Invoice
transactionsRouter.post('/invoices', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.create) {
    return res.status(403).json({ error: 'Permission denied: cannot create invoices' });
  }

  const { projectId, clientId, issueDate, dueDate, items, notes } = req.body;
  if (!projectId || !clientId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Project, client, and at least one invoice item are required' });
  }

  const db = dbManager.get();
  const totalAmount = items.reduce((sum: number, it: any) => sum + (Number(it.total) || Number(it.quantity) * Number(it.unitPrice)), 0);
  const nextNum = (db.invoices.length + 91).toString().padStart(3, '0');
  const invoiceNumber = `INV-${new Date().getFullYear()}-${nextNum}`;

  const newInvoice: Invoice = {
    id: invoiceNumber,
    projectId,
    clientId,
    invoiceNumber,
    issueDate: issueDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    items,
    totalAmount,
    paidAmount: 0,
    status: 'Sent',
    notes: notes || '',
  };

  db.invoices.unshift(newInvoice);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Invoices',
    details: `Generated invoice ${invoiceNumber} for ৳${totalAmount.toLocaleString()}`,
  });

  res.status(201).json(newInvoice);
});

// Record partial or full payment against an invoice
transactionsRouter.post('/invoices/:id/payments', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.create) {
    return res.status(403).json({ error: 'Permission denied: cannot record invoice payments' });
  }

  const { amount, paymentMethod, reference, date, notes } = req.body;
  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }

  const db = dbManager.get();
  const invoice = db.invoices.find((i) => i.id === req.params.id || i.invoiceNumber === req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  invoice.paidAmount += payAmount;
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'Paid';
  } else {
    invoice.status = 'Partial';
  }

  const project = db.projects.find((p) => p.id === invoice.projectId);
  const client = db.clients.find((c) => c.id === invoice.clientId);

  // Automatically record matching income transaction
  const newTx: Transaction = {
    id: `TRX-${Date.now().toString(36).toUpperCase()}`,
    type: 'income',
    date: date || new Date().toISOString().split('T')[0],
    projectId: invoice.projectId,
    isCompanyOverhead: false,
    category: 'Client Payment',
    description: `Payment for Invoice ${invoice.invoiceNumber} (${client?.company || 'Client'}) ${notes ? '- ' + notes : ''}`,
    amount: payAmount,
    paymentMethod: paymentMethod || 'Bank Transfer (BRAC Bank)',
    reference: reference || `PAY-${invoice.invoiceNumber}`,
    paymentStatus: 'Received',
    invoiceNumber: invoice.invoiceNumber,
    clientName: client?.company,
    createdAt: new Date().toISOString(),
  };

  db.transactions.unshift(newTx);
  syncProjectFinancials();
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Invoices',
    details: `Recorded payment of ৳${payAmount.toLocaleString()} against invoice ${invoice.invoiceNumber}`,
  });

  res.status(201).json({ invoice, transaction: newTx });
});
