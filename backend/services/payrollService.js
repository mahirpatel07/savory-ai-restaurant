import Attendance from '../models/Attendance.js';
import Shift from '../models/Shift.js';
import User from '../models/User.js';

/**
 * Calculate automated payroll hours and estimated earnings summary
 */
export const calculatePayrollSummary = async ({ startDate, endDate, userId, period }) => {
  const staffQuery = { role: { $ne: 'customer' } };
  if (userId) staffQuery._id = userId;

  const staffMembers = await User.find(staffQuery).select('-password');

  const attendanceQuery = {};
  if (startDate || endDate) {
    attendanceQuery.date = {};
    if (startDate) attendanceQuery.date.$gte = startDate;
    if (endDate) attendanceQuery.date.$lte = endDate;
  }

  const attendanceRecords = await Attendance.find(attendanceQuery);
  const shiftRecords = await Shift.find(attendanceQuery);

  const summaries = staffMembers.map(staff => {
    const userAttendance = attendanceRecords.filter(
      r => r.userId && r.userId.toString() === staff._id.toString()
    );
    const userShifts = shiftRecords.filter(
      s => s.userId && s.userId.toString() === staff._id.toString()
    );

    const scheduledHours = userShifts.reduce((sum, s) => sum + 8, 0); // 8h standard
    const completedShifts = userAttendance.filter(r => r.checkOut);

    const actualElapsedHours = userAttendance.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const unpaidBreakHours = userAttendance.reduce((sum, r) => sum + ((r.breakDurationMins || 30) / 60), 0);
    const paidHours = Math.max(0, actualElapsedHours - unpaidBreakHours);

    const regularHours = userAttendance.reduce((sum, r) => sum + (r.regularHours || Math.min(r.totalHours || 0, 8)), 0);
    const overtimeHours = userAttendance.reduce((sum, r) => sum + (r.overtimeHours || Math.max(0, (r.totalHours || 0) - 8)), 0);

    const hourlyRate = staff.hourlyRate || 18.50;
    const regularEarnings = Math.round((regularHours * hourlyRate) * 100) / 100;
    const overtimeEarnings = Math.round((overtimeHours * hourlyRate * 1.5) * 100) / 100;
    const estimatedGrossPay = Math.round((regularEarnings + overtimeEarnings) * 100) / 100;

    return {
      userId: staff._id,
      employeeName: staff.name,
      email: staff.email,
      role: staff.role,
      department: staff.department || 'Operations',
      avatar: staff.avatar,
      hourlyRate,
      totalShiftsWorked: completedShifts.length,
      scheduledHours: Math.round(scheduledHours * 100) / 100,
      actualElapsedHours: Math.round(actualElapsedHours * 100) / 100,
      unpaidBreakHours: Math.round(unpaidBreakHours * 100) / 100,
      paidHours: Math.round(paidHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      regularEarnings,
      overtimeEarnings,
      estimatedGrossPay
    };
  });

  return summaries;
};

// Alias method
export const getPayrollSummary = calculatePayrollSummary;

/**
 * Generate CSV content for Payroll Summary
 */
export const generatePayrollCSV = async ({ startDate, endDate, period }) => {
  const summaries = await calculatePayrollSummary({ startDate, endDate, period });

  const headers = [
    'Employee ID', 'Employee Name', 'Role', 'Department', 'Hourly Rate ($)',
    'Completed Shifts', 'Scheduled Hrs', 'Elapsed Hrs', 'Unpaid Break Hrs',
    'Paid Hrs', 'Regular Hrs', 'Overtime Hrs (1.5x)', 'Regular Earnings ($)',
    'Overtime Earnings ($)', 'Estimated Gross Pay ($)'
  ];

  const rows = summaries.map(s => [
    s.userId,
    `"${s.employeeName}"`,
    s.role,
    s.department,
    s.hourlyRate.toFixed(2),
    s.totalShiftsWorked,
    s.scheduledHours.toFixed(2),
    s.actualElapsedHours.toFixed(2),
    s.unpaidBreakHours.toFixed(2),
    s.paidHours.toFixed(2),
    s.regularHours.toFixed(2),
    s.overtimeHours.toFixed(2),
    s.regularEarnings.toFixed(2),
    s.overtimeEarnings.toFixed(2),
    s.estimatedGrossPay.toFixed(2)
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};
