import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shiftTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate' },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  shiftType: {
    type: String,
    enum: ['Morning', 'Evening', 'Night', 'Custom'],
    default: 'Morning'
  },
  startTime: { type: String, default: '08:00' }, // 24-hr format HH:mm
  endTime: { type: String, default: '16:00' },   // 24-hr format HH:mm
  breakDurationMins: { type: Number, default: 30 },
  role: { type: String, default: 'waiter' },
  location: { type: String, default: 'Main Flagship Branch' },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'Scheduled', 'Completed'],
    default: 'published'
  },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

shiftSchema.index({ userId: 1, date: 1 });

export default mongoose.model('Shift', shiftSchema);
