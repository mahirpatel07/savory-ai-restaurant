import AuditLog from '../models/AuditLog.js';

/**
 * Create a new audit log record
 */
export const logAuditAction = async ({ actorId, actorName, action, targetModel, targetId, reason, beforeValue, afterValue, ipAddress }) => {
  try {
    const log = await AuditLog.create({
      actorId: actorId || null,
      actorName: actorName || 'System',
      action,
      targetModel,
      targetId: targetId ? String(targetId) : null,
      reason: reason || '',
      beforeValue: beforeValue || null,
      afterValue: afterValue || null,
      ipAddress: ipAddress || ''
    });
    return log;
  } catch (err) {
    console.error('Audit logging error:', err);
  }
};

/**
 * Fetch audit logs with filtering
 */
export const getAuditLogs = async ({ action, targetModel, startDate, endDate, limit = 100 } = {}) => {
  const query = {};
  if (action && action !== 'all') query.action = action;
  if (targetModel) query.targetModel = targetModel;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);

  return logs;
};
