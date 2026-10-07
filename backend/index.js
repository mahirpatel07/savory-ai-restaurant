import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import multer from 'multer';
import fs from 'fs';
import Reservation from './models/Reservation.js';
import Dish from './models/Dish.js';
import Table from './models/Table.js';
import Notification from './models/Notification.js';
import Order from './models/Order.js';
import { initSocket, emitReservationEvent } from './services/socket.js';
import { selectBestTable } from './services/availability.js';
import { runReservationGraph } from './services/reservationGraph.js';
import { createConfirmedReservation, formatReservationForClient } from './services/reservationService.js';
import { createVoiceSession } from './services/ultravoxService.js';
import { getNotifications, markAsRead, markAllAsRead } from './services/notificationService.js';
import * as orderService from './services/orderService.js';
import * as inventoryService from './services/inventoryService.js';
import * as analyticsService from './services/analyticsService.js';
import * as staffService from './services/staffService.js';
import * as settingService from './services/settingService.js';
import Ingredient from './models/Ingredient.js';
import User from './models/User.js';
import Attendance from './models/Attendance.js';
import Waitlist from './models/Waitlist.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import Review from './models/Review.js';
import PromoCode from './models/PromoCode.js';
import { protect, admin } from './middleware/auth.js';
import * as authService from './services/authService.js';

const app = express();
const server = createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://0.0.0.0:5173,http://192.168.1.218:5173,http://localhost:3001,http://127.0.0.1:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── MULTER CONFIGURATION ──
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, .jpeg and .webp formats are allowed!'));
    }
  }
});

app.use('/uploads', express.static(uploadsDir));

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/savory';

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    const stats = await Reservation.aggregate([
      { $group: { _id: "$phone" } },
      { $count: "count" }
    ]);
    const customersCount = stats[0]?.count || 0;

    // We can add other stats here later if needed
    res.json({
      customers: customersCount
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch dashboard stats' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, state, history, voiceMode } = req.body || {};
    const result = await runReservationGraph({ message, state, history, voiceMode });
    return res.json(result);
  } catch (error) {
    // Detailed backend logging (safe from frontend)
    console.error('AI Chat Failure:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    const errorMessage = error.message || '';
    if (errorMessage.includes('model_not_found') || errorMessage.includes('404')) {
      return res.status(500).json({
        success: false,
        message: `AI Model Error: The configured model '${process.env.GROQ_MODEL}' was not found.`,
        code: 'AI_MODEL_NOT_FOUND'
      });
    }

    if (errorMessage.includes('api_key') || errorMessage.includes('unauthorized') || error.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'AI Authentication Error: Please check your GROQ_API_KEY.',
        code: 'AI_AUTH_ERROR'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'The AI assistant is temporarily unavailable. Please try again in a moment.',
      code: 'AI_SERVICE_ERROR'
    });
  }
});

app.post('/api/voice/join', async (req, res) => {
  try {
    const session = await createVoiceSession();
    res.json(session);
  } catch (error) {
    console.error('Ultravox session error detail:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create voice session',
      details: error.response?.data || error.message
    });
  }
});

app.post('/api/ai/check-table', async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { name, phone, date, time, guestCount, preference, tableStatuses = [] } = req.body;
    const requestedGuests = Number(guestCount || 2);

    console.log(`[AVAILABILITY REQUEST]\nrequestId: ${requestId}\ndate: ${date}\ntime: ${time}\nguests: ${requestedGuests}`);

    let tables = [];
    const dbTables = await Table.find({}).sort({ tableNumber: 1 }).lean();
    if (dbTables.length > 0) {
      tables = dbTables.map((table) => ({
        id: table.tableNumber,
        tableNumber: table.tableNumber,
        seats: table.seats,
        status: table.status || 'available',
        updatedAt: table.updatedAt,
        reservationDate: table.reservationDate,
        reservationTime: table.reservationTime
      }));
    } else if (tableStatuses.length > 0) {
      tables = tableStatuses.map((table) => ({
        id: table.id,
        tableNumber: table.id,
        seats: table.seats || 2,
        status: table.status || 'available',
        updatedAt: table.updatedAt,
        reservationDate: table.reservationDate,
        reservationTime: table.reservationTime
      }));
    } else {
      tables = Array.from({ length: 12 }).map((_, index) => ({
        id: index + 1,
        seats: [2, 2, 4, 4, 6, 8][index % 6] || 2,
        status: 'available'
      }));
    }

    const existingReservations = await Reservation.find({ status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] } });
    const availability = selectBestTable({
      guestCount: requestedGuests,
      requestedDate: date || 'Today',
      requestedTime: time || '7:00 PM',
      tables,
      reservations: existingReservations.map((reservation) => ({
        tableId: reservation.suggestedTable || reservation.tableId,
        tableNumbers: reservation.tableNumbers || [],
        date: reservation.date,
        time: reservation.time,
        duration: reservation.duration
      }))
    });

    if (!availability.available) {
      return res.status(200).json({
        available: false,
        message: availability.message,
        suggestedTimes: availability.suggestedTimes,
        reason: 'No suitable table available.'
      });
    }

    const formattedDate = date || 'Today';
    const formattedTime = time || '7:00 PM';

    console.log(`[AVAILABILITY RESPONSE]\nrequestId: ${requestId}\ntable: T${availability.table.id}`);

    return res.status(200).json({
      available: true,
      table: {
        id: availability.table.id,
        seats: availability.table.seats,
        name,
        phone,
        date: formattedDate,
        time: formattedTime,
        guestCount: requestedGuests,
        preference
      },
      confidence: availability.confidence,
      reason: availability.reason,
      suggestedTimes: availability.suggestedTimes || []
    });
  } catch (error) {
    console.error('Error checking table availability:', error);
    return res.status(500).json({ available: false, message: 'Unable to check table availability' });
  }
});

app.post('/api/reservation', async (req, res) => {
  try {
    const payload = req.body;
    const result = await createConfirmedReservation({
      name: payload.name,
      phone: payload.phone,
      date: payload.date,
      time: payload.time,
      guests: Number(payload.guests || payload.guestCount || 2),
      preference: payload.preference || 'No Preference',
      tableId: payload.tableId || payload.suggestedTable || null,
      tableNumbers: payload.tableNumbers || [],
      tableCapacity: payload.tableCapacity || null,
      suggestedTable: payload.suggestedTable || null,
      confidence: payload.confidence || 0,
      duration: Number(payload.duration || 120),
      vip: Boolean(payload.vip || false),
      waiter: payload.waiter || '',
      source: payload.source || 'ai-chat',
      reason: payload.reason || '',
      suggestedTimes: payload.suggestedTimes || [],
      approvedBy: 'AI',
      reservationSource: payload.source === 'voice-agent' ? 'VOICE' : 'AI_CHAT'
    });

    if (result.success === false) {
      return res.status(409).json({
        success: false,
        message: result.message || 'The selected table is no longer available.',
        error: result.error
      });
    }

    const { reservation, formattedReservation } = result;
    return res.status(201).json({ success: true, reservation: { ...reservation.toObject(), id: reservation._id.toString() }, formattedReservation });
  } catch (error) {
    console.error('Reservation creation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create reservation' });
  }
});

