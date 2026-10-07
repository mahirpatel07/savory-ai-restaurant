import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
  Utensils,
  Play,
  Check,
  ListFilter,
  X,
  Zap,
  ZapOff,
  Search,
  Boxes,
  Volume2,
  VolumeX,
  Bell,
  LayoutGrid,
  Columns
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function KDS() {
  const [orders, setOrders] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenuControl, setShowMenuControl] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // Filter & Layout States
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('columns'); // 'columns' or 'grid'
  const [isChimeMuted, setIsChimeMuted] = useState(true);
  const [checkedItems, setCheckedItems] = useState({}); // { [orderId_itemIndex]: boolean }

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const playChimeSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, menuRes] = await Promise.all([
        axios.get(`${API_BASE}/api/orders/active`),
        axios.get(`${API_BASE}/api/menu`)
      ]);
      const active = ordersRes.data.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
      setOrders(active);
      setDishes(menuRes.data);
      setLoading(false);
    } catch (error) {
      console.error('KDS load error:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (socket) {
      socket.on('order_created', (newOrder) => {
        setOrders(prev => [...prev, newOrder]);
        if (!isChimeMuted) {
          playChimeSound();
        }
        toast('New Order Received!', {
          icon: '🔔',
          style: {
            borderRadius: '20px',
            background: '#222',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          },
        });
      });

      socket.on('order_updated', (updatedOrder) => {
        setOrders(prev => {
          if (['paid', 'cancelled', 'served'].includes(updatedOrder.status)) {
            return prev.filter(o => o._id !== updatedOrder._id);
          }
          return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
        });
      });

      socket.on('menu_updated', (updatedDish) => {
        setDishes(prev => prev.map(d => d._id === updatedDish._id ? updatedDish : d));
      });

      return () => {
        socket.off('order_created');
        socket.off('order_updated');
        socket.off('menu_updated');
      };
    }
  }, [fetchData, isChimeMuted, playChimeSound]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API_BASE}/api/orders/${orderId}`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const toggleDishAvailability = async (dishId) => {
    try {
      const storedUser = localStorage.getItem('savory_user');
      const token = storedUser ? JSON.parse(storedUser).token : localStorage.getItem('token');
      const res = await axios.patch(`${API_BASE}/api/menu/${dishId}/toggle`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setDishes(prev => prev.map(d => d._id === dishId ? res.data : d));
      toast.success(`Item marked as ${res.data.available ? 'In Stock' : 'Sold Out'}`);
    } catch (error) {
      console.error('Toggle dish error:', error);
      toast.error('Failed to update item status');
    }
  };

  const toggleItemCheck = (orderId, itemIndex) => {
    const key = `${orderId}_${itemIndex}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getTimeElapsedSeconds = (createdAt) => {
    const elapsedMs = new Date() - new Date(createdAt);
    return Math.max(0, Math.floor(elapsedMs / 1000));
  };

  const formatElapsed = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const soldOutCount = useMemo(() => dishes.filter(d => d.available === false).length, [dishes]);
  const inStockCount = useMemo(() => dishes.filter(d => d.available !== false).length, [dishes]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const filteredInventoryDishes = useMemo(() => {
    return dishes.filter(dish => {
      const matchesSearch = dish.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        dish.category.toLowerCase().includes(inventorySearch.toLowerCase());
      if (inventoryFilter === 'instock') return matchesSearch && dish.available !== false;
      if (inventoryFilter === 'soldout') return matchesSearch && dish.available === false;
      return matchesSearch;
    });
  }, [dishes, inventorySearch, inventoryFilter]);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] gap-6">
      {/* ── TOP CONTROL BAR ── */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-3xl border ${
        isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'
      } p-6 backdrop-blur-xl shadow-2xl`}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-500 border border-orange-500/30 shadow-inner">
            <ChefHat size={26} />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              Kitchen Display System
            </h1>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-0.5`}>
              Real-time order queue, audio alerts &amp; chef prep countdown timers
            </p>
          </div>
        </div>

        {/* Control Actions & Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter Tabs */}
          <div className={`flex items-center p-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} text-xs font-bold`}>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl transition-all ${
                statusFilter === 'all'
                  ? 'bg-orange-500 text-black font-black shadow-md shadow-orange-500/20'
                  : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-xl transition-all ${
                statusFilter === 'pending'
                  ? 'bg-orange-500 text-black font-black shadow-md shadow-orange-500/20'
                  : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('preparing')}
              className={`px-4 py-2 rounded-xl transition-all ${
                statusFilter === 'preparing'
                  ? 'bg-orange-500 text-black font-black shadow-md shadow-orange-500/20'
                  : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Preparing
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-4 py-2 rounded-xl transition-all ${
                statusFilter === 'ready'
                  ? 'bg-orange-500 text-black font-black shadow-md shadow-orange-500/20'
                  : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ready
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className={`flex items-center p-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'}`}>
            <button
              onClick={() => setViewMode('columns')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'columns'
                  ? 'bg-orange-500 text-black font-bold shadow-md'
                  : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Columns View"
            >
              <Columns size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'grid'
                  ? 'bg-orange-500 text-black font-bold shadow-md'
                  : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {/* Audio Chime Controls */}
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'}`}>
            <button
              onClick={() => setIsChimeMuted(!isChimeMuted)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isChimeMuted
                  ? isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isChimeMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>{isChimeMuted ? 'Chime Muted' : 'Chime Active'}</span>
            </button>
            <button
              onClick={() => {
                playChimeSound();
                toast.success('Test bell chime triggered');
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              TEST BELL
            </button>
          </div>

          {/* Kitchen Inventory Button */}
          <button
            onClick={() => setShowMenuControl(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white active:scale-95 transition-all shadow-lg shadow-orange-500/10"
          >
            <Boxes size={16} />
            <span className="text-xs font-black uppercase tracking-wider">INVENTORY</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-black">
              {soldOutCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── MAIN ORDERS DISPLAY AREA ── */}
      <div className="flex-1 overflow-x-auto overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'flex gap-6 h-full min-w-max pr-6'}>
          <AnimatePresence>
            {loading ? (
              <div className="flex w-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-500" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-1 items-center justify-center min-w-[600px] opacity-40 flex-col gap-4 text-center my-12">
                <div className={`p-6 rounded-full border ${isDark ? 'border-white/10 bg-white/5 text-orange-400' : 'border-gray-200 bg-gray-100 text-orange-600'}`}>
                  <Utensils size={48} />
                </div>
                <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Kitchen Queue Clear</h2>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-600'} max-w-xs`}>
                  All incoming orders will appear here automatically in real time.
                </p>
              </div>
            ) : (
              filteredOrders.map((order, idx) => {
                const elapsedSec = getTimeElapsedSeconds(order.createdAt);
                const elapsedMin = Math.floor(elapsedSec / 60);
                const isLate = elapsedMin > 15;
                const isWarning = elapsedMin > 10 && elapsedMin <= 15;

                const targetMins = 15;
                const pctElapsed = Math.min(100, Math.round((elapsedMin / targetMins) * 100));

                return (
                  <motion.div
                    key={order._id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -50 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex flex-col w-[340px] rounded-[28px] border transition-all ${
                      isLate
                        ? isDark
                          ? 'border-rose-500/50 bg-gradient-to-b from-rose-950/20 to-[#121215] text-white shadow-[0_0_30px_rgba(244,63,94,0.2)]'
                          : 'border-rose-300 bg-rose-50 text-gray-900 shadow-xl'
                        : order.status === 'preparing'
                        ? isDark
                          ? 'border-emerald-500/40 bg-[#121215] text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                          : 'border-emerald-500/40 bg-white text-gray-900 shadow-xl'
                        : isDark
                        ? 'border-white/10 bg-[#121215] text-white'
                        : 'border-gray-200 bg-white text-gray-900 shadow-xl'
                    } p-5 backdrop-blur-xl ${viewMode === 'grid' ? 'w-full' : 'h-full'}`}
                  >
                    {/* Order Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                          {order.orderNumber || order.id || `ORD-${order._id?.slice(-6)}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="rounded-md bg-orange-500/20 text-orange-500 border border-orange-500/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            {order.orderType || 'DINE-IN'}
                          </span>
                          {order.tableNumber && (
                            <span className={`text-[10px] font-bold ${isDark ? 'text-white/80 bg-white/5 border-white/10' : 'text-gray-800 bg-gray-100 border-gray-300'} px-2.5 py-0.5 rounded-md border`}>
                              Table {order.tableNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Live Timer */}
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end text-emerald-500 font-mono font-black text-sm">
                          <Timer size={15} className="animate-pulse" />
                          <span>{formatElapsed(elapsedSec)}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 font-bold block mt-0.5">
                          IN PREP
                        </span>
                      </div>
                    </div>

                    {/* Target Progress Bar */}
                    <div className={`p-3 rounded-2xl border mb-4 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                        <span className={isDark ? 'text-white/40' : 'text-gray-600'}>Target: {targetMins} mins</span>
                        <span className="text-orange-500 font-black">{pctElapsed}% Elapsed</span>
                      </div>
                      <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${pctElapsed}%` }}
                        />
                      </div>
                    </div>

                    {/* Order Notes / Delivery Address Banner if present */}
                    {(order.notes || order.deliveryAddress) && (
                      <div className={`p-2.5 rounded-2xl border mb-3 text-[10px] space-y-1 ${isDark ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                        {order.deliveryAddress && (
                          <div className="font-bold flex items-center gap-1">
                            <span>📍 Delivery: {order.deliveryAddress}</span>
                          </div>
                        )}
                        {order.notes && (
                          <div className="italic flex items-center gap-1">
                            <AlertCircle size={11} className="shrink-0" />
                            <span>Kitchen Note: {order.notes}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Order Items Checkable List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-5 scrollbar-thin scrollbar-thumb-white/10 min-h-[140px]">
                      {order.items.map((item, i) => {
                        const itemKey = `${order._id}_${i}`;
                        const isChecked = Boolean(checkedItems[itemKey]);

                        return (
                          <div
                            key={i}
                            onClick={() => toggleItemCheck(order._id, i)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                              isChecked
                                ? isDark
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : isDark
                                ? 'bg-white/[0.03] border-white/5 hover:border-white/20 text-white'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-900'
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {isChecked ? (
                                <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/20" />
                              ) : (
                                <div className={`h-4 w-4 rounded-md border ${isDark ? 'border-white/20' : 'border-gray-400'}`} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold leading-snug truncate ${
                                isChecked ? 'line-through opacity-70' : isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                {item.quantity}x {item.name}
                              </p>
                              <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} font-medium`}>
                                Chef Recipe Standard
                              </p>
                              {item.notes && (
                                <p className="text-[10px] text-orange-400 mt-1 italic flex items-center gap-1 bg-orange-500/10 p-1 rounded border border-orange-500/20">
                                  <AlertCircle size={10} className="flex-shrink-0" /> {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action Button & Link */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'preparing')}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/30 hover:bg-orange-400 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Play size={14} fill="currentColor" />
                          <span>START PREPARATION</span>
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'ready')}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Check size={16} strokeWidth={3} />
                          <span>MARK READY</span>
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          onClick={() => updateOrderStatus(order._id, 'served')}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Check size={16} strokeWidth={3} />
                          <span>MARK SERVED</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel this order?')) {
                            updateOrderStatus(order._id, 'cancelled');
                          }
                        }}
                        className={`w-full py-1 text-[10px] font-black uppercase tracking-widest ${
                          isDark ? 'text-white/30 hover:text-rose-400' : 'text-gray-400 hover:text-rose-600'
                        } transition-colors cursor-pointer text-center block`}
                      >
                        CANCEL ORDER
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── KITCHEN INVENTORY SIDE DRAWER ── */}
      <AnimatePresence>
        {showMenuControl && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenuControl(false)}
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`fixed top-0 right-0 bottom-0 z-[1001] w-full max-w-md ${
                isDark ? 'bg-[#0e0e11] text-white border-white/10' : 'bg-white text-gray-900 border-gray-200'
              } border-l p-6 flex flex-col shadow-2xl`}
            >
              {/* Drawer Header */}
              <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <Boxes size={22} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>
                      Kitchen Inventory
                    </h2>
                    <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider mt-0.5`}>
                      Live Item Availability
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMenuControl(false)}
                  className={`p-2 rounded-2xl border ${
                    isDark ? 'border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  } transition-all`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Stat Summary Badges */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider opacity-70">In Stock</p>
                    <p className="text-lg font-black">{inStockCount}</p>
                  </div>
                  <CheckCircle2 size={20} className="opacity-80" />
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider opacity-70">Sold Out</p>
                    <p className="text-lg font-black">{soldOutCount}</p>
                  </div>
                  <ZapOff size={20} className="opacity-80" />
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={15} />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className={`w-full rounded-2xl border ${
                      isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'
                    } pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-orange-500/50 transition-all`}
                  />
                  {inventorySearch && (
                    <button onClick={() => setInventorySearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className={`flex gap-2 p-1 rounded-2xl border ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-100'} text-[10px] font-bold`}>
                  <button
                    onClick={() => setInventoryFilter('all')}
                    className={`flex-1 py-1.5 rounded-xl uppercase tracking-wider transition-all ${
                      inventoryFilter === 'all' ? 'bg-orange-500 text-white shadow' : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All ({dishes.length})
                  </button>
                  <button
                    onClick={() => setInventoryFilter('instock')}
                    className={`flex-1 py-1.5 rounded-xl uppercase tracking-wider transition-all ${
                      inventoryFilter === 'instock' ? 'bg-emerald-500 text-white shadow' : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    In Stock ({inStockCount})
                  </button>
                  <button
                    onClick={() => setInventoryFilter('soldout')}
                    className={`flex-1 py-1.5 rounded-xl uppercase tracking-wider transition-all ${
                      inventoryFilter === 'soldout' ? 'bg-rose-500 text-white shadow' : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sold Out ({soldOutCount})
                  </button>
                </div>
              </div>

              {/* Inventory Items List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {filteredInventoryDishes.length === 0 ? (
                  <div className={`text-center py-12 ${isDark ? 'text-white/30' : 'text-gray-500'} text-xs`}>
                    No items match your search filter.
                  </div>
                ) : (
                  filteredInventoryDishes.map(dish => {
                    const isInStock = dish.available !== false;

                    return (
                      <div
                        key={dish._id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          isInStock
                            ? isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'
                            : 'border-rose-500/30 bg-rose-950/10'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={dish.image?.startsWith('http') ? dish.image : `${API_BASE}${dish.image}`}
                            alt={dish.name}
                            className={`h-12 w-12 rounded-xl object-cover flex-shrink-0 shadow-md ${
                              isInStock ? '' : 'opacity-50 grayscale'
                            }`}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>{dish.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black uppercase text-orange-500 tracking-wider">
                                {dish.category}
                              </span>
                              <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-600'}`}>
                                ${dish.price?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleDishAvailability(dish._id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex-shrink-0 ${
                            isInStock
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                              : 'bg-rose-500 border border-rose-400/30 text-white hover:bg-rose-600'
                          }`}
                        >
                          {isInStock ? (
                            <>
                              <Zap size={13} className="fill-emerald-500" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <ZapOff size={13} />
                              <span>Sold Out</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
