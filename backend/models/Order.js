import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'pending'
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  tableId: { type: Number, default: null }, // Null for takeaway
  tableNumber: { type: Number, default: null },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['fixed', 'percentage', 'loyalty'], default: 'loyalty' },
  tip: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  invoiceNumber: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'paid', 'cancelled'],
    default: 'pending'
  },
  inventoryDeducted: {
    type: Boolean,
    default: false
  },
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    default: 'dine-in'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'unpaid', 'partially_paid', 'completed', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'online', 'multiple', 'unpaid'],
    default: 'unpaid'
  },
  payments: [{
    method: { type: String },
    amount: { type: Number },
    transactionId: { type: String, default: '' },
    date: { type: Date, default: Date.now }
  }],
  customerName: { type: String, default: 'Guest' },
  customerPhone: { type: String, default: '' },
  deliveryAddress: { type: String, default: '' },
  deliveryNotes: { type: String, default: '' },
  pointsUsed: { type: Number, default: 0 },
  waiterName: { type: String, default: '' },
  notes: { type: String, default: '' },
  paidAt: { type: Date },
  completedAt: { type: Date }
}, {
  timestamps: true
});

// Auto-generate order number before validation using async/await without next()
orderSchema.pre('validate', async function() {
  if (this.isNew && !this.orderNumber) {
    try {
      const today = new Date();
      const dateStr = today.getFullYear().toString().slice(-2) +
                      (today.getMonth() + 1).toString().padStart(2, '0') +
                      today.getDate().toString().padStart(2, '0');

      const Order = mongoose.model('Order');
      const latestOrder = await Order.findOne({
        orderNumber: new RegExp(`^ORD-${dateStr}-`)
      }).sort({ createdAt: -1 });

      let sequence = 1;
      if (latestOrder && latestOrder.orderNumber) {
        const parts = latestOrder.orderNumber.split('-');
        if (parts.length >= 3) {
          const lastSequence = parseInt(parts[2]);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }
      }

      this.orderNumber = `ORD-${dateStr}-${sequence.toString().padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating order number:', err);
      // Generate a fallback to prevent validation failure
      this.orderNumber = `ORD-FAIL-${Date.now()}`;
    }
  }

  if (!this.invoiceNumber && this.orderNumber) {
    this.invoiceNumber = this.orderNumber.replace('ORD-', 'INV-');
  }

  if (this.isNew && (this.remainingAmount === undefined || this.remainingAmount === 0)) {
    this.remainingAmount = Math.max(0, (this.totalAmount || 0) - (this.amountPaid || 0));
  }
});

export default mongoose.model('Order', orderSchema);
