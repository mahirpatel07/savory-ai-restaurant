import mongoose from 'mongoose';

const correctionSchema = new mongoose.Schema({
  correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  correctedByName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reason: { type: String, required: true },
  previousCheckIn: { type: Date },
  previousCheckOut: { type: Date },
  newCheckIn: { type: Date },
  newCheckOut: { type: Date }
});

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: Date, required: true },
  checkOut: { type: Date },
  originalCheckIn: { type: Date },
  originalCheckOut: { type: Date },
  selfieImage: { type: String, default: '' },
  clockOutSelfieImage: { type: String, default: '' },
  breakDurationMins: { type: Number, default: 30 },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Early Departure', 'Missed Clock-Out', 'Completed', 'On Leave', 'Absent'],
    default: 'Present'
  },
  totalHours: { type: Number, default: 0 },
  regularHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 18.50 },
  estimatedPay: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  corrections: [correctionSchema]
}, {
  timestamps: true
});

attendanceSchema.index({ userId: 1, date: 1 });

export default mongoose.model('Attendance', attendanceSchema);
