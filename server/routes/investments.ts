import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { InvestmentEntry, TreasurySummary } from '../types.js';

export const investmentsRouter = Router();

// Helper to calculate comprehensive treasury summary
export function calculateTreasurySummary(): TreasurySummary {
  const db = dbManager.get();

  const totalInvestmentInjected = (db.investments || []).reduce((sum, inv) => sum + (inv.amount || 0), 0);

  let totalRevenueReceived = 0;
  let totalExpensesPaid = 0;
  let marketingCostTotal = 0;
  let subscriptionsCostTotal = 0;
  let hardwareOfficeCostTotal = 0;
  let payrollCostTotal = 0;
  let directProjectCostsTotal = 0;
  let overheadCostsTotal = 0;

  for (const tx of db.transactions) {
    const isSettled = tx.paymentStatus === 'Received' || tx.paymentStatus === 'Paid';
    if (!isSettled) continue;

    if (tx.type === 'income') {
      totalRevenueReceived += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpensesPaid += tx.amount;

      const catLower = (tx.category || '').toLowerCase();
      if (catLower.includes('marketing') || catLower.includes('brand') || catLower.includes('ad')) {
        marketingCostTotal += tx.amount;
      } else if (
        catLower.includes('software') ||
        catLower.includes('cloud') ||
        catLower.includes('subscription') ||
        catLower.includes('saas') ||
        catLower.includes('license')
      ) {
        subscriptionsCostTotal += tx.amount;
      } else if (catLower.includes('hardware') || catLower.includes('equipment') || catLower.includes('rent')) {
        hardwareOfficeCostTotal += tx.amount;
      } else if (catLower.includes('payroll') || catLower.includes('salary')) {
        payrollCostTotal += tx.amount;
      }

      if (tx.projectId) {
        directProjectCostsTotal += tx.amount;
      } else {
        overheadCostsTotal += tx.amount;
      }
    }
  }

  const totalCashInflow = totalInvestmentInjected + totalRevenueReceived;
  const companyAccountRemaining = totalCashInflow - totalExpensesPaid;
  const netOperatingCashProfit = totalRevenueReceived - totalExpensesPaid;

  return {
    totalInvestmentInjected,
    totalRevenueReceived,
    totalCashInflow,
    totalExpensesPaid,
    companyAccountRemaining,
    marketingCostTotal,
    subscriptionsCostTotal,
    hardwareOfficeCostTotal,
    payrollCostTotal,
    directProjectCostsTotal,
    overheadCostsTotal,
    netOperatingCashProfit,
  };
}

// GET investments & treasury calculations
investmentsRouter.get('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.finance.view) {
    return res.status(403).json({ error: 'Permission denied: cannot access treasury records' });
  }

  const db = dbManager.get();
  const summary = calculateTreasurySummary();

  res.json({
    investments: db.investments || [],
    treasury: summary,
  });
});

// POST record new startup investment (Super Admin or Management)
investmentsRouter.post('/', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin' && user.role !== 'management') {
    return res.status(403).json({ error: 'Only Super Admin or Management can record investment capital' });
  }

  const { source, investorName, amount, date, paymentMethod, reference, notes, allocations } = req.body;

  if (!source || !amount || !date) {
    return res.status(400).json({ error: 'Source, amount, and date are required' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Investment amount must be a positive number' });
  }

  const db = dbManager.get();
  if (!db.investments) db.investments = [];

  const nextId = `INV-CAP-${(db.investments.length + 1).toString().padStart(3, '0')}`;

  const defaultAllocations = allocations || {
    marketing: Math.round(numAmount * 0.25),
    subscriptions: Math.round(numAmount * 0.2),
    hardwareOffice: Math.round(numAmount * 0.25),
    operatingRunway: Math.round(numAmount * 0.3),
  };

  const newEntry: InvestmentEntry = {
    id: nextId,
    source: source.trim(),
    investorName: (investorName || user.name).trim(),
    amount: numAmount,
    date,
    paymentMethod: paymentMethod || 'Bank Transfer (BRAC Bank)',
    reference: reference || `CAP-${Date.now().toString().slice(-6)}`,
    notes: notes || '',
    allocations: defaultAllocations,
    createdAt: new Date().toISOString(),
  };

  db.investments.unshift(newEntry);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Investments',
    details: `Injected ৳${numAmount.toLocaleString()} capital from "${newEntry.source}" (${newEntry.investorName})`,
  });

  const summary = calculateTreasurySummary();
  res.status(201).json({
    investment: newEntry,
    treasury: summary,
  });
});

// DELETE investment (Super Admin only)
investmentsRouter.delete('/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete investment records' });
  }

  const db = dbManager.get();
  if (!db.investments) db.investments = [];

  const idx = db.investments.findIndex((inv) => inv.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Investment entry not found' });
  }

  const removed = db.investments.splice(idx, 1)[0];
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'DELETE',
    resource: 'Investments',
    details: `Removed capital investment "${removed.id}" of ৳${removed.amount.toLocaleString()}`,
  });

  const summary = calculateTreasurySummary();
  res.json({ success: true, id: req.params.id, treasury: summary });
});
