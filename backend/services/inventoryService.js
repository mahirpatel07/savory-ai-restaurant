import Ingredient from '../models/Ingredient.js';
import Dish from '../models/Dish.js';
import InventoryLog from '../models/InventoryLog.js';
import { emitReservationEvent } from './socket.js';
import * as automationService from './automationService.js';
import * as notificationService from './notificationService.js';

/**
 * Deduct stock for an order (Guaranteed single deduction via order.inventoryDeducted flag)
 */
export const deductStockForOrder = async (order) => {
  try {
    if (order.inventoryDeducted) {
      return { success: true, message: 'Stock already deducted for this order' };
    }

    let deductedAny = false;

    for (const item of order.items) {
      const dish = await Dish.findById(item.dishId).populate('recipe.ingredientId');
      if (!dish || !dish.recipe || dish.recipe.length === 0) continue;

      for (const recipeItem of dish.recipe) {
        const quantityToDeduct = recipeItem.quantity * item.quantity;
        const ingredient = await Ingredient.findById(recipeItem.ingredientId?._id || recipeItem.ingredientId);

        if (ingredient) {
          ingredient.currentStock = Math.max(0, ingredient.currentStock - quantityToDeduct);
          await ingredient.save();
          deductedAny = true;

          // Record log entry for order deduction
          await InventoryLog.create({
            ingredientId: ingredient._id,
            ingredientName: ingredient.name,
            type: 'Order Deduction',
            quantity: quantityToDeduct,
            unit: ingredient.unit,
            orderNumber: order.orderNumber,
            reason: `Order #${order.orderNumber} preparation`,
            date: new Date()
          });

          // Check for low stock alert
          if (ingredient.currentStock <= ingredient.minStockLevel) {
            emitReservationEvent('low_stock_alert', {
              ingredientName: ingredient.name,
              currentStock: ingredient.currentStock,
              unit: ingredient.unit
            });

            automationService.sendLowStockAlert(ingredient);

            try {
              await notificationService.createNotification({
                title: 'Low Stock Warning',
                message: `Low Stock Warning: ${ingredient.name} is down to ${ingredient.currentStock} ${ingredient.unit} (Threshold: ${ingredient.minStockLevel} ${ingredient.unit})`,
                type: 'inventory',
                metadata: {
                  ingredientName: ingredient.name,
                  currentStock: ingredient.currentStock,
                  unit: ingredient.unit
                }
              });
            } catch (notifErr) {
              console.error('Low stock notification error:', notifErr);
            }
          }
        }
      }
    }

    order.inventoryDeducted = true;
    await order.save();

    emitReservationEvent('inventory_updated', {});
    return { success: true, deductedAny };
  } catch (error) {
    console.error('Error deducting stock for order:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Restore stock for a cancelled order if it was previously deducted
 */
export const restoreStockForOrder = async (order) => {
  try {
    if (!order.inventoryDeducted) {
      return { success: true, message: 'Stock was not deducted for this order' };
    }

    for (const item of order.items) {
      const dish = await Dish.findById(item.dishId).populate('recipe.ingredientId');
      if (!dish || !dish.recipe || dish.recipe.length === 0) continue;

      for (const recipeItem of dish.recipe) {
        const quantityToRestore = recipeItem.quantity * item.quantity;
        const ingredient = await Ingredient.findById(recipeItem.ingredientId?._id || recipeItem.ingredientId);

        if (ingredient) {
          ingredient.currentStock += quantityToRestore;
          await ingredient.save();

          await InventoryLog.create({
            ingredientId: ingredient._id,
            ingredientName: ingredient.name,
            type: 'Stock In',
            quantity: quantityToRestore,
            unit: ingredient.unit,
            orderNumber: order.orderNumber,
            reason: `Order #${order.orderNumber} Cancellation Return`,
            date: new Date()
          });
        }
      }
    }

    order.inventoryDeducted = false;
    await order.save();

    emitReservationEvent('inventory_updated', {});
    return { success: true };
  } catch (error) {
    console.error('Error restoring stock for order:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Record a stock movement (Stock In, Stock Out, Wastage, Adjustment)
 */
export const recordMovement = async (movementData) => {
  try {
    const { ingredientId, type, quantity, reason, notes, supplier } = movementData;
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) return { success: false, message: 'Ingredient not found' };

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return { success: false, message: 'Invalid quantity' };
    }

    if (type === 'Stock In') {
      ingredient.currentStock += qtyNum;
      ingredient.lastRestocked = new Date();
      if (supplier) ingredient.supplier = supplier;
    } else if (type === 'Stock Out' || type === 'Wastage') {
      ingredient.currentStock = Math.max(0, ingredient.currentStock - qtyNum);
    } else if (type === 'Adjustment') {
      ingredient.currentStock = qtyNum;
    }

    await ingredient.save();

    const logEntry = await InventoryLog.create({
      ingredientId: ingredient._id,
      ingredientName: ingredient.name,
      type: type || 'Stock In',
      quantity: qtyNum,
      unit: ingredient.unit,
      reason: reason || '',
      notes: notes || '',
      supplier: supplier || ingredient.supplier || '',
      date: new Date()
    });

    // Check low stock alert after reduction
    if (ingredient.currentStock <= ingredient.minStockLevel) {
      emitReservationEvent('low_stock_alert', {
        ingredientName: ingredient.name,
        currentStock: ingredient.currentStock,
        unit: ingredient.unit
      });
      automationService.sendLowStockAlert(ingredient);

      try {
        await notificationService.createNotification({
          title: 'Low Stock Warning',
          message: `Low Stock Warning: ${ingredient.name} is down to ${ingredient.currentStock} ${ingredient.unit} (Threshold: ${ingredient.minStockLevel} ${ingredient.unit})`,
          type: 'inventory',
          metadata: {
            ingredientName: ingredient.name,
            currentStock: ingredient.currentStock,
            unit: ingredient.unit
          }
        });
      } catch (notifErr) {
        console.error('Low stock notification error:', notifErr);
      }
    }

    emitReservationEvent('inventory_updated', ingredient);
    return { success: true, ingredient, log: logEntry };
  } catch (error) {
    console.error('Error recording movement:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get movement / usage logs
 */
export const getInventoryLogs = async (ingredientId = null) => {
  const query = ingredientId ? { ingredientId } : {};
  return await InventoryLog.find(query).sort({ createdAt: -1 }).limit(100);
};

/**
 * Get all ingredients
 */
export const getAllIngredients = async () => {
  return await Ingredient.find().sort({ name: 1 });
};

/**
 * Update stock level (Manual Restock)
 */
export const updateStock = async (ingredientId, amount, type = 'add') => {
  const ingredient = await Ingredient.findById(ingredientId);
  if (!ingredient) throw new Error('Ingredient not found');

  if (type === 'add') {
    ingredient.currentStock += Number(amount);
    ingredient.lastRestocked = new Date();
  } else {
    ingredient.currentStock = Number(amount);
  }

  await ingredient.save();

  await InventoryLog.create({
    ingredientId: ingredient._id,
    ingredientName: ingredient.name,
    type: type === 'add' ? 'Stock In' : 'Adjustment',
    quantity: Number(amount),
    unit: ingredient.unit,
    reason: 'Manual Restock / Adjustment',
    date: new Date()
  });

  emitReservationEvent('inventory_updated', ingredient);
  return ingredient;
};

/**
 * Check for expiring items
 */
export const checkExpiry = async () => {
  try {
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const expiringSoon = await Ingredient.find({
      expiryDate: { $lte: threeDaysLater, $gte: today }
    });

    for (const item of expiringSoon) {
      emitReservationEvent('expiry_alert', {
        name: item.name,
        expiryDate: item.expiryDate,
        currentStock: item.currentStock,
        unit: item.unit
      });

      try {
        await notificationService.createNotification({
          title: 'Expiring Item Warning',
          message: `Expiry Alert: ${item.name} is expiring soon on ${new Date(item.expiryDate).toLocaleDateString()} (${item.currentStock} ${item.unit} remaining)`,
          type: 'inventory',
          metadata: {
            ingredientName: item.name,
            currentStock: item.currentStock,
            unit: item.unit
          }
        });
      } catch (eErr) {
        console.error('Expiry notification error:', eErr);
      }
    }
    return expiringSoon;
  } catch (error) {
    console.error('Error checking expiry:', error);
  }
};
