import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCheck, BellOff } from 'lucide-react';

function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return 'just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;

  return new Date(date).toLocaleDateString();
}

export default function NotificationPanel({
  notifications,
  unreadCount,
  onClose,
  onMarkAllAsRead,
  onItemClick,
  isOpen
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          ref={panelRef}
          className="absolute right-0 top-full z-[110] mt-3 flex flex-col overflow-hidden rounded-[24px] border border-white/15 bg-[#0e0e12] shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(255,138,76,0.05)] backdrop-blur-3xl
            w-[calc(100vw-48px)] sm:w-[380px] max-h-[480px]"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Notifications</h3>
              {unreadCount > 0 && (
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#ff8a4c] text-[9px] font-black text-black">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {notifications.some(n => !n.read) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAllAsRead();
                  }}
                  className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.15em] text-[#ff8a4c] hover:text-[#ffb17a] transition-all"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="group flex items-center justify-center rounded-full bg-white/5 p-1 text-white/30 hover:bg-white/10 hover:text-white transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 py-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-white/30">
                <BellOff size={24} strokeWidth={1.5} className="opacity-30 mb-3 text-white" />
                <p className="text-[9px] font-bold uppercase tracking-widest italic text-white/40">No new alerts</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 px-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id || notification._id}
                    onClick={() => onItemClick && onItemClick(notification)}
                    className={`group relative flex flex-col gap-1.5 rounded-[18px] p-3.5 transition-all duration-200 cursor-pointer border ${
                      !notification.read
                        ? 'bg-orange-500/[0.06] border-orange-500/20 hover:bg-orange-500/[0.1] hover:border-orange-500/30'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 flex gap-2.5 min-w-0">
                        {!notification.read && (
                          <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500 shadow-[0_0_10px_#ff8a4c]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4 className={`text-xs font-bold truncate ${!notification.read ? 'text-white' : 'text-white/60'}`}>
                              {notification.title}
                            </h4>
                            <span className="text-[8px] font-black uppercase tracking-wider text-white/40 whitespace-nowrap">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          <p className={`text-[10px] leading-relaxed line-clamp-2 ${!notification.read ? 'text-white/80' : 'text-white/40'}`}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/5 bg-white/[0.02] flex justify-center">
             <button className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 hover:text-white/50 transition-colors">
               View all activity
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
