import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Loader2,
  ChevronRight,
  Clock,
  Star,
  Bell,
  Search,
  MessageSquareHeart,
  X,
  Send,
  Utensils,
  HeartHandshake,
  Music2
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import AIUpsellWidget from './AIUpsellWidget';
import { getSocket } from '../utils/socket';
import { getCategoryImage } from '../utils/menuData';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function CustomerMenu() {
  const { tableNumber: paramTableNumber } = useParams();
  const [searchParams] = useSearchParams();
  const queryTableNumber = searchParams.get('table') || searchParams.get('tableNumber');
  const tableNumber = paramTableNumber || queryTableNumber || '1';
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // Review / Feedback State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    customerName: '',
    rating: 0,
    foodRating: 0,
    serviceRating: 0,
    ambianceRating: 0,
    comment: ''
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/menu`);
        setDishes(response.data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load menu');
        setLoading(false);
      }
    };
    fetchDishes();

    const socket = getSocket();
    if (socket) {
      socket.on('menu_updated', (updatedDish) => {
        setDishes(prev => prev.map(d => d._id === updatedDish._id ? updatedDish : d));
        if (updatedDish.available === false) {
          setCart(prev => prev.filter(item => item.dishId !== updatedDish._id));
          toast.error(`Notice: "${updatedDish.name}" was marked Sold Out`, { id: 'sold-out-socket' });
        }
      });

      return () => {
        socket.off('menu_updated');
      };
    }
  }, []);

  const categories = useMemo(() => ['all', ...new Set(dishes.map(d => d.category))], [dishes]);

  const filteredDishes = useMemo(() => {
    return dishes.filter(d => {
      const matchesCategory = activeCategory === 'all' || d.category === activeCategory;
      const matchesSearch = searchQuery.trim() === '' ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [dishes, activeCategory, searchQuery]);

  const addToCart = (dish) => {
    if (dish.available === false) {
      toast.error(`Sorry, ${dish.name} is currently Sold Out`, { id: 'sold-out-err' });
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.dishId === dish._id);
      if (existing) {
        return prev.map(item => item.dishId === dish._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { dishId: dish._id, name: dish.name, price: dish.price, quantity: 1, image: dish.image }];
    });
    toast.success(`${dish.name} added`, { duration: 1000, position: 'bottom-center' });
  };

  const updateQuantity = (dishId, delta) => {
    const targetDish = dishes.find(d => d._id === dishId);
    if (delta > 0 && targetDish && targetDish.available === false) {
      toast.error(`Sorry, ${targetDish.name} is Sold Out`, { id: 'sold-out-err' });
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.dishId === dishId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const callWaiter = async () => {
    try {
      await axios.post(`${API_BASE}/api/notifications/call-waiter`, { tableNumber });
      toast.success('A waiter has been called to your table.', {
        icon: '🔔',
        style: {
          background: '#1a1a1a',
          color: '#ff6b00',
          border: '1px solid #ff6b00'
        }
      });
    } catch (error) {
      toast.error('Failed to call waiter.');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (feedbackForm.rating === 0) {
      toast.error('Please tap to select your rating before submitting', { id: 'rating-req' });
      return;
    }
    setSubmittingFeedback(true);
    try {
      await axios.post(`${API_BASE}/api/reviews`, {
        orderNumber: `Table ${tableNumber}`,
        customerName: feedbackForm.customerName.trim() || `Table ${tableNumber} Guest`,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment,
        categoryRatings: {
          food: feedbackForm.foodRating || feedbackForm.rating,
          service: feedbackForm.serviceRating || feedbackForm.rating,
          ambiance: feedbackForm.ambianceRating || feedbackForm.rating
        }
      });
      toast.success('Thank you for your feedback! ⭐', { duration: 3000 });
      setFeedbackModalOpen(false);
      setFeedbackForm({
        customerName: '',
        rating: 0,
        foodRating: 0,
        serviceRating: 0,
        ambianceRating: 0,
        comment: ''
      });
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;

    for (const item of cart) {
      const liveDish = dishes.find(d => d._id === item.dishId);
      if (liveDish && liveDish.available === false) {
        toast.error(`Order failed: "${liveDish.name}" is Sold Out. Please remove it from your selection.`);
        setCart(prev => prev.filter(i => i.dishId !== item.dishId));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        tableNumber: Number(tableNumber),
        items: cart,
        subtotal,
        tax,
        totalAmount: total,
        orderType: 'dine-in',
        customerName: `Table ${tableNumber} Guest`,
        paymentMethod: 'unpaid',
        status: 'pending'
      };
      const res = await axios.post(`${API_BASE}/api/orders`, orderData);
      if (res.data.success === false) {
        toast.error(res.data.message || 'Failed to place order.');
        return;
      }
      setOrderConfirmed(true);
      setCart([]);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to place order. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#080808] text-white">
      <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Initializing Savory Menu</p>
    </div>
  );

  if (orderConfirmed) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#080808] p-8 text-center text-white">
      <div className="mb-8 rounded-full bg-emerald-500/10 p-6 text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
        <Check size={64} strokeWidth={3} />
      </div>
      <h1 className="text-4xl font-black italic tracking-tighter mb-4">ORDER CONFIRMED</h1>
      <p className="text-white/40 text-sm max-w-xs leading-relaxed">
        Your culinary journey for <span className="text-orange-500 font-bold">Table {tableNumber}</span> has begun. The kitchen has been notified.
      </p>

      <div className="mt-8 flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => setOrderConfirmed(false)}
          className="rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white/70 hover:bg-white/10 transition-all"
        >
          Order More
        </button>

        <button
          onClick={() => setFeedbackModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          <Star size={16} className="fill-black" />
          <span>Rate Experience</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-orange-500/30 pb-36">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080808]/90 p-4 md:p-6 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter leading-none text-white">SAVORY</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 uppercase tracking-wider">
                  Menu
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mt-1">Table {tableNumber}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setFeedbackModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500 hover:text-black active:scale-95 transition-all text-xs font-bold"
                title="Rate & Feedback"
              >
                <MessageSquareHeart size={18} />
                <span className="hidden sm:inline">Feedback</span>
              </button>

              <button
                onClick={callWaiter}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500 hover:text-white active:scale-95 transition-all text-xs font-bold"
                title="Call Waiter"
              >
                <Bell size={18} />
                <span className="hidden sm:inline">Call Waiter</span>
              </button>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40">
                <Clock size={18} />
              </div>
            </div>
          </div>

          {/* Search & Categories Bar */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide max-w-full">
              {categories.map(cat => {
                const catImg = getCategoryImage(cat, dishes);
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap h-10 px-4.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center justify-center gap-2.5 ${
                      activeCategory === cat
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {catImg && (
                      <img
                        src={catImg}
                        alt={cat}
                        className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
                      />
                    )}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Dish List - Equal Size Grid Cards */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        {filteredDishes.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-white/5 p-8">
            <p className="text-white/40 text-sm font-medium">No dishes found matching your selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredDishes.map(dish => {
              const isSoldOut = dish.available === false;
              const cartItem = cart.find(i => i.dishId === dish._id);

              return (
                <motion.div
                  key={dish._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group relative h-[190px] w-full overflow-hidden rounded-[26px] border p-3.5 transition-all duration-300 flex gap-4 ${
                    isSoldOut
                      ? 'border-rose-500/20 bg-rose-950/10 opacity-70'
                      : 'border-white/10 bg-[#121212] hover:border-orange-500/40 hover:bg-[#161616] hover:shadow-[0_12px_32px_rgba(249,115,22,0.1)]'
                  }`}
                >
                  {/* Fixed Size Image Thumbnail */}
                  <div className="relative h-full w-36 flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
                    <img
                      src={dish.image?.startsWith('http') ? dish.image : `${API_BASE}${dish.image}`}
                      alt={dish.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                    {dish.prepTime && !isSoldOut && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-bold text-orange-400">
                        <Clock size={11} />
                        <span>{dish.prepTime}</span>
                      </div>
                    )}

                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-2 text-center">
                        <span className="bg-rose-500 text-white font-black text-[9px] uppercase px-2 py-1 rounded-md tracking-wider shadow-lg border border-rose-400/30">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-bold text-orange-400/90 tracking-widest uppercase flex items-center gap-1 truncate">
                          <Star size={10} className="fill-orange-400 text-orange-400 flex-shrink-0" />
                          {dish.category || 'Special'}
                        </span>
                        {isSoldOut && (
                          <span className="text-[8px] font-bold text-rose-400 uppercase tracking-widest border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            Sold Out
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold tracking-tight text-white leading-snug truncate mb-1 group-hover:text-orange-400 transition-colors">
                        {dish.name}
                      </h3>

                      <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                        {dish.description}
                      </p>
                    </div>

                    {/* Bottom Price & Action Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-lg font-black text-orange-400">${dish.price.toFixed(2)}</span>

                      {isSoldOut ? (
                        <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider cursor-not-allowed">
                          Unavailable
                        </span>
                      ) : cartItem ? (
                        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1 border border-white/15 backdrop-blur-md">
                          <button
                            onClick={() => updateQuantity(dish._id, -1)}
                            className="h-6 w-6 flex items-center justify-center rounded-lg bg-black/50 text-white/80 hover:text-white hover:bg-black/80 transition-all"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold text-white w-4 text-center">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(dish._id, 1)}
                            className="h-6 w-6 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md shadow-orange-500/30"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(dish)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-xs hover:bg-orange-500 hover:text-white transition-all shadow-sm hover:shadow-orange-500/20 active:scale-95"
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-lg z-[60]"
          >
            <button
              onClick={placeOrder}
              disabled={isSubmitting}
              className="w-full flex items-center justify-between rounded-full bg-gradient-to-r from-orange-500 to-orange-600 p-4 pr-6 shadow-[0_15px_40px_rgba(249,115,22,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 border border-orange-400/30"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-black/20 backdrop-blur-md">
                  <ShoppingCart size={22} className="text-white" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-orange-600 border-2 border-orange-500 shadow">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/70 leading-none mb-1">Your Order</p>
                  <p className="text-lg font-black text-white leading-none">${total.toFixed(2)}</p>
                </div>
              </div>

              {isSubmitting ? (
                <Loader2 className="animate-spin text-white" size={22} />
              ) : (
                <div className="flex items-center gap-2 text-white bg-black/20 px-4 py-2 rounded-full border border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest">Confirm Order</span>
                  <ChevronRight size={18} />
                </div>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Review & Feedback Modal */}
      <AnimatePresence>
        {feedbackModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-xl bg-black/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-amber-500/30 bg-[#121215] p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.15)] text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <MessageSquareHeart size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight uppercase">Rate Your Experience</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Savory Dining Feedback</p>
                  </div>
                </div>

                <button
                  onClick={() => setFeedbackModalOpen(false)}
                  className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="space-y-5 text-xs">
                {/* Guest Name */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g., Guest @ Table ${tableNumber}`}
                    value={feedbackForm.customerName}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, customerName: e.target.value })}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                {/* Overall Star Rating */}
                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 text-center">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2 block">
                    Overall Experience Rating
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                        className="p-1 hover:scale-125 transition-transform"
                      >
                        <Star
                          size={30}
                          className={`${
                            star <= feedbackForm.rating
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                              : 'fill-[#1c1c22] text-white/20'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-2">
                    {feedbackForm.rating === 0
                      ? 'Tap stars to rate your experience'
                      : feedbackForm.rating === 5
                      ? '5 ★ Exceptional!'
                      : feedbackForm.rating === 4
                      ? '4 ★ Very Good'
                      : feedbackForm.rating === 3
                      ? '3 ★ Average'
                      : feedbackForm.rating === 2
                      ? '2 ★ Poor'
                      : '1 ★ Disappointed'}
                  </p>
                </div>

                {/* Category Ratings Grid */}
                <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                    Detailed Experience Ratings
                  </p>

                  {/* Food */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                      <Utensils size={13} /> Food Quality
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setFeedbackForm({ ...feedbackForm, foodRating: star })}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={16}
                            className={`${
                              star <= feedbackForm.foodRating
                                ? 'fill-orange-400 text-orange-400'
                                : 'fill-white/10 text-white/20'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Service */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <HeartHandshake size={13} /> Service Speed
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setFeedbackForm({ ...feedbackForm, serviceRating: star })}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={16}
                            className={`${
                              star <= feedbackForm.serviceRating
                                ? 'fill-emerald-400 text-emerald-400'
                                : 'fill-white/10 text-white/20'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ambiance */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                      <Music2 size={13} /> Ambiance
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setFeedbackForm({ ...feedbackForm, ambianceRating: star })}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={16}
                            className={`${
                              star <= feedbackForm.ambianceRating
                                ? 'fill-purple-400 text-purple-400'
                                : 'fill-white/10 text-white/20'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment Text Area */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
                    Feedback Comments
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you enjoyed or how we can improve..."
                    value={feedbackForm.comment}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white placeholder-white/30 outline-none focus:border-amber-500/50 transition-all resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFeedbackModalOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white/60 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {submittingFeedback ? (
                      <Loader2 size={16} className="animate-spin text-black" />
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
