import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, Search, Filter, CheckCircle2, AlertTriangle, RefreshCw,
  Edit3, Eye, Calendar, User, FileText, X, AlertCircle, History,
  Shield, Check, UserCheck, ArrowRight, Sparkles, MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import CustomDropdown from '../../components/CustomDropdown';
import CalendarPicker from './CalendarPicker';
import DateTimePicker from './DateTimePicker';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function AttendanceDashboard({ isDark, staffList = [] }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const employeeOptions = useMemo(() => [
    { value: 'all', label: 'All Employees' },
    ...staffList.map(s => ({ value: s._id, label: `${s.name} (${s.role.toUpperCase()})` }))
  ], [staffList]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Statuses' },
    { value: 'Present', label: 'Present / In Progress' },
    { value: 'Completed', label: 'Completed Shift' },
    { value: 'Late', label: 'Late Arrival' },
    { value: 'Missed Clock-Out', label: 'Missed Clock-Out' }
  ], []);

  const departmentOptions = useMemo(() => [
    { value: 'all', label: 'All Departments' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Kitchen', label: 'Kitchen / Culinary' },
    { value: 'Service', label: 'Service / Dining' },
    { value: 'Management', label: 'Management' }
  ], []);

  // Correction Modal State
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Correction History View Modal State
  const [historyRecord, setHistoryRecord] = useState(null);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const queryParts = [];
      if (startDate) queryParts.push(`startDate=${startDate}`);
      if (endDate) queryParts.push(`endDate=${endDate}`);
      if (selectedStaffId !== 'all') queryParts.push(`userId=${selectedStaffId}`);
      if (statusFilter !== 'all') queryParts.push(`status=${statusFilter}`);
      if (departmentFilter !== 'all') queryParts.push(`department=${departmentFilter}`);

      const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${API_BASE}/api/attendance/dashboard${queryStr}`, { headers });
      setRecords(res.data || []);
    } catch (err) {
      console.error('Error fetching attendance dashboard:', err);
      toast.error('Failed to load attendance logs');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedStaffId, statusFilter, departmentFilter]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Client-side search filtering
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const u = rec.userId || {};
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      return name.includes(q) || email.includes(q);
    });
  }, [records, searchQuery]);

  const handleOpenCorrection = (record) => {
    setCorrectionRecord(record);
    setEditCheckIn(record.checkIn ? new Date(record.checkIn).toISOString().slice(0, 16) : '');
    setEditCheckOut(record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : '');
    setCorrectionReason('');
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      toast.error('A mandatory reason is required for attendance corrections.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/api/attendance/${correctionRecord._id}/correct`, {
        checkIn: editCheckIn,
        checkOut: editCheckOut,
        reason: correctionReason
      }, { headers });

      if (res.data?.success) {
        toast.success('Attendance record corrected and audit logged successfully!');
        setCorrectionRecord(null);
        fetchAttendance();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply attendance correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate live preview hours inside correction modal
  const previewCorrectionHours = useMemo(() => {
    if (!editCheckIn || !editCheckOut) return null;
    const start = new Date(editCheckIn);
    const end = new Date(editCheckOut);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    const elapsed = Math.max(0.01, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
    const breakHours = (correctionRecord?.breakDurationMins || 30) / 60;
    return Math.max(0, Math.round((elapsed - breakHours) * 100) / 100);
  }, [editCheckIn, editCheckOut, correctionRecord]);

  // Aggregate Metrics
  const totalLogsCount = filteredRecords.length;
  const completedCount = filteredRecords.filter(r => r.status === 'Completed').length;
  const lateCount = filteredRecords.filter(r => r.status === 'Late').length;
  const correctedCount = filteredRecords.filter(r => r.corrections && r.corrections.length > 0).length;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* ── HEADER BANNER ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-orange-500" />
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Compliance &amp; Governance</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">Attendance Dashboard &amp; Audit Trail</h2>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-1`}>
            Track employee clock-ins, late arrivals, shift hours, manager corrections with mandatory reasons, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAttendance}
            className={`p-3 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/70 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700'} transition-all cursor-pointer flex items-center gap-2 text-xs font-bold`}
            title="Refresh Attendance Logs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : ''} />
            <span>Sync Logs</span>
          </button>
        </div>
      </div>

      {/* ── SUMMARY METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Total Shift Logs</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-3xl font-black">{totalLogsCount}</p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} mt-2 uppercase tracking-wider`}>Filtered Attendance Records</p>
        </div>

        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Completed Shifts</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{completedCount}</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase tracking-wider">Full Shift Clock-Outs</p>
        </div>

        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Late Arrivals</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-400">{lateCount}</p>
          <p className="text-[10px] font-bold text-rose-400 mt-2 uppercase tracking-wider">Beyond Late Grace Allowance</p>
        </div>

        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Manager Corrections</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400">{correctedCount}</p>
          <p className="text-[10px] font-bold text-amber-400 mt-2 uppercase tracking-wider">Mandatory Audit Logged</p>
        </div>
      </div>

      {/* ── FILTER CONTROLS BAR ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl relative z-30`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
            <Filter size={16} className="text-orange-500" /> Filter &amp; Search Attendance Logs
          </h3>
          {(startDate || endDate || selectedStaffId !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedStaffId('all');
                setStatusFilter('all');
                setDepartmentFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>
              Search Staff
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={14} />
              <input
                type="text"
                placeholder="Name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} py-2.5 pl-9 pr-3 text-xs outline-none focus:border-orange-500`}
              />
            </div>
          </div>

          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>
              Start Date
            </label>
            <CalendarPicker
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
          </div>

          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>
              End Date
            </label>
            <CalendarPicker
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>

          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>
              Filter Employee
            </label>
            <CustomDropdown
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              options={employeeOptions}
              isDark={isDark}
            />
          </div>

          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>
              Attendance Status
            </label>
            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              isDark={isDark}
            />
          </div>
        </div>
      </div>

      {/* ── ATTENDANCE LOGS TABLE ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl overflow-x-auto`}>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b ${isDark ? 'border-white/10 text-white/40' : 'border-gray-200 text-gray-500'} uppercase font-black tracking-widest text-[10px]`}>
              <th className="pb-4 pl-4">Employee</th>
              <th className="pb-4">Date</th>
              <th className="pb-4">Clock In</th>
              <th className="pb-4">Clock Out</th>
              <th className="pb-4">Elapsed Hours</th>
              <th className="pb-4">Est. Gross Pay</th>
              <th className="pb-4">Status</th>
              <th className="pb-4 pr-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-white/40 font-bold uppercase tracking-wider">
                  Loading Attendance Records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-white/40 font-bold">
                  No attendance records found for the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const u = rec.userId || {};
                const isLate = rec.status === 'Late';
                const isCorrected = rec.corrections && rec.corrections.length > 0;

                return (
                  <tr key={rec._id} className={`group hover:${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} transition-colors`}>
                    <td className="py-4 pl-4 font-bold flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center font-black shrink-0">
                        {(u.name || 'E').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{u.name || 'Employee'}</p>
                        <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase font-semibold`}>{u.role}</p>
                      </div>
                    </td>

                    <td className="py-4 font-mono font-bold">{rec.date}</td>

                    <td className="py-4 font-mono font-bold text-emerald-400">
                      {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>

                    <td className="py-4 font-mono font-bold text-sky-400">
                      {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}
                    </td>

                    <td className="py-4 font-mono font-black text-amber-400 text-sm">
                      {rec.totalHours ? `${rec.totalHours} hrs` : '—'}
                    </td>

                    <td className="py-4 font-mono font-bold text-emerald-400">
                      ${(rec.estimatedPay || 0).toFixed(2)}
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                          isLate
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : rec.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {rec.status}
                        </span>

                        {isCorrected && (
                          <span
                            onClick={() => setHistoryRecord(rec)}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase cursor-pointer hover:bg-amber-500 hover:text-black transition-all"
                            title="Click to view manager correction audit trail"
                          >
                            Corrected ({rec.corrections.length})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isCorrected && (
                          <button
                            onClick={() => setHistoryRecord(rec)}
                            title="View Correction Audit History"
                            className="p-2 rounded-xl border border-white/10 bg-white/5 text-amber-400 hover:text-white cursor-pointer transition-all"
                          >
                            <History size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenCorrection(rec)}
                          title="Correct Attendance Datetime"
                          className="p-2 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MANAGER ATTENDANCE CORRECTION MODAL WITH MANDATORY REASON ── */}
      <AnimatePresence>
        {correctionRecord && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-6 shadow-2xl font-sans`}
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">Manager Attendance Correction</h3>
                  <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} font-bold uppercase`}>
                    Employee: {correctionRecord.userId?.name || 'Staff Member'}
                  </p>
                </div>
                <button onClick={() => setCorrectionRecord(null)} className="text-white/50 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
                <div>
                  <label className={`text-[10px] font-black uppercase ${isDark ? 'text-white/50' : 'text-gray-600'} block mb-1`}>
                    Corrected Check In Datetime *
                  </label>
                  <DateTimePicker
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    placeholder="Select Check-In Datetime"
                  />
                </div>

                <div>
                  <label className={`text-[10px] font-black uppercase ${isDark ? 'text-white/50' : 'text-gray-600'} block mb-1`}>
                    Corrected Check Out Datetime
                  </label>
                  <DateTimePicker
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    placeholder="Select Check-Out Datetime"
                  />
                </div>

                {previewCorrectionHours !== null && (
                  <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs flex justify-between items-center">
                    <span>Recalculated Paid Hours:</span>
                    <span className="font-black text-sm">{previewCorrectionHours} hrs</span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                      Mandatory Correction Reason *
                    </label>
                    <span className="text-[9px] font-bold text-white/40">Audit Logged</span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Employee forgot to clock out at shift end due to dinner rush. Verified with Shift Supervisor."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/60 text-white placeholder-white/30' : 'border-gray-300 bg-white text-gray-900'} p-3 text-xs outline-none focus:border-orange-500`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Correction...' : 'Confirm & Immutable Audit Log Correction'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CORRECTION AUDIT TRAIL HISTORY MODAL ── */}
      <AnimatePresence>
        {historyRecord && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-lg rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-6 shadow-2xl font-sans`}
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-amber-400" />
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Correction Audit History: {historyRecord.userId?.name || 'Employee'}
                  </h3>
                </div>
                <button onClick={() => setHistoryRecord(null)} className="text-white/50 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto text-xs font-mono pr-1 scrollbar-hide">
                {(historyRecord.corrections || []).map((c, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-amber-400">Corrected By: {c.correctedByName}</p>
                      <span className="text-[10px] text-white/40">{new Date(c.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-black/40 border border-white/10 my-2 text-white/80">
                      <span className="text-[9px] text-orange-400 font-bold block uppercase mb-0.5">Mandatory Reason</span>
                      <p className="text-xs italic">"{c.reason}"</p>
                    </div>

                    <div className="text-[10px] text-white/60 space-y-0.5 pt-1">
                      <p>Check-In: {c.previousCheckIn ? new Date(c.previousCheckIn).toLocaleString() : '—'} ➔ {c.newCheckIn ? new Date(c.newCheckIn).toLocaleString() : '—'}</p>
                      <p>Check-Out: {c.previousCheckOut ? new Date(c.previousCheckOut).toLocaleString() : '—'} ➔ {c.newCheckOut ? new Date(c.newCheckOut).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setHistoryRecord(null)}
                className="w-full mt-4 py-2.5 rounded-2xl border border-white/10 text-xs font-bold text-white/60 hover:text-white cursor-pointer"
              >
                Close Audit History
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
