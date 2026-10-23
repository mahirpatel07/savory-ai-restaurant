import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomDropdown({ value, options, onChange, placeholder = 'Select...', className = '', isDark = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${isOpen ? 'z-[100]' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-2xl border transition-all cursor-pointer px-4 py-3 text-xs font-bold ${
          isDark
            ? 'border-white/15 bg-black/50 text-white hover:border-orange-500/50'
            : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-orange-500/50'
        }`}
      >
        <span className="truncate pr-1">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : isDark ? 'text-white/40' : 'text-gray-400'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute left-0 mt-2 min-w-full w-max max-w-[280px] z-[110] rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-2xl ${
              isDark
                ? 'border-white/15 bg-[#121216]/98 text-white'
                : 'border-gray-200 bg-white/98 text-gray-900 shadow-xl'
            }`}
          >
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left gap-3 ${
                      isSelected
                        ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                        : isDark
                          ? 'hover:bg-white/10 text-white/80 hover:text-white'
                          : 'hover:bg-gray-100 text-gray-700 hover:text-gray-950'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-black shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