app.get('/api/reservations', async (_req, res) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 });
    return res.json(reservations.map(formatReservationForClient));
  } catch (error) {
    console.error('Error loading reservations:', error);
    return res.status(500).json({ message: 'Unable to load reservations' });
  }
});

// ── NOTIFICATION API ENDPOINTS ──

app.get('/api/notifications', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await getNotifications(limit);
    const unreadCount = await Notification.countDocuments({ read: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch notifications' });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id);
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Unable to update notification' });
  }
});

app.post('/api/notifications/read-all', async (_req, res) => {
  try {
    await markAllAsRead();
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Unable to update notifications' });
  }
});

// ── MENU API ENDPOINTS ──

app.get('/api/menu', async (_req, res) => {
  try {
    const dishes = await Dish.find().sort({ createdAt: -1 });
    res.json(dishes);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch menu' });
  }
});

app.post('/api/menu', upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, category, tags } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dish image is required' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const dish = await Dish.create({
      name,
      price: Number(price),
      description,
      category,
      image: imageUrl,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : []
    });

    emitReservationEvent('dish_created', dish);

    res.status(201).json(dish);
  } catch (error) {
    console.error('Error creating dish:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to create dish' });
  }
});

app.patch('/api/menu/:id/toggle', async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) {
      return res.status(404).json({ success: false, message: 'Dish not found' });
    }
    dish.available = !dish.available;
    await dish.save();

    emitReservationEvent('menu_updated', dish);
    res.json(dish);
  } catch (error) {
    console.error('Error toggling dish availability:', error);
    res.status(500).json({ success: false, message: 'Unable to toggle dish availability' });
  }
});

app.patch('/api/menu/:id', async (req, res) => {
  try {
    const dish = await Dish.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dish) {
      return res.status(404).json({ success: false, message: 'Dish not found' });
    }
    emitReservationEvent('menu_updated', dish);
    res.json(dish);
  } catch (error) {
    console.error('Error updating dish:', error);
    res.status(500).json({ success: false, message: 'Unable to update dish' });
  }
});

// ── POS & ORDERING API ENDPOINTS ──

app.get('/api/orders', async (req, res) => {
  try {
    const { status, tableNumber } = req.query;
    let query = {};
    if (status) query.status = status;
    if (tableNumber) query.tableNumber = Number(tableNumber);

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  const result = await orderService.createOrder(req.body);
  if (result.success) {
    res.status(201).json(result.order);
  } else {
    res.status(500).json(result);
  }
});

app.patch('/api/orders/:id', async (req, res) => {
  const result = await orderService.updateOrder(req.params.id, req.body);
  if (result.success) {
    res.json(result.order);
  } else {
    res.status(500).json(result);
  }
});

app.post('/api/orders/:id/pay', async (req, res) => {
  const result = await orderService.processPayment(req.params.id, req.body);
  if (result.success) {
    res.json(result.order);
  } else {
    res.status(400).json(result);
  }
});

app.get('/api/orders/active', async (_req, res) => {
  try {
    const orders = await orderService.getActiveOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch active orders' });
  }
});

app.get('/api/orders/table/:tableNumber', async (req, res) => {
  try {
    const orders = await orderService.getTableOrders(Number(req.params.tableNumber));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch table orders' });
  }
});

// ── INVENTORY API ENDPOINTS ──

app.get('/api/inventory', async (_req, res) => {
  try {
    const ingredients = await inventoryService.getAllIngredients();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch inventory' });
  }
});

app.post('/api/inventory/seed', async (_req, res) => {
  try {
    const defaultIngredients = [
      { name: 'A5 Wagyu Beef', category: 'Proteins', currentStock: 12, minStockLevel: 5, unit: 'kg', costPerUnit: 120 },
      { name: 'Black Truffle Oil', category: 'Pantry & Oils', currentStock: 3, minStockLevel: 5, unit: 'liters', costPerUnit: 45 },
      { name: 'Artisanal Mozzarella', category: 'Dairy & Cheese', currentStock: 25, minStockLevel: 10, unit: 'kg', costPerUnit: 14 },
      { name: 'Wild Chanterelle Mushrooms', category: 'Fresh Produce', currentStock: 8, minStockLevel: 10, unit: 'kg', costPerUnit: 28 },
      { name: 'Organic Sourdough Flour', category: 'Pantry & Oils', currentStock: 80, minStockLevel: 20, unit: 'kg', costPerUnit: 3.5 },
      { name: 'Grade-A Heavy Cream', category: 'Dairy & Cheese', currentStock: 18, minStockLevel: 8, unit: 'liters', costPerUnit: 6.5 },
      { name: 'Haas Avocados', category: 'Fresh Produce', currentStock: 4, minStockLevel: 15, unit: 'pcs', costPerUnit: 1.8 },
      { name: 'Matcha Green Tea Powder', category: 'Beverages', currentStock: 15, minStockLevel: 5, unit: 'kg', costPerUnit: 32 },
      { name: 'Spanish Saffron Strands', category: 'Pantry & Oils', currentStock: 2, minStockLevel: 3, unit: 'g', costPerUnit: 15 },
      { name: 'Vintage Pinot Noir Base', category: 'Beverages', currentStock: 24, minStockLevel: 10, unit: 'pcs', costPerUnit: 22 }
    ];

    for (const item of defaultIngredients) {
      await Ingredient.findOneAndUpdate({ name: item.name }, item, { upsert: true, new: true });
    }

    const all = await Ingredient.find().sort({ name: 1 });
    emitReservationEvent('inventory_updated', {});
    return res.json({ success: true, ingredients: all });
  } catch (err) {
    console.error('Error seeding inventory:', err);
    return res.status(500).json({ success: false, message: 'Failed to seed inventory' });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    emitReservationEvent('inventory_updated', ingredient);
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to create ingredient' });
  }
});

app.patch('/api/inventory/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    emitReservationEvent('inventory_updated', ingredient);
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to update ingredient' });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await Ingredient.findByIdAndDelete(req.params.id);
    emitReservationEvent('inventory_updated', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to delete ingredient' });
  }
});

