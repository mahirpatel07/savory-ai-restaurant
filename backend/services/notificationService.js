import Notification from '../models/Notification.js';
import { emitReservationEvent } from './socket.js';

export async function createNotification(data) {
  try {
    const notification = await Notification.create({
      title: data.title,
      message: data.message,
      type: data.type || 'reservation',
      metadata: data.metadata || {}
    });

    const notificationData = {
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata,
      read: notification.read,
      createdAt: notification.createdAt
    };

    emitReservationEvent('new_notification', notificationData);

    // Also emit unread count update
    const unreadCount = await Notification.countDocuments({ read: false });
    emitReservationEvent('unread_count_updated', { count: unreadCount });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function getNotifications(limit = 20) {
  return await Notification.find().sort({ createdAt: -1 }).limit(limit);
}

export async function markAsRead(id) {
  const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
  const unreadCount = await Notification.countDocuments({ read: false });
  emitReservationEvent('unread_count_updated', { count: unreadCount });
  return notification;
}

export async function markAllAsRead() {
  await Notification.updateMany({ read: false }, { read: true });
  emitReservationEvent('unread_count_updated', { count: 0 });
}
