import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Info } from 'lucide-react';

const CombineConfirmationModal = ({ isOpen, onClose, selectedTables, onConfirm }) => {
  const [combinedName, setCombinedName] = useState('');
  const totalSeats = selectedTables.reduce((sum, t) => sum + t.seats, 0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{ maxHeight: '90vh' }}
            className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-[#0e0e11] shadow-2xl overflow-hidden flex flex-col z-[10001]"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Header - Fixed */}
            <div className="px-8 pt-8 flex-none">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <Layers size={24} />
                  </div>
                  <h2 className="text-xl font-black text-white">Combine Tables</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Description - Fixed */}
            <div className="px-8 pb-4 flex-none">
              <p className="text-sm text-white/50 leading-relaxed">
                You are creating a new combined table unit. The following individual tables will be grouped together:
              </p>
            </div>

            {/* Scrollable Table List */}
            <div className="px-8 flex-1 overflow-y-auto min-h-0 py-2 custom-scrollbar">
              <div className="space-y-3 mb-4">
                {selectedTables.map(t => (
                  <div key={t.tableNumber} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="font-bold text-white">Table {t.tableNumber}</span>
                    <span className="text-xs font-black text-white/30 uppercase tracking-widest">{t.seats} Seats</span>
                  </div>
                ))}

                <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
                  <span className="font-black text-orange-500">Total Capacity</span>
                  <span className="text-sm font-black text-orange-500 uppercase tracking-widest">{totalSeats} Seats</span>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar - Fixed (Name Input, Info, Buttons) */}
            <div className="px-8 pb-8 pt-4 flex-none bg-[#0e0e11] border-t border-white/5">
              <div className="space-y-4 mb-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Name this unit (Optional)</label>
                  <input
                    type="text"
                    value={combinedName}
                    onChange={(e) => setCombinedName(e.target.value)}
                    placeholder="e.g. Grand Table A, Royal Suite..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/20 focus:border-orange-500/50 outline-none transition-all"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
                  <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-400/80 leading-relaxed font-medium uppercase tracking-tight">
                    Original tables will be hidden from the grid. You can split them back at any time from the unit's details panel.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onConfirm(combinedName)}
                  className="flex-[1.5] py-4 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-widest hover:bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all active:scale-95"
                >
                  Confirm Combine
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CombineConfirmationModal;
