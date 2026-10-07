import React, { useState } from 'react';
import { motion } from 'framer-motion';

const QUICK_ACTIONS = [
  { key: 'reserve', label: '🍽 Reserve a Table' },
  { key: 'availability', label: '📅 Check Availability' },
  { key: 'menu', label: '📖 View Menu' },
  { key: 'info', label: '📍 Restaurant Information' },
  { key: 'question', label: '💬 Ask a Question' }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.08
    }
  }
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

const buttonVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 }
};

export default function WelcomeScreen() {
  const [selectedAction, setSelectedAction] = useState('reserve');

  return (
    <motion.div
      className="relative flex h-full w-full flex-col overflow-hidden ai-welcome-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="pointer-events-none absolute -top-24 -left-24 h-[360px] w-[360px] rounded-full bg-[#FF7A45]/10 blur-[90px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,69,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_32%)]" />

      <div className="relative flex h-full flex-col justify-between gap-8 px-6 py-8">
        <motion.div variants={fadeUpVariants} className="max-w-[78%]">
          <div className="rounded-[28px] border border-white/10 bg-[#111111] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <div className="text-sm leading-7 text-white/90 whitespace-pre-wrap">
              👋 Welcome to Savory!

              I'm your AI Reservation Assistant.

              I can help you:

              🍽 Reserve a table

              📅 Check table availability

              ⏰ Find the best dining time

              👨‍👩‍👧 Reserve for individuals, families, or large groups

              ✨ Answer questions about our restaurant

              I'll guide you through the reservation process step by step.

              How can I help you today?
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/40">7:12 PM</p>
        </motion.div>

        <motion.div variants={fadeUpVariants} className="space-y-4">
          <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">Quick Actions</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => {
              const isSelected = selectedAction === action.key;
              return (
                <motion.button
                  key={action.key}
                  type="button"
                  variants={buttonVariants}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setSelectedAction(action.key)}
                  className={`flex h-[52px] items-center justify-center rounded-full border px-4 text-sm font-semibold transition-all duration-300 ${
                    isSelected
                      ? 'border-[#FF7A45] bg-[#FF7A45]/15 text-white shadow-[0_20px_50px_rgba(255,122,69,0.18)]'
                      : 'border-white/10 bg-[#111111] text-white/80 hover:border-[#FF7A45] hover:bg-[#FF7A45]/10 hover:text-white'
                  }`}
                >
                  {action.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
