import mongoose from 'mongoose';

const cashTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['drop', 'payout'],
    required: true
  },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  addedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const cashDrawerSchema = new mongoose.Schema({
  date: { type: String, required: true }, // YYYY-MM-DD
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedByName: { type: String, required: true },
  openedAt: { type: Date, default: Date.now },
  openingFloat: { type: Number, required: true, default: 200.00 },

  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closedByName: { type: String },
  closedAt: { type: Date },

  cashTransactions: [cashTransactionSchema],

  actualCountedCash: { type: Number, default: 0 },
  expectedCash: { type: Number, default: 0 },
  drawerVariance: { type: Number, default: 0 },

  cashSalesTotal: { type: Number, default: 0 },
  cardSalesTotal: { type: Number, default: 0 },
  upiSalesTotal: { type: Number, default: 0 },
  grossSalesTotal: { type: Number, default: 0 },
  taxCollectedTotal: { type: Number, default: 0 },

  notes: { type: String, default: '' },
  zReportSummary: { type: Object }
}, {
  timestamps: true
});

cashDrawerSchema.index({ status: 1, date: 1 });

export default mongoose.model('CashDrawer', cashDrawerSchema);
