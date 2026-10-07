import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true }, // e.g., 'kg', 'g', 'liters', 'pcs'
  currentStock: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 10 }, // Threshold for alerts
  costPerUnit: { type: Number, default: 0 },
  category: { type: String, default: 'General' },
  supplier: { type: String, default: '' },
  lastRestocked: { type: Date, default: Date.now },
  expiryDate: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model('Ingredient', ingredientSchema);
