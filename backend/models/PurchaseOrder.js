import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  costPerUnit: { type: Number, default: 0 }
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  supplier: { type: String, required: true },
  items: [purchaseOrderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'received', 'cancelled'],
    default: 'draft'
  },
  sentAt: { type: Date },
  receivedAt: { type: Date }
}, {
  timestamps: true
});

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