app.post('/api/inventory/movement', async (req, res) => {
  const result = await inventoryService.recordMovement(req.body);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get('/api/inventory/logs', async (req, res) => {
  try {
    const logs = await inventoryService.getInventoryLogs(req.query.ingredientId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch inventory logs' });
  }
});

// ── STAFF MANAGEMENT API ENDPOINTS ──

app.get('/api/staff', async (_req, res) => {
  try {
    const staff = await staffService.getAllStaff();
    res.json(staff);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch staff list' });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const staff = await staffService.createStaff(req.body);
    emitReservationEvent('staff_updated', {});
    res.status(201).json(staff);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.patch('/api/staff/:id', async (req, res) => {
  try {
    const staff = await staffService.updateStaff(req.params.id, req.body);
    emitReservationEvent('staff_updated', {});
    res.json(staff);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.patch('/api/staff/:id/toggle', async (req, res) => {
  try {
    const staff = await staffService.toggleStaffStatus(req.params.id);
    emitReservationEvent('staff_updated', {});
    res.json(staff);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/staff/seed', async (_req, res) => {
  try {
    const staff = await staffService.seedStaffDefaults();
    emitReservationEvent('staff_updated', {});
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to seed staff' });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    emitReservationEvent('staff_updated', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to delete staff member' });
  }
});

// ── RESTAURANT SETTINGS API ENDPOINTS ──

app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await settingService.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to fetch settings' });
  }
});

app.patch('/api/settings', async (req, res) => {
  try {
    const settings = await settingService.updateSettings(req.body);
    emitReservationEvent('settings_updated', settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to update settings' });
  }
});

app.post('/api/settings/branches', async (req, res) => {
  try {
    const settings = await settingService.saveBranch(req.body);
    emitReservationEvent('settings_updated', settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to save branch' });
  }
});

app.post('/api/settings/printers', async (req, res) => {
  try {
    const settings = await settingService.savePrinter(req.body);
    emitReservationEvent('settings_updated', settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to save printer' });
  }
});

app.post('/api/settings/printers/:id/test', async (req, res) => {
  try {
    const result = await settingService.testPrint(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Test print failed' });
  }
});

// ── REVIEWS & FEEDBACK API ENDPOINTS ──

app.get('/api/reviews', async (_req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

app.get('/api/reviews/stats', async (_req, res) => {
  try {
    const reviews = await Review.find();
    const totalCount = reviews.length;
    if (totalCount === 0) {
      return res.json({
        totalCount: 0,
        averageRating: 0,
        foodAverage: 0,
        serviceAverage: 0,
        ambianceAverage: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
    }

    const sumRating = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avgRating = (sumRating / totalCount).toFixed(1);

    const foodSum = reviews.reduce((acc, r) => acc + (r.categoryRatings?.food || r.rating || 0), 0);
    const serviceSum = reviews.reduce((acc, r) => acc + (r.categoryRatings?.service || r.rating || 0), 0);
    const ambianceSum = reviews.reduce((acc, r) => acc + (r.categoryRatings?.ambiance || r.rating || 0), 0);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      distribution[star] = (distribution[star] || 0) + 1;
    });

    res.json({
      totalCount,
      averageRating: Number(avgRating),
      foodAverage: Number((foodSum / totalCount).toFixed(1)),
      serviceAverage: Number((serviceSum / totalCount).toFixed(1)),
      ambianceAverage: Number((ambianceSum / totalCount).toFixed(1)),
      distribution
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate review stats' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { orderNumber, customerName, rating, comment, categoryRatings, dishesReviewed } = req.body;
    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    const newReview = new Review({
      orderNumber: orderNumber || `T-${Date.now().toString().slice(-4)}`,
      customerName: customerName || 'Guest',
      rating,
      comment: comment || '',
      categoryRatings: categoryRatings || { food: rating, service: rating, ambiance: rating },
      dishesReviewed: dishesReviewed || []
    });

    await newReview.save();
    emitReservationEvent('review_created', newReview);
    res.status(201).json({ success: true, review: newReview });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    emitReservationEvent('review_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
});

// ── DIGITAL WAITLIST (SMART QUEUE MANAGEMENT) API ENDPOINTS ──

app.get('/api/waitlist', async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = {
        $or: [
          { status: { $in: ['waiting', 'notified'] } },
          { createdAt: { $gte: today } }
        ]
      };
    }
    const items = await Waitlist.find(query).sort({ tokenNumber: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch waitlist' });
  }
});

app.get('/api/waitlist/stats', async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayItems = await Waitlist.find({ createdAt: { $gte: today } });
    const waitingCount = todayItems.filter(i => ['waiting', 'notified'].includes(i.status)).length;
    const seatedCount = todayItems.filter(i => i.status === 'seated').length;
    const cancelledCount = todayItems.filter(i => i.status === 'cancelled').length;

    const avgWaitMinutes = Math.max(5, waitingCount * 8);

    res.json({
      waitingCount,
      seatedCount,
      cancelledCount,
      totalToday: todayItems.length,
      avgWaitMinutes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch waitlist stats' });
  }
});

app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, phone, partySize, notes } = req.body;
    if (!name || !phone || !partySize) {
      return res.status(400).json({ success: false, message: 'Name, phone, and party size are required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastToken = await Waitlist.findOne({ createdAt: { $gte: today } }).sort({ tokenNumber: -1 });
    const nextTokenNumber = lastToken ? lastToken.tokenNumber + 1 : 101;

    const currentWaiting = await Waitlist.countDocuments({ status: { $in: ['waiting', 'notified'] } });
    const calculatedWait = Math.max(10, (currentWaiting * 10) + (Number(partySize) > 4 ? 15 : 0));

    const newWaitlistItem = new Waitlist({
      name,
      phone,
      partySize: Number(partySize),
      tokenNumber: nextTokenNumber,
      status: 'waiting',
      estimatedWait: calculatedWait
    });

    await newWaitlistItem.save();
    emitReservationEvent('waitlist_updated', newWaitlistItem);
    res.status(201).json({ success: true, item: newWaitlistItem });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    res.status(500).json({ success: false, message: 'Failed to add to waitlist' });
  }
});

app.patch('/api/waitlist/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === 'notified') {
      updateData.notifiedAt = new Date();
    }

    const updated = await Waitlist.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Waitlist item not found' });
    }

    emitReservationEvent('waitlist_updated', updated);
    if (status === 'notified') {
      emitReservationEvent('waitlist_notified', updated);
    }
    res.json({ success: true, item: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update waitlist status' });
  }
});

app.delete('/api/waitlist/:id', async (req, res) => {
  try {
    await Waitlist.findByIdAndDelete(req.params.id);
    emitReservationEvent('waitlist_updated', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete waitlist entry' });
  }
});

// ── ANALYTICS API ENDPOINTS ──

app.get('/api/analytics/summary', async (req, res) => {
  try {
    const { period = 'today', orderType = 'all' } = req.query;
    const data = await analyticsService.getAnalyticsSummary(period, orderType);
    res.json({
      todayRevenue: data.totalSales,
      totalSales: data.totalSales,
      todayOrders: data.totalOrders,
      totalOrders: data.totalOrders,
      averageOrderValue: data.averageOrderValue,
      paidOrderCount: data.paidOrderCount,
      period: data.period,
      orderType: data.orderType
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch analytics summary' });
  }
});

app.get('/api/analytics/reporting', async (req, res) => {
  try {
    const { period = 'weekly', orderType = 'all' } = req.query;
    const report = await analyticsService.getDetailedAnalyticsReport(period, orderType);
    res.json(report);
  } catch (error) {
    console.error('Reporting error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch reporting data' });
  }
});

// ── AI-POWERED UP-SELLING & RECOMMENDATION ENDPOINT ──

app.post('/api/ai/recommendations', async (req, res) => {
  try {
    const { cartItems = [], dishes: clientDishes } = req.body || {};

    let allDishes = clientDishes;
    if (!allDishes || allDishes.length === 0) {
      allDishes = await Dish.find().lean();
    }

    if (!allDishes || allDishes.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    const cartDishIds = new Set(cartItems.map(item => item.dishId || item._id || item.id));
    const cartCategories = new Set(cartItems.map(item => (item.category || '').toLowerCase()));

    // Filter out items that are already in cart OR currently Sold Out
    const remainingDishes = allDishes.filter(d =>
      d.available !== false &&
      !cartDishIds.has(d._id) &&
      !cartDishIds.has(d.id)
    );

    if (remainingDishes.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    const recommendations = [];

    // 1. Beverage / Drink Pairing Rule
    const hasBeverage = Array.from(cartCategories).some(c => c.includes('drink') || c.includes('beverage') || c.includes('wine'));
    if (!hasBeverage) {
      const drinks = remainingDishes.filter(d => {
        const cat = (d.category || '').toLowerCase();
        return cat.includes('drink') || cat.includes('beverage') || cat.includes('wine') || cat.includes('cocktail');
      });
      if (drinks.length > 0) {
        recommendations.push({
          dish: drinks[0],
          reason: 'Sommelier Recommended Pairing to balance flavors',
          matchScore: 98,
          tag: 'PERFECT PAIRING'
        });
      }
    }

    // 2. Dessert Finish Rule
    const hasDessert = Array.from(cartCategories).some(c => c.includes('dessert') || c.includes('sweet'));
    if (!hasDessert) {
      const desserts = remainingDishes.filter(d => {
        const cat = (d.category || '').toLowerCase();
        return cat.includes('dessert') || cat.includes('sweet');
      });
      if (desserts.length > 0) {
        recommendations.push({
          dish: desserts[0],
          reason: 'Top Rated Sweet Finale selected by guests',
          matchScore: 96,
          tag: 'DESSERT RECOMMENDATION'
        });
      }
    }

    // 3. Chef Special / High Margin Upgrade
    if (recommendations.length < 2) {
      const specials = remainingDishes.filter(d =>
        (d.tags && (d.tags.includes('Chef Special') || d.tags.includes('Signature'))) || d.price >= 20
      );
      if (specials.length > 0 && !recommendations.some(r => r.dish._id === specials[0]._id)) {
        recommendations.push({
          dish: specials[0],
          reason: 'Chef\'s High-Margin Signature recommendation',
          matchScore: 94,
          tag: 'CHEF SELECTION'
        });
      }
    }

    // Fallback if still under 2
    if (recommendations.length < 2 && remainingDishes.length > 0) {
      for (const dish of remainingDishes) {
        if (!recommendations.some(r => r.dish._id === dish._id)) {
          recommendations.push({
            dish,
            reason: 'Popular dish item frequently ordered together',
            matchScore: 91,
            tag: 'POPULAR COMBO'
          });
        }
        if (recommendations.length >= 2) break;
      }
    }

    return res.json({
      success: true,
      recommendations: recommendations.slice(0, 2)
    });

  } catch (error) {
    console.error('Recommendation Engine Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AI recommendations' });
  }
});

// ── FUTURISTIC ADMIN VOICE CONTROL API ENDPOINT ──

app.post('/api/admin/voice-command', async (req, res) => {
  try {
    const { command = '' } = req.body || {};
    const cmd = command.toLowerCase().trim();

    // 1. Navigation / Route Intents
    if (cmd.includes('dashboard') || cmd.includes('home') || cmd.includes('overview')) {
      return res.json({
        success: true,
        action: 'navigate',
        route: '/admin',
        spokenText: 'Navigating to Ops Dashboard.',
        displayText: 'Opened Ops Dashboard Command Center.'
      });
    }

    if (cmd.includes('inventory') || cmd.includes('stock level')) {
      const ingredients = await Ingredient.find().lean();
      const lowStock = ingredients.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 10));
      const spokenText = lowStock.length > 0
        ? `Opening inventory. Warning: ${lowStock.length} items are currently at or below minimum stock levels.`
        : `Opening inventory. All ${ingredients.length} items are at healthy stock levels.`;

      return res.json({
        success: true,
        action: 'navigate_and_show',
        route: '/admin/inventory',
        spokenText,
        displayText: lowStock.length > 0 ? `Alert: ${lowStock.length} items low stock` : 'Inventory Status: Normal',
        data: {
          type: 'inventory',
          title: 'Inventory Telemetry',
          totalItems: ingredients.length,
          lowStockCount: lowStock.length,
          lowStockItems: lowStock.slice(0, 5).map(i => ({ name: i.name, stock: `${i.currentStock} ${i.unit}`, min: i.minStockLevel }))
        }
      });
    }

    if (cmd.includes('pos') || cmd.includes('point of sale') || cmd.includes('terminal')) {
      return res.json({
        success: true,
        action: 'navigate',
        route: '/admin/pos',
        spokenText: 'Switching to P O S terminal.',
        displayText: 'POS Terminal Active.'
      });
    }

    if (cmd.includes('kitchen') || cmd.includes('kds') || cmd.includes('display')) {
      const activeOrders = await Order.find({ status: { $in: ['pending', 'preparing'] } }).lean();
      return res.json({
        success: true,
        action: 'navigate_and_show',
        route: '/admin/kds',
        spokenText: `Opening Kitchen Display System. There are ${activeOrders.length} active orders currently being processed.`,
        displayText: `KDS Live: ${activeOrders.length} active kitchen orders.`,
        data: {
          type: 'orders',
          title: 'Kitchen Telemetry',
          activeCount: activeOrders.length,
          pending: activeOrders.filter(o => o.status === 'pending').length,
          preparing: activeOrders.filter(o => o.status === 'preparing').length
        }
      });
    }

    if (cmd.includes('table') || cmd.includes('floor') || cmd.includes('layout') || cmd.includes('seating')) {
      const tables = await Table.find().lean();
      const occupied = tables.filter(t => t.status === 'occupied').length;
      const reserved = tables.filter(t => t.status === 'reserved').length;
      const available = tables.filter(t => t.status === 'available').length;

      return res.json({
        success: true,
        action: 'navigate_and_show',
        route: '/admin/table-management',
        spokenText: `Table floor plan loaded. ${occupied} occupied, ${reserved} reserved, and ${available} tables available out of ${tables.length} total tables.`,
        displayText: `Floor Status: ${occupied} Occupied | ${reserved} Reserved | ${available} Available`,
        data: {
          type: 'tables',
          title: 'Floor Occupancy',
          total: tables.length,
          occupied,
          reserved,
          available,
          occupancyRate: Math.round(((occupied + reserved) / (tables.length || 1)) * 100) + '%'
        }
      });
    }

    if (cmd.includes('reservation') || cmd.includes('booking')) {
      const reservations = await Reservation.find({ status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] } }).lean();
      return res.json({
        success: true,
        action: 'navigate_and_show',
        route: '/admin/reservations',
        spokenText: `Opening reservation management. You have ${reservations.length} active reservations on schedule.`,
        displayText: `Bookings: ${reservations.length} active reservations found.`,
        data: {
          type: 'reservations',
          title: 'Reservation Overview',
          activeCount: reservations.length,
          pendingCount: reservations.filter(r => r.status === 'pending').length
        }
      });
    }

    if (cmd.includes('menu')) {
      const dishes = await Dish.find().lean();
      return res.json({
        success: true,
        action: 'navigate',
        route: '/admin/menu',
        spokenText: `Opening Menu Management. You have ${dishes.length} menu dishes active.`,
        displayText: `Menu Manager: ${dishes.length} items configured.`
      });
    }

    if (cmd.includes('ai') || cmd.includes('copilot') || cmd.includes('assistant')) {
      return res.json({
        success: true,
        action: 'navigate',
        route: '/admin/ai',
        spokenText: 'Launching AI Copilot Intelligence Center.',
        displayText: 'AI Copilot Active.'
      });
    }

    // 2. Telemetry Queries (Data without navigation or with live summary)
    if (cmd.includes('revenue') || cmd.includes('sales') || cmd.includes('earn') || cmd.includes('money')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = await Order.find({ createdAt: { $gte: today }, status: 'paid' }).lean();
      const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const orderCount = todayOrders.length;
      const avgOrder = orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : '0.00';

      return res.json({
        success: true,
        action: 'show_telemetry',
        spokenText: `Today's total revenue is ${totalRevenue.toFixed(0)} dollars from ${orderCount} completed orders, with an average ticket of ${avgOrder} dollars.`,
        displayText: `Sales Today: $${totalRevenue.toFixed(2)} (${orderCount} orders, avg $${avgOrder})`,
        data: {
          type: 'revenue',
          title: 'Daily Sales Performance',
          totalRevenue: `$${totalRevenue.toFixed(2)}`,
          orderCount,
          avgOrderValue: `$${avgOrder}`
        }
      });
    }

    if (cmd.includes('profit') || cmd.includes('margin')) {
      const orders = await Order.find({ status: 'paid' }).lean();
      let totalRevenue = 0;
      orders.forEach(o => totalRevenue += (o.totalAmount || 0));
      const estimatedCost = totalRevenue * 0.35; // 35% COGS estimate
      const profit = totalRevenue - estimatedCost;
      const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0.0';

      return res.json({
        success: true,
        action: 'show_telemetry',
        spokenText: `Estimated total profit is ${profit.toFixed(0)} dollars with an average profit margin of ${margin} percent.`,
        displayText: `Profitability: $${profit.toFixed(2)} (${margin}% Margin)`,
        data: {
          type: 'profit',
          title: 'Financial Margin Analysis',
          profit: `$${profit.toFixed(2)}`,
          estimatedCost: `$${estimatedCost.toFixed(2)}`,
          profitMargin: `${margin}%`
        }
      });
    }

    if (cmd.includes('alert') || cmd.includes('low stock') || cmd.includes('warning')) {
      const ingredients = await Ingredient.find().lean();
      const lowStock = ingredients.filter(i => (i.currentStock || 0) <= (i.minStockLevel || 10));

      if (lowStock.length === 0) {
        return res.json({
          success: true,
          action: 'show_telemetry',
          spokenText: 'All ingredient stock levels are currently optimal. No low stock alerts detected.',
          displayText: 'Stock Status: Optimal (0 Alerts)',
          data: { type: 'alert', title: 'System Alerts', alerts: [] }
        });
      }

      const names = lowStock.map(i => i.name).join(', ');
      return res.json({
        success: true,
        action: 'show_telemetry',
        spokenText: `Found ${lowStock.length} items needing restock: ${names}.`,
        displayText: `Stock Alerts (${lowStock.length}): ${names}`,
        data: {
          type: 'alert',
          title: 'Critical Stock Alerts',
          alerts: lowStock.map(i => `${i.name}: ${i.currentStock} ${i.unit} (Min: ${i.minStockLevel})`)
        }
      });
    }

    if (cmd.includes('help') || cmd.includes('what can you do') || cmd.includes('command')) {
      return res.json({
        success: true,
        action: 'show_help',
        spokenText: 'You can command me to open Dashboard, Inventory, POS, Kitchen Display, or Table layout. You can also ask for revenue summaries, stock alerts, or profit margins.',
        displayText: 'Available Voice Commands:',
        data: {
          type: 'help',
          title: 'Tactical Voice Commands',
          commands: [
            'Open Dashboard / Overview',
            'Check low stock alerts / Inventory',
            'Switch to POS Terminal',
            'Show Kitchen Display / Active Orders',
            'View Table layout / Floor status',
            'Show today\'s revenue & sales',
            'Check profit & financial margins',
            'View reservations & bookings',
            'Ask AI strategy / copilot advice'
          ]
        }
      });
    }

    // 3. Fallback to AI Copilot
    try {
      const aiResult = await runReservationGraph({ message: command, voiceMode: true });
      return res.json({
        success: true,
        action: 'ai_response',
        spokenText: aiResult.message || `Processed query: ${command}`,
        displayText: aiResult.message || `Processed query: ${command}`,
        data: {
          type: 'ai',
          title: 'AI Copilot Insight',
          response: aiResult.message
        }
      });
    } catch {
      return res.json({
        success: true,
        action: 'text_fallback',
        spokenText: `I heard: ${command}. I can help you navigate or check sales, inventory, and floor status.`,
        displayText: `Recognized: "${command}"`
      });
    }

  } catch (error) {
    console.error('Error in /api/admin/voice-command:', error);
    res.status(500).json({ success: false, message: 'Voice command processing failed' });
  }
});

// ── AUTH API ENDPOINTS ──

app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUser(email, password);
    res.json(user);
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/profile', protect, async (req, res) => {
  res.json(req.user);
});

// ── CUSTOMER DASHBOARD ENDPOINTS ──

app.get('/api/customer/orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ customerPhone: req.user.phone }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

app.get('/api/customer/reservations', protect, async (req, res) => {
  try {
    const reservations = await Reservation.find({ phone: req.user.phone }).sort({ date: -1, time: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching reservations' });
  }
});

app.patch('/api/customer/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.preferences = { ...user.preferences, ...req.body };
    await user.save();
    res.json(user.preferences);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating preferences' });
  }
});

// ── CUSTOMER LOYALTY ──
app.get('/api/customers/search', async (req, res) => {
  try {
    const { query } = req.query;
    const customers = await User.find({
      $or: [
        { name: new RegExp(query, 'i') },
        { phone: new RegExp(query, 'i') },
        { email: new RegExp(query, 'i') }
      ]
    }).limit(10);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error searching customers' });
  }
});

app.get('/api/customers/profile/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    if (!user) return res.status(404).json({ success: false, message: 'Customer not found' });

    const orders = await Order.find({ customerPhone: req.params.phone }).sort({ createdAt: -1 });
    res.json({ user, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

app.patch('/api/customers/preferences/:phone', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { phone: req.params.phone },
      { $set: { notes: req.body.notes } },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating preferences' });
  }
});

// ── DIGITAL WAITER ──
app.post('/api/notifications/call-waiter', async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const notification = await Notification.create({
      type: 'waiter_call',
      title: 'Waiter Requested',
      message: `Table ${tableNumber} is calling for service.`,
      metadata: { tableNumber }
    });

    emitReservationEvent('waiter_call', {
      tableNumber,
      notificationId: notification._id
    });

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calling waiter' });
  }
});




app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, suggestedTimes, tableId, date, time, duration, vip, waiter } = req.body;

    let reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const previousTableId = reservation.tableId;
    const previousTableNumbers = reservation.tableNumbers || (previousTableId ? [previousTableId] : []);

    // 1. Handle status updates and table status sync
    if (status) {
      reservation.status = status;
    }

    if (reason !== undefined) reservation.reason = reason;
    if (suggestedTimes !== undefined) reservation.suggestedTimes = suggestedTimes;

    // Handle date/time moving
    if (date) reservation.date = date;
    if (time) reservation.time = time;
    if (duration !== undefined) reservation.duration = Number(duration);
    if (vip !== undefined) reservation.vip = Boolean(vip);
    if (waiter !== undefined) reservation.waiter = waiter;

    // Handle table changing
    let targetTableId = tableId !== undefined ? tableId : reservation.tableId;
    let targetTableNumbers = reservation.tableNumbers || [];

    // Approve flow: assign table if none is assigned
    if ((status === 'approved' || status === 'confirmed') && (!targetTableId && targetTableNumbers.length === 0)) {
      const dbTables = await Table.find({}).sort({ tableNumber: 1 }).lean();
      const tables = dbTables.map((table) => ({
        id: table.tableNumber,
        tableNumber: table.tableNumber,
        seats: table.seats,
        status: table.status || 'available',
        updatedAt: table.updatedAt,
        reservationDate: table.reservationDate,
        reservationTime: table.reservationTime
      }));
      const existingReservations = await Reservation.find({ status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] }, _id: { $ne: id } });
      
      const availability = selectBestTable({
        guestCount: reservation.guests,
        requestedDate: reservation.date,
        requestedTime: reservation.time,
        tables,
        reservations: existingReservations.map((r) => ({
          tableId: r.suggestedTable || r.tableId,
          tableNumbers: r.tableNumbers || [],
          date: r.date,
          time: r.time,
          duration: r.duration
        }))
      });

      if (availability.available) {
        targetTableId = availability.table?.id || availability.tableIds?.[0];
        targetTableNumbers = availability.tableIds || [targetTableId];
      }
    }

    // Apply table change if needed
    const tablesChanged = tableId !== undefined || targetTableNumbers.length > 0;
    if (tablesChanged && JSON.stringify(targetTableNumbers) !== JSON.stringify(previousTableNumbers)) {
      // Release previous tables if existed
      if (previousTableNumbers.length > 0) {
        await Table.updateMany(
          { tableNumber: { $in: previousTableNumbers } },
          {
            status: 'available',
            reservedBy: null,
            phone: null,
            reservationDate: null,
            reservationTime: null
          }
        );
      }
      reservation.tableId = targetTableId;
      reservation.suggestedTable = targetTableId;
      reservation.tableNumbers = targetTableNumbers;
    }

    // Save early so we have updated values
    await reservation.save();

    // Perform specific database updates on Table status based on reservation status
    const currentTableNumbers = reservation.tableNumbers || (reservation.tableId ? [reservation.tableId] : []);
    const currentStatus = reservation.status;

    if (currentTableNumbers.length > 0) {
      if (currentStatus === 'confirmed' || currentStatus === 'approved') {
        await Table.updateMany(
          { tableNumber: { $in: currentTableNumbers } },
          {
            status: 'reserved',
            reservedBy: reservation.name,
            phone: reservation.phone,
            reservationDate: reservation.date,
            reservationTime: reservation.time
          }
        );
      } else if (currentStatus === 'checked-in') {
        await Table.updateMany(
          { tableNumber: { $in: currentTableNumbers } },
          {
            status: 'occupied',
            reservedBy: reservation.name,
            phone: reservation.phone,
            reservationDate: reservation.date,
            reservationTime: reservation.time
          }
        );
      } else if (currentStatus === 'completed') {
        await Table.updateMany(
          { tableNumber: { $in: currentTableNumbers } },
          { status: 'cleaning' }
        );

        // Auto-transition from cleaning -> available after 60 seconds
        setTimeout(async () => {
          try {
            await Table.updateMany(
              { tableNumber: { $in: currentTableNumbers }, status: 'cleaning' },
              {
                status: 'available',
                reservedBy: null,
                phone: null,
                reservationDate: null,
                reservationTime: null,
                currentReservation: null
              }
            );
            const allTables = await Table.find().sort({ tableNumber: 1 }).populate('currentReservation');
            emitReservationEvent('tables_updated', { tables: allTables });
          } catch (err) {
            console.error('Error auto-releasing tables:', err);
          }
        }, 60000);
      } else if (currentStatus === 'cancelled' || currentStatus === 'declined' || currentStatus === 'no-show') {
        await Table.updateMany(
          { tableNumber: { $in: currentTableNumbers } },
          {
            status: 'available',
            reservedBy: null,
            phone: null,
            reservationDate: null,
            reservationTime: null,
            currentReservation: null
          }
        );
      } else if (date || time) {
        // If moved time, update table reservation info
        await Table.updateMany(
          { tableNumber: { $in: currentTableNumbers } },
          {
            reservationDate: reservation.date,
            reservationTime: reservation.time
          }
        );
      }
    }

    // Emit live events via socket
    const formattedRes = {
      id: reservation._id.toString(),
      name: reservation.name,
      phone: reservation.phone,
      guests: reservation.guests,
      date: reservation.date,
      time: reservation.time,
      preference: reservation.preference,
      tableId: reservation.tableId,
      status: reservation.status,
      duration: reservation.duration || 120,
      vip: reservation.vip || false,
      waiter: reservation.waiter || '',
      requestedAt: reservation.requestedAt || reservation.createdAt,
      suggestedTable: reservation.suggestedTable,
      confidence: reservation.confidence,
      reason: reservation.reason,
      suggestedTimes: reservation.suggestedTimes
    };

    if (currentStatus === 'confirmed' || currentStatus === 'approved') {
      emitReservationEvent('reservation_confirmed', { reservation: formattedRes });
    } else if (currentStatus === 'cancelled' || currentStatus === 'declined') {
      emitReservationEvent('reservation_declined', { reservation: formattedRes });
    } else if (currentStatus === 'completed') {
      emitReservationEvent('reservation_completed', { reservation: formattedRes });
    } else {
      emitReservationEvent('reservation_updated', { reservation: formattedRes });
    }

    // Always emit timeline updated for admin sync
    emitReservationEvent('timeline_updated', { reservation: formattedRes });

    // Also emit all tables to sync floor status instantly
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });

    // Emit updated stats
    try {
      const stats = await Reservation.aggregate([
        { $group: { _id: "$phone" } },
        { $count: "count" }
      ]);
      const customersCount = stats[0]?.count || 0;
      emitReservationEvent('stats_updated', { customers: customersCount });
    } catch (err) {
      console.error('Error emitting stats update:', err);
    }

    return res.json({ success: true, reservation: formattedRes });
  } catch (error) {
    console.error('Error updating reservation:', error);
    return res.status(500).json({ success: false, message: 'Unable to update reservation' });
  }
});

