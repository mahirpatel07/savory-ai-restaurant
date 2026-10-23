import mongoose from 'mongoose';

const shiftTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. 'Morning Shift', 'Evening Shift', 'Night Shift'
  startTime: { type: String, required: true, default: '08:00' }, // HH:mm
  endTime: { type: String, required: true, default: '16:00' },   // HH:mm
  breakDurationMins: { type: Number, default: 30 },
  location: { type: String, default: 'Main Flagship Branch' },
  color: { type: String, default: '#10b981' }, // Hex visual identifier badge
  earlyAllowanceMins: { type: Number, default: 15 },
  lateAllowanceMins: { type: Number, default: 15 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export default mongoose.model('ShiftTemplate', shiftTemplateSchema);
