import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCalendar, FiClock, FiUsers, FiAward } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CalendarPicker from '../../admin/components/CalendarPicker';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
const TIME_SLOTS = ['6:00 PM', '7:30 PM', '9:00 PM', '10:30 PM'];
const GUESTS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ReserveModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    date: '',
    time: '7:30 PM',
    guests: 2,
    dietary: 'None',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/reservation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: 'Customer Email: ' + formData.email, // Using email as reference for manual booking
          date: formData.date,
          time: formData.time,
          guests: formData.guests,
          preference: formData.dietary !== 'None' ? `${formData.dietary}. ${formData.notes}` : formData.notes,
          source: 'customer-portal'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        toast.error(data.message || 'Table unavailable for selected time.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Unable to connect to reservation server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      date: '',
      time: '7:30 PM',
      guests: 2,
      dietary: 'None',
      notes: ''
    });
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-full max-w-lg glass-panel bg-[#111111]/90 rounded-[20px] border border-white/10 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] pointer-events-auto select-none"
            >
              
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-serif text-white font-bold tracking-tight">Reserve Table</h3>
                  <p className="text-[11px] text-primary font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                    <FiAward className="w-3.5 h-3.5" />
                    Michelin Standard Seating
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full glass-panel hover:border-white/20 text-gray-dark hover:text-white transition-colors cursor-pointer"
                  aria-label="Close booking modal"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* SUCCESS STATE */}
              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8 flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary glow-primary text-2xl font-bold animate-bounce">
                    ✓
                  </div>
                  <h4 className="text-xl font-serif text-white font-bold">Palate Seating Reserved!</h4>
                  <p className="text-xs text-gray-dark font-light max-w-sm leading-relaxed">
                    A confirmation invite has been dispatched to <span className="text-primary font-semibold">{formData.email}</span>. We look forward to hosting your gastronomic journey on <span className="text-white font-medium">{formData.date}</span> at <span className="text-white font-medium">{formData.time}</span>.
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-6 px-8 py-3 rounded-full bg-primary text-black font-bold text-xs uppercase tracking-widest cursor-pointer shadow-lg hover:shadow-primary/20 transition-all"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                /* RESERVATION FORM */
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-dark font-semibold uppercase tracking-wider">Your Name</label>
                      <input
                        required
                        type="text"
                        placeholder="Jean-Luc Picard"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="text-xs text-white bg-white/5 border border-white/8 rounded-xl py-3 px-4 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-dark font-semibold uppercase tracking-wider">Email Address</label>
                      <input
                        required
                        type="email"
                        placeholder="jeanluc@savory.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="text-xs text-white bg-white/5 border border-white/8 rounded-xl py-3 px-4 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Date */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <label className="text-[10px] text-gray-dark font-semibold uppercase tracking-wider flex items-center gap-1">
                        <FiCalendar className="text-primary" /> Date
                      </label>
                      <CalendarPicker
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        placeholder="Select Date"
                        align="left"
                      />
                    </div>
                    
                    {/* Time Slot */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <label className="text-[10px] text-gray-dark font-semibold uppercase tracking-wider flex items-center gap-1">
                        <FiClock className="text-primary" /> Time
                      </label>
                      <select
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="text-xs text-white bg-white/5 border border-white/8 rounded-xl py-3 px-4 focus:border-primary focus:outline-none transition-colors cursor-pointer"
                      >
                        {TIME_SLOTS.map((t) => (
                          <option key={t} value={t} className="bg-card-dark text-white">{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Guests */}
                    <div className="flex flex-col gap-1.5 col-span-1">
                      <label className="text-[10px] text-gray-dark font-semibold uppercase tracking-wider flex items-center gap-1">
                        <FiUsers className="text-primary" /> Guests
                      </label>
                      <select
                        value={formData.guests}
                        onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                        className="text-xs text-white bg-white/5 border border-white/8 rounded-xl py-3 px-4 focus:border-primary focus:outline-none transition-colors cursor-pointer"
                      >
                        {GUESTS_OPTIONS.map((g) => (
                          <option key={g} value={g} className="bg-card-dark text-white">{g} {g === 1 ? 'Guest' : 'Guests'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dietary Requirements */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-dark font-semibold uppercase tracking-wider">Dietary Preferences</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['None', 'Vegetarian', 'Gluten Free', 'Truffle Allergy'].map((diet) => {
                        const isSelected = formData.dietary === diet;
                        return (
                          <button
                            key={diet}
                            type="button"
                            onClick={() => setFormData({ ...formData, dietary: diet })}
                            className={`py-2 px-3 rounded-lg border text-[10px] font-semibold text-center uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                              isSelected
                                ? 'bg-primary/20 border-primary/50 text-primary'
                                : 'bg-white/5 border-white/8 text-gray-dark hover:text-white hover:border-white/20'
                            }`}
                          >
                            {diet}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-dark font-semibold uppercase tracking-wider">Special Requests</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Candle-light anniversary table, wine pairing consultation, window seat requests..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="text-xs text-white bg-white/5 border border-white/8 rounded-xl py-3 px-4 focus:border-primary focus:outline-none transition-colors resize-none placeholder-gray-dark/40"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-black font-extrabold text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      ) : (
                        <span>Confirm Reservation</span>
                      )}
                    </motion.button>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
