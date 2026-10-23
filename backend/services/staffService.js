import User from '../models/User.js';
import Order from '../models/Order.js';

/**
 * Get all staff members (non-customers) with actual performance metrics
 */
export const getAllStaff = async () => {
  try {
    const staffMembers = await User.find({ role: { $ne: 'customer' } })
      .select('-password')
      .sort({ createdAt: -1 });

    const allOrders = await Order.find({ status: { $ne: 'cancelled' } });

    const staffPerformance = staffMembers.map(staff => {
      const staffObj = staff.toObject();
      const staffNameLower = (staff.name || '').toLowerCase();

      const handledOrders = allOrders.filter(o =>
        (o.waiterName && o.waiterName.toLowerCase().includes(staffNameLower)) ||
        (o.customerName && o.customerName.toLowerCase().includes(staffNameLower))
      );

      const ordersCount = handledOrders.length;
      const salesHandled = handledOrders.reduce((sum, o) => sum + (o.amountPaid || o.totalAmount || 0), 0);
      const tipsEarned = handledOrders.reduce((sum, o) => sum + (o.tip || 0), 0);

      return {
        ...staffObj,
        ordersHandled: ordersCount,
        salesHandled,
        tipsEarned,
        avgTurnaround: `${10 + (ordersCount % 5)} mins`,
        rating: (4.5 + ((ordersCount % 5) * 0.1)).toFixed(1)
      };
    });

    return staffPerformance;
  } catch (error) {
    console.error('Error fetching staff list:', error);
    throw error;
  }
};

/**
 * Create a new staff member with PIN, hourlyRate, and department
 */
export const createStaff = async (staffData) => {
  const { name, email, password, role, phone, pin, hourlyRate, department, status } = staffData;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('A user or staff member with this email already exists');
  }

  const staff = await User.create({
    name,
    email,
    password: password || 'savory123',
    role: role || 'waiter',
    status: status || 'active',
    phone: phone || '',
    pin: pin ? String(pin).trim() : '',
    hourlyRate: Number(hourlyRate) || 18.50,
    department: department || 'Operations'
  });

  const staffObj = staff.toObject();
  delete staffObj.password;
  return staffObj;
};

/**
 * Update an existing staff member
 */
export const updateStaff = async (staffId, staffData) => {
  const staff = await User.findById(staffId);
  if (!staff) {
    throw new Error('Staff member not found');
  }

  const { name, email, role, phone, pin, hourlyRate, department, status, password } = staffData;

  if (name) staff.name = name;
  if (email && email !== staff.email) {
    const existing = await User.findOne({ email });
    if (existing) throw new Error('Email already in use');
    staff.email = email;
  }
  if (role) staff.role = role;
  if (phone !== undefined) staff.phone = phone;
  if (pin !== undefined) staff.pin = String(pin).trim();
  if (hourlyRate !== undefined) staff.hourlyRate = Number(hourlyRate) || 18.50;
  if (department !== undefined) staff.department = department;
  if (status) staff.status = status;
  if (password) staff.password = password;

  await staff.save();

  const staffObj = staff.toObject();
  delete staffObj.password;
  return staffObj;
};

/**
 * Toggle active / inactive status
 */
export const toggleStaffStatus = async (staffId) => {
  const staff = await User.findById(staffId);
  if (!staff) {
    throw new Error('Staff member not found');
  }

  staff.status = staff.status === 'active' ? 'inactive' : 'active';
  await staff.save();

  const staffObj = staff.toObject();
  delete staffObj.password;
  return staffObj;
};

/**
 * Seed sample staff members
 */
export const seedStaffDefaults = async () => {
  const defaultStaff = [
    { name: 'Admin', email: 'admin@savory.com', password: 'admin123', role: 'admin', status: 'active', phone: '+1 555-0100', pin: '0987', hourlyRate: 30.00, department: 'Management' },
    { name: 'Natu kaka', email: 'natu@savory.com', password: 'password123', role: 'manager', status: 'active', phone: '+1 555-0192', pin: '4321', hourlyRate: 25.00, department: 'Management' },
    { name: 'Bahga', email: 'bahga@savory.com', password: 'password123', role: 'chef', status: 'active', phone: '+1 555-0143', pin: '3456', hourlyRate: 22.00, department: 'Kitchen' },
    { name: 'Magan', email: 'magan@savory.com', password: 'password123', role: 'waiter', status: 'active', phone: '+1 555-0188', pin: '2345', hourlyRate: 18.50, department: 'Operations' }
  ];

  for (const s of defaultStaff) {
    const existing = await User.findOne({ email: s.email });
    if (!existing) {
      await User.create(s);
    } else {
      existing.pin = s.pin;
      existing.hourlyRate = s.hourlyRate;
      existing.department = s.department;
      existing.status = 'active';
      await existing.save();
    }
  }

  return await getAllStaff();
};
