import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CountUpPkg from 'react-countup'
const CountUp = CountUpPkg.default || CountUpPkg
import {
  Clock3,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Printer
} from 'lucide-react'
import { useReservation } from '../../context/ReservationContext'
import { useTheme } from '../../context/ThemeContext'
import { Toaster } from 'react-hot-toast'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import TimelineScheduler from './TimelineScheduler'
import CalendarPicker from '../components/CalendarPicker'

// Helper to get local YYYY-MM-DD date string
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD safely into local Date object
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function Reservations() {
  const {
    tables,
    reservations,
    syncReservations,
    isRefreshing,
    refreshData
  } = useReservation()

  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [searchQuery] = useState('')
  const [statusFilter] = useState('all')
  const [dateQuickFilter, setDateQuickFilter] = useState('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [currentTab, setCurrentTab] = useState('list')
  const [calendarMode, setCalendarMode] = useState('day')

  useEffect(() => {
    syncReservations()
  }, [syncReservations])

  const activeDate = useMemo(() => {
    const today = new Date();
    if (dateQuickFilter === 'today') return getLocalDateString(today);
    if (dateQuickFilter === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return getLocalDateString(tomorrow);
    }
    if (customStartDate) return customStartDate;
    return getLocalDateString(today);
  }, [dateQuickFilter, customStartDate]);

  const stats = useMemo(() => {
    const total = reservations.length
    const pending = reservations.filter(r => r.status === 'pending').length
    const confirmed = reservations.filter(r => r.status === 'confirmed' || r.status === 'approved').length
    const checkedIn = reservations.filter(r => r.status === 'checked-in').length
    const completed = reservations.filter(r => r.status === 'completed').length
    const cancelled = reservations.filter(r => r.status === 'cancelled' || r.status === 'declined').length
    const noShow = reservations.filter(r => r.status === 'no-show').length

    return { total, pending, confirmed, checkedIn, completed, cancelled, noShow }
  }, [reservations])

  const analyticsData = useMemo(() => {
    const dayCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }
    const hourCounts = Array.from({ length: 24 }).map((_, i) => ({ hour: `${i}:00`, count: 0 }))
    let guestSum = 0
    let reservationCount = 0

    reservations.forEach(r => {
      reservationCount++
      guestSum += r.guests || 2

      const dateObj = new Date(r.date)
      if (!Number.isNaN(dateObj.getTime())) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        dayCounts[days[dateObj.getDay()]]++
      }

      if (r.time) {
        const match = r.time.match(/(\d{1,2})/)
        if (match) {
          let hour = parseInt(match[1], 10)
          if (r.time.toLowerCase().includes('pm') && hour < 12) hour += 12
          if (r.time.toLowerCase().includes('am') && hour === 12) hour = 0
          if (hour >= 0 && hour < 24) hourCounts[hour].count++
        }
      }
    })

    const topDays = Object.entries(dayCounts).map(([day, val]) => ({ day, count: val }))
    const peakHours = hourCounts.filter(h => h.count > 0 || (parseInt(h.hour) >= 11 && parseInt(h.hour) <= 22))

    const occupiedTables = tables.filter(t => t.status === 'occupied').length
    const reservedTables = tables.filter(t => t.status === 'reserved').length
    const cleanTables = tables.filter(t => t.status === 'cleaning').length
    const availTables = tables.filter(t => t.status === 'available').length

    const tableUtilData = [
      { name: 'Occupied', value: occupiedTables, color: '#f43f5e' },
      { name: 'Reserved', value: reservedTables, color: '#10b981' },
      { name: 'Cleaning', value: cleanTables, color: '#0ea5e9' },
      { name: 'Available', value: availTables, color: '#64748b' }
    ]

    return {
      topDays,
      peakHours,
      avgGuests: reservationCount > 0 ? (guestSum / reservationCount).toFixed(1) : '2.0',
      tableUtilData
    }
  }, [reservations, tables])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      <Toaster position="top-right" reverseOrder={false} />

      {/* ── HEADER & CONTROLS ROW ── */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Reservation Timeline
            </h1>
            <span className="rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 text-[10px] font-bold text-orange-500 uppercase tracking-widest">
              Live
            </span>
          </div>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-1`}>Visual timeline of every restaurant table reservation.</p>
        </div>

        {/* Unified Controls Toolbar */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Quick Step Buttons */}
          <div className={`flex items-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} p-1 backdrop-blur-xl`}>
            <button
              onClick={() => {
                const d = parseLocalDate(activeDate);
                d.setDate(d.getDate() - 1);
                setCustomStartDate(getLocalDateString(d));
                setDateQuickFilter('custom');
              }}
              className={`rounded-xl p-2 ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'} transition`}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                setDateQuickFilter('today')
                setCustomStartDate('')
              }}
              className={`px-4 py-1.5 text-xs font-bold ${isDark ? 'text-white/80 hover:text-white hover:bg-white/5' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'} transition rounded-xl`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = parseLocalDate(activeDate);
                d.setDate(d.getDate() + 1);
                setCustomStartDate(getLocalDateString(d));
                setDateQuickFilter('custom');
              }}
              className={`rounded-xl p-2 ${isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'} transition`}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Date Selector */}
          <CalendarPicker
            value={activeDate}
            onChange={(e) => {
              setCustomStartDate(e.target.value)
              setDateQuickFilter('custom')
            }}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              title="Refresh Data"
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'} transition ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-orange-500' : ''} />
            </button>
            <button
              onClick={handlePrint}
              title="Print Summary"
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'} transition`}
            >
              <Printer size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW TABS ── */}
      <div className={`flex gap-2 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} p-1.5 max-w-md`}>
        <button
          onClick={() => setCurrentTab('list')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
            currentTab === 'list'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : isDark ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
        >
          List Overview
        </button>
        <button
          onClick={() => setCurrentTab('calendar')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
            currentTab === 'calendar'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : isDark ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
        >
          Calendar Planner
        </button>
        <button
          onClick={() => setCurrentTab('analytics')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
            currentTab === 'analytics'
              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
              : isDark ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
        >
          AI Analytics
        </button>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {[
          { label: 'Total Queue', count: stats.total, color: isDark ? 'from-blue-500/20 to-blue-500/5' : 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/30', glow: 'shadow-blue-500/10' },
          { label: 'Awaiting AI', count: stats.pending, color: isDark ? 'from-amber-500/20 to-amber-500/5' : 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/30', glow: 'shadow-amber-500/10' },
          { label: 'Confirmed', count: stats.confirmed, color: isDark ? 'from-emerald-500/20 to-emerald-500/5' : 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10' },
          { label: 'Checked In', count: stats.checkedIn, color: isDark ? 'from-sky-500/20 to-sky-500/5' : 'from-sky-500/10 to-sky-500/5', border: 'border-sky-500/30', glow: 'shadow-sky-500/10' },
          { label: 'Completed', count: stats.completed, color: isDark ? 'from-zinc-500/20 to-zinc-500/5' : 'from-gray-200 to-gray-50', border: isDark ? 'border-zinc-500/30' : 'border-gray-200', glow: 'shadow-gray-500/10' },
          { label: 'Cancelled', count: stats.cancelled, color: isDark ? 'from-rose-500/20 to-rose-500/5' : 'from-rose-500/10 to-rose-500/5', border: 'border-rose-500/30', glow: 'shadow-rose-500/10' },
          { label: 'No Show', count: stats.noShow, color: isDark ? 'from-purple-500/20 to-purple-500/5' : 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/30', glow: 'shadow-purple-500/10' }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -3, scale: 1.02 }}
            className={`relative overflow-hidden rounded-2xl border ${item.border} bg-gradient-to-b ${item.color} p-4 backdrop-blur-xl shadow-lg ${item.glow} transition duration-300`}
          >
            <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-600'}`}>{item.label}</div>
            <div className={`mt-2 text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <CountUp end={item.count} duration={1.2} />
            </div>
            <div className={`absolute -bottom-2 -right-2 h-10 w-10 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'} blur-md`} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentTab === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <TimelineScheduler
              showPageHeader={false}
              externalSearchQuery={searchQuery}
              externalStatusFilter={statusFilter}
              externalSelectedDate={activeDate}
            />
          </motion.div>
        )}

        {currentTab === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl space-y-6 shadow-2xl`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Daily & Weekly Slots Planner</h3>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-600'}`}>Assign tables and balance floor load across timeslots.</p>
              </div>
              <div className={`flex gap-1.5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} p-1 text-xs font-bold`}>
                {['day', 'week', 'month'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setCalendarMode(m)}
                    className={`px-4 py-2 rounded-xl capitalize transition ${calendarMode === m ? 'bg-orange-500 text-white font-black shadow-md' : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {m} view
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {['11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'].map((slotTime) => {
                const matchingRes = reservations.filter(r => {
                  if (!r.date || !r.time) return false;

                  const rDate = String(r.date).split('T')[0];
                  const selDate = activeDate;
                  if (rDate !== selDate) return false;

                  const [slotHour, slotPeriod] = slotTime.split(' ');
                  const slotHourNum = slotHour.split(':')[0];

                  const rTimeUpper = r.time.toUpperCase();
                  return rTimeUpper.startsWith(slotHourNum + ':') && rTimeUpper.includes(slotPeriod);
                })
                return (
                  <div key={slotTime} className={`flex gap-4 rounded-2xl border ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} p-4 items-start`}>
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-white/50' : 'text-gray-600'} w-24 flex-shrink-0 pt-1`}>
                      <Clock3 size={14} className="text-orange-500" />
                      {slotTime}
                    </div>
                    <div className="flex-1 flex flex-wrap gap-3">
                      {matchingRes.length === 0 ? (
                        <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'} italic pt-1`}>No bookings scheduled</span>
                      ) : (
                        matchingRes.map(r => (
                          <div
                            key={r.id}
                            className={`cursor-pointer group flex items-center gap-3 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-gray-100 hover:bg-gray-200'} px-3 py-2 text-xs transition duration-200`}
                          >
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.name}</span>
                            <span className={isDark ? 'text-white/40' : 'text-gray-500'}>({r.guests} guests)</span>
                            <span className={`font-bold text-orange-500 ${isDark ? 'bg-black/40 border-orange-500/20' : 'bg-white border-orange-500/20'} px-2 py-0.5 rounded-lg border`}>
                              T{r.tableId || r.assignedTable || r.tableNumbers?.[0] || '??'}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {currentTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-3">
              <div className={`rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 backdrop-blur-xl`}>
                <div className={`text-xs font-bold ${isDark ? 'text-white/50' : 'text-gray-600'} uppercase tracking-wider`}>Average Party Size</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{analyticsData.avgGuests}</span>
                  <span className="text-xs text-emerald-500 flex items-center gap-0.5 font-bold">
                    <TrendingUp size={12} />
                    +4.2% visitors
                  </span>
                </div>
                <div className={`mt-3 text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>Optimizing floor layout for larger group dining.</div>
              </div>

              <div className={`rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 backdrop-blur-xl`}>
                <div className={`text-xs font-bold ${isDark ? 'text-white/50' : 'text-gray-600'} uppercase tracking-wider`}>Table Occupancy Rate</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {Math.round(((tables.filter(t => t.status === 'occupied' || t.status === 'reserved').length) / (tables.length || 1)) * 100)}%
                  </span>
                  <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>of capacity</span>
                </div>
                <div className={`mt-3 text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>Capacity allocation tracking in real-time.</div>
              </div>

              <div className="rounded-[26px] border border-orange-500/20 bg-orange-500/5 p-5 backdrop-blur-xl">
                <div className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} />
                  AI Optimization Insight
                </div>
                <p className={`mt-2.5 text-xs ${isDark ? 'text-white/80' : 'text-gray-700'} leading-relaxed font-medium`}>
                  &quot;Predicting heavy dinner rushes between 7:00 PM and 8:30 PM. Recommend merging tables for party sizes larger than 6 guests.&quot;
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl`}>
                <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Top Reservation Days</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.topDays}>
                      <XAxis dataKey="day" stroke={isDark ? "#ffffff50" : "#666666"} fontSize={11} />
                      <YAxis stroke={isDark ? "#ffffff50" : "#666666"} fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#131316' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: '12px', color: isDark ? '#ffffff' : '#111827' }} />
                      <Bar dataKey="count" fill="url(#orangeGrad)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#fb923c" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl`}>
                <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Peak Reservation Hours</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.peakHours}>
                      <XAxis dataKey="hour" stroke={isDark ? "#ffffff50" : "#666666"} fontSize={11} />
                      <YAxis stroke={isDark ? "#ffffff50" : "#666666"} fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: isDark ? '#131316' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: '12px', color: isDark ? '#ffffff' : '#111827' }} />
                      <Area type="monotone" dataKey="count" stroke="#a855f7" fill="url(#purpGrad)" strokeWidth={2} />
                      <defs>
                        <linearGradient id="purpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
