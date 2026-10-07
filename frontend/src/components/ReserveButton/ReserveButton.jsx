import React from 'react';
import { motion } from 'framer-motion';
import { FiCalendar } from 'react-icons/fi';

export default function ReserveButton({ onClick }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.6, type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-26 right-8 z-40 select-none hidden sm:block"
    >
      {/* Floating Action Button */}
      <motion.button
        onClick={onClick}
        whileHover={{ 
          scale: 1.1,
          y: -4,
          boxShadow: '0 0 25px rgba(255, 130, 77, 0.4)',
          borderColor: 'rgba(255, 130, 77, 0.3)'
        }}
        whileTap={{ scale: 0.9 }}
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          y: {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.0 // Offset float timing from the AI button
          }
        }}
        className="w-12 h-12 rounded-full bg-card-dark border border-white/10 text-primary flex items-center justify-center cursor-pointer shadow-2xl relative group"
        aria-label="Book a table reservation"
      >
        <FiCalendar className="w-5 h-5" />

        {/* Small tooltip hover label */}
        <span className="absolute right-[120%] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 origin-right transition-all duration-300 bg-[#111111]/90 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold tracking-widest uppercase py-2 px-4 rounded-full whitespace-nowrap shadow-xl">
          Reserve Table
        </span>
      </motion.button>
    </motion.div>
  );
}
