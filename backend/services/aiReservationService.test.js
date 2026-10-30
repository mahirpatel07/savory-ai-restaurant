import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGroqPayload } from './aiReservationService.js';

test('normalizes Groq JSON payload into reservation fields', () => {
  const result = normalizeGroqPayload('\n\n```json\n{\n  "date": "tomorrow",\n  "time": "8:00 PM",\n  "guests": 4,\n  "name": "John",\n  "phone": "9876543210",\n  "confirmationText": "Reservation ready for tomorrow at 8:00 PM"\n}\n```\n');

  assert.deepEqual(result, {
    date: 'tomorrow',
    time: '8:00 PM',
    guests: 4,
    name: 'John',
    phone: '9876543210',
    confirmationText: 'Reservation ready for tomorrow at 8:00 PM'
  });
});
