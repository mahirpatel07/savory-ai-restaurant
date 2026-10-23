import CashDrawer from '../models/CashDrawer.js';
import Order from '../models/Order.js';
import { logAuditAction } from './auditService.js';

/**
 * Get current active open drawer session
 */
export const getCurrentDrawer = async () => {
  const activeDrawer = await CashDrawer.findOne({ status: 'open' })
    .populate('openedBy', 'name email role')
    .sort({ createdAt: -1 });

  if (!activeDrawer) return null;

  // Calculate live POS sales since drawer opened
  const orders = await Order.find({
    createdAt: { $gte: activeDrawer.openedAt },
    status: { $ne: 'cancelled' }
  });

  let cashSales = 0;
  let cardSales = 0;
  let upiSales = 0;
  let grossSales = 0;
  let taxCollected = 0;

  orders.forEach(o => {
    const amount = o.amountPaid || o.totalAmount || 0;
    grossSales += amount;
    taxCollected += o.tax || 0;

    const pm = (o.paymentMethod || 'cash').toLowerCase();
    if (pm === 'cash') cashSales += amount;
    else if (pm === 'card' || pm === 'credit card') cardSales += amount;
    else if (pm === 'upi' || pm === 'qr' || pm === 'online') upiSales += amount;
    else cashSales += amount;
  });

  const totalDrops = (activeDrawer.cashTransactions || [])
    .filter(t => t.type === 'drop')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayouts = (activeDrawer.cashTransactions || [])
    .filter(t => t.type === 'payout')
    .reduce((sum, t) => sum + t.amount, 0);

  const expectedCash = activeDrawer.openingFloat + cashSales + totalDrops - totalPayouts;

  const drawerObj = activeDrawer.toObject();
  return {
    ...drawerObj,
    liveSales: {
      cashSales,
      cardSales,
      upiSales,
      grossSales,
      taxCollected,
      ordersCount: orders.length
    },
    liveTransactions: {
      totalDrops,
      totalPayouts
    },
    expectedCash
  };
};

/**
 * Open daily cash register with opening float
 */
