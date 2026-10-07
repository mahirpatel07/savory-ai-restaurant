import Order from '../models/Order.js';
import Table from '../models/Table.js';
import User from '../models/User.js';
import Dish from '../models/Dish.js';
import { emitReservationEvent } from './socket.js';
import * as inventoryService from './inventoryService.js';
import * as automationService from './automationService.js';
import * as notificationService from './notificationService.js';

/**
 * Create a new order
 */
export const createOrder = async (orderData) => {
  try {
    // Validate dish availability
    if (orderData.items && orderData.items.length > 0) {
      for (const item of orderData.items) {
        if (item.dishId) {
          const dish = await Dish.findById(item.dishId);
          if (dish && dish.available === false) {
            return {
              success: false,
              message: `Sorry, "${dish.name}" is currently Sold Out and cannot be ordered.`
            };
          }
        }
      }
    }

    const order = new Order(orderData);
    await order.save();

    // If points are used, deduct them from the user
    if (orderData.pointsUsed && order.customerPhone) {
        const user = await User.findOne({ phone: order.customerPhone });
        if (user) {
            user.loyaltyPoints = Math.max(0, user.loyaltyPoints - orderData.pointsUsed);
            await user.save();
        }
    }

    // If it's a dine-in order, update the table status to 'occupied'
    if (order.orderType === 'dine-in' && order.tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { status: 'occupied' }
      );

      const allTables = await Table.find().sort({ tableNumber: 1 });
      emitReservationEvent('tables_updated', { tables: allTables });
    }

    emitReservationEvent('order_created', order);

    // 1. New Order Alert Notification
    try {
      await notificationService.createNotification({
        title: 'New Order Received',
        message: `New Order #${order.orderNumber} (${order.orderType.toUpperCase()}${order.tableNumber ? ' - Table ' + order.tableNumber : ''}) received!`,
        type: 'order',
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          tableNumber: order.tableNumber,
          orderType: order.orderType
        }
      });
    } catch (notifErr) {
      console.error('Notification error on order create:', notifErr);
    }

    return { success: true, order };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Update an order status or items
 */
