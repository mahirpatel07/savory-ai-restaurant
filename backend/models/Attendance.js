import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'On Leave'],
    default: 'Present'
  },
  totalHours: { type: Number, default: 0 },
  notes: { type: String }
}, {
  timestamps: true
});

export default mongoose.model('Attendance', attendanceSchema);