// ── TABLE MANAGEMENT API ENDPOINTS ──

// Seed function to initialize tables in MongoDB if database is empty
async function seedTablesIfEmpty() {
  try {
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      const defaultTables = Array.from({ length: 12 }).map((_, i) => {
        const seats = [2, 4, 6, 8][i % 4];
        const zones = ['Indoor', 'Outdoor', 'VIP', 'Bar'];
        const zone = zones[i % 4];
        return {
          tableNumber: i + 1,
          seats,
          status: 'available',
          zone,
          indoor: zone === 'Indoor' || zone === 'VIP' || zone === 'Bar',
          outdoor: zone === 'Outdoor',
          vip: zone === 'VIP',
          window: i % 3 === 0,
          family: zone === 'Indoor' && seats >= 6,
          bar: zone === 'Bar',
          notes: `Premium table in ${zone} area.`,
          posX: 120 + (i % 4) * 160,
          posY: 100 + Math.floor(i / 4) * 140
        };
      });
      await Table.insertMany(defaultTables);
      console.log('Seeded 12 default tables in MongoDB');
    }

    const dishCount = await Dish.countDocuments();
    if (dishCount === 0) {
      // We could import menuItems here, but since it's a frontend file,
      // we'll just add a few samples or the user can add them via the UI.
      // To be safe and minimal, I'll just add a couple of initial dishes.
      const sampleDishes = [
        {
          name: 'Truffle & Wild Mushroom Pizza',
          price: 28,
          description: 'Chanterelle, shiitake, and cremini mushrooms, fresh mozzarella, white truffle oil, and shaved black truffles on sourdough crust.',
          image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
          category: 'pizza',
          rating: 4.9,
          reviews: 142,
          tags: ['Chef Special', 'Vegetarian', 'Truffle']
        },
        {
          name: 'The Wagyu Gold Standard',
          price: 34,
          description: 'A5 Wagyu beef patty, white cheddar, caramelized onion compote, truffle aioli, and edible 24k gold leaf on a brioche bun.',
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
          category: 'burger',
          rating: 4.9,
          reviews: 215,
          tags: ['Signature', 'Luxury']
        }
      ];
      await Dish.insertMany(sampleDishes);
      console.log('Seeded initial dishes in MongoDB');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

async function seedIngredientsIfEmpty() {
  try {
    const count = await Ingredient.countDocuments();
    if (count === 0) {
      const defaultIngredients = [
        { name: 'A5 Wagyu Beef', category: 'Proteins', currentStock: 12, minStockLevel: 5, unit: 'kg', costPerUnit: 120 },
        { name: 'Black Truffle Oil', category: 'Pantry & Oils', currentStock: 3, minStockLevel: 5, unit: 'liters', costPerUnit: 45 },
        { name: 'Artisanal Mozzarella', category: 'Dairy & Cheese', currentStock: 25, minStockLevel: 10, unit: 'kg', costPerUnit: 14 },
        { name: 'Wild Chanterelle Mushrooms', category: 'Fresh Produce', currentStock: 8, minStockLevel: 10, unit: 'kg', costPerUnit: 28 },
        { name: 'Organic Sourdough Flour', category: 'Pantry & Oils', currentStock: 80, minStockLevel: 20, unit: 'kg', costPerUnit: 3.5 },
        { name: 'Grade-A Heavy Cream', category: 'Dairy & Cheese', currentStock: 18, minStockLevel: 8, unit: 'liters', costPerUnit: 6.5 },
        { name: 'Haas Avocados', category: 'Fresh Produce', currentStock: 4, minStockLevel: 15, unit: 'pcs', costPerUnit: 1.8 },
        { name: 'Matcha Green Tea Powder', category: 'Beverages', currentStock: 15, minStockLevel: 5, unit: 'kg', costPerUnit: 32 },
        { name: 'Spanish Saffron Strands', category: 'Pantry & Oils', currentStock: 2, minStockLevel: 3, unit: 'g', costPerUnit: 15 },
        { name: 'Vintage Pinot Noir Base', category: 'Beverages', currentStock: 24, minStockLevel: 10, unit: 'pcs', costPerUnit: 22 }
      ];
      await Ingredient.insertMany(defaultIngredients);
      console.log('Seeded 10 default inventory ingredients in MongoDB');
    }
  } catch (err) {
    console.error('Error seeding ingredients:', err);
  }
}

// Seed admin user
async function seedAdminUser() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await authService.registerUser({
        name: 'Admin User',
        email: 'admin@savory.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Seeded default admin user: admin@savory.com / admin123');
    }
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
}

// Get all tables
app.get('/api/tables', async (_req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 }).populate('currentReservation');
    return res.json(tables);
  } catch (err) {
    console.error('Error loading tables:', err);
    return res.status(500).json({ success: false, message: 'Unable to load tables' });
  }
});

