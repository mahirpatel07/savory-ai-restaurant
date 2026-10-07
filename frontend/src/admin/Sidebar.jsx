import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Table2,
  History,
  Store,
  ChefHat,
  Boxes,
  LogOut,
  Star,
  Utensils,
  Users,
  Settings
} from 'lucide-react'
import gsap from 'gsap'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const allItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { to: '/admin/reservations', label: 'Reservations', icon: CalendarDays, roles: ['admin', 'manager', 'waiter'] },
  { to: '/admin/daily-reservations', label: 'Customer History', icon: History, roles: ['admin', 'manager'] },
  { to: '/admin/table-management', label: 'Table Management', icon: Table2, roles: ['admin', 'manager', 'waiter'] },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, roles: ['admin', 'manager'] },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes, roles: ['admin', 'manager', 'chef'] },
  { to: '/admin/reviews', label: 'Customer Reviews', icon: Star, roles: ['admin', 'manager'] },
  { to: '/admin/pos', label: 'POS Terminal', icon: Store, roles: ['admin', 'manager', 'waiter'] },
  { to: '/admin/kds', label: 'Kitchen Display', icon: ChefHat, roles: ['admin', 'manager', 'chef'] },
  { to: '/admin/staff', label: 'Staff Management', icon: Users, roles: ['admin', 'manager'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'] },
  { to: '/admin/ai', label: 'AI Assistant', icon: Sparkles, roles: ['admin', 'manager'] }
]

export default function Sidebar({ onClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const sidebarRef = useRef(null)
  const logoRef = useRef(null)
  const navRef = useRef(null)

  const items = allItems.filter(item => {
    if (!item.roles) return true;
    if (!user || !user.role) return true;
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (sidebarRef.current) {
        gsap.from(sidebarRef.current, {
          x: -300,
          duration: 0.8,
          ease: 'power3.out'
        });
      }

      if (logoRef.current) {
        gsap.from(logoRef.current, {
          opacity: 0,
          y: -20,
          duration: 0.6,
          delay: 0.2
        });
      }

      if (navRef.current?.children && navRef.current.children.length > 0) {
        const navChildren = Array.from(navRef.current.children);
        gsap.from(navChildren, {
          opacity: 0,
          x: -15,
          stagger: 0.05,
          duration: 0.4,
          delay: 0.3,
          ease: 'power2.out'
        });
      }
    }, sidebarRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    gsap.to(sidebarRef.current, {
      width: collapsed ? 90 : 280,
      duration: 0.35,
      ease: 'power3.inOut'
    });
  }, [collapsed]);

  return (
    <aside
      ref={sidebarRef}
      className={`relative z-20 flex h-full flex-col border-r ${isDark ? 'border-white/10 bg-[#0e0e11]/95 text-white' : 'border-gray-200 bg-white text-gray-900'} px-3.5 py-6 backdrop-blur-2xl overflow-hidden font-sans select-none`}
      style={{ width: collapsed ? 90 : 280 }}
    >
      {/* Brand Header */}
      <div className="mb-8 flex items-center justify-between px-1">
        <div ref={logoRef} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-black shadow-[0_0_25px_rgba(249,115,22,0.35)] flex-shrink-0 font-black">
            <Utensils size={20} />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <div className={`text-base font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'} leading-none`}>SAVORY</div>
              <div className={`text-[9px] font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'} uppercase tracking-widest mt-1`}>Ops Command</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'} p-2 transition-all shadow-sm`}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav ref={navRef} className="flex flex-col gap-1.5 flex-1 overflow-y-auto scrollbar-hide pr-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.to || (item.to === '/admin' && location.pathname === '/admin')

          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'} onClick={handleLinkClick}>
              {({ isActive }) => {
                const isCurrent = isActive || active
                return (
                  <div
                    className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 cursor-pointer ${
                      isCurrent
                        ? isDark
                          ? 'bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent border-l-2 border-orange-500 text-white font-bold shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                          : 'bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent border-l-2 border-orange-500 text-gray-900 font-bold shadow-sm'
                        : isDark
                          ? 'text-white/60 hover:text-white hover:bg-white/5'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-black shadow-md shadow-orange-500/30 font-bold'
                          : isDark
                            ? 'bg-white/5 border border-white/10 text-white/50 group-hover:text-orange-400 group-hover:border-orange-500/30'
                            : 'bg-gray-100 border border-gray-200 text-gray-500 group-hover:text-orange-600 group-hover:border-orange-500/30'
                      }`}
                    >
                      <Icon size={18} />
                    </div>

                    {!collapsed && (
                      <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </div>
                )
              }}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer / Sign Out */}
      <div className={`mt-auto pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} flex flex-col gap-2`}>
        {!collapsed && user && (
          <div className={`px-3 py-2 rounded-2xl ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'} border flex items-center justify-between mb-1`}>
            <div className="min-w-0">
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>{user.name || 'Staff User'}</p>
              <p className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{user.role || 'Admin'}</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-rose-600 dark:text-rose-400/80 hover:text-rose-700 dark:hover:text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="Sign Out"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex-shrink-0">
            <LogOut size={16} />
          </div>
          {!collapsed && <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
