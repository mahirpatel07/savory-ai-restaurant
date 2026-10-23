import React, { useEffect, useRef, useState, useCallback } from 'react';
import CountUpPkg from 'react-countup';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from 'recharts';
import { CalendarRange, Sparkles, Users, DollarSign, ShoppingBag, TrendingUp, Clock, Utensils, Zap, Activity, Download, Filter, CreditCard, Wallet, Smartphone, Layers, CheckCircle2, ChevronRight, Award } from 'lucide-react';
import { useReservation } from '../../context/ReservationContext';
import { useTheme } from '../../context/ThemeContext';

import { motion } from 'framer-motion';
import axios from 'axios';
import gsap from 'gsap';
import toast from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

const CountUp = CountUpPkg.default || CountUpPkg;

function StatCard({ title, value, suffix = '', prefix = '', icon: Icon, accent, loading = false, decimals = 0 }) {
  const cardRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleHover = (isEnter) => {
    gsap.to(cardRef.current, {
      scale: isEnter ? 1.02 : 1,
      y: isEnter ? -4 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      className={`relative overflow-hidden rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 backdrop-blur-2xl transition-all hover:border-orange-500/40`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{title}</p>
          <div className={`mt-2 text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {loading ? (
              <div className={`h-8 w-20 animate-pulse rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            ) : (
              <>
                {prefix}
                <CountUp end={value} decimals={decimals} duration={1.2} />
                {suffix}
              </>
            )}
          </div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} shadow-inner`} style={{ boxShadow: `0 0 20px ${accent}` }}>
          <Icon size={20} className="text-orange-500" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { getAvailableTables, tables, dashboardStats, activeOrders } = useReservation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Period and Order Type Filter States
  const [period, setPeriod] = useState('weekly'); // 'today', 'weekly', 'monthly', 'all'
  const [orderType, setOrderType] = useState('all'); // 'all', 'dine-in', 'takeaway', 'delivery'


  const [analytics, setAnalytics] = useState({ todayRevenue: 0, todayOrders: 0, averageOrderValue: 0, loading: true });
  const [reportData, setReportData] = useState({
    peakHours: [],
    profit: 0,
    revenue: 0,
    cost: 0,
    profitMargin: 0,
    bestSellingItems: [],
    paymentBreakdown: {},
    tablePerformance: [],
    chartData: [],
    loading: true
  });

  const dashboardRef = useRef(null);
  const heroCardRef = useRef(null);
  const chartRef = useRef(null);
  const reportChartRef = useRef(null);
  const listRef = useRef(null);

  const availableTables = getAvailableTables().length;

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const [summaryRes, reportRes] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/summary?period=${period}&orderType=${orderType}`),
        axios.get(`${API_BASE}/api/analytics/reporting?period=${period}&orderType=${orderType}`)
      ]);
      setAnalytics({ ...summaryRes.data, loading: false });
      setReportData({ ...reportRes.data, loading: false });
    } catch (e) {
      console.error('Error fetching analytics:', e);
      setAnalytics(prev => ({ ...prev, loading: false }));
      setReportData(prev => ({ ...prev, loading: false }));
    }
  }, [period, orderType]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      if (heroCardRef.current) {
        tl.from(heroCardRef.current, {
          opacity: 0,
          y: 25,
          duration: 0.6,
          ease: 'power3.out'
        });
      }

      const statWrappers = document.querySelectorAll('.stat-card-wrapper');
      if (statWrappers.length > 0) {
        tl.from(statWrappers, {
          opacity: 0,
          scale: 0.95,
          y: 15,
          stagger: 0.08,
          duration: 0.5,
          ease: 'back.out(1.2)'
        }, '-=0.3');
      }
    }, dashboardRef);

    return () => ctx.revert();
  }, []);



  return (
    <div ref={dashboardRef} className="space-y-6 pb-12 font-sans">
      {/* ── HERO BANNER & ANALYTICS FILTER BAR ── */}
      <div
        ref={heroCardRef}
        className={`relative overflow-hidden rounded-[32px] border ${isDark ? 'border-white/10 bg-gradient-to-r from-orange-500/10 via-[#121215] to-[#0c0c0e] text-white' : 'border-gray-200 bg-gradient-to-r from-orange-500/10 via-white to-gray-50 text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl`}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-500">
              <Sparkles size={14} className="animate-pulse" />
              <span>Real-Time Business Intelligence</span>
            </div>
            <h1 className={`mt-3 text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Dashboard &amp; Analytics Command Center
            </h1>
            <p className={`mt-2 max-w-2xl text-xs sm:text-sm ${isDark ? 'text-white/60' : 'text-gray-600'} leading-relaxed font-medium`}>
              Live sales performance, payment breakdowns, peak hour heatmaps, and menu dish rankings calculated from actual POS transactions.
            </p>
          </div>


        </div>

        {/* Analytics Filter Selector Bar */}
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          {/* Period Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} mr-1`}>Time Period:</span>
            {[
              { key: 'today', label: 'Today' },
              { key: 'weekly', label: 'This Week' },
              { key: 'monthly', label: 'This Month' },
              { key: 'all', label: 'All Time' }
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  period === p.key
                    ? 'bg-orange-500 text-black font-black shadow-md'
                    : isDark ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Order Type Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} mr-1`}>Type:</span>
            {[
              { key: 'all', label: 'All Types' },
              { key: 'dine-in', label: 'Dine-In' },
              { key: 'takeaway', label: 'Takeaway' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setOrderType(t.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  orderType === t.key
                    ? 'bg-amber-500 text-black font-black shadow-md'
                    : isDark ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOP STATS GRID ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card-wrapper">
          <StatCard
            title={`${period.toUpperCase()} SALES`}
            value={analytics.todayRevenue || 0}
            prefix="$"
            decimals={2}
            icon={DollarSign}
            accent="rgba(16,185,129,0.3)"
            loading={analytics.loading}
          />
        </div>
        <div className="stat-card-wrapper">
          <StatCard
            title="TOTAL ORDERS"
            value={analytics.todayOrders || 0}
            icon={ShoppingBag}
            accent="rgba(249,115,22,0.3)"
            loading={analytics.loading}
          />
        </div>
        <div className="stat-card-wrapper">
          <StatCard
            title="AVG ORDER VALUE (AOV)"
            value={analytics.averageOrderValue || 0}
            prefix="$"
            decimals={2}
            icon={TrendingUp}
            accent="rgba(59,130,246,0.3)"
            loading={analytics.loading}
          />
        </div>
        <div className="stat-card-wrapper">
          <StatCard
            title="AVAILABLE TABLES"
            value={availableTables}
            icon={CalendarRange}
            accent="rgba(168,85,247,0.3)"
            loading={dashboardStats.loading}
          />
        </div>
      </div>

      {/* ── MIDDLE ROW: REVENUE OVERVIEW & BEST SELLING DISHES ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Overview Chart */}
        <div ref={chartRef} className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl`}>
          <div className={`mb-6 flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-1.5`}>
                <TrendingUp size={13} className="text-emerald-500" />
                Revenue Performance
              </p>
              <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} mt-0.5`}>
                Sales Trend ({period.toUpperCase()})
              </p>
            </div>
            <span className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-500">
              Live DB Sync
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData.chartData && reportData.chartData.length > 0 ? reportData.chartData : [{ name: 'No Data', value: 0 }]}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: isDark ? '#111114' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 12, fontSize: '12px', color: isDark ? '#ffffff' : '#111827' }} />
                <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" isAnimationActive={true} animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best-Selling Items */}
        <div ref={listRef} className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl`}>
          <div className={`mb-4 flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-1.5`}>
                <Utensils size={13} className="text-orange-500" /> Menu Demand
              </p>
              <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} mt-0.5`}>Best-Selling Menu Items</p>
            </div>
            <span className={`rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60' : 'border-gray-200 bg-gray-100 text-gray-600'} px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}>
              Ranked by Qty
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {(!reportData.bestSellingItems || reportData.bestSellingItems.length === 0) ? (
              <div className="text-center py-12 text-white/30 text-xs font-bold uppercase tracking-wider">
                No menu sales recorded for this period yet.
              </div>
            ) : (
              reportData.bestSellingItems.map((item, idx) => (
                <div key={idx} className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} p-3.5 transition-all hover:border-orange-500/30`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 font-black text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                        <p className={`mt-0.5 text-xs ${isDark ? 'text-white/50' : 'text-gray-600'} font-semibold`}>
                          Sold: <strong className="text-orange-400">{item.quantity} orders</strong>
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-400 flex-shrink-0">
                      ${item.revenue?.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── LOWER ROW: PAYMENT BREAKDOWN & PEAK HOURS ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Methods Breakdown */}
        <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl`}>
          <div className={`mb-6 flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-1.5`}>
                <CreditCard size={13} className="text-orange-500" /> Payment Split
              </p>
              <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} mt-0.5`}>Payment Method Breakdown</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'cash', label: 'Cash', icon: Wallet, color: 'text-emerald-400', border: 'border-emerald-500/20' },
              { key: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-400', border: 'border-blue-500/20' },
              { key: 'upi', label: 'UPI QR', icon: Smartphone, color: 'text-purple-400', border: 'border-purple-500/20' },
              { key: 'multiple', label: 'Split Payments', icon: Layers, color: 'text-amber-400', border: 'border-amber-500/20' }
            ].map(m => {
              const data = reportData.paymentBreakdown?.[m.key] || { count: 0, amount: 0 };
              const Icon = m.icon;

              return (
                <div key={m.key} className={`rounded-2xl border ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'} p-4 ${m.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-gray-600'}`}>{m.label}</span>
                    <Icon size={16} className={m.color} />
                  </div>
                  <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>${data.amount?.toFixed(2)}</p>
                  <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} mt-1`}>
                    {data.count} Transactions
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Hours Heatmap */}
        <div ref={reportChartRef} className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl`}>
          <div className={`mb-6 flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-1.5`}>
                <Clock size={13} className="text-orange-500" />
                Peak Operations
              </p>
              <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} mt-0.5`}>Busy Hours Distribution (24h)</p>
            </div>
            <span className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60' : 'border-gray-200 bg-gray-100 text-gray-600'} px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}>
              Volume by Hour
            </span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.peakHours || []}>
                <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 10 }}
                  interval={3}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ background: isDark ? '#111114' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 12, fontSize: '12px', color: isDark ? '#ffffff' : '#111827' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {(reportData.peakHours || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.count > 3 ? '#f97316' : 'rgba(249,115,22,0.3)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── TABLE PERFORMANCE & FLOOR OCCUPANCY ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl`}>
        <div className={`mb-6 pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between`}>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Floor Readiness &amp; Seating Analytics</p>
            <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} mt-0.5`}>Table Performance &amp; Live Occupancy</p>
          </div>
          <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-3 py-1 rounded-xl border border-orange-500/20">
            {tables.length} Total Floor Tables
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/10 text-white/40' : 'border-gray-200 text-gray-500'} uppercase font-black tracking-widest text-[10px]`}>
                <th className="pb-3 pl-2">Table Number</th>
                <th className="pb-3">Capacity</th>
                <th className="pb-3">Live Status</th>
                <th className="pb-3">Orders Processed</th>
                <th className="pb-3 pr-2 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(!reportData.tablePerformance || reportData.tablePerformance.length === 0) ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/30 text-xs font-bold uppercase tracking-wider">
                    Loading floor table analytics...
                  </td>
                </tr>
              ) : (
                reportData.tablePerformance.map((tbl) => (
                  <tr key={tbl.tableNumber} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pl-2 font-bold text-sm">Table {tbl.tableNumber}</td>
                    <td className="py-3 font-semibold text-white/60">{tbl.capacity} Seats</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        tbl.status === 'occupied'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : tbl.status === 'reserved'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : tbl.status === 'cleaning'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {tbl.status || 'available'}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-white/80">{tbl.orderCount} Orders</td>
                    <td className="py-3 pr-2 text-right font-mono font-bold text-emerald-400 text-sm">
                      ${tbl.revenue?.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