// Create new table
app.post('/api/tables', async (req, res) => {
  try {
    const data = req.body;
    const existing = await Table.findOne({ tableNumber: Number(data.tableNumber) });
    if (existing) {
      return res.status(400).json({ success: false, message: `Table T${data.tableNumber} already exists` });
    }
    const table = await Table.create(data);
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.status(201).json({ success: true, table });
  } catch (err) {
    console.error('Error creating table:', err);
    return res.status(500).json({ success: false, message: 'Unable to create table' });
  }
});

// Update table
app.put('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    let query = mongoose.isValidObjectId(id) ? { _id: id } : { tableNumber: Number(id) };

    const table = await Table.findOneAndUpdate(query, updateData, { returnDocument: 'after' });
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.json({ success: true, table });
  } catch (err) {
    console.error('Error updating table:', err);
    return res.status(500).json({ success: false, message: 'Unable to update table' });
  }
});

// Delete table
app.delete('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let query = mongoose.isValidObjectId(id) ? { _id: id } : { tableNumber: Number(id) };
    const table = await Table.findOneAndDelete(query);
    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting table:', err);
    return res.status(500).json({ success: false, message: 'Unable to delete table' });
  }
});

// Merge tables
app.post('/api/tables/merge', async (req, res) => {
  try {
    const { tableNumbers, combinedName } = req.body;
    if (!tableNumbers || tableNumbers.length < 2) {
      return res.status(400).json({ success: false, message: 'Select at least 2 tables to merge' });
    }
    
    const originalTables = await Table.find({ tableNumber: { $in: tableNumbers.map(Number) } });
    if (originalTables.length !== tableNumbers.length) {
      return res.status(404).json({ success: false, message: 'Some tables not found' });
    }
    
    for (const t of originalTables) {
      if (t.status !== 'available' || t.isCombined) {
        return res.status(400).json({ success: false, message: `Table T${t.tableNumber} is not available for merging` });
      }
    }
    
    const combinedCapacity = originalTables.reduce((sum, t) => sum + t.seats, 0);
    
    const maxNum = Math.max(...tableNumbers.map(Number));
    let uniqueCombinedNum = 100 + maxNum;
    let exists = true;
    while (exists) {
      const check = await Table.findOne({ tableNumber: uniqueCombinedNum });
      if (check) {
        uniqueCombinedNum += 1;
      } else {
        exists = false;
      }
    }
    
    await Table.updateMany(
      { tableNumber: { $in: tableNumbers.map(Number) } },
      { 
        status: 'combined', 
        combinedName: combinedName,
        originalStatus: 'available' 
      }
    );
    
    const avgX = originalTables.reduce((sum, t) => sum + t.posX, 0) / originalTables.length;
    const avgY = originalTables.reduce((sum, t) => sum + t.posY, 0) / originalTables.length;
    
    const combinedTable = await Table.create({
      tableNumber: uniqueCombinedNum,
      seats: combinedCapacity,
      status: 'available',
      zone: originalTables[0].zone,
      indoor: originalTables[0].indoor,
      outdoor: originalTables[0].outdoor,
      vip: originalTables[0].vip,
      window: originalTables[0].window,
      family: true,
      bar: originalTables[0].bar,
      isCombined: true,
      combinedMembers: tableNumbers.map(Number),
      combinedName: combinedName,
      posX: avgX,
      posY: avgY
    });
    
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.status(201).json({ success: true, table: combinedTable });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Unable to merge tables' });
  }
});

