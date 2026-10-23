import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Sparkles, Check, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DateTimePicker({ value, onChange, placeholder = 'Select Date & Time', align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, right: 0, showAbove: false });

  // Parse initial datetime or default to current Date
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [selectedDate, setSelectedDate] = useState(() => parsedValue || new Date());
  const [hours, setHours] = useState(() => {
    const d = parsedValue || new Date();
    const h = d.getHours() % 12;
    return h === 0 ? 12 : h;
  });
  const [minutes, setMinutes] = useState(() => {
    const d = parsedValue || new Date();
    return d.getMinutes();
  });
  const [ampm, setAmPm] = useState(() => {
    const d = parsedValue || new Date();
    return d.getHours() >= 12 ? 'PM' : 'AM';
  });

  // Sync state when value changes externally
  useEffect(() => {
    if (parsedValue) {
      setSelectedDate(parsedValue);
      const h = parsedValue.getHours() % 12;
      setHours(h === 0 ? 12 : h);
      setMinutes(parsedValue.getMinutes());
      setAmPm(parsedValue.getHours() >= 12 ? 'PM' : 'AM');
    }
  }, [parsedValue]);

  // View month/year state
  const [viewDate, setViewDate] = useState(() => {
    const initial = parsedValue || new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  // Update popup coordinates when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popupHeight = 440;
      const showAbove = spaceBelow < popupHeight && rect.top > popupHeight;

      setCoords({
        top: showAbove ? (rect.top + window.scrollY) : (rect.bottom + window.scrollY),
        left: rect.left + window.scrollX,
        width: rect.width,
        right: rect.right + window.scrollX,
        showAbove
      });
    }
  }, [isOpen]);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const emitChange = (newDate, newHours, newMinutes, newAmPm) => {
    let h24 = newHours % 12;
    if (newAmPm === 'PM') h24 += 12;

    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const hh = String(h24).padStart(2, '0');
    const mm = String(newMinutes).padStart(2, '0');

    // Format as YYYY-MM-DDTHH:mm (compatible with backend Date/datetime-local)
    const formattedIso = `${y}-${m}-${d}T${hh}:${mm}`;
    onChange({ target: { value: formattedIso } });
  };

  const handleDateSelect = (day) => {
    const newD = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newD);
    emitChange(newD, hours, minutes, ampm);
  };

  const handleHoursChange = (newH) => {
    const clamped = Math.max(1, Math.min(12, newH));
    setHours(clamped);
    emitChange(selectedDate, clamped, minutes, ampm);
  };

  const handleMinutesChange = (newM) => {
    const clamped = Math.max(0, Math.min(59, newM));
    setMinutes(clamped);
    emitChange(selectedDate, hours, clamped, ampm);
  };

  const handleAmPmToggle = () => {
    const nextVal = ampm === 'AM' ? 'PM' : 'AM';
    setAmPm(nextVal);
    emitChange(selectedDate, hours, minutes, nextVal);
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const prevMonthDays = daysInMonth(year, month - 1);

    const days = [];

    for (let i = startDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center font-mono text-[10px] text-white/10 font-medium">
          {prevMonthDays - i}
        </div>
      );
    }

    for (let i = 1; i <= totalDays; i++) {
      const isSelected = selectedDate &&
        selectedDate.getDate() === i &&
        selectedDate.getMonth() === month &&
        selectedDate.getFullYear() === year;

      const isToday =
        new Date().getDate() === i &&
        new Date().getMonth() === month &&
        new Date().getFullYear() === year;

      days.push(
        <button
          key={`curr-${i}`}
          type="button"
          onClick={() => handleDateSelect(i)}
          className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl font-mono text-xs font-bold transition-all duration-200 relative group cursor-pointer
            ${isSelected
              ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)] scale-105 z-10 font-black'
              : 'text-white/80 hover:bg-orange-500/20 hover:text-orange-400'
            }
          `}
        >
          {i}
          {isToday && !isSelected && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" />
          )}
        </button>
      );
    }

    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push(
        <div key={`next-${i}`} className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center font-mono text-[10px] text-white/10 font-medium">
          {i}
        </div>
      );
    }

    return days;
  };

  const formattedDisplay = useMemo(() => {
    if (!value || !parsedValue) return placeholder;
    const datePart = parsedValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = parsedValue.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} • ${timePart}`;
  }, [value, parsedValue, placeholder]);

  const popupContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: coords.showAbove ? -10 : 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: coords.showAbove ? -10 : 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              top: coords.showAbove ? 'auto' : (coords.top + 6),
              bottom: coords.showAbove ? (window.innerHeight - (coords.top - window.scrollY) + 6) : 'auto',
              left: align === 'left' ? coords.left : 'auto',
              right: align === 'right' ? (window.innerWidth - coords.right) : 'auto',
              zIndex: 9999
            }}
            className={`w-[300px] sm:w-[330px] rounded-[32px] border border-orange-500/30 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl overflow-hidden font-sans ${
              isDark ? 'bg-[#0c0d14]/98 text-white' : 'bg-white text-gray-900 shadow-2xl'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between mb-3 pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-orange-500" />
                <h4 className={`font-mono text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {MONTHS[viewDate.getMonth()]} <span className="text-orange-400 font-bold ml-0.5">{viewDate.getFullYear()}</span>
                </h4>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className={`p-1.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${isDark ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900'}`}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className={`p-1.5 rounded-xl border transition-all active:scale-90 cursor-pointer ${isDark ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900'}`}
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(day => (
                <div key={day} className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center font-mono text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Date Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {renderDays()}
            </div>

            {/* Time Selector Bar */}
            <div className={`p-3 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} mb-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-1">
                  <Clock size={12} /> Set Time (12-Hour)
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')} {ampm}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 font-mono text-xs">
                {/* Hours Input */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Hr:</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={hours}
                    onChange={(e) => handleHoursChange(parseInt(e.target.value) || 12)}
                    className="w-12 py-1 text-center font-black rounded-xl border border-white/15 bg-black/60 text-white outline-none focus:border-orange-500"
                  />
                </div>

                {/* Minutes Input */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/40 uppercase font-bold">Min:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={minutes}
                    onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
                    className="w-12 py-1 text-center font-black rounded-xl border border-white/15 bg-black/60 text-white outline-none focus:border-orange-500"
                  />
                </div>

                {/* AM/PM Toggle */}
                <button
                  type="button"
                  onClick={handleAmPmToggle}
                  className={`px-3 py-1 rounded-xl border font-black text-xs transition-all cursor-pointer ${
                    ampm === 'AM'
                      ? 'bg-sky-500 text-black border-sky-400 shadow-md'
                      : 'bg-orange-500 text-black border-orange-400 shadow-md'
                  }`}
                >
                  {ampm}
                </button>
              </div>
            </div>

            {/* Footer / Confirm Action */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <Check size={14} /> Apply Datetime
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full rounded-2xl border py-3 px-4 font-mono text-xs transition-all shadow-inner group cursor-pointer ${
          isDark
            ? (isOpen || value ? 'border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.2)] bg-black/70 text-white' : 'border-white/15 bg-black/50 text-white hover:border-orange-500/40')
            : (isOpen || value ? 'border-orange-500/60 bg-gray-100 text-gray-900' : 'border-gray-200 bg-white text-gray-900 hover:border-orange-500/40')
        }`}
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon size={16} className={`transition-colors ${isOpen || value ? 'text-orange-500' : isDark ? 'text-white/30 group-hover:text-orange-500' : 'text-gray-400 group-hover:text-orange-500'}`} />
          <span className={`font-bold ${value ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/30' : 'text-gray-400')}`}>
            {formattedDisplay}
          </span>
        </div>
        <Clock size={14} className={`transition-colors ${isOpen ? 'text-orange-500' : isDark ? 'text-white/30' : 'text-gray-400'}`} />
      </button>

      {typeof document !== 'undefined' && createPortal(popupContent, document.body)}
    </div>
  );
}
