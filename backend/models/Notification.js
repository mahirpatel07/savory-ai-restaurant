import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['reservation', 'order', 'kitchen', 'inventory', 'payment', 'table', 'system', 'alert', 'waiter_call'],
    default: 'system'
  },
  metadata: {
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderNumber: String,
    invoiceNumber: String,
    tableNumber: Number,
    ingredientName: String,
    amount: Number,
    paymentMethod: String,
    customerName: String,
    date: String,
    time: String,
    guests: Number
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
