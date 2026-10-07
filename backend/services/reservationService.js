import Reservation from '../models/Reservation.js'
import Table from '../models/Table.js'
import { emitReservationEvent } from './socket.js'
import { selectBestTable } from './availability.js'
import { createNotification } from './notificationService.js'
import * as automationService from './automationService.js'

export function formatReservationForClient(reservation) {
  if (!reservation) return null;
  const resObj = reservation.toObject ? reservation.toObject() : reservation;

  return {
    id: resObj._id?.toString?.() || resObj.id,
    name: resObj.name,
    phone: resObj.phone,
    guests: resObj.guests,
    date: resObj.date,
    time: resObj.time,
    preference: resObj.preference || 'No Preference',
    tableId: resObj.assignedTable ?? resObj.suggestedTable ?? resObj.tableId,
    tableNumbers: resObj.tableNumbers || [],
    tableCapacity: resObj.tableCapacity || null,
    status: resObj.status,
    duration: resObj.duration || 120,
    vip: resObj.vip || false,
    waiter: resObj.waiter || '',
    requestedAt: resObj.requestedAt || resObj.createdAt,
    suggestedTable: resObj.suggestedTable ?? resObj.assignedTable ?? resObj.tableId,
    confidence: resObj.confidence || 0,
    reason: resObj.reason || '',
    suggestedTimes: resObj.suggestedTimes || [],
    approvedBy: resObj.approvedBy || 'AI',
    reservationSource: resObj.reservationSource || 'AI_CHAT',
    assignedTable: resObj.assignedTable ?? resObj.suggestedTable ?? resObj.tableId
  }
}

export async function createConfirmedReservation(payload) {
  // FINAL AVAILABILITY VALIDATION
  const requestedTableNumbers = payload.tableNumbers || (payload.tableId ? [Number(payload.tableId)] : []);
  const guestCount = Number(payload.guests || payload.guestCount || 2);
  const date = payload.date;
  const time = payload.time;

  const dbTables = await Table.find({}).sort({ tableNumber: 1 }).lean();
  const tables = dbTables.map(t => ({
    id: t.tableNumber,
    tableNumber: t.tableNumber,
    seats: t.seats,
    status: t.status,
    updatedAt: t.updatedAt,
    reservationDate: t.reservationDate,
    reservationTime: t.reservationTime
  }));

  const existingReservations = await Reservation.find({
    status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] }
  });

  const availability = selectBestTable({
    guestCount,
    requestedDate: date,
    requestedTime: time,
    tables,
    reservations: existingReservations
  });

  const availableTableIds = (availability.availableTables || []).map(t => t.id || t.tableNumber);
  const isRequestedAvailable = requestedTableNumbers.length > 0
    ? requestedTableNumbers.every(num => availableTableIds.includes(num))
    : availability.available;

  if (!isRequestedAvailable) {
    return {
      success: false,
      error: 'UNAVAILABLE',
      message: 'The selected table is no longer available.'
    };
  }

  // Use the best combination found if none was specifically requested but availability is true
  const finalTableNumbers = requestedTableNumbers.length > 0 ? requestedTableNumbers : (availability.tableIds || []);
  const finalTableId = finalTableNumbers[0] || null;

  const reservation = await Reservation.create({
    name: payload.name,
    phone: payload.phone,
    date: payload.date,
    time: payload.time,
    guests: guestCount,
    preference: payload.preference || 'No Preference',
    tableId: finalTableId,
    tableNumbers: finalTableNumbers,
    tableCapacity: payload.tableCapacity ?? availability.totalCapacity ?? null,
    suggestedTable: finalTableId,
    assignedTable: finalTableId,
    confidence: payload.confidence || availability.confidence || 0,
    status: payload.status || 'confirmed',
    duration: Number(payload.duration || 120),
    vip: Boolean(payload.vip || false),
    waiter: payload.waiter || '',
    source: payload.source || 'ai-chat',
    reason: payload.reason || availability.reason || '',
    suggestedTimes: payload.suggestedTimes || availability.suggestedTimes || [],
    approvedBy: payload.approvedBy || 'AI',
    reservationSource: payload.reservationSource || (payload.source === 'voice-agent' ? 'VOICE' : 'AI_CHAT'),
    requestedAt: new Date()
  })

  if (reservation.tableNumbers && reservation.tableNumbers.length > 0) {
    await Table.updateMany(
      { tableNumber: { $in: reservation.tableNumbers } },
      {
        status: 'reserved',
        reservedBy: reservation.name,
        phone: reservation.phone,
        reservationDate: reservation.date,
        reservationTime: reservation.time,
        currentReservation: reservation._id
      }
    );
  } else if (reservation.tableId) {
    const tableObject = await Table.findOne({ tableNumber: reservation.tableId })
    if (tableObject) {
      tableObject.status = 'reserved'
      tableObject.reservedBy = reservation.name
      tableObject.phone = reservation.phone
      tableObject.reservationDate = reservation.date
      tableObject.reservationTime = reservation.time
      tableObject.currentReservation = reservation._id
      await tableObject.save()
    }
  }

  const formattedReservation = formatReservationForClient(reservation)

  // Create notification for admin
  await createNotification({
    title: 'New Reservation',
    message: `A new reservation for ${reservation.guests} guests has been received from ${reservation.name}.`,
    type: 'reservation',
    metadata: {
      reservationId: reservation._id,
      customerName: reservation.name,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests
    }
  });

  // Trigger Email Automation
  automationService.sendReservationEmail(reservation);

  // Standardized event names
  emitReservationEvent('reservation_created', { reservation: formattedReservation })
  emitReservationEvent('timeline_updated', { reservation: formattedReservation })
  emitReservationEvent('reservation_confirmed', { reservation: formattedReservation })

  // Backward compatibility emissions (optional but keeping for now)
  emitReservationEvent('new-reservation', { reservation: formattedReservation })

  const allTables = await Table.find().sort({ tableNumber: 1 })
  emitReservationEvent('tables_updated', { tables: allTables })

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

  return { reservation, formattedReservation }
}