// Split combined table
app.post('/api/tables/split/:tableNumber', async (req, res) => {
  try {
    const tableNumber = Number(req.params.tableNumber);
    const combinedTable = await Table.findOne({ tableNumber, isCombined: true });
    if (!combinedTable) {
      return res.status(404).json({ success: false, message: 'Combined table not found' });
    }
    
    const members = combinedTable.combinedMembers;
    
    await Table.updateMany(
      { tableNumber: { $in: members } },
      { 
        status: 'available', 
        combinedName: '',
        combinedMembers: [],
        originalStatus: 'available'
      }
    );
    
    await Table.deleteOne({ tableNumber, isCombined: true });
    
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to split table' });
  }
});

// Move reservation
app.post('/api/tables/move-reservation', async (req, res) => {
  try {
    const { sourceTableNumber, targetTableNumber } = req.body;
    
    const sourceTable = await Table.findOne({ tableNumber: Number(sourceTableNumber) });
    const targetTable = await Table.findOne({ tableNumber: Number(targetTableNumber) });
    
    if (!sourceTable || !targetTable) {
      return res.status(404).json({ success: false, message: 'Tables not found' });
    }
    
    if (targetTable.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Destination table is not available' });
    }
    
    targetTable.status = sourceTable.status;
    targetTable.reservedBy = sourceTable.reservedBy;
    targetTable.reservationDate = sourceTable.reservationDate;
    targetTable.reservationTime = sourceTable.reservationTime;
    targetTable.phone = sourceTable.phone;
    await targetTable.save();
    
    sourceTable.status = 'available';
    sourceTable.reservedBy = null;
    sourceTable.reservationDate = null;
    sourceTable.reservationTime = null;
    sourceTable.phone = null;
    await sourceTable.save();
    
    const reservation = await Reservation.findOne({
      tableId: Number(sourceTableNumber),
      status: { $in: ['pending', 'approved'] }
    }).sort({ createdAt: -1 });
    
    if (reservation) {
      reservation.tableId = Number(targetTableNumber);
      reservation.suggestedTable = Number(targetTableNumber);
      await reservation.save();
      emitReservationEvent('reservation_updated', { reservation });
    }
    
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to move reservation' });
  }
});

