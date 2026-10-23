import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Save, Trash2, Sparkles,
  Sun, Moon, Sunset, Plus, Clock, Users, Check, RefreshCw, AlertTriangle, Send, Eye,
  AlertCircle, ShieldAlert, Zap, Info, Move, X
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

const SHIFT_TYPES = {
  Morning: { label: 'Morning (10:00 - 24:00)', hours: 14, bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: Sun },
  Evening: { label: 'Evening (4pm-12am)', hours: 8, bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: Sunset },
  Night: { label: 'Night (12am-8am)', hours: 8, bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', icon: Moon },
  Off: { label: 'Day Off', hours: 0, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', icon: Clock }
};

export default function ShiftScheduler({ isDark, staffList = [], currentUser }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [viewMode, setViewMode] = useState('manager'); // 'manager' or 'my-shifts'
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Drag-and-Drop state
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'palette'|'card', shiftType, sourceUserId, sourceDateStr }
  const [dragOverCell, setDragOverCell] = useState(null); // `${userId}_${dateStr}`

  // Selected cell modal for quick click assignment
  const [selectedCell, setSelectedCell] = useState(null);

  // Compute week dates array (Mon to Sun)
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      dates.push({ dateStr, dayName, dayNum, monthName, fullDate: d });
    }
    return dates;
  }, [currentWeekStart]);

  const startDateStr = weekDates[0]?.dateStr;
  const endDateStr = weekDates[6]?.dateStr;

  // Fetch shifts for active week
  const fetchShifts = useCallback(async () => {
    if (!startDateStr || !endDateStr) return;
    setLoading(true);
    try {
      const endpoint = viewMode === 'my-shifts'
        ? `${API_BASE}/api/shifts/my-shifts?startDate=${startDateStr}&endDate=${endDateStr}`
        : `${API_BASE}/api/shifts?startDate=${startDateStr}&endDate=${endDateStr}`;

      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(endpoint, { headers });
      setShifts(res.data || []);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  }, [startDateStr, endDateStr, viewMode]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Real-time Conflict Computation Engine (Overlaps, < 12h Rest, > 72h Weekly Limit)
  const activeConflicts = useMemo(() => {
    const conflicts = [];
    const shiftsByStaff = {};

    shifts.forEach(s => {
      const uid = s.userId?._id || s.userId;
      if (!uid) return;
      if (!shiftsByStaff[uid]) shiftsByStaff[uid] = [];
      shiftsByStaff[uid].push(s);
    });

    Object.entries(shiftsByStaff).forEach(([uid, userShifts]) => {
      const staff = staffList.find(st => st._id === uid) || { name: 'Staff Member' };
      const staffName = staff.name || 'Staff Member';

      // 1. Weekly Work Limit Exceeding 72 Hours Check
      const totalWeeklyHours = userShifts.reduce((sum, s) => {
        const h = SHIFT_TYPES[s.shiftType]?.hours || 8;
        return sum + h;
      }, 0);

      if (totalWeeklyHours > 72) {
        conflicts.push({
          id: `limit-${uid}`,
          type: 'weekly_limit',
          severity: 'error',
          userId: uid,
          staffName,
          totalWeeklyHours,
          message: `Weekly Work Limit Exceeded: ${staffName} is scheduled for ${totalWeeklyHours} hrs this week, exceeding the 72-hour maximum weekly work limit.`
        });
      }

      // Sort user shifts chronologically
      const sortedShifts = userShifts.map(s => {
        const [sh, sm] = (s.startTime || '08:00').split(':').map(Number);
        const [eh, em] = (s.endTime || '16:00').split(':').map(Number);

        const startDt = new Date(`${s.date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
        let endDt = new Date(`${s.date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`);

        // Handle overnight shifts crossing midnight
        if (endDt <= startDt) {
          endDt = new Date(endDt.getTime() + 24 * 60 * 60 * 1000);
        }

        return { ...s, startDt, endDt };
      }).sort((a, b) => a.startDt.getTime() - b.startDt.getTime());

      // 2. Overlapping Shift Check & 3. < 12 Hours Rest Check (Consecutive shifts)
      for (let i = 0; i < sortedShifts.length - 1; i++) {
        const current = sortedShifts[i];
        const next = sortedShifts[i + 1];

        // Direct overlap check
        if (current.endDt > next.startDt) {
          conflicts.push({
            id: `overlap-${uid}-${current._id || current.date + '-' + current.shiftType}-${next._id || next.date + '-' + next.shiftType}`,
            type: 'overlap',
            severity: 'error',
            userId: uid,
            dateStr: current.date,
            staffName,
            message: `Overlapping Shift Conflict: ${staffName} has overlapping shifts on ${current.date} (${current.shiftType}) and ${next.date} (${next.shiftType}).`
          });
        } else {
          // Insufficient rest check (< 11h) between consecutive shifts
          const restMs = next.startDt.getTime() - current.endDt.getTime();
          const restHours = restMs / (1000 * 60 * 60);

          if (restHours < 11 && restHours >= 0) {
            const roundedRest = Math.round(restHours * 10) / 10;
            conflicts.push({
              id: `rest-${uid}-${current._id || current.date + '-' + current.shiftType}-${next._id || next.date + '-' + next.shiftType}`,
              type: 'insufficient_rest',
              severity: 'warning',
              userId: uid,
              dateStr: current.date,
              nextDateStr: next.date,
              staffName,
              restHours: roundedRest,
              message: `Insufficient Rest Warning: ${staffName} has only ${roundedRest}h rest between ${current.shiftType} shift on ${current.date} (ends ${current.endTime}) and ${next.shiftType} shift on ${next.date} (starts ${next.startTime}). Minimum required rest is 11 hours.`
            });
          }
        }
      }
    });

    return conflicts;
  }, [shifts, staffList]);

  // Navigate week
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleTodayWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const getShiftFor = (userId, dateStr) => {
    return shifts.find(s => (s.userId?._id === userId || s.userId === userId) && s.date === dateStr);
  };

  // Assign or update shift with conflict detection
  const handleAssignShift = (userId, dateStr, shiftType, sourceUserId, sourceDateStr) => {
    if (shiftType === 'Off') {
      setShifts(prev => prev.filter(s => !((s.userId?._id === userId || s.userId === userId) && s.date === dateStr)));
      return;
    }

    const times = shiftType === 'Morning'
      ? { startTime: '10:00', endTime: '24:00' }
      : shiftType === 'Evening'
      ? { startTime: '16:00', endTime: '00:00' }
      : { startTime: '00:00', endTime: '08:00' };

    setShifts(prev => {
      let copy = [...prev];

      // If moving an existing shift from source cell
      if (sourceUserId && sourceDateStr && (sourceUserId !== userId || sourceDateStr !== dateStr)) {
        copy = copy.filter(s => !((s.userId?._id === sourceUserId || s.userId === sourceUserId) && s.date === sourceDateStr));
      }

      const existingIdx = copy.findIndex(s => (s.userId?._id === userId || s.userId === userId) && s.date === dateStr);
      const updatedItem = {
        ...(existingIdx >= 0 ? copy[existingIdx] : {}),
        userId,
        date: dateStr,
        shiftType,
        ...times,
        status: 'draft'
      };

      if (existingIdx >= 0) {
        copy[existingIdx] = updatedItem;
      } else {
        copy.push(updatedItem);
      }

      return copy;
    });
  };

  // Drag and Drop Handlers
  const handlePaletteDragStart = (e, shiftType) => {
    setDraggedItem({ type: 'palette', shiftType });
    e.dataTransfer.setData('text/plain', shiftType);
  };

  const handleCardDragStart = (e, shift, userId, dateStr) => {
    setDraggedItem({
      type: 'card',
      shiftType: shift.shiftType,
      sourceUserId: userId,
      sourceDateStr: dateStr
    });
    e.dataTransfer.setData('text/plain', shift.shiftType);
  };

  const handleDragOver = (e, userId, dateStr) => {
    e.preventDefault();
    setDragOverCell(`${userId}_${dateStr}`);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverCell(null);
  };

  const handleDrop = (e, userId, dateStr) => {
    e.preventDefault();
    setDragOverCell(null);

    if (draggedItem) {
      handleAssignShift(
        userId,
        dateStr,
        draggedItem.shiftType,
        draggedItem.sourceUserId,
        draggedItem.sourceDateStr
      );
      toast.success(`Assigned ${draggedItem.shiftType} shift`);
    }
    setDraggedItem(null);
  };

  // Save weekly roster batch
  const handleSaveRoster = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/api/shifts/batch-save`, { shifts }, { headers });
      if (res.data?.success) {
        toast.success('Weekly Shift Roster saved successfully!');
        fetchShifts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save shift roster');
    } finally {
      setSaving(false);
    }
  };

  // Publish Roster
  const handlePublishRoster = async () => {
    const errorConflicts = activeConflicts.filter(c => c.severity === 'error');
    if (errorConflicts.length > 0) {
      toast.error(`Cannot publish roster with ${errorConflicts.length} active schedule conflicts (>72h limit or overlapping shifts). Please resolve conflicts first.`);
      return;
    }

    if (!window.confirm('Are you sure you want to publish this weekly roster to all staff members?')) return;
    setPublishing(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/api/shifts/publish`, {
        startDate: startDateStr,
        endDate: endDateStr
      }, { headers });

      if (res.data?.success) {
        toast.success(`Weekly Roster Published (${res.data.count || 0} shifts)! Notifications sent.`);
        fetchShifts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish roster');
    } finally {
      setPublishing(false);
    }
  };

  // Auto-schedule algorithm
  const handleAutoSchedule = () => {
    const activeStaff = staffList.filter(s => s.status === 'active');
    if (activeStaff.length === 0) {
      toast.error('No active staff members available to schedule');
      return;
    }

    const shiftTypesList = ['Morning', 'Evening', 'Night'];
    const newShifts = [];

    weekDates.forEach((wDate) => {
      activeStaff.forEach((staff, staffIdx) => {
        const dayIdx = new Date(wDate.dateStr).getDay();
        if ((staffIdx + dayIdx) % 7 === 6) return; // Day off

        const shiftType = shiftTypesList[(staffIdx + dayIdx) % 3];
        const times = shiftType === 'Morning'
          ? { startTime: '10:00', endTime: '24:00' }
          : shiftType === 'Evening'
          ? { startTime: '16:00', endTime: '00:00' }
          : { startTime: '00:00', endTime: '08:00' };

        newShifts.push({
          userId: staff._id,
          date: wDate.dateStr,
          shiftType,
          ...times,
          status: 'draft'
        });
      });
    });

    setShifts(newShifts);
    toast.success('Auto-scheduled weekly roster generated! Conflict checks active.');
  };

  const calculateTotalWeeklyHours = (userId) => {
    const userShifts = shifts.filter(s => (s.userId?._id === userId || s.userId === userId));
    return userShifts.reduce((sum, s) => sum + (SHIFT_TYPES[s.shiftType]?.hours || 8), 0);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* TOP TOOLBAR & NAVIGATION */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 sm:p-6 backdrop-blur-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 overflow-x-auto`}>
        {/* Left Section: Title + View Switcher */}
        <div className="flex items-center gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shrink-0">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight whitespace-nowrap">Interactive Drag-and-Drop Shift Scheduler</h3>
              <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider whitespace-nowrap`}>
                {weekDates[0]?.monthName} {weekDates[0]?.dayNum} – {weekDates[6]?.monthName} {weekDates[6]?.dayNum}, {currentWeekStart.getFullYear()}
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className={`flex items-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} p-1 h-11 shrink-0`}>
            <button
              onClick={() => setViewMode('manager')}
              className={`h-full px-4 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                viewMode === 'manager' ? 'bg-orange-500 text-black shadow-md' : isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Roster Manager
            </button>
            <button
              onClick={() => setViewMode('my-shifts')}
              className={`h-full px-4 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                viewMode === 'my-shifts' ? 'bg-orange-500 text-black shadow-md' : isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Shifts
            </button>
          </div>
        </div>

        {/* Right Section: Drag Palette + Navigator + Actions */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {/* Drag Shift Palette */}
          {viewMode === 'manager' && (
            <div className={`flex items-center gap-2 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} p-1.5 h-11 shrink-0`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} px-2 whitespace-nowrap`}>
                Drag Palette:
              </span>
              {Object.entries(SHIFT_TYPES).filter(([k]) => k !== 'Off').map(([type, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => handlePaletteDragStart(e, type)}
                    className={`h-full flex items-center gap-1.5 px-3 rounded-xl border ${cfg.bg} ${cfg.text} ${cfg.border} text-xs font-bold cursor-grab active:cursor-grabbing hover:scale-105 transition-all select-none shadow-sm whitespace-nowrap`}
                    title="Drag shift onto any calendar cell"
                  >
                    <Icon size={14} /> {type}
                  </div>
                );
              })}
            </div>
          )}

          {/* Week Navigator */}
          <div className={`flex items-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} p-1 h-11 shrink-0`}>
            <button onClick={handlePrevWeek} className="h-full px-2.5 rounded-xl text-white/70 hover:text-white cursor-pointer flex items-center" title="Previous Week">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleTodayWeek} className="h-full px-3 text-xs font-black uppercase tracking-wider text-orange-500 cursor-pointer flex items-center">
              Today
            </button>
            <button onClick={handleNextWeek} className="h-full px-2.5 rounded-xl text-white/70 hover:text-white cursor-pointer flex items-center" title="Next Week">
              <ChevronRight size={16} />
            </button>
          </div>

          {viewMode === 'manager' && (
            <>
              <button
                onClick={handleAutoSchedule}
                className={`h-11 flex items-center gap-1.5 px-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/80 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-800'} text-xs font-bold cursor-pointer transition-all shrink-0 whitespace-nowrap`}
              >
                <Sparkles size={14} className="text-orange-500" /> Auto-Fill
              </button>

              <button
                onClick={handleSaveRoster}
                disabled={saving}
                className={`h-11 flex items-center gap-1.5 px-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 font-bold text-xs hover:bg-orange-500 hover:text-black transition-all cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50`}
              >
                <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
              </button>

              <button
                onClick={handlePublishRoster}
                disabled={publishing}
                className="h-11 flex items-center gap-1.5 px-5 rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 shrink-0 whitespace-nowrap"
              >
                <Send size={14} /> {publishing ? 'Publishing...' : 'Publish Roster'}
              </button>
            </>
          )}
        </div>
      </div>



      {/* ROSTER GRID TABLE */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl overflow-x-auto`}>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className={`border-b ${isDark ? 'border-white/10 text-white/40' : 'border-gray-200 text-gray-500'} font-black uppercase text-[10px] tracking-widest`}>
              <th className="pb-4 pl-4 text-left w-56">Staff Member</th>
              {weekDates.map((wDate) => (
                <th key={wDate.dateStr} className="pb-4 text-center min-w-[120px]">
                  <div>{wDate.dayName}</div>
                  <div className="text-xs font-bold text-orange-500 mt-0.5">{wDate.monthName} {wDate.dayNum}</div>
                </th>
              ))}
              <th className="pb-4 pr-4 text-right min-w-[120px] whitespace-nowrap">Total Hrs</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {staffList.filter(s => s.status === 'active' && (viewMode !== 'my-shifts' || s._id === currentUser?._id)).map((staff) => {
              const totalHrs = calculateTotalWeeklyHours(staff._id);
              const isOver72 = totalHrs > 72;

              return (
                <tr key={staff._id} className={`group hover:${isDark ? 'bg-white/[0.01]' : 'bg-gray-50'} transition-colors`}>
                  <td className="py-4 pl-4 font-bold">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center font-black shrink-0">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{staff.name}</p>
                        <p className={`text-[10px] uppercase font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                          {staff.role} • ${staff.hourlyRate || 18.5}/h
                        </p>
                      </div>
                    </div>
                  </td>

                  {weekDates.map((wDate) => {
                    const shift = getShiftFor(staff._id, wDate.dateStr);
                    const shiftType = shift ? shift.shiftType : null;
                    const shiftCfg = shiftType ? SHIFT_TYPES[shiftType] : null;
                    const ShiftIcon = shiftCfg?.icon;
                    const isPublished = shift?.status === 'published';

                    const cellKey = `${staff._id}_${wDate.dateStr}`;
                    const isDragOver = dragOverCell === cellKey;

                    // Check if this cell has an active conflict
                    const cellConflict = activeConflicts.find(c =>
                      c.userId === staff._id && (c.dateStr === wDate.dateStr || c.type === 'weekly_limit')
                    );

                    return (
                      <td
                        key={wDate.dateStr}
                        onDragOver={(e) => handleDragOver(e, staff._id, wDate.dateStr)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, staff._id, wDate.dateStr)}
                        onClick={() => viewMode === 'manager' && setSelectedCell({ userId: staff._id, dateStr: wDate.dateStr, staffName: staff.name })}
                        className={`py-3 px-1 text-center cursor-pointer relative group/cell transition-all ${
                          isDragOver ? 'bg-orange-500/15 rounded-2xl border-2 border-dashed border-orange-500' : ''
                        }`}
                      >
                        {shiftCfg ? (
                          <div
                            draggable={viewMode === 'manager'}
                            onDragStart={(e) => handleCardDragStart(e, shift, staff._id, wDate.dateStr)}
                            className={`p-2 rounded-2xl border ${
                              cellConflict
                                ? cellConflict.severity === 'error'
                                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                  : 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                                : `${shiftCfg.bg} ${shiftCfg.text} ${shiftCfg.border}`
                            } flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-105 shadow-sm relative cursor-grab active:cursor-grabbing select-none`}
                          >
                            <div className="flex items-center gap-1 font-black text-[11px]">
                              {cellConflict && <AlertTriangle size={12} className="text-amber-400 animate-pulse shrink-0" />}
                              {ShiftIcon && <ShiftIcon size={12} />}
                              <span>{shiftType}</span>
                            </div>
                            <span className="text-[9px] font-mono opacity-80">{shift.startTime} - {shift.endTime}</span>
                            {isPublished && (
                              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400" title="Published" />
                            )}
                          </div>
                        ) : (
                          <div className={`h-12 rounded-2xl border border-dashed ${
                            isDragOver
                              ? 'border-orange-500 bg-orange-500/10'
                              : isDark
                              ? 'border-white/10 hover:border-orange-500/40 bg-white/[0.01] hover:bg-orange-500/5'
                              : 'border-gray-200 hover:border-orange-500/40 bg-gray-50 hover:bg-orange-50'
                          } flex items-center justify-center text-white/20 hover:text-orange-500 transition-all`}>
                            <Plus size={14} />
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="py-4 pr-4 text-right whitespace-nowrap font-mono font-black text-xs">
                    <span className={`inline-block px-3 py-1.5 rounded-xl border text-xs font-mono font-black whitespace-nowrap shadow-sm ${
                      isOver72
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {totalHrs} hrs
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* QUICK SHIFT ASSIGNMENT MODAL */}
      <AnimatePresence>
        {selectedCell && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-xl bg-black/70">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-[28px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-6 shadow-2xl`}
            >
              <h4 className="text-base font-black uppercase tracking-tight mb-1">
                Assign Shift: {selectedCell.staffName}
              </h4>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'} font-mono mb-4`}>
                Date: {selectedCell.dateStr}
              </p>

              <div className="space-y-2 mb-6">
                {Object.entries(SHIFT_TYPES).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        handleAssignShift(selectedCell.userId, selectedCell.dateStr, type);
                        setSelectedCell(null);
                      }}
                      className={`w-full p-3 rounded-2xl border ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center justify-between font-bold text-xs hover:scale-[1.02] transition-all cursor-pointer`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={16} />
                        <span>{cfg.label}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase">{type}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setSelectedCell(null)}
                className="w-full py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
