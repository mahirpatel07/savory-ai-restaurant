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
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
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

// Hash password before saving using async/await without next()
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
