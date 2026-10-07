import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true },
  customerName: { type: String, default: 'Anonymous' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  categoryRatings: {
    food: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    ambiance: { type: Number, min: 1, max: 5 }
  },
  dishesReviewed: [{
    dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish' },
    rating: { type: Number }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Review', reviewSchema);
