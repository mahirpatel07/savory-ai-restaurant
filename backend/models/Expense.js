import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: {
    type: String,
    enum: ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Ingredients', 'Other'],
    default: 'Other'
  },
  date: { type: Date, default: Date.now },
  description: { type: String },
  recurring: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model('Expense', expenseSchema);
