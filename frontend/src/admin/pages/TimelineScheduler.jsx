import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Clock,
  RotateCw,
  Search,
  AlertTriangle
} from 'lucide-react'
import { useReservation } from '../../context/ReservationContext'
import { useTheme } from '../../context/ThemeContext'
import toast, { Toaster } from 'react-hot-toast'

// Reusable Components
import ReservationCard from '../components/ReservationCard'
import ReservationTooltip from '../components/ReservationTooltip'
import ReservationModal from '../components/ReservationModal'
import CalendarPicker from '../components/CalendarPicker'

// ==========================================
// SCHEDULER CONSTANTS (Global Scope)
// ==========================================
const PIXELS_PER_MINUTE = 2
const START_HOUR = 11
const END_HOUR = 24
const TOTAL_HOURS = END_HOUR - START_HOUR
const TOTAL_MINUTES = TOTAL_HOURS * 60
const GRID_WIDTH = TOTAL_MINUTES * PIXELS_PER_MINUTE
const STEP_MINUTES = 30
const TOTAL_SLOTS = TOTAL_MINUTES / STEP_MINUTES

const TIMELINE_STYLES = `
  .timeline-shell { width: 100%; max-width: 100%; overflow: hidden; position: relative; }
  .timeline-scroll { overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; scrollbar-width: thin; position: relative; }
  .timeline-grid-track { width: ${GRID_WIDTH}px; min-width: ${GRID_WIDTH}px; position: relative; }
  .timeline-hour-col { min-width: ${60 * PIXELS_PER_MINUTE}px; width: ${60 * PIXELS_PER_MINUTE}px; }
  .active-reservation-glow { box-shadow: 0 0 20px rgba(255, 130, 77, 0.4); border-color: rgba(255, 130, 77, 0.6) !important; }
`;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function timeToMinutesFromStart(timeStr) {
  if (!timeStr) return 0
  const match = timeStr.trim().toLowerCase().match(/(\d{1,2}):(\d{2})\s*(am|pm)?/)
  let hour = 12, minute = 0
  if (match) {
    hour = parseInt(match[1], 10)
    minute = parseInt(match[2], 10)
    if (match[3] === 'pm' && hour < 12) hour += 12
    if (match[3] === 'am' && hour === 12) hour = 0
  } else {
      const parts = timeStr.split(':')
      hour = parseInt(parts[0], 10)
      minute = parseInt(parts[1], 10)
  }
  if (hour < 4) hour += 24
  return (hour * 60 + minute) - (START_HOUR * 60)
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false
  const toYYYYMMDD = (d) => {
    if (typeof d === 'string') return d.split('T')[0]
    try {
      const date = new Date(d)
      if (Number.isNaN(date.getTime())) return String(d).split('T')[0]
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return String(d).split('T')[0]
    }
  }
  return toYYYYMMDD(date1) === toYYYYMMDD(date2)
}

// ==========================================
// MAIN COMPONENT
// ==========================================

class TimelineErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("Timeline Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#060608] text-white p-8 text-center">
          <AlertTriangle size={48} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-black mb-2">Timeline Unavailable</h2>
          <p className="text-white/40 mb-6">An unexpected error occurred while rendering the reservation engine.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-orange-500 rounded-full font-bold text-black">Reload Timeline</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TimelineScheduler(props) {
  return (
    <TimelineErrorBoundary>
      <TimelineContent {...props} />
    </TimelineErrorBoundary>
  );
}