export const openDrawer = async ({ openingFloat, reqUser }) => {
  const existingOpen = await CashDrawer.findOne({ status: 'open' });
  if (existingOpen) {
    throw new Error('A cash register drawer is already open for operations.');
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const drawer = await CashDrawer.create({
    date: todayStr,
    status: 'open',
    openedBy: reqUser._id,
    openedByName: reqUser.name || 'Staff User',
    openedAt: new Date(),
    openingFloat: Number(openingFloat) || 200.00,
    cashTransactions: []
  });

  await logAuditAction({
    actorId: reqUser._id,
    actorName: reqUser.name,
    action: 'drawer_opened',
    targetModel: 'CashDrawer',
    targetId: drawer._id,
    afterValue: { openingFloat, openedAt: drawer.openedAt }
  });

  return await getCurrentDrawer();
};

/**
 * Record cash drop (bank deposit) or petty cash payout
 */
export const addCashTransaction = async ({ type, amount, reason, reqUser }) => {
  if (!reason || reason.trim().length === 0) {
    throw new Error('A mandatory reason is required for cash drops and petty cash payouts.');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Please enter a valid positive cash amount.');
  }

  const drawer = await CashDrawer.findOne({ status: 'open' });
  if (!drawer) {
    throw new Error('No open cash register drawer found. Please open the register drawer first.');
  }

  drawer.cashTransactions.push({
    type,
    amount: numAmount,
    reason: reason.trim(),
    addedBy: reqUser.name || 'Staff User',
    timestamp: new Date()
  });

  await drawer.save();

  await logAuditAction({
    actorId: reqUser._id,
    actorName: reqUser.name,
    action: type === 'drop' ? 'cash_drop' : 'cash_payout',
    targetModel: 'CashDrawer',
    targetId: drawer._id,
    reason: reason.trim(),
    afterValue: { type, amount: numAmount, reason: reason.trim() }
  });

  return await getCurrentDrawer();
};

/**
 * Close Register & Generate End-of-Day Z-Report Reconciliation
 */
export const closeZReport = async ({ actualCountedCash, notes, reqUser }) => {
  const drawer = await CashDrawer.findOne({ status: 'open' });
  if (!drawer) {
    throw new Error('No active open cash drawer to perform Z-Report closure.');
  }

  const numCounted = Number(actualCountedCash);
  if (isNaN(numCounted) || numCounted < 0) {
    throw new Error('Please enter a valid actual counted cash amount.');
  }

  // Fetch all orders completed during session
  const orders = await Order.find({
    createdAt: { $gte: drawer.openedAt },
    status: { $ne: 'cancelled' }
  });

  let cashSalesTotal = 0;
  let cardSalesTotal = 0;
  let upiSalesTotal = 0;
  let grossSalesTotal = 0;
  let taxCollectedTotal = 0;

  orders.forEach(o => {
    const amount = o.amountPaid || o.totalAmount || 0;
    grossSalesTotal += amount;
    taxCollectedTotal += o.tax || 0;

    const pm = (o.paymentMethod || 'cash').toLowerCase();
    if (pm === 'cash') cashSalesTotal += amount;
    else if (pm === 'card' || pm === 'credit card') cardSalesTotal += amount;
    else if (pm === 'upi' || pm === 'qr' || pm === 'online') upiSalesTotal += amount;
    else cashSalesTotal += amount;
  });

  const totalDrops = drawer.cashTransactions
    .filter(t => t.type === 'drop')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayouts = drawer.cashTransactions
    .filter(t => t.type === 'payout')
    .reduce((sum, t) => sum + t.amount, 0);

  const expectedCash = drawer.openingFloat + cashSalesTotal + totalDrops - totalPayouts;
  const drawerVariance = Math.round((numCounted - expectedCash) * 100) / 100;

  const now = new Date();

  // Construct End-of-Day Z-Report Summary Snapshot
  const zReportSummary = {
    zReportNumber: `ZR-${Date.now().toString().slice(-6)}`,
    registerDate: drawer.date,
    openedAt: drawer.openedAt,
    closedAt: now,
    openedByName: drawer.openedByName,
    closedByName: reqUser.name || 'Manager',
    openingFloat: drawer.openingFloat,
    cashSalesTotal,
    cardSalesTotal,
    upiSalesTotal,
    grossSalesTotal,
    taxCollectedTotal,
    totalDrops,
    totalPayouts,
    expectedCash,
    actualCountedCash: numCounted,
    drawerVariance,
    varianceStatus: drawerVariance === 0 ? 'Balanced' : drawerVariance > 0 ? 'Overage' : 'Shortage',
    totalOrdersCount: orders.length,
    cashTransactionsCount: drawer.cashTransactions.length,
    notes: notes || ''
  };

  drawer.status = 'closed';
  drawer.closedBy = reqUser._id;
  drawer.closedByName = reqUser.name || 'Manager';
  drawer.closedAt = now;
  drawer.actualCountedCash = numCounted;
  drawer.expectedCash = expectedCash;
  drawer.drawerVariance = drawerVariance;
  drawer.cashSalesTotal = cashSalesTotal;
  drawer.cardSalesTotal = cardSalesTotal;
  drawer.upiSalesTotal = upiSalesTotal;
  drawer.grossSalesTotal = grossSalesTotal;
  drawer.taxCollectedTotal = taxCollectedTotal;
  drawer.notes = notes || '';
  drawer.zReportSummary = zReportSummary;

  await drawer.save();

  await logAuditAction({
    actorId: reqUser._id,
    actorName: reqUser.name,
    action: 'z_report_closed',
    targetModel: 'CashDrawer',
    targetId: drawer._id,
    reason: `Closed register drawer with Z-Report variance: $${drawerVariance}`,
    afterValue: zReportSummary
  });

  return {
    success: true,
    drawer,
    zReportSummary
  };
};

/**
 * Get Z-Report Closure History
 */
export const getZReportHistory = async () => {
  return await CashDrawer.find({ status: 'closed' })
    .populate('openedBy', 'name email role')
    .populate('closedBy', 'name email role')
    .sort({ closedAt: -1 });
};
