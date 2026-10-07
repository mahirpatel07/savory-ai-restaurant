import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, Menu, Sun, Moon } from 'lucide-react'
import { useReservation } from '../context/ReservationContext'
import { useTheme } from '../context/ThemeContext'
import NotificationPanel from './components/NotificationPanel'

const pageMap = {
  '/admin': {
    title: 'Dashboard',
    subtitle: 'Operational overview of reservations, tables, and menu.'
  },
  '/admin/settings': {
    title: 'Restaurant Settings',
    subtitle: 'Configure GST tax rates, business hours, multiple branches, hardware printers, and discount rules.'
  },
  '/admin/staff': {
    title: 'Staff Management',
    subtitle: 'Manage staff accounts, assign roles, track order performance, and control system permissions.'
  },
  '/admin/reservations': {
    title: 'Reservations',
    subtitle: 'Manage booking requests, confirm tables, and keep floor flow on track.'
  },
  '/admin/daily-reservations': {
    title: 'Customer History',
    subtitle: 'Track day-wise reservation history and past customer bookings.'
  },
  '/admin/table-management': {
    title: 'Table Management',
    subtitle: 'Manage restaurant tables, seating layout, live occupancy, merged tables and reservations.'
  },
  '/admin/menu': {
    title: 'Menu Management',
    subtitle: 'Optimize dishes, availability, and pricing across the menu.'
  },
  '/admin/inventory': {
    title: 'Inventory',
    subtitle: 'Track ingredients, stock levels, and automated procurement alerts.'
  },
  '/admin/ai': {
    title: 'AI Assistant',
    subtitle: 'Ask the copilot for forecasts, staffing, and upsell suggestions.'
  },
  '/admin/pos': {
    title: 'POS Terminal',
    subtitle: 'Point of sale terminal for taking orders, managing payments, and printing bills.'
  },
  '/admin/kds': {
    title: 'Kitchen Display',
    subtitle: 'Real-time kitchen display system for tracking active orders and preparation times.'
  },
  '/admin/reviews': {
    title: 'Customer Feedback',
    subtitle: 'View ratings, customer reviews, category breakdowns, and sentiment feedback.'
  }
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageMap[location.pathname] || pageMap['/admin']
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useReservation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  const handleNotificationClick = async (notification) => {
    await markNotificationAsRead(notification.id || notification._id);
    setIsNotificationOpen(false);

    if (notification.type === 'reservation') {
      navigate('/admin/reservations');
    } else if (notification.type === 'order') {
      navigate('/admin/pos');
    } else if (notification.type === 'kitchen') {
      navigate('/admin/kds');
    } else if (notification.type === 'inventory') {
      navigate('/admin/inventory');
    } else if (notification.type === 'payment') {
      navigate('/admin/pos');
    } else if (notification.type === 'table') {
      navigate('/admin/table-management');
    }
  };

  return (
    <div className={`relative h-screen h-[100dvh] w-screen overflow-hidden font-sans transition-colors duration-300 ${isDark ? 'bg-[#060608] text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-[#ff8a4c]/15 blur-[120px]" />
        <div className="absolute bottom-0 right-[-8%] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[140px]" />
      </div>

      <div className="relative flex h-full w-full overflow-hidden">
        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          />
        )}

        {/* Sidebar Component: Overlay on mobile, fixed/sticky full height on desktop */}
        <div className={`fixed inset-y-0 left-0 z-[160] lg:static lg:z-20 lg:h-full lg:shrink-0 transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <Sidebar onClose={() => setMobileSidebarOpen(false)} />
        </div>

        {/* Right Area Container: Fixed Header + Independent Scroll Main View */}
        <div className="flex-1 flex flex-col h-full min-w-0 w-full overflow-hidden">
          {/* Header Component */}
          <header className={`shrink-0 z-[100] mx-4 mt-4 rounded-[28px] border p-4 sm:p-6 shadow-2xl backdrop-blur-3xl transition-all sm:mx-6 lg:mx-8 xl:mx-10 ${isDark ? 'border-white/10 bg-[rgba(19,19,22,0.95)] text-white' : 'border-gray-200 bg-white/95 text-gray-900'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col justify-between py-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className={`lg:hidden p-2.5 rounded-xl border transition-all flex-shrink-0 ${isDark ? 'border-white/10 bg-white/5 text-white/80 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700 hover:text-gray-900'}`}
                    aria-label="Open Navigation"
                  >
                    <Menu size={20} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-px w-3 bg-orange-500/60" />
                      <p className={`text-[10px] font-bold uppercase tracking-[0.4em] ${isDark ? 'text-white/30' : 'text-gray-500'}`}>{page.title}</p>
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {page.title} <span className={`font-medium italic text-sm sm:text-base ${isDark ? 'text-white/20' : 'text-gray-400'}`}>command center</span>
                    </h2>
                  </div>
                </div>
                <p className={`mt-3 text-xs sm:text-sm italic leading-relaxed max-w-2xl ${isDark ? 'text-white/40' : 'text-gray-600'}`}>
                  {page.subtitle}
                </p>
              </div>

              <div className="flex flex-col items-start lg:items-end justify-between gap-4 py-1">
                <div className="relative w-full sm:w-auto flex items-center gap-3 justify-start lg:justify-end">
                  {/* Theme Toggle Button */}
                  <button
                    onClick={toggleTheme}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all active:scale-95 cursor-pointer ${isDark ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/15' : 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
                    <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>

                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className={`group inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
                      isDark
                        ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                        : 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm'
                    } ${isNotificationOpen ? (isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-900') : ''}`}
                  >
                    <div className="relative">
                      <BellRing size={18} className="text-orange-500 transition-transform group-hover:rotate-12" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(255,138,76,0.5)]">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <span className={isDark ? 'text-white/80' : 'text-gray-900 font-bold'}>Notifications</span>
                    {unreadCount > 0 && !isNotificationOpen && (
                       <span className="ml-0.5 text-orange-500 font-bold">{unreadCount}</span>
                    )}
                  </button>

                  <NotificationPanel
                    isOpen={isNotificationOpen}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onClose={() => setIsNotificationOpen(false)}
                    onMarkAsRead={markNotificationAsRead}
                    onMarkAllAsRead={markAllNotificationsAsRead}
                    onItemClick={handleNotificationClick}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 ${
                    isDark ? 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 shadow-sm'
                  }`}>
                    Live bookings
                  </button>
                  <button className={`px-3.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 ${
                    isDark ? 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 shadow-sm'
                  }`}>
                     Revenue view
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Independent Scroll Main Area */}
          <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 xl:p-10 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mx-auto max-w-7xl w-full h-auto min-h-full flex flex-col"
              >
                <React.Suspense fallback={<div className="flex h-full w-full items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-500" /></div>}>
                  <Outlet />
                </React.Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}
