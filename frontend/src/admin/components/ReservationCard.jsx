import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';

const ReservationCard = ({
  reservation,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
  isActive
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'approved': return { bg: 'bg-[#FF824D]/10', border: 'border-[#FF824D]/40', text: 'text-[#FF824D]' };
      case 'checked-in': return { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400' };
      case 'completed': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400' };
      case 'cancelled':
      case 'declined': return { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400' };
      case 'no-show': return { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-400' };
      default: return { bg: 'bg-zinc-800', border: 'border-zinc-700', text: 'text-zinc-400' };
    }
  };

  const colors = getStatusColor(reservation.status);

  return (
    <motion.div
      layoutId={`res-card-${reservation.id}`}
      onMouseEnter={(e) => onMouseEnter(e, reservation)}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(reservation)}
      whileHover={{ scale: 1.04, zIndex: 50 }}
      transition={{ duration: 0.2 }}
      className={`absolute rounded-xl p-2.5 text-[10px] font-black flex flex-col justify-between overflow-hidden cursor-pointer border backdrop-blur-md transition-shadow duration-200 ${colors.bg} ${colors.border} ${colors.text} ${
        isActive ? 'shadow-[0_0_20px_rgba(255,130,77,0.4)] border-[#FF824D]/80 animate-pulse' : 'shadow-lg'
      }`}
      style={style}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="truncate uppercase tracking-tight font-black">
          {reservation?.name || "Guest"}
        </span>
        <span className="opacity-40 text-[8px] font-mono whitespace-nowrap">
          {reservation?.guests || 0}P
        </span>
      </div>

      <div className="flex justify-between items-center mt-auto">
        <div className="flex gap-1">
          {reservation?.vip && <Crown size={11} className="text-orange-400 fill-orange-400" />}
          {reservation?.preference && reservation.preference !== 'No Preference' && (
            <Sparkles size={11} className="text-blue-400" />
          )}
        </div>
        <span className="opacity-60 text-[8px] font-mono">
          {reservation?.time}
        </span>
      </div>
    </motion.div>
  );
};

export default React.memo(ReservationCard);