// Transfer running order from one table to another
app.post('/api/tables/transfer-order', async (req, res) => {
  try {
    const { sourceTableNumber, targetTableNumber } = req.body;

    if (!sourceTableNumber || !targetTableNumber) {
      return res.status(400).json({ success: false, message: 'Source and target table numbers are required' });
    }

    const sourceTable = await Table.findOne({ tableNumber: Number(sourceTableNumber) });
    const targetTable = await Table.findOne({ tableNumber: Number(targetTableNumber) });

    if (!sourceTable || !targetTable) {
      return res.status(404).json({ success: false, message: 'Source or target table not found' });
    }

    if (targetTable.status === 'occupied') {
      return res.status(400).json({ success: false, message: `Table T${targetTableNumber} is currently occupied` });
    }

    const activeOrder = await Order.findOne({
      tableNumber: Number(sourceTableNumber),
      status: { $in: ['pending', 'preparing', 'ready', 'served'] }
    }).sort({ createdAt: -1 });

    if (!activeOrder) {
      return res.status(404).json({ success: false, message: `No active order found on Table T${sourceTableNumber}` });
    }

    activeOrder.tableNumber = Number(targetTableNumber);
    activeOrder.tableId = Number(targetTableNumber);
    await activeOrder.save();

    sourceTable.status = 'available';
    await sourceTable.save();

    targetTable.status = 'occupied';
    await targetTable.save();

    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    emitReservationEvent('order_updated', activeOrder);

    return res.json({ success: true, order: activeOrder, tables: allTables });
  } catch (error) {
    console.error('Error transferring order:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to transfer order' });
  }
});

