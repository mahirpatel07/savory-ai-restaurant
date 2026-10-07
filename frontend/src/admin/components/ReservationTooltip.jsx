import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Users, Grid, Calendar, Clock, Sparkles } from 'lucide-react';

const ReservationTooltip = ({ reservation, mousePos }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const tooltipWidth = 280;
    const tooltipHeight = 220;
    const padding = 20;

    let x = mousePos.x + 15;
    let y = mousePos.y + 15;

    // Boundary checks
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = mousePos.x - tooltipWidth - 15;
    }
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = mousePos.y - tooltipHeight - 15;
    }

    setPosition({ x, y });
  }, [mousePos]);

  if (!reservation) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="w-[280px] rounded-2xl border border-white/10 bg-[#0f0f12]/90 p-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-white/90">Details</h4>
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
          reservation.status === 'confirmed' ? 'text-orange-400 border-orange-400/30' : 'text-blue-400 border-blue-400/30'
        }`}>
          {reservation.status}
        </span>
      </div>

      <div className="space-y-2.5">
        <DetailItem icon={User} label="Guest" value={reservation?.name || "Unknown"} />
        <DetailItem icon={Phone} label="Phone" value={reservation?.phone || "N/A"} />
        <div className="grid grid-cols-2 gap-2">
          <DetailItem icon={Users} label="Guests" value={`${reservation?.guests || 0} Pax`} />
          <DetailItem icon={Grid} label="Table" value={`T${reservation?.assignedTable || reservation?.tableId || '?'}`} />
        </div>
        <DetailItem icon={Calendar} label="Date" value={reservation?.date || "N/A"} />
        <DetailItem icon={Clock} label="Time" value={`${reservation?.time} (${reservation?.duration || 120}m)`} />
      </div>

      {reservation?.preference && reservation.preference !== 'No Preference' && (
        <div className="mt-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">
            <Sparkles size={10} /> Special Request
          </div>
          <p className="text-[10px] text-white/50 italic leading-relaxed line-clamp-2">
            "{reservation.preference}"
          </p>
        </div>
      )}
    </motion.div>
  );
};

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2">
    <div className="p-1 rounded-md bg-white/5">
      <Icon size={10} className="text-white/40" />
    </div>
    <div className="flex flex-col">
      <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{label}</span>
      <span className="text-[11px] font-bold text-white/80 truncate max-w-[180px]">{value}</span>
    </div>
  </div>
);

export default React.memo(ReservationTooltip);
