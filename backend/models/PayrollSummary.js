import mongoose from 'mongoose';

const payrollSummarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payPeriodStart: { type: String, required: true }, // YYYY-MM-DD
  payPeriodEnd: { type: String, required: true },   // YYYY-MM-DD
  scheduledHours: { type: Number, default: 0 },
  actualElapsedHours: { type: Number, default: 0 },
  unpaidBreakHours: { type: Number, default: 0 },
  paidHours: { type: Number, default: 0 },
  regularHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  hourlyRate: { type: Number, required: true, default: 18.50 },
  regularEarnings: { type: Number, default: 0 },
  overtimeEarnings: { type: Number, default: 0 },
  estimatedGrossPay: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['estimated', 'approved', 'processed'],
    default: 'estimated'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, {
  timestamps: true
});

payrollSummarySchema.index({ userId: 1, payPeriodStart: 1, payPeriodEnd: 1 });

export default mongoose.model('PayrollSummary', payrollSummarySchema);
