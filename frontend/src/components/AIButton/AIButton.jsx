import React from 'react';
import { motion } from 'framer-motion';
import { LuSparkles } from 'react-icons/lu';

export default function AIButton({ onClick }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.5, type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-8 right-8 z-40 select-none hidden sm:block"
    >
      {/* Glow ring removed to avoid duplicate circle */}

      {/* Floating Action Button */}
      <motion.button
        onClick={onClick}
        whileHover={{ 
          scale: 1.1,
          y: -4,
          boxShadow: '0 0 35px rgba(255, 130, 77, 0.55)',
          borderColor: 'rgba(255, 130, 77, 0.4)'
        }}
        whileTap={{ scale: 0.9 }}
        animate={{
          y: [0, -6, 0],
        }}
        transition={{
          y: {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-[#ff9e75] border border-primary/25 text-black flex items-center justify-center cursor-pointer shadow-2xl relative group"
        aria-label="Open AI Concierge Sommelier"
      >
        {/* Shimmer overlay removed per request */}
        <LuSparkles className="w-6 h-6 animate-pulse" />

        {/* Small tooltip hover label */}
        <span className="absolute right-[120%] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 origin-right transition-all duration-300 bg-[#111111]/90 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold tracking-widest uppercase py-2 px-4 rounded-full whitespace-nowrap shadow-xl">
          Ask AI Assistant
        </span>
      </motion.button>
    </motion.div>
  );
}
