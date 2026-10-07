import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true, unique: true },
  seats: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['available', 'reserved', 'occupied', 'cleaning', 'out-of-service', 'combined'],
    default: 'available'
  },
  zone: { type: String, default: 'Indoor' },
  indoor: { type: Boolean, default: true },
  outdoor: { type: Boolean, default: false },
  vip: { type: Boolean, default: false },
  window: { type: Boolean, default: false },
  family: { type: Boolean, default: false },
  bar: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  isCombined: { type: Boolean, default: false },
  combinedMembers: { type: [Number], default: [] },
  combinedName: { type: String, default: '' },
  originalStatus: { type: String, default: 'available' },
  posX: { type: Number, default: 100 },
  posY: { type: Number, default: 100 },
  reservedBy: { type: String, default: null },
  reservationDate: { type: String, default: null },
  reservationTime: { type: String, default: null },
  phone: { type: String, default: null },
  currentReservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null }
}, {
  timestamps: true
});

export default mongoose.model('Table', tableSchema);
