import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  branchId: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  active: { type: Boolean, default: true }
});

const printerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['receipt', 'kitchen'], default: 'receipt' },
  connectionType: { type: String, enum: ['network', 'usb', 'bluetooth'], default: 'network' },
  ipAddress: { type: String, default: '192.168.1.100' },
  port: { type: Number, default: 9100 },
  active: { type: Boolean, default: true }
});

const businessHoursSchema = new mongoose.Schema({
  day: { type: String, required: true },
  openTime: { type: String, default: '11:00' },
  closeTime: { type: String, default: '00:00' },
  isClosed: { type: Boolean, default: false }
});

const restaurantSettingSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'Savory Michelin Restaurant' },
  tagline: { type: String, default: 'Exquisite Culinary Excellence' },
  phone: { type: String, default: '+1 (555) 234-5678' },
  email: { type: String, default: 'contact@savory.com' },
  address: { type: String, default: '123 Gourmet Avenue, Culinary District' },
  timezone: { type: String, default: 'America/New_York' },
  taxRate: { type: Number, default: 5.0 }, // 5% Tax/GST
  taxName: { type: String, default: 'GST' },
  currency: { type: String, default: '$' },
  allowManualDiscounts: { type: Boolean, default: true },
  maxDiscountPercentage: { type: Number, default: 50 },
  branches: [branchSchema],
  printers: [printerSchema],
  businessHours: [businessHoursSchema]
}, { timestamps: true });

export default mongoose.model('RestaurantSetting', restaurantSettingSchema);
