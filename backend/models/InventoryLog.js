import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  ingredientName: { type: String, required: true },
  type: {
    type: String,
    enum: ['Stock In', 'Stock Out', 'Order Deduction', 'Wastage', 'Adjustment'],
    required: true
  },
  quantity: { type: Number, required: true },
  unit: { type: String, default: '' },
  reason: { type: String, default: '' },
  notes: { type: String, default: '' },
  orderNumber: { type: String, default: '' },
  supplier: { type: String, default: '' },
  date: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.model('InventoryLog', inventoryLogSchema);
