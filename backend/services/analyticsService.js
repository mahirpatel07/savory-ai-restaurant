import Order from '../models/Order.js';
import Dish from '../models/Dish.js';
import Table from '../models/Table.js';

export const getAnalyticsSummary = async (period = 'daily', orderType = 'all') => {
  const now = new Date();
  let startDate = new Date();

  if (period === 'today' || period === 'daily') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'monthly') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === 'all') {
    startDate = new Date(0);
  }

  const query = {
    createdAt: { $gte: startDate },
    status: { $ne: 'cancelled' }
  };

  if (orderType && orderType !== 'all') {
    query.orderType = orderType.toLowerCase();
  }

  const orders = await Order.find(query);

  const paidOrders = orders.filter(o =>
    ['paid', 'completed', 'served', 'ready', 'preparing'].includes(o.status) ||
    ['paid', 'completed', 'partially_paid'].includes(o.paymentStatus)
  );

  const totalSales = paidOrders.reduce((sum, o) => sum + (o.amountPaid || o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const paidOrderCount = paidOrders.length;
  const aov = paidOrderCount > 0 ? totalSales / paidOrderCount : 0;

  return {
    period,
    orderType,
    totalSales,
    totalOrders,
    paidOrderCount,
    averageOrderValue: aov
  };
};

export const getDetailedAnalyticsReport = async (period = 'weekly', orderType = 'all') => {
  const now = new Date();
  let startDate = new Date();

  if (period === 'today' || period === 'daily') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'monthly') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === 'all') {
    startDate = new Date(0);
  }

  const query = {
    createdAt: { $gte: startDate },
    status: { $ne: 'cancelled' }
  };

  if (orderType && orderType !== 'all') {
    query.orderType = orderType.toLowerCase();
  }

  const orders = await Order.find(query);

  // 1. Sales & Orders Summary
  const paidOrders = orders.filter(o =>
    ['paid', 'completed', 'served', 'ready', 'preparing'].includes(o.status) ||
    ['paid', 'completed', 'partially_paid'].includes(o.paymentStatus)
  );

  const totalSales = paidOrders.reduce((sum, o) => sum + (o.amountPaid || o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const paidOrderCount = paidOrders.length;
  const aov = paidOrderCount > 0 ? totalSales / paidOrderCount : 0;

  // 2. Best Selling Items
  const itemMap = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const id = item.name || item.dishId?.toString() || 'Unknown';
      if (!itemMap[id]) {
        itemMap[id] = { name: item.name, quantity: 0, revenue: 0 };
      }
      itemMap[id].quantity += item.quantity || 1;
      itemMap[id].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });

  const bestSellingItems = Object.values(itemMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // 3. Payment Breakdown (Handling split payments & payment methods)
  const paymentBreakdown = {
    cash: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    upi: { count: 0, amount: 0 },
    online: { count: 0, amount: 0 },
    multiple: { count: 0, amount: 0 }
  };

  paidOrders.forEach(order => {
    if (order.payments && order.payments.length > 0) {
      order.payments.forEach(p => {
        const method = (p.method || 'cash').toLowerCase();
        if (!paymentBreakdown[method]) {
          paymentBreakdown[method] = { count: 0, amount: 0 };
        }
        paymentBreakdown[method].count += 1;
        paymentBreakdown[method].amount += Number(p.amount) || 0;
      });
    } else {
      const method = (order.paymentMethod || 'cash').toLowerCase();
      if (!paymentBreakdown[method]) {
        paymentBreakdown[method] = { count: 0, amount: 0 };
      }
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].amount += (order.amountPaid || order.totalAmount || 0);
    }
  });

  // 4. Peak Hours Analysis (24h)
  const peakHours = Array(24).fill(0).map((_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    count: 0
  }));

  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    if (peakHours[hour]) {
      peakHours[hour].count += 1;
    }
  });

  // 5. Table Performance
  const tableMap = {};
  const allTables = await Table.find();

  allTables.forEach(t => {
    tableMap[t.tableNumber] = {
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      status: t.status,
      orderCount: 0,
      revenue: 0
    };
  });

  orders.forEach(order => {
    if (order.tableNumber && tableMap[order.tableNumber]) {
      tableMap[order.tableNumber].orderCount += 1;
      tableMap[order.tableNumber].revenue += (order.amountPaid || order.totalAmount || 0);
    }
  });

  const tablePerformance = Object.values(tableMap).sort((a, b) => b.revenue - a.revenue);

  // 6. Revenue Chart Data
  const chartData = [];
  if (period === 'today' || period === 'daily') {
    // 24 hour chart
    const hourMap = Array(24).fill(0);
    paidOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      hourMap[h] += (o.amountPaid || o.totalAmount || 0);
    });
    for (let i = 0; i < 24; i += 2) {
      chartData.push({
        name: `${String(i).padStart(2, '0')}:00`,
        value: hourMap[i] + (hourMap[i + 1] || 0)
      });
    }
  } else if (period === 'weekly') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    paidOrders.forEach(o => {
      const dName = days[new Date(o.createdAt).getDay()];
      if (dayMap[dName] !== undefined) {
        dayMap[dName] += (o.amountPaid || o.totalAmount || 0);
      }
    });
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
      chartData.push({ name: d, value: dayMap[d] });
    });
  } else {
    // Monthly / All: Group by week/date
    const dateMap = {};
    paidOrders.forEach(o => {
      const dateKey = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateKey] = (dateMap[dateKey] || 0) + (o.amountPaid || o.totalAmount || 0);
    });
    const keys = Object.keys(dateMap).slice(-10);
    if (keys.length === 0) {
      chartData.push({ name: 'No Data', value: 0 });
    } else {
      keys.forEach(k => {
        chartData.push({ name: k, value: dateMap[k] });
      });
    }
  }

  // Cost & Profit Estimation
  const dishes = await Dish.find().populate('recipe.ingredientId');
  const dishCosts = {};
  dishes.forEach(dish => {
    let cost = 0;
    (dish.recipe || []).forEach(item => {
      if (item.ingredientId) {
        cost += item.quantity * (item.ingredientId.costPerUnit || 0);
      }
    });
    dishCosts[dish._id.toString()] = cost;
  });

  let totalCost = 0;
  paidOrders.forEach(order => {
    (order.items || []).forEach(item => {
      const dishCost = dishCosts[item.dishId?.toString()] || ((item.price || 0) * 0.3);
      totalCost += dishCost * (item.quantity || 1);
    });
  });

  const profit = Math.max(0, totalSales - totalCost);
  const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  return {
    period,
    orderType,
    totalSales,
    totalOrders,
    paidOrderCount,
    averageOrderValue: aov,
    bestSellingItems,
    paymentBreakdown,
    peakHours,
    tablePerformance,
    chartData,
    totalCost,
    profit,
    profitMargin
  };
};
