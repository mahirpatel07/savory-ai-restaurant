import Attendance from '../models/Attendance.js';
import Shift from '../models/Shift.js';
import User from '../models/User.js';
import { logAuditAction } from './auditService.js';

/**
 * Helper to reliably find a staff member by 4-digit PIN with multi-level fallback
 */
export const findStaffByPin = async (candidatePin) => {
  if (candidatePin === undefined || candidatePin === null) return null;
  const cleanPin = String(candidatePin).trim();
  if (!cleanPin) return null;
  const numPin = Number(cleanPin);

  // 1. Direct query: search by pin (string or number) for non-inactive users
  let staff = await User.findOne({
    status: { $ne: 'inactive' },
    $or: [
      { pin: cleanPin },
      { pin: String(cleanPin) },
      ...(!isNaN(numPin) ? [{ pin: numPin }] : [])
    ]
  }).select('+pinHash');

  // 2. If not found directly, compare against all non-inactive staff
  if (!staff) {
    const candidateUsers = await User.find({ status: { $ne: 'inactive' } }).select('+pinHash');
    for (const u of candidateUsers) {
      if (await u.comparePin(cleanPin) || (u.pin && String(u.pin).trim() === cleanPin)) {
        staff = u;
        break;
      }
    }
  }

  // 3. Fallback: Search ALL users in DB regardless of status to handle status edge-cases
  if (!staff) {
    const allUsers = await User.find().select('+pinHash');
    for (const u of allUsers) {
      if (await u.comparePin(cleanPin) || (u.pin && String(u.pin).trim() === cleanPin)) {
        staff = u;
        break;
      }
    }
  }

  return staff;
};

/**
 * Verify staff 4-digit PIN for real-time station feedback and auto-clock status lookup
 */
export const verifyPin = async ({ pin }) => {
  if (!pin || String(pin).trim().length === 0) {
    throw new Error('PIN code is required.');
  }

  const cleanPin = String(pin).trim();
  const staff = await findStaffByPin(cleanPin);

  if (!staff) {
    throw new Error(`Invalid 4-digit PIN (${cleanPin}). No matching staff account found.`);
  }

  if (staff.status === 'inactive') {
    throw new Error(`Staff account for ${staff.name} is currently inactive. Please set account status to active in Staff Directory.`);
  }

  if (staff.lockoutUntil && new Date() < new Date(staff.lockoutUntil)) {
    const remainingMins = Math.ceil((new Date(staff.lockoutUntil) - new Date()) / 60000);
    throw new Error(`Account temporarily locked due to repeated invalid PIN attempts. Try again in ${remainingMins} min(s).`);
  }

  const openAttendance = await Attendance.findOne({
    userId: staff._id,
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
  });

  return {
    success: true,
    staff: {
      _id: staff._id,
      name: staff.name ? staff.name.trim() : 'Staff Member',
      role: staff.role || 'staff',
      department: staff.department || 'Operations',
      avatar: staff.avatar || '',
      hourlyRate: staff.hourlyRate || 18.50
    },
    isClockedIn: !!openAttendance,
    activeAttendance: openAttendance || null
  };
};

/**
 * Clock In staff member with secure PIN, rate limiting, and camera selfie capture
 */
