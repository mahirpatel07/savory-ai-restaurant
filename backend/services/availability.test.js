import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBestTable } from './availability.js';

test('prefers exact-capacity tables before larger ones', () => {
  const result = selectBestTable({
    guestCount: 2,
    requestedDate: '2026-07-16',
    requestedTime: '19:00',
    tables: [
      { id: 1, seats: 2, status: 'available' },
      { id: 2, seats: 2, status: 'available' },
      { id: 5, seats: 4, status: 'available' }
    ],
    reservations: []
  });

  assert.ok(result.available);
  assert.equal(result.table.id, 1);
  assert.equal(result.reason, 'Assigned T1 (2 seats).');
});

test('falls back to the next smallest suitable table when no exact-size option exists', () => {
  const result = selectBestTable({
    guestCount: 4,
    requestedDate: '2026-07-16',
    requestedTime: '19:00',
    tables: [
      { id: 6, seats: 6, status: 'available' }
    ],
    reservations: []
  });

  assert.ok(result.available);
  assert.equal(result.table.id, 6);
  assert.equal(result.reason, 'Assigned T6 (6 seats).');
});

test('returns suggested times when no suitable table is available', () => {
  const result = selectBestTable({
    guestCount: 4,
    requestedDate: '2026-07-16',
    requestedTime: '19:00',
    tables: [
      { id: 1, seats: 2, status: 'occupied' },
      { id: 2, seats: 2, status: 'cleaning' }
    ],
    reservations: []
  });

  assert.equal(result.available, false);
  assert.deepEqual(result.suggestedTimes, ['6:45 PM', '8:30 PM', 'Tomorrow 7 PM']);
});

test('rejects requests outside business hours and suggests later slots', () => {
  const result = selectBestTable({
    guestCount: 2,
    requestedDate: '2026-07-16',
    requestedTime: '10:00 AM',
    tables: [
      { id: 1, seats: 2, status: 'available' }
    ],
    reservations: []
  });

  assert.equal(result.available, false);
  assert.ok(result.message.includes('only open between'));
  assert.ok(result.suggestedTimes.length >= 1);
});
