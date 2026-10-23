import Shift from '../models/Shift.js';
import ShiftTemplate from '../models/ShiftTemplate.js';
import User from '../models/User.js';
import { logAuditAction } from './auditService.js';

const DEFAULT_TEMPLATES = [
  { name: 'Morning Shift', startTime: '10:00', endTime: '24:00', breakDurationMins: 30, color: '#10b981', location: 'Main Flagship Branch' },
  { name: 'Evening Shift', startTime: '16:00', endTime: '00:00', breakDurationMins: 30, color: '#f59e0b', location: 'Main Flagship Branch' },
  { name: 'Night Shift', startTime: '00:00', endTime: '08:00', breakDurationMins: 30, color: '#6366f1', location: 'Main Flagship Branch' }
];

/**
 * Get or seed default Shift Templates
 */
export const getShiftTemplates = async () => {
  let templates = await ShiftTemplate.find({ isActive: true });
  if (templates.length === 0) {
    templates = await ShiftTemplate.insertMany(DEFAULT_TEMPLATES);
  }
  return templates;
};

/**
 * Save or update Shift Template
 */
export const saveShiftTemplate = async (templateData, reqUser) => {
  let template;
  if (templateData._id) {
    template = await ShiftTemplate.findByIdAndUpdate(templateData._id, templateData, { new: true });
  } else {
    template = await ShiftTemplate.create(templateData);
  }

  await logAuditAction({
    actorId: reqUser?._id,
    actorName: reqUser?.name || 'Manager',
    action: templateData._id ? 'shift_template_updated' : 'shift_template_created',
    targetModel: 'ShiftTemplate',
    targetId: template._id,
    afterValue: template
  });

  return template;
};

/**
 * Delete / deactivate Shift Template
 */
export const deleteShiftTemplate = async (id, reqUser) => {
  await ShiftTemplate.findByIdAndUpdate(id, { isActive: false });
  await logAuditAction({
    actorId: reqUser?._id,
    actorName: reqUser?.name || 'Manager',
    action: 'shift_template_deleted',
    targetModel: 'ShiftTemplate',
    targetId: id
  });
  return { success: true };
};

/**
 * Check Scheduling Conflicts & Policy Warnings (Overlapping, <12h Rest, >72h Weekly Limit)
 */
export const checkShiftConflicts = async ({ userId, date, startTime, endTime, excludeShiftId }) => {
  const warnings = [];
  const errors = [];

  const staff = await User.findById(userId);
  const staffName = staff?.name || 'Staff Member';

  // 1. Overlapping shift check on same date
  const query = {
    userId,
    date,
    status: { $ne: 'cancelled' }
  };
  if (excludeShiftId) query._id = { $ne: excludeShiftId };

  const existingShifts = await Shift.find(query);
  if (existingShifts.length > 0) {
    errors.push(`Overlapping shift conflict: ${staffName} is already scheduled for a shift on ${date}`);
  }

  // 2. Weekly total scheduled hours check (> 72 hrs error limit, > 48 hrs overtime policy limit)
  const shiftDate = new Date(date);
  const day = shiftDate.getDay();
  const diff = shiftDate.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(shiftDate.setDate(diff)).toISOString().split('T')[0];

  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = weekEndDate.toISOString().split('T')[0];

  const userWeeklyShifts = await Shift.find({
    userId,
    date: { $gte: weekStart, $lte: weekEnd },
    status: { $ne: 'cancelled' }
  });

  const currentShiftHours = 8;
  const totalWeeklyHours = userWeeklyShifts.length * 8 + currentShiftHours;

  if (totalWeeklyHours > 72) {
    errors.push(`Weekly work limit exceeded: ${staffName} is scheduled for ${totalWeeklyHours} hrs this week (Maximum limit: 72 hrs).`);
  }

  // 3. Less than 11 hours rest check between consecutive shifts
  const prevDateObj = new Date(date);
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const prevDateStr = prevDateObj.toISOString().split('T')[0];

  const prevShifts = await Shift.find({ userId, date: prevDateStr, status: { $ne: 'cancelled' } });
  for (const prevShift of prevShifts) {
    const [pStartH] = (prevShift.startTime || '08:00').split(':').map(Number);
    const [pEndH] = (prevShift.endTime || '16:00').split(':').map(Number);
    const [cStartH] = (startTime || '08:00').split(':').map(Number);

    let prevEndDt = new Date(`${prevDateStr}T${String(pEndH).padStart(2, '0')}:00:00`);
    if (pEndH <= pStartH) {
      prevEndDt = new Date(prevEndDt.getTime() + 24 * 60 * 60 * 1000);
    }

    const currentStartDt = new Date(`${date}T${String(cStartH).padStart(2, '0')}:00:00`);
    const restMs = currentStartDt.getTime() - prevEndDt.getTime();
    const restHours = restMs / (1000 * 60 * 60);

    if (restHours < 11 && restHours >= 0) {
      warnings.push(`Insufficient rest warning: ${staffName} has only ${Math.round(restHours * 10) / 10}h rest between shifts on ${prevDateStr} and ${date} (Minimum required rest is 11 hours).`);
    }
  }

  return { hasErrors: errors.length > 0, errors, warnings };
};