function TimelineContent({
  showPageHeader = true,
  externalSelectedDate,
  externalSearchQuery,
  externalStatusFilter
}) {
  const { tables, reservations, updateReservation, cancelReservation, syncReservations, updateTableBackend } = useReservation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '')
  const [statusFilter, setStatusFilter] = useState(externalStatusFilter || 'all')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Sync with external props
  useEffect(() => {
    if (externalSelectedDate) setSelectedDate(externalSelectedDate)
  }, [externalSelectedDate])

  useEffect(() => {
    if (externalSearchQuery !== undefined) setSearchQuery(externalSearchQuery)
  }, [externalSearchQuery])

  useEffect(() => {
    if (externalStatusFilter !== undefined) setStatusFilter(externalStatusFilter)
  }, [externalStatusFilter])

  // Interactive UI States
  const [hoveredRes, setHoveredRes] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [selectedModalRes, setSelectedModalRes] = useState(null)

  const scrollRef = useRef(null)
  const gridTrackRef = useRef(null)

  useEffect(() => {
    syncReservations()
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [syncReservations])

  const isToday = isSameDay(selectedDate, new Date())

  // Calculate red line position
  const timePos = useMemo(() => {
    if (!isToday) return -1
    const h = currentTime.getHours()
    const m = currentTime.getMinutes()
    const adjustedH = h < 4 ? h + 24 : h
    const mins = adjustedH * 60 + m - START_HOUR * 60
    return mins * PIXELS_PER_MINUTE
  }, [currentTime, isToday])

  // Auto Scroll
  useLayoutEffect(() => {
    if (isToday && scrollRef.current && timePos > 0) {
      const containerWidth = scrollRef.current.offsetWidth
      scrollRef.current.scrollLeft = timePos - containerWidth / 2
    }
  }, [isToday, timePos])

  const filteredReservations = useMemo(() => {
    const ignored = ['cancelled', 'completed', 'no_show', 'declined'];
    const filtered = (reservations || []).filter(res => {
      if (!isSameDay(res.date, selectedDate)) return false

      if (statusFilter === 'all') {
        if (ignored.includes(res.status)) return false;
      } else if (res.status !== statusFilter) {
        return false
      }

      const s = searchQuery.toLowerCase()
      return !s || res.name?.toLowerCase().includes(s) || res.id?.toLowerCase().includes(s)
    });
    console.log('Timeline Debug - Fetched Reservations:', reservations);
    console.log('Timeline Debug - Filtered Reservations:', filtered);
    return filtered;
  }, [reservations, selectedDate, statusFilter, searchQuery])

  // Collision Logic
  const tableReservations = useMemo(() => {
    const map = {}
    tables.forEach(t => map[Number(t.tableNumber)] = [])

    filteredReservations.forEach(res => {
      // Handle both tableNumbers (merged) and single assignedTable
      const tIds = res.tableNumbers?.length > 0
        ? res.tableNumbers.map(Number)
        : [Number(res.assignedTable || res.tableId)];

      tIds.forEach(tId => {
        if (map[tId]) {
          console.log(`Timeline Debug - Mapping Res ${res.id} to Table T${tId}`);
          map[tId].push(res);
        }
      });
    })

    Object.keys(map).forEach(tId => {
      const resList = map[tId].sort((a, b) => timeToMinutesFromStart(a.time) - timeToMinutesFromStart(b.time))
      const lanes = []
      resList.forEach(res => {
        const start = timeToMinutesFromStart(res.time)
        let laneIndex = lanes.findIndex(laneEnd => start >= laneEnd)
        if (laneIndex === -1) {
          lanes.push(start + (res.duration || 90))
          res.lane = lanes.length - 1
        } else {
          lanes[laneIndex] = start + (res.duration || 90)
          res.lane = laneIndex
        }
        res.totalLanes = lanes.length
      })
    })
    return map;
  }, [filteredReservations, tables])

  const handleMouseMove = useCallback((e) => {
    if (hoveredRes) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [hoveredRes]);

  const handleAction = async (action, id) => {
    try {
      if (action === 'check-in') {
        await updateReservation(id, { status: 'checked-in' });
      } else if (action === 'cancel') {
        await cancelReservation(id);
      } else if (action === 'cleaning') {
        await updateReservation(id, { status: 'completed' });
      } else if (action === 'completed') {
        const res = reservations.find(r => r.id === id);
        const tId = res?.assignedTable || res?.tableId;
        if (tId) {
          await updateTableBackend(tId, { status: 'available' });
        }
        await updateReservation(id, { status: 'completed' }); // Ensure reservation is marked completed
      }
      toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} processed successfully.`);
      setSelectedModalRes(null);
    } catch {
      toast.error("Operation failed");
    }
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#060608] text-white' : 'bg-gray-50 text-gray-900'} p-4 font-sans select-none overflow-hidden`}
      onMouseMove={handleMouseMove}
    >
      <style>{TIMELINE_STYLES}</style>
      <Toaster position="top-right" />

      {showPageHeader && (
        <header className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Floor Timeline
              <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-black tracking-widest uppercase animate-pulse">Live Sync</span>
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Operational view for {selectedDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
               <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={14} />
               <input type="text" placeholder="Search Guest..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`border rounded-2xl pl-9 pr-4 py-2 text-xs outline-none w-48 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-gray-100 border-gray-200 text-gray-900 focus:border-orange-500/50'}`} />
            </div>
            <CalendarPicker value={selectedDate} onChange={e => setSelectedDate(e.target.value)} align="right" />
            <button onClick={() => syncReservations()} className={`p-2.5 border rounded-2xl transition-colors ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}><RotateCw size={16} /></button>
          </div>
        </header>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${statusFilter === f ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_15px_rgba(255,130,77,0.3)]' : isDark ? 'bg-white/5 text-white/50 border-white/5 hover:border-white/20' : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <section className={`timeline-shell flex-1 flex flex-col overflow-hidden bg-transparent ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className={`w-28 md:w-36 border-r z-30 ${isDark ? 'border-white/10 bg-transparent text-white' : 'border-gray-200 bg-transparent text-gray-900'}`}>
            <div className={`h-14 border-b flex items-center px-6 text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'border-white/10 text-white/30' : 'border-gray-200 text-gray-400'}`}>Table</div>
            <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-200'}`}>
              {tables.map(t => (
                <div key={t.tableNumber} className={`h-24 flex flex-col justify-center px-6 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-100'}`}>
                  <span className={`text-sm font-black ${isDark ? 'text-white/90' : 'text-gray-900'}`}>T{t.tableNumber}</span>
                  <span className={`text-[10px] font-bold ${isDark ? 'text-white/30' : 'text-gray-500'}`}>{t.seats} Pax</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="timeline-scroll flex-1 scroll-smooth" ref={scrollRef}>
            <div className="timeline-grid-track" ref={gridTrackRef}>
              <div className={`h-14 flex border-b sticky top-0 z-20 ${isDark ? 'border-white/10 bg-[#060608]/90 text-white/60' : 'border-gray-200 bg-gray-50/90 text-gray-700'}`}>
                {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
                  const h = START_HOUR + i
                  const label = h % 12 || 12
                  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM'
                  return (
                    <div key={i} className={`timeline-hour-col border-l flex flex-col items-center justify-center text-[10px] font-black ${isDark ? 'border-white/5 text-white/60' : 'border-gray-200 text-gray-600'}`}>
                      <span>{label}:00</span>
                      <span className="opacity-30 text-[8px]">{ampm}</span>
                    </div>
                  )
                })}
              </div>

              {/* Red Line Indicator */}
              {timePos > 0 && timePos < GRID_WIDTH && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-[0_0_15px_rgba(239,68,68,0.8)] pointer-events-none transition-all duration-1000" style={{ left: `${timePos}px` }}>
                   <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-[8px] font-black text-white px-2 py-0.5 rounded shadow-lg flex items-center gap-1"><Clock size={10} /> NOW</div>
                </div>
              )}

              <div className={`relative divide-y ${isDark ? 'divide-white/5' : 'divide-gray-200'}`}>
                {tables.length === 0 ? (
                  <div className={`h-64 flex items-center justify-center font-black uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                    No Tables Configured
                  </div>
                ) : filteredReservations.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className={`font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                      No Reservations Found
                    </div>
                  </div>
                ) : null}

                {tables.map(t => (
                  <div key={t.tableNumber} className={`h-24 relative transition-colors ${isDark ? 'hover:bg-white/[0.01]' : 'hover:bg-gray-50/50'}`}>
                    {/* Visual grid lines for half hours */}
                    {Array.from({ length: TOTAL_SLOTS }).map((_, si) => (
                       <div key={si} className={`absolute top-0 bottom-0 border-l ${isDark ? 'border-white/[0.02]' : 'border-gray-200/60'}`} style={{ left: `${si * STEP_MINUTES * PIXELS_PER_MINUTE}px` }} />
                    ))}

                    <AnimatePresence>
                      {tableReservations[Number(t.tableNumber)]?.map(res => {
                        const start = timeToMinutesFromStart(res.time)
                        const dur = res.duration || 90
                        const isActive = isToday && timePos >= start * PIXELS_PER_MINUTE && timePos <= (start + dur) * PIXELS_PER_MINUTE
                        const laneHeight = 90 / (res.totalLanes || 1)

                        console.log(`Timeline Debug - Rendering Res ${res.id} on Table T${t.tableNumber} at lane ${res.lane}`);

                        return (
                          <ReservationCard
                            key={res.id}
                            reservation={res}
                            isActive={isActive}
                            onMouseEnter={(e) => { setHoveredRes(res); setMousePos({ x: e.clientX, y: e.clientY }); }}
                            onMouseLeave={() => setHoveredRes(null)}
                            onClick={(res) => setSelectedModalRes(res)}
                            style={{
                              left: `${start * PIXELS_PER_MINUTE}px`,
                              width: `${dur * PIXELS_PER_MINUTE}px`,
                              top: `${4 + (res.lane || 0) * laneHeight}px`,
                              height: `${laneHeight - 4}px`
                            }}
                          />
                        )
                      })}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Tooltip */}
      <AnimatePresence>
        {hoveredRes && (
          <ReservationTooltip reservation={hoveredRes} mousePos={mousePos} />
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <ReservationModal
        reservation={selectedModalRes}
        isOpen={!!selectedModalRes}
        onClose={() => setSelectedModalRes(null)}
        onAction={handleAction}
      />
    </div>
  )
}
