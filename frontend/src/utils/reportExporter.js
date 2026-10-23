import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Helper to format currency
const formatCurrency = (val) => `$${Number(val || 0).toFixed(2)}`;

// ════════════════════════════════════════════════════════════════════════════
// 1. REVENUE STATEMENT (PDF & EXCEL)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Export Revenue Statement as PDF
 */
export const exportRevenueStatementPDF = (analytics, reportData, filters = {}) => {
  const { period = 'weekly', orderType = 'all' } = filters;
  const doc = new jsPDF('portrait', 'pt', 'a4');

  const primaryColor = [249, 115, 22]; // Orange-500
  const darkBg = [18, 18, 21];

  // Header Banner
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, 595, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI RESTAURANT MANAGEMENT SYSTEM', 40, 35);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(249, 115, 22);
  doc.text('OFFICIAL REVENUE STATEMENT & FINANCIAL REPORT', 40, 55);

  // Metadata Box
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Generated Date: ${new Date().toLocaleString()}`, 40, 100);
  doc.text(`Time Period: ${period.toUpperCase()}`, 250, 100);
  doc.text(`Order Type: ${orderType.toUpperCase()}`, 420, 100);

  doc.setDrawColor(220, 220, 220);
  doc.line(40, 110, 555, 110);

  // SECTION 1: Financial Summary Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('1. FINANCIAL PERFORMANCE SUMMARY', 40, 128);

  const totalSales = analytics.totalSales || analytics.todayRevenue || reportData.revenue || 0;
  const totalOrders = analytics.totalOrders || analytics.todayOrders || 0;
  const aov = analytics.averageOrderValue || 0;
  const totalCost = reportData.cost || reportData.totalCost || 0;
  const netProfit = reportData.profit !== undefined ? reportData.profit : (totalSales - totalCost);
  const profitMargin = reportData.profitMargin !== undefined ? reportData.profitMargin : (totalSales > 0 ? (netProfit / totalSales) * 100 : 0);

  autoTable(doc, {
    startY: 135,
    margin: { left: 40, right: 40 },
    head: [['Metric Description', 'Value']],
    body: [
      ['Total Gross Revenue', formatCurrency(totalSales)],
      ['Total Orders Processed', `${totalOrders} orders`],
      ['Average Order Value (AOV)', formatCurrency(aov)],
      ['Estimated Cost of Goods Sold (COGS)', formatCurrency(totalCost)],
      ['Net Profit', formatCurrency(netProfit)],
      ['Profit Margin (%)', `${Number(profitMargin).toFixed(1)}%`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  let currentY = doc.lastAutoTable.finalY + 20;

  // SECTION 2: Payment Breakdown Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('2. REVENUE BY PAYMENT METHOD', 40, currentY);

  const paymentRows = Object.entries(reportData.paymentBreakdown || {}).map(([method, info]) => {
    const amount = info.amount || 0;
    const count = info.count || 0;
    const pct = totalSales > 0 ? ((amount / totalSales) * 100).toFixed(1) : '0.0';
    return [method.toUpperCase(), `${count} txns`, formatCurrency(amount), `${pct}%`];
  });

  if (paymentRows.length === 0) {
    paymentRows.push(['N/A', '0 txns', '$0.00', '0.0%']);
  }

  autoTable(doc, {
    startY: currentY + 7,
    margin: { left: 40, right: 40 },
    head: [['Payment Method', 'Transactions', 'Total Revenue', 'Share (%)']],
    body: paymentRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  currentY = doc.lastAutoTable.finalY + 20;

  // SECTION 3: Best Selling Items
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('3. TOP REVENUE GENERATING MENU ITEMS', 40, currentY);

  const bestSellingRows = (reportData.bestSellingItems || []).map((item, idx) => [
    `#${idx + 1}`,
    item.name,
    `${item.quantity} sold`,
    formatCurrency(item.revenue)
  ]);

  if (bestSellingRows.length === 0) {
    bestSellingRows.push(['-', 'No data recorded', '0 sold', '$0.00']);
  }

  autoTable(doc, {
    startY: currentY + 7,
    margin: { left: 40, right: 40 },
    head: [['Rank', 'Menu Item Name', 'Quantity Sold', 'Total Revenue']],
    body: bestSellingRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  // Footer Signature Line
  const finalY = Math.min(doc.lastAutoTable.finalY + 40, 780);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('----------------------------------------------------', 40, finalY);
  doc.text('Authorized Signature / Restaurant Manager Verification', 40, finalY + 12);
  doc.text('Confidential - Generated by AI Restaurant Management System', 320, finalY + 12);

  doc.save(`Revenue_Statement_${period}_${orderType}_${Date.now()}.pdf`);
};

/**
 * Export Revenue Statement as Excel Spreadsheet (.xlsx)
 */
export const exportRevenueStatementExcel = (analytics, reportData, filters = {}) => {
  const { period = 'weekly', orderType = 'all' } = filters;

  const totalSales = analytics.totalSales || analytics.todayRevenue || reportData.revenue || 0;
  const totalOrders = analytics.totalOrders || analytics.todayOrders || 0;
  const aov = analytics.averageOrderValue || 0;
  const totalCost = reportData.cost || reportData.totalCost || 0;
  const netProfit = reportData.profit !== undefined ? reportData.profit : (totalSales - totalCost);
  const profitMargin = reportData.profitMargin !== undefined ? reportData.profitMargin : (totalSales > 0 ? (netProfit / totalSales) * 100 : 0);

  const sheetData = [
    ['AI RESTAURANT MANAGEMENT SYSTEM'],
    ['REVENUE STATEMENT & FINANCIAL REPORT'],
    ['Generated Date', new Date().toLocaleString()],
    ['Period Filter', period.toUpperCase()],
    ['Order Type Filter', orderType.toUpperCase()],
    [''],
    ['1. FINANCIAL PERFORMANCE SUMMARY'],
    ['Metric Description', 'Value'],
    ['Total Gross Revenue ($)', totalSales],
    ['Total Orders Count', totalOrders],
    ['Average Order Value ($)', aov],
    ['Estimated COGS ($)', totalCost],
    ['Net Profit ($)', netProfit],
    ['Profit Margin (%)', `${Number(profitMargin).toFixed(1)}%`],
    [''],
    ['2. REVENUE BY PAYMENT METHOD'],
    ['Payment Method', 'Transactions Count', 'Total Amount ($)', 'Sales Contribution (%)']
  ];

  Object.entries(reportData.paymentBreakdown || {}).forEach(([method, info]) => {
    const amount = info.amount || 0;
    const count = info.count || 0;
    const pct = totalSales > 0 ? ((amount / totalSales) * 100).toFixed(1) : 0;
    sheetData.push([method.toUpperCase(), count, amount, `${pct}%`]);
  });

  sheetData.push(['']);
  sheetData.push(['3. TOP REVENUE GENERATING DISHES']);
  sheetData.push(['Rank', 'Dish Name', 'Quantity Sold', 'Total Revenue ($)']);

  (reportData.bestSellingItems || []).forEach((item, idx) => {
    sheetData.push([idx + 1, item.name, item.quantity, item.revenue]);
  });

  sheetData.push(['']);
  sheetData.push(['4. FLOOR TABLE REVENUE PERFORMANCE']);
  sheetData.push(['Table Number', 'Seating Capacity', 'Orders Handled', 'Total Revenue ($)']);

  (reportData.tablePerformance || []).forEach((tbl) => {
    sheetData.push([`Table ${tbl.tableNumber}`, tbl.capacity, tbl.orderCount, tbl.revenue]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column width formatting
  ws['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Revenue Statement');
  XLSX.writeFile(wb, `Revenue_Statement_${period}_${orderType}_${Date.now()}.xlsx`);
};

// ════════════════════════════════════════════════════════════════════════════
// 2. TAX SUMMARY REPORT (PDF & EXCEL)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Export Tax Summary as PDF
 */
export const exportTaxSummaryPDF = (analytics, reportData, filters = {}) => {
  const { period = 'weekly', orderType = 'all', taxRate = 5.0, taxName = 'GST / Sales Tax' } = filters;
  const doc = new jsPDF('portrait', 'pt', 'a4');

  const totalSales = analytics.totalSales || analytics.todayRevenue || reportData.revenue || 0;
  const totalOrders = analytics.totalOrders || analytics.todayOrders || 0;

  // Calculate Tax Values
  // Subtotal before tax = Total Sales / (1 + taxRate / 100)
  const taxableSubtotal = totalSales / (1 + taxRate / 100);
  const totalTaxCollected = totalSales - taxableSubtotal;
  const avgTaxPerOrder = totalOrders > 0 ? totalTaxCollected / totalOrders : 0;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, 595, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI RESTAURANT MANAGEMENT SYSTEM', 40, 35);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(`TAX SUMMARY & AUDIT STATEMENT (${taxName.toUpperCase()})`, 40, 55);

  // Metadata Box
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Date: ${new Date().toLocaleString()}`, 40, 100);
  doc.text(`Applied Tax Rate: ${taxRate}% (${taxName})`, 250, 100);
  doc.text(`Period: ${period.toUpperCase()}`, 430, 100);

  doc.setDrawColor(220, 220, 220);
  doc.line(40, 110, 555, 110);

  // SECTION 1: Tax Aggregates
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('1. TAX LIABILITY & COLLECTIONS SUMMARY', 40, 128);

  autoTable(doc, {
    startY: 135,
    margin: { left: 40, right: 40 },
    head: [['Tax Parameter', 'Amount ($)']],
    body: [
      ['Gross Sales Revenue (Tax Inclusive)', formatCurrency(totalSales)],
      [`Net Taxable Subtotal (Excl. ${taxName})`, formatCurrency(taxableSubtotal)],
      [`Total ${taxName} Collected (${taxRate}%)`, formatCurrency(totalTaxCollected)],
      ['Total Taxed Transactions Count', `${totalOrders} orders`],
      ['Average Tax Collected Per Order', formatCurrency(avgTaxPerOrder)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 6 }
  });

  let currentY = doc.lastAutoTable.finalY + 20;

  // SECTION 2: Tax Breakdown by Payment Channel
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('2. TAX COLLECTION BY PAYMENT METHOD', 40, currentY);

  const taxByPaymentRows = Object.entries(reportData.paymentBreakdown || {}).map(([method, info]) => {
    const gross = info.amount || 0;
    const sub = gross / (1 + taxRate / 100);
    const tax = gross - sub;
    return [method.toUpperCase(), `${info.count} txns`, formatCurrency(gross), formatCurrency(sub), formatCurrency(tax)];
  });

  if (taxByPaymentRows.length === 0) {
    taxByPaymentRows.push(['N/A', '0 txns', '$0.00', '$0.00', '$0.00']);
  }

  autoTable(doc, {
    startY: currentY + 7,
    margin: { left: 40, right: 40 },
    head: [['Payment Channel', 'Count', 'Gross Amount', 'Taxable Subtotal', `Tax (${taxRate}%)`]],
    body: taxByPaymentRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  currentY = doc.lastAutoTable.finalY + 20;

  // SECTION 3: Periodic Sales & Tax Trend
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('3. PERIODIC TAX AUDIT TIMELINE', 40, currentY);

  const chartRows = (reportData.chartData || []).map((pt) => {
    const gross = pt.value || 0;
    const sub = gross / (1 + taxRate / 100);
    const tax = gross - sub;
    return [pt.name, formatCurrency(gross), formatCurrency(sub), formatCurrency(tax)];
  });

  autoTable(doc, {
    startY: currentY + 7,
    margin: { left: 40, right: 40 },
    head: [['Timeline Interval', 'Gross Revenue', 'Taxable Subtotal', 'Tax Collected']],
    body: chartRows.length > 0 ? chartRows : [['No data', '$0.00', '$0.00', '$0.00']],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 5 }
  });

  // Footer Signature Line
  const finalY = Math.min(doc.lastAutoTable.finalY + 40, 780);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('----------------------------------------------------', 40, finalY);
  doc.text('Certified Tax Auditor / Manager Signature', 40, finalY + 12);
  doc.text('Official Document for Tax Reporting & Compliance', 320, finalY + 12);

  doc.save(`Tax_Summary_${period}_${taxRate}pct_${Date.now()}.pdf`);
};

/**
 * Export Tax Summary as Excel Spreadsheet (.xlsx)
 */
export const exportTaxSummaryExcel = (analytics, reportData, filters = {}) => {
  const { period = 'weekly', orderType = 'all', taxRate = 5.0, taxName = 'GST / Sales Tax' } = filters;

  const totalSales = analytics.totalSales || analytics.todayRevenue || reportData.revenue || 0;
  const totalOrders = analytics.totalOrders || analytics.todayOrders || 0;

  const taxableSubtotal = totalSales / (1 + taxRate / 100);
  const totalTaxCollected = totalSales - taxableSubtotal;

  const sheetData = [
    ['AI RESTAURANT MANAGEMENT SYSTEM'],
    ['TAX SUMMARY & AUDIT DISCLOSURE REPORT'],
    ['Generated Date', new Date().toLocaleString()],
    ['Period Filter', period.toUpperCase()],
    ['Tax Regime', `${taxName} (${taxRate}%)`],
    [''],
    ['1. TAX SUMMARY OVERVIEW'],
    ['Parameter Description', 'Amount ($)'],
    ['Gross Revenue (Tax Inclusive)', totalSales],
    ['Taxable Subtotal (Excl. Tax)', taxableSubtotal],
    ['Total Tax Collected', totalTaxCollected],
    ['Taxed Orders Count', totalOrders],
    [''],
    ['2. TAX BY PAYMENT METHOD'],
    ['Payment Channel', 'Txn Count', 'Gross Sales ($)', 'Taxable Amount ($)', 'Tax Collected ($)']
  ];

  Object.entries(reportData.paymentBreakdown || {}).forEach(([method, info]) => {
    const gross = info.amount || 0;
    const sub = gross / (1 + taxRate / 100);
    const tax = gross - sub;
    sheetData.push([method.toUpperCase(), info.count, gross, sub, tax]);
  });

  sheetData.push(['']);
  sheetData.push(['3. TIMELINE TAX LOG']);
  sheetData.push(['Interval', 'Gross Revenue ($)', 'Taxable Amount ($)', 'Tax Collected ($)']);

  (reportData.chartData || []).forEach((pt) => {
    const gross = pt.value || 0;
    const sub = gross / (1 + taxRate / 100);
    const tax = gross - sub;
    sheetData.push([pt.name, gross, sub, tax]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Tax Summary');
  XLSX.writeFile(wb, `Tax_Summary_${period}_${taxRate}pct_${Date.now()}.xlsx`);
};

// ════════════════════════════════════════════════════════════════════════════
// 3. STOCK AUDIT LOGS & INVENTORY REPORT (PDF & EXCEL)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Export Stock Audit Logs & Current Inventory as PDF
 */
export const exportStockAuditPDF = (ingredients = [], logs = [], options = {}) => {
  const { selectedCategory = 'All', logTypeFilter = 'All' } = options;
  const doc = new jsPDF('landscape', 'pt', 'a4'); // Landscape for rich table layout

  const lowStockCount = ingredients.filter(i => i.currentStock <= i.minStockLevel).length;
  const totalValuation = ingredients.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.costPerUnit || 0)), 0);

  // Header Banner
  doc.setFillColor(18, 18, 21);
  doc.rect(0, 0, 842, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI RESTAURANT MANAGEMENT SYSTEM', 40, 35);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(249, 115, 22);
  doc.text('INVENTORY STOCK AUDIT LOGS & AUDIT TRAIL REPORT', 40, 55);

  // Metadata Box
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 100);
  doc.text(`Total Ingredients: ${ingredients.length}`, 260, 100);
  doc.text(`Low Stock Alerts: ${lowStockCount}`, 430, 100);
  doc.text(`Total Inventory Valuation: ${formatCurrency(totalValuation)}`, 590, 100);

  doc.setDrawColor(220, 220, 220);
  doc.line(40, 110, 802, 110);

  // SECTION 1: CURRENT STOCK AUDIT TABLE
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('1. CURRENT STOCK INVENTORY AUDIT', 40, 128);

  const inventoryRows = ingredients.map(ing => {
    const isLow = ing.currentStock <= ing.minStockLevel;
    const value = (ing.currentStock || 0) * (ing.costPerUnit || 0);
    return [
      ing.name,
      ing.category || 'General',
      `${ing.currentStock} ${ing.unit}`,
      `${ing.minStockLevel} ${ing.unit}`,
      ing.supplier || 'N/A',
      formatCurrency(ing.costPerUnit),
      formatCurrency(value),
      isLow ? '⚠️ LOW STOCK' : 'OK'
    ];
  });

  autoTable(doc, {
    startY: 135,
    margin: { left: 40, right: 40 },
    head: [['Ingredient', 'Category', 'Current Stock', 'Min Threshold', 'Supplier', 'Cost/Unit', 'Total Value', 'Status']],
    body: inventoryRows.length > 0 ? inventoryRows : [['No ingredients found', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 4 }
  });

  let currentY = doc.lastAutoTable.finalY + 25;

  // Check page overflow
  if (currentY > 480) {
    doc.addPage();
    currentY = 50;
  }

  // SECTION 2: STOCK MOVEMENT & AUDIT LOGS
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('2. STOCK MOVEMENT & USAGE AUDIT LOGS', 40, currentY);

  const logRows = logs.map(l => [
    l.createdAt ? new Date(l.createdAt).toLocaleString() : 'N/A',
    l.ingredientName || 'N/A',
    (l.type || 'Movement').toUpperCase(),
    `${l.quantity > 0 ? '+' : ''}${l.quantity} ${l.unit || ''}`,
    l.reason || l.orderNumber || 'N/A',
    l.supplier || l.user || 'System POS'
  ]);

  autoTable(doc, {
    startY: currentY + 7,
    margin: { left: 40, right: 40 },
    head: [['Timestamp', 'Ingredient', 'Type', 'Quantity', 'Reason / Order #', 'Supplier / User']],
    body: logRows.length > 0 ? logRows : [['No audit logs found', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 4 }
  });

  // Footer
  const finalY = Math.min(doc.lastAutoTable.finalY + 30, 560);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('----------------------------------------------------', 40, finalY);
  doc.text('Verified by Inventory Audit Manager', 40, finalY + 12);
  doc.text('AI Restaurant Management System Stock Verification Report', 500, finalY + 12);

  doc.save(`Stock_Audit_Logs_${Date.now()}.pdf`);
};

/**
 * Export Stock Audit Logs & Current Inventory as Excel Spreadsheet (.xlsx)
 */
export const exportStockAuditExcel = (ingredients = [], logs = [], options = {}) => {
  const wb = XLSX.utils.book_new();

  // SHEET 1: Current Stock Inventory
  const stockSheetData = [
    ['AI RESTAURANT MANAGEMENT SYSTEM'],
    ['STOCK INVENTORY AUDIT REPORT'],
    ['Generated Date', new Date().toLocaleString()],
    ['Total Ingredients', ingredients.length],
    [''],
    ['Ingredient Name', 'Category', 'Current Stock', 'Unit', 'Min Threshold', 'Supplier', 'Cost / Unit ($)', 'Total Stock Value ($)', 'Status']
  ];

  ingredients.forEach(ing => {
    const isLow = ing.currentStock <= ing.minStockLevel;
    const value = (ing.currentStock || 0) * (ing.costPerUnit || 0);
    stockSheetData.push([
      ing.name,
      ing.category || 'General',
      ing.currentStock,
      ing.unit,
      ing.minStockLevel,
      ing.supplier || 'N/A',
      ing.costPerUnit,
      value,
      isLow ? 'LOW STOCK' : 'IN STOCK'
    ]);
  });

  const wsStock = XLSX.utils.aoa_to_sheet(stockSheetData);
  wsStock['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsStock, 'Current Stock Audit');

  // SHEET 2: Stock Movement Audit History Logs
  const logSheetData = [
    ['AI RESTAURANT MANAGEMENT SYSTEM'],
    ['STOCK MOVEMENT & USAGE AUDIT HISTORY LOGS'],
    ['Generated Date', new Date().toLocaleString()],
    ['Total Audit Entries', logs.length],
    [''],
    ['Date & Time', 'Ingredient Name', 'Movement Type', 'Quantity Change', 'Unit', 'Reason / Order #', 'Supplier / Source']
  ];

  logs.forEach(l => {
    logSheetData.push([
      l.createdAt ? new Date(l.createdAt).toLocaleString() : 'N/A',
      l.ingredientName || 'N/A',
      l.type || 'Movement',
      l.quantity,
      l.unit || '',
      l.reason || l.orderNumber || 'N/A',
      l.supplier || l.user || 'System POS'
    ]);
  });

  const wsLogs = XLSX.utils.aoa_to_sheet(logSheetData);
  wsLogs['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Stock Movement Logs');

  XLSX.writeFile(wb, `Stock_Audit_Logs_${Date.now()}.xlsx`);
};

// ════════════════════════════════════════════════════════════════════════════
// 4. DIGITAL TABLE-SIDE E-RECEIPT (PDF)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Export Customer Digital E-Receipt as PDF
 */
export const exportReceiptPDF = (order, paymentInfo = {}) => {
  const doc = new jsPDF('portrait', 'pt', [320, 600]);

  // Header Banner
  doc.setFillColor(18, 18, 21);
  doc.rect(0, 0, 320, 65, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('SAVORY RESTAURANT', 160, 28, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(249, 115, 22);
  doc.text('DIGITAL TABLE E-RECEIPT & PAYMENT PROOF', 160, 46, { align: 'center' });

  // Metadata
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice #: ${order.invoiceNumber || 'INV-' + (order.orderNumber || Date.now().toString().slice(-4))}`, 20, 85);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 100);
  doc.text(`Table Number: Table ${order.tableNumber || 'Self-Order'}`, 20, 115);
  doc.text(`Payment Channel: ${(paymentInfo.method || order.paymentMethod || 'UPI QR').toUpperCase()}`, 20, 130);

  doc.setDrawColor(220, 220, 220);
  doc.line(20, 140, 300, 140);

  // Items Header
  let y = 158;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM DESCRIPTION', 20, y);
  doc.text('QTY', 200, y);
  doc.text('AMOUNT', 300, y, { align: 'right' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  (order.items || []).forEach(item => {
    const itemName = item.name.length > 24 ? item.name.substring(0, 24) + '...' : item.name;
    doc.text(itemName, 20, y);
    doc.text(`${item.quantity}x`, 200, y);
    doc.text(`$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`, 300, y, { align: 'right' });
    y += 14;
  });

  doc.line(20, y, 300, y);
  y += 16;

  // Totals
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 20, y);
  doc.text(`$${(order.subtotal || 0).toFixed(2)}`, 300, y, { align: 'right' });
  y += 14;

  doc.text('Tax (5% GST):', 20, y);
  doc.text(`$${(order.tax || 0).toFixed(2)}`, 300, y, { align: 'right' });
  y += 14;

  if (paymentInfo.tip || order.tip) {
    doc.text('Tip:', 20, y);
    doc.text(`$${Number(paymentInfo.tip || order.tip).toFixed(2)}`, 300, y, { align: 'right' });
    y += 14;
  }

  doc.setFontSize(10);
  doc.setTextColor(249, 115, 22);
  doc.text('Total Paid:', 20, y);
  doc.text(`$${Number(paymentInfo.amount || order.amountPaid || order.totalAmount || 0).toFixed(2)}`, 300, y, { align: 'right' });

  y += 32;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('----------------------------------------------------', 160, y, { align: 'center' });
  doc.text('Thank you for dining with Savory Restaurant!', 160, y + 14, { align: 'center' });
  doc.text('Order marked as PAID in live POS & Kitchen system.', 160, y + 26, { align: 'center' });

  doc.save(`Receipt_Table${order.tableNumber}_${Date.now()}.pdf`);
};

// ════════════════════════════════════════════════════════════════════════════
// 5. PAYROLL SUMMARY REPORT (EXCEL & CSV)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Export Payroll Summary as Excel Spreadsheet (.xlsx)
 */
export const exportPayrollExcel = (payrollData = [], dateFilter = 'month') => {
  const totalCost = payrollData.reduce((sum, item) => sum + (item.estimatedGrossPay || 0), 0);
  const totalHours = payrollData.reduce((sum, item) => sum + (item.paidHours || 0), 0);
  const totalRegular = payrollData.reduce((sum, item) => sum + (item.regularHours || 0), 0);
  const totalOvertime = payrollData.reduce((sum, item) => sum + (item.overtimeHours || 0), 0);

  const sheetData = [
    ['AI RESTAURANT MANAGEMENT SYSTEM'],
    ['AUTOMATED PAYROLL & WORKING HOURS REPORT'],
    ['Generated Date', new Date().toLocaleString()],
    ['Period Filter', dateFilter.toUpperCase()],
    ['Total Employees', payrollData.length],
    ['Total Estimated Gross Pay ($)', totalCost],
    [''],
    ['Employee Name', 'Role', 'Department', 'Hourly Rate ($/hr)', 'Completed Shifts', 'Regular Hours', 'Overtime Hours (1.5x)', 'Total Paid Hours', 'Regular Pay ($)', 'Overtime Pay ($)', 'Estimated Gross Pay ($)']
  ];

  payrollData.forEach(item => {
    sheetData.push([
      item.employeeName,
      item.role,
      item.department,
      item.hourlyRate,
      item.totalShiftsWorked,
      item.regularHours,
      item.overtimeHours,
      item.paidHours,
      item.regularEarnings || 0,
      item.overtimeEarnings || 0,
      item.estimatedGrossPay
    ]);
  });

  sheetData.push(['']);
  sheetData.push(['TOTALS', '', '', '', '', totalRegular, totalOvertime, totalHours, '', '', totalCost]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 22 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Payroll Summary');
  XLSX.writeFile(wb, `Payroll_Summary_${dateFilter}_${Date.now()}.xlsx`);
};

/**
 * Export Payroll Summary as CSV
 */
export const exportPayrollCSV = (payrollData = [], dateFilter = 'month') => {
  const headers = ['Employee Name', 'Role', 'Department', 'Hourly Rate ($/hr)', 'Completed Shifts', 'Regular Hours', 'Overtime Hours (1.5x)', 'Total Paid Hours', 'Regular Earnings ($)', 'Overtime Earnings ($)', 'Estimated Gross Pay ($)'];
  const rows = payrollData.map(item => [
    `"${item.employeeName}"`,
    item.role,
    item.department,
    item.hourlyRate,
    item.totalShiftsWorked,
    item.regularHours,
    item.overtimeHours,
    item.paidHours,
    (item.regularEarnings || 0).toFixed(2),
    (item.overtimeEarnings || 0).toFixed(2),
    item.estimatedGrossPay.toFixed(2)
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Payroll_Summary_${dateFilter}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


