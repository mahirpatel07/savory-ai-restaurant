import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  partySize: { type: Number, required: true },
  tokenNumber: { type: Number, required: true },
  status: {
    type: String,
    enum: ['waiting', 'notified', 'seated', 'cancelled'],
    default: 'waiting'
  },
  estimatedWait: { type: Number, default: 30 }, // in minutes
  notifiedAt: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model('Waitlist', waitlistSchema);