export const updateOrder = async (orderId, updateData) => {
  try {
    // Validate dish availability if new/updated items are passed
    if (updateData.items && updateData.items.length > 0) {
      for (const item of updateData.items) {
        if (item.dishId) {
          const dish = await Dish.findById(item.dishId);
          if (dish && dish.available === false) {
            return {
              success: false,
              message: `Sorry, "${dish.name}" is currently Sold Out and cannot be added.`
            };
          }
        }
      }
    }

    const order = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
    if (!order) return { success: false, message: 'Order not found' };

    // Deduct stock when order starts preparing
    if (updateData.status === 'preparing') {
      await inventoryService.deductStockForOrder(order);
    }

    // Restore stock if order is cancelled and stock was already deducted
    if (updateData.status === 'cancelled') {
      await inventoryService.restoreStockForOrder(order);
    }

    // 2. Kitchen Ready Alert Notification
    if (updateData.status === 'ready') {
      try {
        await notificationService.createNotification({
          title: 'Kitchen Order Ready',
          message: `Order #${order.orderNumber} is READY in the kitchen for ${order.orderType.toUpperCase()}${order.tableNumber ? ' (Table ' + order.tableNumber + ')' : ''}!`,
          type: 'kitchen',
          metadata: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            tableNumber: order.tableNumber
          }
        });
      } catch (notifErr) {
        console.error('Notification error on order ready:', notifErr);
      }
    }

    // If order is paid, completed, or cancelled, release the table if it's dine-in
    if ((updateData.status === 'paid' || updateData.status === 'completed' || updateData.status === 'cancelled') && order.orderType === 'dine-in' && order.tableNumber) {
        // Check if there are other active orders for this table
        const otherActiveOrders = await Order.findOne({
            tableNumber: order.tableNumber,
            status: { $in: ['pending', 'preparing', 'ready', 'served'] },
            _id: { $ne: order._id }
        });

        if (!otherActiveOrders) {
            await Table.findOneAndUpdate(
                { tableNumber: order.tableNumber },
                { status: 'cleaning' }
            );

            // Trigger auto-cleaning release logic after 60s
            setTimeout(async () => {
                await Table.findOneAndUpdate(
                    { tableNumber: order.tableNumber, status: 'cleaning' },
                    { status: 'available' }
                );
                const allTables = await Table.find().sort({ tableNumber: 1 });
                emitReservationEvent('tables_updated', { tables: allTables });

                // 6. Table Ready Notification
                try {
                  await notificationService.createNotification({
                    title: 'Table Available',
                    message: `Table #${order.tableNumber} is now cleaned and AVAILABLE for seating!`,
                    type: 'table',
                    metadata: { tableNumber: order.tableNumber }
                  });
                } catch (tErr) {
                  console.error('Table notification error:', tErr);
                }
            }, 60000);
        }
    }

    emitReservationEvent('order_updated', order);

    // If order is paid or completed, emit billing event & process loyalty
    if (updateData.status === 'paid' || updateData.status === 'completed') {
      emitReservationEvent('bill_paid', order);

      // Trigger Automation for Bill
      automationService.sendBillNotification(order);

      // Add loyalty points if customer phone is provided
      if (order.customerPhone) {
          const user = await User.findOne({ phone: order.customerPhone });
          if (user) {
              const pointsEarned = Math.floor(order.totalAmount);
              user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
              await user.save();
              console.log(`Added ${pointsEarned} points to user ${user.name}`);
          }
      }
    }

    return { success: true, order };
  } catch (error) {
    console.error('Error updating order:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Process payment for an order (Full, Partial, Multiple, UPI, Tip)
 */
export const processPayment = async (orderId, paymentData) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    if (order.paymentStatus === 'completed' || order.paymentStatus === 'paid') {
      return { success: false, message: `Order #${order.orderNumber} is already fully paid.` };
    }

    const {
      amount,
      paymentMethod = 'cash',
      payments = [],
      tip = 0,
      transactionId = ''
    } = paymentData;

    // Apply tip if provided
    if (tip && Number(tip) > 0) {
      order.tip = (order.tip || 0) + Number(tip);
      order.totalAmount = (order.subtotal || 0) - (order.discount || 0) + (order.tax || 0) + order.tip;
    }

    let newPayments = [];
    if (payments && payments.length > 0) {
      newPayments = payments.map(p => ({
        method: p.method || paymentMethod,
        amount: Number(p.amount),
        transactionId: p.transactionId || transactionId || `TXN-${Date.now()}`,
        date: new Date()
      }));
    } else {
      const payAmount = (amount !== undefined && amount !== null && Number(amount) > 0)
        ? Number(amount)
        : Math.max(0, (order.totalAmount || 0) - (order.amountPaid || 0));

      newPayments = [{
        method: paymentMethod,
        amount: payAmount,
        transactionId: transactionId || `TXN-${Date.now()}`,
        date: new Date()
      }];
    }

    const totalNewPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
    order.amountPaid = (order.amountPaid || 0) + totalNewPaid;
    order.remainingAmount = Math.max(0, (order.totalAmount || 0) - order.amountPaid);
    order.payments = [...(order.payments || []), ...newPayments];

    if (order.payments.length > 1) {
      order.paymentMethod = 'multiple';
    } else if (order.payments.length === 1) {
      order.paymentMethod = order.payments[0].method;
    }

    if (order.remainingAmount === 0) {
      order.paymentStatus = 'completed';
      order.status = 'completed';
      order.paidAt = new Date();
      order.completedAt = new Date();
    } else if (order.amountPaid > 0) {
      order.paymentStatus = 'partially_paid';
    }

    if (!order.invoiceNumber) {
      order.invoiceNumber = order.orderNumber.replace('ORD-', 'INV-');
    }

    await order.save();

    // 4. Payment Confirmation Notification
    try {
      await notificationService.createNotification({
        title: 'Payment Confirmed',
        message: `Payment Confirmed: $${totalNewPaid.toFixed(2)} received for Order #${order.orderNumber} via ${paymentMethod.toUpperCase()} (Invoice #${order.invoiceNumber})`,
        type: 'payment',
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceNumber: order.invoiceNumber,
          amount: totalNewPaid,
          paymentMethod
        }
      });
    } catch (pErr) {
      console.error('Payment notification error:', pErr);
    }

    // Release table if fully paid and dine-in
    if ((order.paymentStatus === 'completed' || order.paymentStatus === 'paid') && order.orderType === 'dine-in' && order.tableNumber) {
      const otherActiveOrders = await Order.findOne({
        tableNumber: order.tableNumber,
        status: { $in: ['pending', 'preparing', 'ready', 'served'] },
        _id: { $ne: order._id }
      });

      if (!otherActiveOrders) {
        await Table.findOneAndUpdate({ tableNumber: order.tableNumber }, { status: 'cleaning' });
        setTimeout(async () => {
          await Table.findOneAndUpdate({ tableNumber: order.tableNumber, status: 'cleaning' }, { status: 'available' });
          const allTables = await Table.find().sort({ tableNumber: 1 });
          emitReservationEvent('tables_updated', { tables: allTables });

          // 6. Table Ready Notification
          try {
            await notificationService.createNotification({
              title: 'Table Available',
              message: `Table #${order.tableNumber} is now cleaned and AVAILABLE for seating!`,
              type: 'table',
              metadata: { tableNumber: order.tableNumber }
            });
          } catch (tErr) {
            console.error('Table notification error:', tErr);
          }
        }, 60000);
      }
    }

    emitReservationEvent('order_updated', order);
    emitReservationEvent('bill_paid', order);
    automationService.sendBillNotification(order);

    if (order.customerPhone) {
      const user = await User.findOne({ phone: order.customerPhone });
      if (user) {
        const pointsEarned = Math.floor(totalNewPaid);
        user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
        await user.save();
      }
    }

    return { success: true, order };
  } catch (error) {
    console.error('Error processing payment:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get active orders for KDS
 */
export const getActiveOrders = async () => {
  return await Order.find({
    status: { $in: ['pending', 'preparing', 'ready', 'served'] }
  }).sort({ createdAt: 1 });
};

/**
 * Get orders for a specific table
 */
export const getTableOrders = async (tableNumber) => {
    return await Order.find({
        tableNumber,
        status: { $in: ['pending', 'preparing', 'ready', 'served'] }
    }).sort({ createdAt: -1 });
};