export const clockIn = async ({ pin, selfieImage, notes, userId, ipAddress }) => {
  let staff;

  if (pin && String(pin).trim().length > 0) {
    const cleanPin = String(pin).trim();
    staff = await findStaffByPin(cleanPin);
  } else if (userId) {
    staff = await User.findById(userId).select('+pinHash');
  }

  if (!staff) {
    throw new Error('Invalid 4-digit PIN code. No matching staff account found.');
  }

  if (staff.status === 'inactive') {
    throw new Error(`Staff account for ${staff.name} is currently inactive.`);
  }

  // Check rate limiting / lockout
  if (staff.lockoutUntil && new Date() < new Date(staff.lockoutUntil)) {
    const remainingMins = Math.ceil((new Date(staff.lockoutUntil) - new Date()) / 60000);
    throw new Error(`Account temporarily locked due to repeated invalid PIN attempts. Try again in ${remainingMins} min(s).`);
  }

  // Verify candidate PIN
  if (pin) {
    const isPinValid = await staff.comparePin(pin);
    if (!isPinValid) {
      staff.failedPinAttempts = (staff.failedPinAttempts || 0) + 1;
      if (staff.failedPinAttempts >= 5) {
        staff.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }
      await staff.save();

      await logAuditAction({
        actorId: staff._id,
        actorName: staff.name,
        action: 'pin_failed',
        targetModel: 'User',
        targetId: staff._id,
        reason: 'Failed clock-in PIN attempt',
        ipAddress
      });

      throw new Error('Invalid 4-digit PIN code.');
    }
  }

  // Reset PIN attempts on success
  staff.failedPinAttempts = 0;
  staff.lockoutUntil = null;
  await staff.save();

  // Check if staff is already clocked in without a clock-out
  const openAttendance = await Attendance.findOne({
    userId: staff._id,
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
  });

  if (openAttendance) {
    return {
      alreadyClockedIn: true,
      attendance: openAttendance,
      staff: {
        _id: staff._id,
        name: staff.name,
        role: staff.role,
        avatar: staff.avatar,
        hourlyRate: staff.hourlyRate
      },
      message: `${staff.name} is already clocked in since ${new Date(openAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    };
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  // Check today's scheduled shift
  const scheduledShift = await Shift.findOne({ userId: staff._id, date: dateStr });
  let status = 'Present';

  if (scheduledShift && scheduledShift.startTime) {
    const [sHours, sMins] = scheduledShift.startTime.split(':').map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(sHours, sMins, 0, 0);
    const graceMs = (scheduledShift.lateAllowanceMins || 15) * 60 * 1000;

    if (now.getTime() > shiftStart.getTime() + graceMs) {
      status = 'Late';
    }
  }

  const newAttendance = await Attendance.create({
    userId: staff._id,
    shiftId: scheduledShift ? scheduledShift._id : null,
    date: dateStr,
    checkIn: now,
    originalCheckIn: now,
    selfieImage: selfieImage || '',
    breakDurationMins: scheduledShift?.breakDurationMins || 30,
    status,
    hourlyRate: staff.hourlyRate || 18.50,
    notes: notes || ''
  });

  const populated = await Attendance.findById(newAttendance._id).populate('userId', 'name email role avatar hourlyRate department');

  await logAuditAction({
    actorId: staff._id,
    actorName: staff.name,
    action: 'clock_in',
    targetModel: 'Attendance',
    targetId: newAttendance._id,
    afterValue: { checkIn: now, status },
    ipAddress
  });

  return {
    success: true,
    action: 'clock_in',
    attendance: populated,
    staff: {
      _id: staff._id,
      name: staff.name,
      role: staff.role,
      avatar: staff.avatar,
      hourlyRate: staff.hourlyRate
    },
    message: `Successfully Clocked In: ${staff.name} (${status.toUpperCase()})`
  };
};

/**
 * Clock Out staff member with PIN, server timestamp, and camera selfie capture
 */
export const clockOut = async ({ pin, selfieImage, notes, userId, ipAddress }) => {
  let staff;

  if (pin && String(pin).trim().length > 0) {
    const cleanPin = String(pin).trim();
    staff = await findStaffByPin(cleanPin);
  } else if (userId) {
    staff = await User.findById(userId).select('+pinHash');
  }

  if (!staff) {
    throw new Error('Invalid 4-digit PIN code. No matching staff account found.');
  }

  if (staff.status === 'inactive') {
    throw new Error(`Staff account for ${staff.name} is currently inactive.`);
  }

  // Check rate limiting / lockout
  if (staff.lockoutUntil && new Date() < new Date(staff.lockoutUntil)) {
    const remainingMins = Math.ceil((new Date(staff.lockoutUntil) - new Date()) / 60000);
    throw new Error(`Account temporarily locked due to repeated invalid PIN attempts. Try again in ${remainingMins} min(s).`);
  }

  // Verify PIN
  if (pin) {
    const isPinValid = await staff.comparePin(pin);
    if (!isPinValid) {
      staff.failedPinAttempts = (staff.failedPinAttempts || 0) + 1;
      if (staff.failedPinAttempts >= 5) {
        staff.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await staff.save();

      await logAuditAction({
        actorId: staff._id,
        actorName: staff.name,
        action: 'pin_failed',
        targetModel: 'User',
        targetId: staff._id,
        reason: 'Failed clock-out PIN attempt',
        ipAddress
      });

      throw new Error('Invalid 4-digit PIN code.');
    }
  }

  // Reset PIN attempts on success
  staff.failedPinAttempts = 0;
  staff.lockoutUntil = null;
  await staff.save();

  // Find active open attendance session
  const openAttendance = await Attendance.findOne({
    userId: staff._id,
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
  }).sort({ createdAt: -1 });

  if (!openAttendance) {
    throw new Error(`${staff.name} does not have an active open clock-in session to clock out.`);
  }

  const checkOutTime = new Date();
  const checkInTime = new Date(openAttendance.checkIn);
  const diffMs = checkOutTime.getTime() - checkInTime.getTime();

  // Elapsed hours calculation (handles overnight shifts)
  const elapsedHours = Math.max(0.01, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
  const unpaidBreakHours = (openAttendance.breakDurationMins || 30) / 60;
  const paidHours = Math.max(0, Math.round((elapsedHours - unpaidBreakHours) * 100) / 100);

  // Overtime Rules: Regular <= 8h, Overtime > 8h at 1.5x rate
  const regularHours = Math.min(paidHours, 8);
  const overtimeHours = Math.max(0, Math.round((paidHours - 8) * 100) / 100);
  const rate = staff.hourlyRate || openAttendance.hourlyRate || 18.50;

  const regularPay = regularHours * rate;
  const overtimePay = overtimeHours * rate * 1.5;
  const estimatedPay = Math.round((regularPay + overtimePay) * 100) / 100;

  openAttendance.checkOut = checkOutTime;
  if (!openAttendance.originalCheckOut) openAttendance.originalCheckOut = checkOutTime;
  openAttendance.totalHours = elapsedHours;
  openAttendance.regularHours = regularHours;
  openAttendance.overtimeHours = overtimeHours;
  openAttendance.estimatedPay = estimatedPay;
  openAttendance.status = 'Completed';
  if (selfieImage) openAttendance.clockOutSelfieImage = selfieImage;
  if (notes) openAttendance.notes = notes;

  await openAttendance.save();

  const populated = await Attendance.findById(openAttendance._id).populate('userId', 'name email role avatar hourlyRate department');

  await logAuditAction({
    actorId: staff._id,
    actorName: staff.name,
    action: 'clock_out',
    targetModel: 'Attendance',
    targetId: openAttendance._id,
    afterValue: { checkOut: checkOutTime, totalHours: elapsedHours, estimatedPay },
    ipAddress
  });

  return {
    success: true,
    action: 'clock_out',
    attendance: populated,
    staff: {
      _id: staff._id,
      name: staff.name,
      role: staff.role,
      avatar: staff.avatar,
      hourlyRate: staff.hourlyRate
    },
    message: `Successfully Clocked Out: ${staff.name}. Worked ${elapsedHours} hrs (Pay: $${estimatedPay.toFixed(2)})`
  };
};

/**
 * Attendance Correction by Manager with mandatory reason & audit logging
 */
export const correctAttendanceRecord = async ({ attendanceId, checkIn, checkOut, reason, managerUser, ipAddress }) => {
  if (!reason || reason.trim().length === 0) {
    throw new Error('A mandatory reason is required for attendance record corrections.');
  }

  const record = await Attendance.findById(attendanceId);
  if (!record) {
    throw new Error('Attendance record not found.');
  }

  const prevCheckIn = record.checkIn;
  const prevCheckOut = record.checkOut;

  if (!record.originalCheckIn) record.originalCheckIn = prevCheckIn;
  if (!record.originalCheckOut && prevCheckOut) record.originalCheckOut = prevCheckOut;

  const newCheckInDate = checkIn ? new Date(checkIn) : prevCheckIn;
  const newCheckOutDate = checkOut ? new Date(checkOut) : prevCheckOut;

  record.checkIn = newCheckInDate;
  if (newCheckOutDate) {
    record.checkOut = newCheckOutDate;
    const diffMs = newCheckOutDate.getTime() - newCheckInDate.getTime();
    const elapsedHours = Math.max(0.01, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
    const unpaidBreakHours = (record.breakDurationMins || 30) / 60;
    const paidHours = Math.max(0, Math.round((elapsedHours - unpaidBreakHours) * 100) / 100);

    const regularHours = Math.min(paidHours, 8);
    const overtimeHours = Math.max(0, Math.round((paidHours - 8) * 100) / 100);
    const rate = record.hourlyRate || 18.50;

    record.totalHours = elapsedHours;
    record.regularHours = regularHours;
    record.overtimeHours = overtimeHours;
    record.estimatedPay = Math.round(((regularHours * rate) + (overtimeHours * rate * 1.5)) * 100) / 100;
  }

  record.corrections.push({
    correctedBy: managerUser._id,
    correctedByName: managerUser.name || 'Manager',
    timestamp: new Date(),
    reason: reason.trim(),
    previousCheckIn: prevCheckIn,
    previousCheckOut: prevCheckOut,
    newCheckIn: newCheckInDate,
    newCheckOut: newCheckOutDate
  });

  await record.save();

  await logAuditAction({
    actorId: managerUser._id,
    actorName: managerUser.name,
    action: 'attendance_correction',
    targetModel: 'Attendance',
    targetId: record._id,
    reason: reason.trim(),
    beforeValue: { checkIn: prevCheckIn, checkOut: prevCheckOut },
    afterValue: { checkIn: newCheckInDate, checkOut: newCheckOutDate },
    ipAddress
  });

  return await Attendance.findById(record._id).populate('userId', 'name email role avatar hourlyRate department');
};

/**
 * Get active clocked in staff
 */
export const getActiveClockedInStaff = async () => {
  const activeRecords = await Attendance.find({
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
  }).populate('userId', 'name email role avatar hourlyRate department phone');

  const now = new Date();
  const validActive = [];

  for (const rec of activeRecords) {
    if (!rec.userId) {
      await Attendance.findByIdAndDelete(rec._id);
      continue;
    }

    const checkInTime = new Date(rec.checkIn);
    const ageInHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    if (ageInHours > 24) {
      const autoCheckOut = new Date(checkInTime.getTime() + 8 * 60 * 60 * 1000);
      rec.checkOut = autoCheckOut;
      rec.totalHours = 8.0;
      rec.regularHours = 8.0;
      rec.overtimeHours = 0;
      rec.status = 'Missed Clock-Out';
      rec.notes = 'System auto-closed stale clock-in session older than 24 hours.';
      await rec.save();
      continue;
    }

    validActive.push(rec);
  }

  return validActive;
};

/**
 * Get Attendance Dashboard Records with Filtering
 */
export const getAttendanceDashboard = async ({ startDate, endDate, userId, status, department }) => {
  const query = {};

  if (userId) query.userId = userId;
  if (status && status !== 'all') query.status = status;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const records = await Attendance.find(query)
    .populate('userId', 'name email role avatar hourlyRate department phone')
    .populate('shiftId')
    .sort({ createdAt: -1 });

  if (department && department !== 'all') {
    return records.filter(r => r.userId && r.userId.department === department);
  }

  return records;
};
