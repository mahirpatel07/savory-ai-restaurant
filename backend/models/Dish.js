import mongoose from 'mongoose';

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 }
});

const dishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  available: { type: Boolean, default: true },
  rating: { type: Number, default: 5.0 },
  reviews: { type: Number, default: 0 },
  tags: [{ type: String }],
  prepTime: { type: String, default: '15 mins' },
  calories: { type: String, default: '0 kcal' },
  addOns: [addOnSchema],
  recipe: [{
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
    quantity: { type: Number, required: true } // Quantity per serving
  }],
}, { timestamps: true });

export default mongoose.model('Dish', dishSchema);
