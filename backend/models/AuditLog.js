import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, default: 'System' },
  action: { type: String, required: true }, // e.g. 'clock_in', 'clock_out', 'attendance_correction', 'shift_created', 'roster_published'
  targetModel: { type: String, required: true }, // 'Attendance', 'Shift', 'User', etc.
  targetId: { type: String },
  reason: { type: String, default: '' },
  beforeValue: { type: mongoose.Schema.Types.Mixed },
  afterValue: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

auditLogSchema.index({ timestamp: -1, action: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
