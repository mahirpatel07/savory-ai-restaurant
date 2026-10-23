import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'manager', 'cashier', 'waiter', 'chef', 'customer'],
    default: 'waiter'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  pin: { type: String, default: '' },
  pinHash: { type: String, select: false },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  hourlyRate: { type: Number, default: 18.50 },
  department: { type: String, default: 'Operations' },
  failedPinAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  ordersHandled: { type: Number, default: 0 },
  tipsEarned: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  preferences: {
    spiceLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    dietary: [{ type: String }],
    favoriteDishes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dish' }],
    specialNotes: { type: String, default: '' }
  },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

// Hash password and PIN before saving
userSchema.pre('save', async function() {
  if (this.isModified('password') && this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  if (this.isModified('pin') && this.pin) {
    const cleanPin = String(this.pin).trim();
    this.pin = cleanPin;
    this.pinHash = await bcrypt.hash(cleanPin, 10);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compare PIN method (supports bcrypt pinHash or direct plaintext string fallback)
userSchema.methods.comparePin = async function(candidatePin) {
  if (!candidatePin) return false;
  const cleanPin = String(candidatePin).trim();

  // 1. Direct match with plaintext pin
  if (this.pin && String(this.pin).trim() === cleanPin) {
    return true;
  }

  // 2. Hash match with pinHash
  if (this.pinHash) {
    return await bcrypt.compare(cleanPin, this.pinHash);
  }

  return false;
};

export default mongoose.model('User', userSchema);
