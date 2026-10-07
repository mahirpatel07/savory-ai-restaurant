import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPicker({ value, onChange, placeholder = 'Select Date', align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, right: 0, showAbove: false });

  // Parse initial date or default to null
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }, [value]);

  // View state (which month we are looking at)
  const [viewDate, setViewDate] = useState(() => {
    const initial = selectedDate || new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  // Update position coordinates when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 350;
      const showAbove = spaceBelow < calendarHeight && rect.top > calendarHeight;

      setCoords({
        top: showAbove ? (rect.top + window.scrollY) : (rect.bottom + window.scrollY),
        left: rect.left + window.scrollX,
        width: rect.width,
        right: rect.right + window.scrollX,
        showAbove
      });
    }
  }, [isOpen]);

  // Sync view date when selected date changes
  useEffect(() => {
    if (!isOpen && selectedDate) {
      setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate, isOpen]);

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

  const handleDateClick = (day) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
    onChange({ target: { value: dateStr } });
    setIsOpen(false);
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const prevMonthDays = daysInMonth(year, month - 1);

    const days = [];

    // Previous month's trailing days
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center font-mono text-[10px] text-white/10 font-medium">
          {prevMonthDays - i}
        </div>
      );
    }

    // Current month's days
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
          onClick={() => handleDateClick(i)}
          className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl font-mono text-xs font-bold transition-all duration-300 relative group
            ${isSelected
              ? 'bg-gradient-to-br from-[#ff8a4c] to-[#ffb17a] text-black shadow-[0_0_15px_rgba(255,138,76,0.4)] scale-105 z-10 font-black'
              : 'text-white/80 hover:bg-[#ff8a4c]/20 hover:text-[#ffb17a] hover:border hover:border-[#ff8a4c]/30'
            }
          `}
        >
          {i}
          {isToday && !isSelected && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#ff8a4c] shadow-[0_0_6px_#ff8a4c]" />
          )}
        </button>
      );
    }

    // Next month's leading days
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

  const formattedValue = useMemo(() => {
    if (!selectedDate) return placeholder;
    return selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedDate, placeholder]);

  const calendarContent = (
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
            className={`w-[290px] sm:w-[320px] rounded-[28px] border border-[#ff8a4c]/30 p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.2)] backdrop-blur-3xl overflow-hidden font-sans ${
              isDark ? 'bg-[#0c0d14]/95 text-white' : 'bg-white text-gray-900'
            }`}
          >
            {/* Savory Background Glows */}
            <div className="absolute -top-20 -right-20 w-36 h-36 bg-[#ff8a4c]/10 blur-[50px] pointer-events-none rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-36 h-36 bg-[#ff8a4c]/10 blur-[50px] pointer-events-none rounded-full" />

            {/* Header */}
            <div className={`flex items-center justify-between mb-4 relative z-10 px-1 border-b pb-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#ff8a4c]" />
                <h4 className={`font-mono text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {MONTHS[viewDate.getMonth()]} <span className="text-[#ffb17a] font-bold ml-0.5">{viewDate.getFullYear()}</span>
                </h4>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className={`p-1.5 rounded-xl border transition-all active:scale-90 ${isDark ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900'}`}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className={`p-1.5 rounded-xl border transition-all active:scale-90 ${isDark ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900'}`}
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-2 relative z-10">
              {WEEKDAYS.map(day => (
                <div key={day} className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center font-mono text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-7 gap-1 relative z-10">
              {renderDays()}
            </div>

            {/* Footer / Today Link */}
            <div className={`mt-4 pt-3 border-t flex justify-between items-center relative z-10 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <span className={`font-mono text-[9px] uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Savory Date Picker</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  onChange({ target: { value: `${year}-${month}-${day}` } });
                  setIsOpen(false);
                }}
                className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#ff8a4c] hover:text-[#ffb17a] transition-all active:scale-95"
              >
                Go to Today
              </button>
            </div>
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
        className={`flex items-center justify-between w-full rounded-2xl border py-3 pl-3.5 pr-4 font-mono text-xs transition-all shadow-inner group ${
          isDark
            ? (isOpen || selectedDate ? 'border-[#ff8a4c]/60 shadow-[0_0_15px_rgba(255,138,76,0.15)] bg-black/70 text-white' : 'border-white/15 bg-black/50 text-white hover:border-[#ff8a4c]/40')
            : (isOpen || selectedDate ? 'border-[#ff8a4c]/60 bg-gray-100 text-gray-900' : 'border-gray-200 bg-white text-gray-900 hover:border-[#ff8a4c]/40')
        }`}
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon size={16} className={`transition-colors ${isOpen || selectedDate ? 'text-[#ff8a4c]' : isDark ? 'text-white/30 group-hover:text-[#ff8a4c]' : 'text-gray-400 group-hover:text-[#ff8a4c]'}`} />
          <span className={`font-medium ${selectedDate ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/30' : 'text-gray-400')}`}>
            {formattedValue}
          </span>
        </div>
        <ChevronRight size={14} className={`transition-transform ${isOpen ? 'rotate-90 text-[#ff8a4c]' : isDark ? 'text-white/30' : 'text-gray-400'}`} />
      </button>

      {typeof document !== 'undefined' && createPortal(calendarContent, document.body)}
    </div>
  );
}
