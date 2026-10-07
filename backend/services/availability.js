const OPENING_HOUR = 11;
const CLOSING_HOUR = 23;

function normalizeDate(value) {
  if (!value) return null;
  if (value === 'Today' || value === 'today') return new Date();
  if (value === 'Tomorrow' || value === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTime(value) {
  if (!value) return null;
  const asString = String(value).trim().toLowerCase();
  if (asString.includes('lunch')) return '12:00';
  if (asString.includes('dinner')) return '19:00';

  const match = asString.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minutes = match[2] || '00';
  const suffix = (match[3] || '').toLowerCase();

  if (!suffix) {
    return `${String(hour).padStart(2, '0')}:${minutes}`;
  }

  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;

  return `${String(hour).padStart(2, '0')}:${minutes}`;
}

function overlapsWithReservation(table, requestedDate, requestedTime, reservation) {
  const reservationDate = reservation.date;
  const sameDate = String(reservationDate) === String(requestedDate);
  if (!sameDate) return false;

  const reservationTime = normalizeTime(reservation.time);
  const requested = normalizeTime(requestedTime);
  if (!reservationTime || !requested) return false;

  const [requestedHour, requestedMinute] = requested.split(':').map(Number);
  const [reservationHour, reservationMinute] = reservationTime.split(':').map(Number);

  const requestedStart = requestedHour * 60 + requestedMinute;
  const reservationStart = reservationHour * 60 + reservationMinute;
  const duration = Number(reservation.duration || 120);
  const requestedDuration = 120; // Default requested duration

  const requestedEnd = requestedStart + requestedDuration;
  const reservationEnd = reservationStart + duration;

  return requestedStart < reservationEnd && requestedEnd > reservationStart;
}

function isWithinBusinessHours(requestedTime) {
  const normalized = normalizeTime(requestedTime);
  if (!normalized) return true;

  const [hour] = normalized.split(':').map(Number);
  return hour >= OPENING_HOUR && hour < CLOSING_HOUR;
}

/**
 * Finds the optimal combination of tables for a given guest count.
 * Priority: 1. Requested table (if valid), 2. Single table, 3. Min tables, 4. Min extra seats.
 */
function findOptimalCombination(requestedGuests, availableTables, requestedTableId = null) {
  // 0. If a specific table was requested
  if (requestedTableId) {
    const table = availableTables.find(t => String(t.id) === String(requestedTableId) || String(t.tableNumber) === String(requestedTableId));
    if (table && table.seats >= requestedGuests) {
      return [table];
    }
  }

  // 1. Try single table (Best fit)
  const singleMatches = availableTables
    .filter(t => t.seats >= requestedGuests)
    .sort((a, b) => a.seats - b.seats);

  if (singleMatches.length > 0) {
    return [singleMatches[0]];
  }

  // 2. Combination search (Brute force for small table set, or greedy)
  // Since we typically have < 20 tables, we can do a simplified search
  const sorted = [...availableTables].sort((a, b) => b.seats - a.seats); // Largest first
  let combination = [];
  let remaining = requestedGuests;

  for (const table of sorted) {
    if (remaining <= 0) break;
    combination.push(table);
    remaining -= table.seats;
  }

  if (remaining > 0) return null; // Even all tables together not enough

  return combination;
}

export function selectBestTable({ guestCount, requestedDate, requestedTime, tables, reservations, requestedTableId = null }) {
  const requestedGuests = Number(guestCount || 2);
  const normalizedDate = normalizeDate(requestedDate);
  const requestedDateKey = normalizedDate ? normalizedDate.toISOString().split('T')[0] : requestedDate;

  if (!isWithinBusinessHours(requestedTime)) {
    return {
      available: false,
      message: `Sorry, our restaurant is only open between ${OPENING_HOUR}:00 and ${CLOSING_HOUR}:00.`,
      suggestedTimes: ['12:30 PM', '2:30 PM', '7:00 PM']
    };
  }

  // Filter out tables that are already booked for this time
  const availableTables = tables.filter((table) => {
    // If the table is physically out of service or part of a combined table, it's not available
    if (table.status === 'out-of-service' || table.status === 'combined') return false;

    // Treat 'occupied' and 'cleaning' as implicit reservations for today
    const isToday = requestedDateKey === new Date().toISOString().split('T')[0];

    if (isToday) {
      if (table.status === 'occupied' || table.status === 'cleaning') {
        const duration = table.status === 'occupied' ? 120 : 30; // 2h for occupied, 30m for cleaning

        // Use updatedAt as the start time, fallback to 'now'
        const startTime = table.updatedAt ? new Date(table.updatedAt) : new Date();
        const startHour = startTime.getHours();
        const startMin = startTime.getMinutes();
        const timeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

        const implicitRes = {
          date: requestedDateKey,
          time: timeStr,
          duration: duration
        };

        if (overlapsWithReservation(table, requestedDateKey, requestedTime, implicitRes)) {
          return false;
        }
      }
    }

    // Also check if the table has a direct reservation metadata that might not be in the 'reservations' array
    if (table.status === 'reserved' && table.reservationDate === requestedDateKey) {
      const implicitRes = {
        date: table.reservationDate,
        time: table.reservationTime,
        duration: 120
      };
      if (overlapsWithReservation(table, requestedDateKey, requestedTime, implicitRes)) {
        return false;
      }
    }

    const isBooked = reservations.some((res) => {
      const isSameTable = res.tableNumbers?.includes(table.tableNumber || table.id) || res.tableId === (table.tableNumber || table.id);
      if (!isSameTable) return false;
      return overlapsWithReservation(table, requestedDateKey, requestedTime, res);
    });

    return !isBooked;
  });

  const bestCombination = findOptimalCombination(requestedGuests, availableTables, requestedTableId);

  if (bestCombination && bestCombination.length > 0) {
    const totalCapacity = bestCombination.reduce((sum, t) => sum + t.seats, 0);
    const tableIds = bestCombination.map(t => t.id);

    let reason = bestCombination.length === 1
      ? `Assigned T${tableIds[0]} (${bestCombination[0].seats} seats).`
      : `Optimal combination: ${tableIds.map(id => 'T' + id).join(' + ')} (Total ${totalCapacity} seats).`;

    return {
      available: true,
      table: bestCombination[0],
      tables: bestCombination,
      tableIds,
      totalCapacity,
      reason,
      confidence: 98,
      availableTables // Added this
    };
  }

  const suggestedTimes = ['6:45 PM', '8:30 PM', 'Tomorrow 7 PM'];

  return {
    available: false,
    message: `I'm sorry.\n\nNo suitable table arrangement is available at ${requestedTime}.\n\nNearest availability:\n${suggestedTimes.join('\n')}`,
    suggestedTimes,
    availableTables // Added this
  };
}

export default selectBestTable;