// Swap reservations
app.post('/api/tables/swap-reservations', async (req, res) => {
  try {
    const { tableNumberA, tableNumberB } = req.body;
    
    const tableA = await Table.findOne({ tableNumber: Number(tableNumberA) });
    const tableB = await Table.findOne({ tableNumber: Number(tableNumberB) });
    
    if (!tableA || !tableB) {
      return res.status(404).json({ success: false, message: 'Tables not found' });
    }
    
    const temp = {
      status: tableA.status,
      reservedBy: tableA.reservedBy,
      reservationDate: tableA.reservationDate,
      reservationTime: tableA.reservationTime,
      phone: tableA.phone
    };
    
    tableA.status = tableB.status;
    tableA.reservedBy = tableB.reservedBy;
    tableA.reservationDate = tableB.reservationDate;
    tableA.reservationTime = tableB.reservationTime;
    tableA.phone = tableB.phone;
    await tableA.save();
    
    tableB.status = temp.status;
    tableB.reservedBy = temp.reservedBy;
    tableB.reservationDate = temp.reservationDate;
    tableB.reservationTime = temp.reservationTime;
    tableB.phone = temp.phone;
    await tableB.save();
    
    const resA = await Reservation.findOne({
      tableId: Number(tableNumberA),
      status: { $in: ['pending', 'approved'] }
    }).sort({ createdAt: -1 });
    
    const resB = await Reservation.findOne({
      tableId: Number(tableNumberB),
      status: { $in: ['pending', 'approved'] }
    }).sort({ createdAt: -1 });
    
    if (resA) {
      resA.tableId = Number(tableNumberB);
      resA.suggestedTable = Number(tableNumberB);
      await resA.save();
      emitReservationEvent('reservation_updated', { reservation: resA });
    }
    if (resB) {
      resB.tableId = Number(tableNumberA);
      resB.suggestedTable = Number(tableNumberA);
      await resB.save();
      emitReservationEvent('reservation_updated', { reservation: resB });
    }
    
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to swap reservations' });
  }
});

// Update layout
app.post('/api/tables/layout', async (req, res) => {
  try {
    const { layout } = req.body;
    if (!layout || !Array.isArray(layout)) {
      return res.status(400).json({ success: false, message: 'Invalid layout' });
    }
    
    for (const item of layout) {
      await Table.updateOne(
        { tableNumber: Number(item.tableNumber) },
        { posX: Number(item.posX), posY: Number(item.posY) }
      );
    }
    
    const allTables = await Table.find().sort({ tableNumber: 1 });
    emitReservationEvent('tables_updated', { tables: allTables });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to save layout' });
  }
});

// Serving React frontend removed, it runs separately now

async function start() {
  try {
    await mongoose.connect(mongoUri);
    await seedTablesIfEmpty();
    await seedIngredientsIfEmpty();
    await seedAdminUser();
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    initSocket(server);
  } catch (error) {
    console.error('Unable to start server', error);
  }
}

start();
