import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true, min: 1 },
  preference: { type: String, default: 'No Preference' },
  tableId: { type: Number, default: null },
  tableNumbers: { type: [Number], default: [] },
  tableCapacity: { type: Number, default: null },
  suggestedTable: { type: Number, default: null },
  confidence: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'confirmed', 'declined', 'checked-in', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  duration: { type: Number, default: 120 }, // duration in minutes
  vip: { type: Boolean, default: false },
  waiter: { type: String, default: '' },
  source: { type: String, default: 'ai-chat' },
  approvedBy: { type: String, default: 'AI' },
  reservationSource: { type: String, default: 'AI_CHAT' },
  assignedTable: { type: Number, default: null },
  reason: { type: String, default: '' },
  suggestedTimes: { type: [String], default: [] },
  requestedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.model('Reservation', reservationSchema);