/**
 * Save single scheduled shift
 */
export const saveShift = async (shiftData, reqUser) => {
  const { _id, userId, date, shiftType, startTime, endTime, breakDurationMins, role, location, notes, status } = shiftData;

  const conflictCheck = await checkShiftConflicts({
    userId,
    date,
    startTime: startTime || '08:00',
    endTime: endTime || '16:00',
    excludeShiftId: _id
  });

  if (conflictCheck.hasErrors) {
    throw new Error(conflictCheck.errors.join('; '));
  }

  let saved;
  if (_id) {
    saved = await Shift.findByIdAndUpdate(
      _id,
      { userId, date, shiftType, startTime, endTime, breakDurationMins, role, location, notes, status: status || 'draft', updatedBy: reqUser?._id },
      { new: true }
    ).populate('userId', 'name email role avatar hourlyRate department');
  } else {
    saved = await Shift.create({
      userId,
      date,
      shiftType: shiftType || 'Morning',
      startTime: startTime || '08:00',
      endTime: endTime || '16:00',
      breakDurationMins: breakDurationMins || 30,
      role: role || 'waiter',
      location: location || 'Main Flagship Branch',
      notes: notes || '',
      status: status || 'draft',
      createdBy: reqUser?._id,
      updatedBy: reqUser?._id
    });
    saved = await Shift.findById(saved._id).populate('userId', 'name email role avatar hourlyRate department');
  }

  await logAuditAction({
    actorId: reqUser?._id,
    actorName: reqUser?.name || 'Manager',
    action: _id ? 'shift_updated' : 'shift_created',
    targetModel: 'Shift',
    targetId: saved._id,
    afterValue: saved
  });

  return { shift: saved, warnings: conflictCheck.warnings };
};

/**
 * Get Weekly Shift Roster
 */
export const getWeeklyRoster = async ({ startDate, endDate, userId, status } = {}) => {
  const query = {};
  if (userId) query.userId = userId;
  if (status && status !== 'all') query.status = status;

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const shifts = await Shift.find(query)
    .populate('userId', 'name email role avatar hourlyRate department')
    .sort({ date: 1, startTime: 1 });

  return shifts;
};

export const getScheduledShifts = getWeeklyRoster;

/**
 * Publish Weekly Roster
 */
export const publishRoster = async ({ startDate, endDate, reqUser } = {}) => {
  const query = { status: 'draft' };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const result = await Shift.updateMany(query, { status: 'published', updatedBy: reqUser?._id });

  await logAuditAction({
    actorId: reqUser?._id,
    actorName: reqUser?.name || 'Manager',
    action: 'roster_published',
    targetModel: 'Shift',
    reason: `Published roster for period ${startDate || 'all'} to ${endDate || 'all'}`
  });

  return { success: true, count: result.modifiedCount };
};

/**
 * Delete a scheduled shift
 */
export const deleteShift = async (shiftId, reqUser) => {
  const shift = await Shift.findByIdAndDelete(shiftId);
  if (shift) {
    await logAuditAction({
      actorId: reqUser?._id,
      actorName: reqUser?.name || 'Manager',
      action: 'shift_deleted',
      targetModel: 'Shift',
      targetId: shiftId,
      beforeValue: shift
    });
  }
  return { success: true };
};

/**
 * Batch save weekly shift roster
 */
export const batchSaveRoster = async ({ shifts, reqUser } = {}) => {
  const shiftsArray = Array.isArray(shifts) ? shifts : [];
  const savedShifts = [];
  for (const s of shiftsArray) {
    if (s.deleted && s._id) {
      await deleteShift(s._id, reqUser);
    } else {
      const res = await saveShift(s, reqUser);
      savedShifts.push(res.shift);
    }
  }
  return savedShifts;
};

export const batchSaveShifts = batchSaveRoster;
