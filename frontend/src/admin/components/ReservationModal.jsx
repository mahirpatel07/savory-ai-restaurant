import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Users, Calendar, Clock, Grid, Hash, CheckCircle, Trash2, RefreshCw, Check } from 'lucide-react';

const ReservationModal = ({ reservation, isOpen, onClose, onAction }) => {
  if (!reservation) return null;

  const isConfirmed = reservation.status === 'confirmed' || reservation.status === 'approved';
  const isCheckedIn = reservation.status === 'checked-in';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg rounded-[32px] border border-white/10 bg-[#0e0e11] p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-black text-white">{reservation.name}</h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  isConfirmed ? 'text-orange-400 border-orange-400/20 bg-orange-400/5' :
                  isCheckedIn ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' :
                  'text-emerald-400 border-emerald-400/20 bg-emerald-400/5'
                }`}>
                  {reservation.status}
                </span>
              </div>
              <p className="text-sm text-white/40 flex items-center gap-2">
                <Hash size={14} /> ID: {reservation.id.toUpperCase()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <InfoBlock icon={Phone} label="Contact" value={reservation.phone} />
              <InfoBlock icon={Users} label="Guest Count" value={`${reservation.guests} Pax`} />
              <InfoBlock icon={Calendar} label="Reservation Date" value={reservation.date} />
              <InfoBlock icon={Clock} label="Arrival Time" value={reservation.time} />
              <InfoBlock icon={Clock} label="Duration" value={`${reservation.duration || 120} Minutes`} />
              <InfoBlock icon={Grid} label="Assigned Table" value={`Table T${reservation.assignedTable || reservation.tableId}`} />
            </div>

            {reservation.preference && reservation.preference !== 'No Preference' && (
              <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">Special Request</span>
                <p className="text-sm text-white/80 italic leading-relaxed">"{reservation.preference}"</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {isConfirmed && (
                  <>
                    <button
                      onClick={() => onAction('check-in', reservation.id)}
                      className="flex items-center justify-center gap-2 bg-emerald-500 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all"
                    >
                      <CheckCircle size={16} /> Mark Checked-In
                    </button>
                    <button
                      onClick={() => onAction('cancel', reservation.id)}
                      className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 py-4 rounded-2xl text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={16} /> Cancel
                    </button>
                  </>
                )}

                {isCheckedIn && (
                  <button
                    onClick={() => onAction('cleaning', reservation.id)}
                    className="col-span-2 flex items-center justify-center gap-2 bg-orange-500 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-orange-400 transition-all"
                  >
                    <RefreshCw size={16} /> Start Cleaning
                  </button>
                )}

                {reservation.status === 'completed' && (
                  <button
                    onClick={() => onAction('completed', reservation.id)}
                    className="col-span-2 flex items-center justify-center gap-2 bg-blue-500 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-blue-400 transition-all"
                  >
                    <Check size={16} /> Complete Cleaning
                  </button>
                )}
              </div>

              {!isConfirmed && !isCheckedIn && reservation.status !== 'completed' && (
                 <button
                  onClick={() => onAction('cancel', reservation.id)}
                  className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 py-4 rounded-2xl text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={16} /> Cancel Reservation
                </button>
              )}
            </div>

            <div className="mt-6 text-center">
              <span className="text-[10px] text-white/20 font-bold uppercase tracking-tighter">
                Created on {new Date(reservation.requestedAt || reservation.createdAt).toLocaleString()}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const InfoBlock = ({ icon: Icon, label, value }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
      <Icon size={12} /> {label}
    </span>
    <span className="text-sm font-bold text-white/90">{value}</span>
  </div>
);

export default ReservationModal;
