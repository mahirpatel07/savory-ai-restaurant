import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Search,
  Download,
  Printer,
  Users,
  UserCheck,
  CalendarCheck,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Phone,
  Clock,
  Hash
} from 'lucide-react'
import { useReservation } from '../../context/ReservationContext'
import { useTheme } from '../../context/ThemeContext'
import CountUpPkg from 'react-countup'
import CalendarPicker from '../components/CalendarPicker'
const CountUp = CountUpPkg.default || CountUpPkg

const ROWS_PER_PAGE = 10

const STATUS_COLORS = {
  'pending': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/25' },
  'confirmed': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/25' },
  'approved': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/25' },
  'checked-in': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/25' },
  'completed': { bg: 'bg-white/5', text: 'text-gray-500', border: 'border-gray-200' },
  'cancelled': { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/25' },
  'declined': { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/25' }
}

const getStatusLabel = (status) => {
  if (status === 'approved') return 'Confirmed'
  if (status === 'declined') return 'Cancelled'
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'
}

export default function DailyReservations() {
  const { reservations, syncReservations } = useReservation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [filterType, setFilterType] = useState('today')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    syncReservations()
  }, [syncReservations])

  // Filtering Logic
  const filteredData = useMemo(() => {
    let data = [...reservations]

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (filterType === 'today') {
      data = data.filter(r => {
        const d = new Date(r.date)
        return d >= today
      })
    } else if (filterType === 'yesterday') {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      data = data.filter(r => {
        const d = new Date(r.date)
        return d >= yesterday && d < today
      })
    } else if (filterType === 'last7days') {
      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 7)
      data = data.filter(r => new Date(r.date) >= last7)
    } else if (filterType === 'thismonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      data = data.filter(r => new Date(r.date) >= startOfMonth)
    } else if (filterType === 'custom' && customRange.start && customRange.end) {
      const start = new Date(customRange.start)
      const end = new Date(customRange.end)
      end.setHours(23, 59, 59, 999)
      data = data.filter(r => {
        const d = new Date(r.date)
        return d >= start && d <= end
      })
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q)
      )
    }

    return data.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))
  }, [reservations, filterType, customRange, searchQuery])

  // Stats Logic
  const stats = useMemo(() => {
    const total = filteredData.length
    const customers = new Set(filteredData.map(r => r.phone || r.name)).size
    const guests = filteredData.reduce((acc, r) => acc + (parseInt(r.guests) || 0), 0)
    const completed = filteredData.filter(r => r.status === 'completed').length
    const cancelled = filteredData.filter(r => r.status === 'cancelled' || r.status === 'declined').length

    return [
      { label: 'Total Reservations', value: total, icon: CalendarCheck, color: 'text-blue-500', border: 'hover:border-blue-500/40' },
      { label: 'Total Customers', value: customers, icon: Users, color: 'text-purple-500', border: 'hover:border-purple-500/40' },
      { label: 'Total Guests', value: guests, icon: UserCheck, color: 'text-emerald-500', border: 'hover:border-emerald-500/40' },
      { label: 'Completed', value: completed, icon: CalendarCheck, color: isDark ? 'text-white/60' : 'text-gray-600', border: isDark ? 'hover:border-white/20' : 'hover:border-gray-300' },
      { label: 'Cancelled', value: cancelled, icon: XCircle, color: 'text-rose-500', border: 'hover:border-rose-500/40' }
    ]
  }, [filteredData, isDark])

  // Pagination Logic
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return filteredData.slice(start, start + ROWS_PER_PAGE)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE)

  const handleExportCSV = () => {
    const headers = ['Date', 'Customer Name', 'Mobile Number', 'Guests', 'Table', 'Time', 'Status']
    const rows = filteredData.map(r => [
      new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      r.name,
      r.phone,
      r.guests,
      `T${r.tableId || r.assignedTable || r.tableNumbers?.[0] || '??'}`,
      r.time,
      getStatusLabel(r.status)
    ])

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `customer_history_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── FILTERS HEADER BAR ── */}
      <div className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl shadow-xl`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-2`}>
              <Filter size={14} className="text-orange-500" /> Time Range Filters
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7days', label: 'Last 7 Days' },
                { id: 'thismonth', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilterType(f.id)
                    setCurrentPage(1)
                  }}
                  className={`rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    filterType === f.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : isDark ? 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filterType === 'custom' && (
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="space-y-1">
                <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} ml-1`}>Start Date</p>
                <CalendarPicker
                  value={customRange.start}
                  onChange={e => {
                    const newStart = e.target.value;
                    setCustomRange(prev => {
                      const newState = { ...prev, start: newStart };
                      if (prev.end && new Date(newStart) > new Date(prev.end)) {
                        newState.end = newStart;
                      }
                      return newState;
                    });
                  }}
                  align="left"
                />
              </div>
              <div className="space-y-1">
                <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} ml-1`}>End Date</p>
                <CalendarPicker
                  value={customRange.end}
                  onChange={e => {
                    const newEnd = e.target.value;
                    setCustomRange(prev => {
                      const newState = { ...prev, end: newEnd };
                      if (prev.start && new Date(newEnd) < new Date(prev.start)) {
                        newState.start = newEnd;
                      }
                      return newState;
                    });
                  }}
                  align="right"
                />
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
              <input
                type="text"
                placeholder="Search name or mobile..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50 transition-all`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={handleExportCSV}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'} transition`}
              title="Export CSV"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handlePrint}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'} transition`}
              title="Print Page"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS CARDS GRID ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 backdrop-blur-xl shadow-xl transition-all ${stat.border}`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'} border ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider`}>{stat.label}</p>
              <h4 className={`mt-1 text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <CountUp end={stat.value} duration={1.2} />
              </h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── CUSTOMER HISTORY TABLE ── */}
      <div className={`overflow-hidden rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-2xl shadow-2xl`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/10 bg-white/[0.02] text-white/40' : 'border-gray-200 bg-gray-50 text-gray-500'} text-[10px] font-bold uppercase tracking-[0.2em]`}>
                <th className="px-6 py-4 pl-6">Date</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Mobile Number</th>
                <th className="px-6 py-4 text-center">Guests</th>
                <th className="px-6 py-4 text-center">Table</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-200'} text-xs`}>
              <AnimatePresence mode="popLayout">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`px-6 py-20 text-center ${isDark ? 'text-white/30' : 'text-gray-500'}`}>
                      <div className="flex flex-col items-center gap-3">
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10 text-white/20' : 'bg-gray-100 border-gray-200 text-gray-400'} border`}>
                          <Calendar size={36} />
                        </div>
                        <p className={`text-sm font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>No reservations found for this period</p>
                        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} max-w-xs`}>
                          Try adjusting your time range filters or search query to view historical customer bookings.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((res) => (
                    <motion.tr
                      key={res.id || res._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} transition-colors group`}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap font-mono ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        {new Date(res.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`px-6 py-4 font-bold ${isDark ? 'text-white' : 'text-gray-900'} group-hover:text-orange-500 transition-colors`}>
                        {res.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap font-mono ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {res.phone}
                      </td>
                      <td className="px-6 py-4 text-center font-bold">
                        <span className={`rounded-xl ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-200 text-gray-800'} border px-3 py-1 text-xs`}>
                          {res.guests}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-500">
                          T{res.tableId || res.assignedTable || res.tableNumbers?.[0] || '??'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-white/70' : 'text-gray-700'} font-mono`}>
                        {res.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                          STATUS_COLORS[res.status]?.bg || (isDark ? 'bg-white/5' : 'bg-gray-100')
                        } ${
                          STATUS_COLORS[res.status]?.text || (isDark ? 'text-white/60' : 'text-gray-700')
                        } ${
                          STATUS_COLORS[res.status]?.border || (isDark ? 'border-white/10' : 'border-gray-200')
                        }`}>
                          {getStatusLabel(res.status)}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between border-t ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'} px-6 py-4 text-xs font-bold`}>
            <p className={isDark ? 'text-white/40' : 'text-gray-600'}>
              Showing <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{(currentPage - 1) * ROWS_PER_PAGE + 1}</span> to <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.min(currentPage * ROWS_PER_PAGE, filteredData.length)}</span> of <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredData.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'} transition disabled:opacity-30`}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-8 w-8 rounded-xl text-xs font-bold transition ${
                    currentPage === i + 1
                    ? 'bg-orange-500 text-white shadow-md'
                    : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'} transition disabled:opacity-30`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
