import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Clock, DollarSign, Zap, RefreshCw, UserCheck, UserX,
  AlertTriangle, Search, Filter, Shield, Camera, Image as ImageIcon,
  CheckCircle2, Sparkles, AlertCircle, X, ChevronRight, Phone
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getSocket } from '../../utils/socket';
import CustomDropdown from '../../components/CustomDropdown';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function LiveStaffDashboard({ isDark, staffList = [], onRefreshStaff }) {
  const [activeRecords, setActiveRecords] = useState([]);
  const [clockLogs, setClockLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal for viewing selfie evidence
  const [selectedSelfie, setSelectedSelfie] = useState(null);

  // Live 1-second clock tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active working staff records
  const fetchActiveStaff = useCallback(async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/api/attendance/active`),
        axios.get(`${API_BASE}/api/attendance/history`)
      ]);
      setActiveRecords(activeRes.data || []);
      setClockLogs(historyRes.data || []);
    } catch (err) {
      console.error('Error fetching live working staff:', err);
      toast.error('Failed to update live working staff dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveStaff();

    // Listen to Socket.IO events for zero-latency live updates
    const socket = getSocket();
    if (socket) {
      socket.on('attendance_updated', fetchActiveStaff);
      socket.on('staff_updated', fetchActiveStaff);
      return () => {
        socket.off('attendance_updated', fetchActiveStaff);
        socket.off('staff_updated', fetchActiveStaff);
      };
    }
  }, [fetchActiveStaff]);

  // Calculate formatted live duration timer (HH:MM:SS)
  const calculateLiveTimer = (checkInTime) => {
    if (!checkInTime) return { formatted: '00:00:00', totalHours: 0, isOvertime: false, isNearOvertime: false };
    const start = new Date(checkInTime);
    const diffMs = Math.max(0, now.getTime() - start.getTime());

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    const totalHours = totalSeconds / 3600;

    return {
      formatted,
      hours,
      mins,
      secs,
      totalHours,
      isOvertime: totalHours >= 8.0,
      isNearOvertime: totalHours >= 7.0 && totalHours < 8.0
    };
  };

  // Calculate live earnings ticking in real-time
  const calculateLiveEarnings = (checkInTime, hourlyRate = 18.50) => {
    if (!checkInTime) return 0;
    const start = new Date(checkInTime);
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalHours = diffMs / (1000 * 60 * 60);

    // Regular <= 8h, Overtime > 8h at 1.5x multiplier
    const regHours = Math.min(totalHours, 8);
    const otHours = Math.max(0, totalHours - 8);

    const regPay = regHours * hourlyRate;
    const otPay = otHours * hourlyRate * 1.5;

    return Math.max(0, regPay + otPay);
  };

  // Manager Quick Clock-Out
  const handleManagerClockOut = async (staffMember) => {
    const u = staffMember.userId || {};
    const staffName = u.name || 'Staff Member';

    if (!window.confirm(`Are you sure you want to clock out ${staffName} from this station?`)) return;

    try {
      const res = await axios.post(`${API_BASE}/api/attendance/clock-out`, {
        userId: u._id || staffMember.userId
      });
      if (res.data?.success) {
        toast.success(res.data.message || `Clocked out ${staffName}`);
        fetchActiveStaff();
        if (onRefreshStaff) onRefreshStaff();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clock out staff member');
    }
  };

  // Filtered active records
  const filteredActiveRecords = useMemo(() => {
    return activeRecords.filter(rec => {
      const u = rec.userId || {};
      const name = (u.name || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const dept = (u.department || 'Operations').toLowerCase();

      const matchesSearch = name.includes(searchQuery.toLowerCase()) || role.includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'all' || dept === departmentFilter.toLowerCase();
      const matchesRole = roleFilter === 'all' || role === roleFilter.toLowerCase();

      return matchesSearch && matchesDept && matchesRole;
    });
  }, [activeRecords, searchQuery, departmentFilter, roleFilter]);

  // Aggregate metrics
  const totalHourlyBurnRate = activeRecords.reduce((sum, rec) => {
    const rate = rec.userId?.hourlyRate || rec.hourlyRate || 18.50;
    return sum + rate;
  }, 0);

  const totalAccumulatedEarnings = activeRecords.reduce((sum, rec) => {
    const rate = rec.userId?.hourlyRate || rec.hourlyRate || 18.50;
    return sum + calculateLiveEarnings(rec.checkIn, rate);
  }, 0);

  const overtimeCount = activeRecords.filter(rec => {
    const timer = calculateLiveTimer(rec.checkIn);
    return timer.isOvertime;
  }).length;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* ── HEADER BANNER ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Zap size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Live Working Roster Command</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight mt-0.5">Active Staff Live Shift Monitor</h2>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-1`}>
              Real-time shift duration timers ticking per second, live labor cost accumulators, and shift status metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchActiveStaff}
            className={`p-3 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/70 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700'} transition-all cursor-pointer flex items-center gap-2 text-xs font-bold`}
            title="Refresh Live Monitor"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : ''} />
            <span>Sync Live Feed</span>
          </button>
        </div>
      </div>

      {/* ── METRICS DASHBOARD CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl relative overflow-hidden`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>On-Shift Active Staff</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{activeRecords.length} Active</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase tracking-wider flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Live Clocked In
          </p>
        </div>

        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Hourly Payroll Burn Rate</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400">${totalHourlyBurnRate.toFixed(2)}/hr</p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} mt-2 uppercase tracking-wider`}>Combined Base Hourly Wage</p>
        </div>

        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Accumulated Labor Pay</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-sky-400 font-mono">${totalAccumulatedEarnings.toFixed(2)}</p>
          <p className="text-[10px] font-bold text-sky-400 mt-2 uppercase tracking-wider animate-pulse">⏱ Ticking Real-Time</p>
        </div>

        <div className={`p-6 rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Overtime Status (&gt;8h)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-400">{overtimeCount} Staff</p>
          <p className={`text-[10px] font-bold ${overtimeCount > 0 ? 'text-rose-400' : 'text-emerald-400'} mt-2 uppercase tracking-wider`}>
            {overtimeCount > 0 ? '⚠️ Overtime Multiplier (1.5x) Active' : '✅ All Shifts Within Regular 8h'}
          </p>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 sm:p-6 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-30`}>
        <div className="relative w-full sm:w-72">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
          <input
            type="text"
            placeholder="Search active staff by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50`}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <CustomDropdown
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={[
              { value: 'all', label: 'All Departments' },
              { value: 'Operations', label: 'Operations' },
              { value: 'Kitchen', label: 'Kitchen / Culinary' },
              { value: 'Service', label: 'Service / Dining' },
              { value: 'Management', label: 'Management' }
            ]}
            className="w-40 sm:w-48"
            isDark={isDark}
          />

          <CustomDropdown
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'manager', label: 'Manager' },
              { value: 'waiter', label: 'Waitstaff' },
              { value: 'chef', label: 'Chef / Kitchen' },
              { value: 'cashier', label: 'Cashier' },
              { value: 'admin', label: 'Admin' }
            ]}
            className="w-36 sm:w-44"
            isDark={isDark}
          />
        </div>
      </div>

      {/* ── LIVE ACTIVE WORKING STAFF CARDS GRID ── */}
      {filteredActiveRecords.length === 0 ? (
        <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-16 text-center`}>
          <UserX size={48} className={`mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-400'}`} />
          <h3 className="text-lg font-black uppercase tracking-tight">No Active Working Staff</h3>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'} font-medium mt-1 max-w-sm mx-auto`}>
            {searchQuery || departmentFilter !== 'all' || roleFilter !== 'all'
              ? 'No active staff members match the selected search or filter criteria.'
              : 'There are currently no staff members clocked in. Staff can clock in using the Time Clock Station PIN keypad.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActiveRecords.map((item) => {
            const u = item.userId || {};
            const hourlyRate = u.hourlyRate || item.hourlyRate || 18.50;
            const timer = calculateLiveTimer(item.checkIn);
            const liveEarned = calculateLiveEarnings(item.checkIn, hourlyRate);

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[32px] border transition-all ${
                  timer.isOvertime
                    ? 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    : timer.isNearOvertime
                    ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : isDark
                    ? 'border-white/10 bg-[#121215]/95 text-white hover:border-emerald-500/40'
                    : 'border-gray-200 bg-white text-gray-900 shadow-md hover:border-emerald-500/40'
                } p-6 backdrop-blur-2xl flex flex-col justify-between gap-5 relative overflow-hidden`}
              >
                {/* Top Row: User Avatar, Name, Role */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {item.selfieImage ? (
                          <img
                            src={item.selfieImage}
                            alt="Selfie"
                            onClick={() => setSelectedSelfie(item)}
                            className="h-12 w-12 rounded-2xl object-cover border-2 border-emerald-500/60 cursor-pointer hover:scale-105 transition-transform"
                            title="Click to view full selfie evidence"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-lg">
                            {(u.name || 'S').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
                      </div>

                      <div>
                        <h4 className="font-black text-base leading-tight">{u.name || 'Staff Member'}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                            u.role === 'admin'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : u.role === 'manager'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : u.role === 'chef'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}>
                            {u.role || 'Staff'}
                          </span>
                          <span className={`text-[10px] font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            {u.department || 'Operations'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleManagerClockOut(item)}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase hover:bg-amber-500 hover:text-black transition-all cursor-pointer shrink-0"
                      title="Quick Clock Out Staff"
                    >
                      Clock Out
                    </button>
                  </div>

                  {/* Live Shift Duration HUD Display */}
                  <div className={`p-4 rounded-2xl border ${
                    timer.isOvertime
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                      : timer.isNearOvertime
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : isDark
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-emerald-500/30 bg-emerald-50 text-emerald-700'
                  } mb-3 text-center relative overflow-hidden`}>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Live Shift Timer
                      </span>
                      <span className="font-mono">
                        {timer.isOvertime ? '⚠️ Overtime (1.5x)' : 'Standard Rate'}
                      </span>
                    </div>

                    <p className="text-3xl font-black font-mono tracking-wider py-1">
                      {timer.formatted}
                    </p>

                    <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-500 ${
                          timer.isOvertime ? 'bg-rose-500' : timer.isNearOvertime ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (timer.totalHours / 8) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Earned Pay & Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className={`p-2.5 rounded-xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                      <span className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} block uppercase`}>Clock In Time</span>
                      <span className="font-bold text-white">
                        {new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                      <span className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} block uppercase`}>Accumulated Pay</span>
                      <span className="font-black text-emerald-400">
                        ${liveEarned.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Notes / Selfie evidence badge */}
                <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between text-[10px]`}>
                  <div className="flex items-center gap-1.5 text-white/50">
                    <Shield size={12} className="text-emerald-400" />
                    <span>Hourly Rate: ${hourlyRate.toFixed(2)}/hr</span>
                  </div>

                  {item.selfieImage ? (
                    <button
                      onClick={() => setSelectedSelfie(item)}
                      className="text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Camera size={12} /> View Photo
                    </button>
                  ) : (
                    <span className="text-white/30 font-semibold">No Selfie</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── SELFIE EVIDENCE LIGHTBOX MODAL ── */}
      <AnimatePresence>
        {selectedSelfie && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/80">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-6 shadow-2xl font-sans`}
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-orange-500" />
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Selfie Evidence: {selectedSelfie.userId?.name || 'Staff Member'}
                  </h3>
                </div>
                <button onClick={() => setSelectedSelfie(null)} className="text-white/50 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-orange-500/30 aspect-square mb-4 bg-black">
                <img src={selectedSelfie.selfieImage} alt="Selfie Verification" className="w-full h-full object-cover" />
              </div>

              <div className="text-xs space-y-1 font-mono text-white/70 mb-4">
                <p>Clock-In Timestamp: {new Date(selectedSelfie.checkIn).toLocaleString()}</p>
                <p>Role: {selectedSelfie.userId?.role || 'Staff'}</p>
              </div>

              <button
                onClick={() => setSelectedSelfie(null)}
                className="w-full py-3 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 cursor-pointer shadow-lg shadow-orange-500/20"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
