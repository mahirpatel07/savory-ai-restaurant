import React from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Users, Calendar, Clock, Sparkles } from 'lucide-react';

const ReservationHoverCard = ({ table, mousePos }) => {
  const reservation = table?.currentReservation;
  if (!reservation && !table?.reservedBy) return null;

  // Use either populated reservation or fallback to table's string fields
  const guestName = reservation?.name || table?.reservedBy || "Unknown Guest";
  const phone = reservation?.phone || table?.phone || "N/A";
  const guests = reservation?.guests || "N/A";
  const date = reservation?.date || table?.reservationDate || "N/A";
  const time = reservation?.time || table?.reservationTime || "N/A";
  const duration = reservation?.duration ? `${reservation.duration}m` : "90m";
  const status = reservation?.status || table?.status || "Reserved";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      style={{
        position: 'fixed',
        left: mousePos.x + 15,
        top: mousePos.y + 15,
        zIndex: 100,
        pointerEvents: 'none'
      }}
      className="w-72 rounded-2xl border border-white/10 bg-[#0f0f12]/90 p-4 shadow-2xl backdrop-blur-xl savory-glow"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Reservation</h4>
        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[8px] font-bold uppercase border border-orange-500/20">
          {status}
        </span>
      </div>

      <div className="space-y-3">
        <DetailItem icon={User} label="Guest" value={guestName} />
        <DetailItem icon={Phone} label="Phone" value={phone} />

        <div className="grid grid-cols-2 gap-2">
          <DetailItem icon={Users} label="Pax" value={`${guests} Pax`} />
          <DetailItem icon={Clock} label="Duration" value={duration} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DetailItem icon={Calendar} label="Date" value={date} />
          <DetailItem icon={Clock} label="Time" value={time} />
        </div>
      </div>

      {reservation?.preference && (
        <div className="mt-3 pt-2 border-t border-white/5">
          <p className="text-[9px] text-white/30 italic flex items-center gap-1">
            <Sparkles size={8} className="text-blue-400" />
            "{reservation.preference}"
          </p>
        </div>
      )}
    </motion.div>
  );
};

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2.5">
    <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
      <Icon size={10} className="text-white/40" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[7px] font-bold text-white/20 uppercase tracking-tighter">{label}</span>
      <span className="text-[10px] font-bold text-white/90 truncate">{value}</span>
    </div>
  </div>
);

export default React.memo(ReservationHoverCard);
