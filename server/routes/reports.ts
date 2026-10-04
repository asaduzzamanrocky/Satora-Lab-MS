import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';

export const reportsRouter = Router();

// GET monthly financial and project performance report
reportsRouter.get('/monthly', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.reports.view || !user.permissions.canViewFinancials) {
    return res.status(403).json({ error: 'Permission denied: cannot access financial reports' });
  }

  const { month, year } = req.query;
  const currentYear = year ? Number(year) : new Date().getFullYear();
  const currentMonth = month ? Number(month) : new Date().getMonth() + 1; // 1-12

  const monthStr = currentMonth.toString().padStart(2, '0');
  const targetPrefix = `${currentYear}-${monthStr}`;

  const db = dbManager.get();

  // Filter transactions for target month
  const monthTransactions = db.transactions.filter((tx) => tx.date.startsWith(targetPrefix));

  let revenueReceived = 0;
  let directExpensesPaid = 0;
  let overheadExpensesPaid = 0;
  let payrollPaid = 0;

  for (const tx of monthTransactions) {
    if (tx.type === 'income' && (tx.paymentStatus === 'Received' || tx.paymentStatus === 'Paid')) {
      revenueReceived += tx.amount;
    } else if (tx.type === 'expense' && (tx.paymentStatus === 'Paid' || tx.paymentStatus === 'Received')) {
      if (tx.category === 'Payroll') {
        payrollPaid += tx.amount;
      } else if (tx.isCompanyOverhead) {
        overheadExpensesPaid += tx.amount;
      } else {
        directExpensesPaid += tx.amount;
      }
    }
  }

  const totalExpensesPaid = directExpensesPaid + overheadExpensesPaid + payrollPaid;
  const monthlyCashProfit = revenueReceived - totalExpensesPaid;

  // Cumulative all-time metrics
  let allTimeRevenue = 0;
  let allTimeExpenses = 0;
  for (const tx of db.transactions) {
    if (tx.type === 'income' && (tx.paymentStatus === 'Received' || tx.paymentStatus === 'Paid')) {
      allTimeRevenue += tx.amount;
    } else if (tx.type === 'expense' && (tx.paymentStatus === 'Paid' || tx.paymentStatus === 'Received')) {
      allTimeExpenses += tx.amount;
    }
  }
  const companyNetCashProfit = allTimeRevenue - allTimeExpenses;

  // Contracts and Outstanding balances
  const totalContractValue = db.projects.reduce((acc, p) => acc + p.contractValue, 0);
  const totalProjectPaymentsReceived = db.projects.reduce((acc, p) => acc + p.paymentsReceived, 0);
  const totalOutstandingPayments = db.projects.reduce(
    (acc, p) => acc + Math.max(0, p.contractValue - p.paymentsReceived),
    0
  );
  const totalOverpayments = db.projects.reduce(
    (acc, p) => acc + Math.max(0, p.paymentsReceived - p.contractValue),
    0
  );

  // Invoices overview
  const pendingInvoices = db.invoices.filter((i) => i.status !== 'Paid');
  const totalOutstandingInvoices = pendingInvoices.reduce((acc, i) => acc + (i.totalAmount - i.paidAmount), 0);

  // Category breakdown for the month
  const categoryBreakdown: Record<string, number> = {};
  for (const tx of monthTransactions) {
    if (tx.type === 'expense') {
      categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
    }
  }

  // Monthly trends for past 6 months
  const monthlyTrends: { monthYear: string; income: number; expenses: number; profit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const y = d.getFullYear();
    const prefix = `${y}-${m}`;

    const txs = db.transactions.filter((t) => t.date.startsWith(prefix));
    const inc = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    monthlyTrends.push({
      monthYear: `${y}-${m}`,
      income: inc,
      expenses: exp,
      profit: inc - exp,
    });
  }

  res.json({
    period: {
      year: currentYear,
      month: currentMonth,
      monthFormatted: new Date(currentYear, currentMonth - 1).toLocaleString('en-BD', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      }),
    },
    monthly: {
      revenueReceived,
      directExpensesPaid,
      overheadExpensesPaid,
      payrollPaid,
      totalExpensesPaid,
      monthlyCashProfit,
      marginPercent: revenueReceived > 0 ? ((monthlyCashProfit / revenueReceived) * 100).toFixed(1) : 0,
      transactionsCount: monthTransactions.length,
      categoryBreakdown,
    },
    companyAllTime: {
      allTimeRevenue,
      allTimeExpenses,
      companyNetCashProfit,
      totalContractValue,
      totalProjectPaymentsReceived,
      totalOutstandingPayments,
      totalOverpayments,
      totalOutstandingInvoices,
    },
    monthlyTrends,
  });
});

// CSV Export for monthly financial statement
reportsRouter.get('/export-csv', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  if (!user.permissions.reports.export || !user.permissions.canViewFinancials) {
    return res.status(403).json({ error: 'Permission denied: cannot export financial data' });
  }

  const { month, year } = req.query;
  const currentYear = year ? Number(year) : new Date().getFullYear();
  const currentMonth = month ? Number(month) : new Date().getMonth() + 1;
  const prefix = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

  const db = dbManager.get();
  const txs = db.transactions.filter((t) => t.date.startsWith(prefix));

  let csv = 'ID,Date,Type,Category,Description,Amount (BDT),Payment Method,Reference,Status,Project ID\n';
  for (const t of txs) {
    const escapedDesc = `"${t.description.replace(/"/g, '""')}"`;
    csv += `${t.id},${t.date},${t.type},${t.category},${escapedDesc},${t.amount},${t.paymentMethod},${t.reference},${t.paymentStatus},${t.projectId || 'N/A'}\n`;
  }

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SHEET_IMPORT',
    resource: 'Reports',
    details: `Exported monthly financial CSV for period ${prefix}`,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="satora-lab-report-${prefix}.csv"`);
  res.send(csv);
});
