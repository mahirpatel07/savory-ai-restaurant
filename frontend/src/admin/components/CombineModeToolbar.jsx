import React from 'react';
import { motion } from 'framer-motion';
import { Layers, X, Check } from 'lucide-react';

const CombineModeToolbar = ({ selectedTables, onCancel, onCombine }) => {
  const totalSeats = selectedTables.reduce((sum, t) => sum + t.seats, 0);
  const count = selectedTables.length;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4"
    >
      <div className="bg-[#111111]/90 backdrop-blur-2xl border border-orange-500/30 rounded-3xl p-4 shadow-[0_20px_50px_rgba(249,115,22,0.15)] flex items-center justify-between">
        <div className="flex items-center gap-6 pl-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Selected</span>
            <span className="text-sm font-black text-white flex items-center gap-2">
              <Layers size={14} className="text-orange-500" />
              {count} {count === 1 ? 'Table' : 'Tables'}
            </span>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Total Capacity</span>
            <span className="text-sm font-black text-orange-500">
              {totalSeats} Seats
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
          >
            <X size={14} /> Cancel
          </button>

          <button
            disabled={count < 2}
            onClick={onCombine}
            className="px-6 py-2.5 rounded-2xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest hover:bg-orange-400 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
          >
            <Check size={14} /> Combine Selected
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CombineModeToolbar;
