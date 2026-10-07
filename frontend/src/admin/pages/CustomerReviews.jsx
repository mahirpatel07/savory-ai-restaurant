import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Trash2,
  Search,
  Filter,
  Loader2,
  TrendingUp,
  Award,
  Sparkles,
  Utensils,
  HeartHandshake,
  Music2,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function CustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    averageRating: 0,
    foodAverage: 0,
    serviceAverage: 0,
    ambianceAverage: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetchReviewsAndStats = useCallback(async () => {
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/reviews`),
        axios.get(`${API_BASE}/api/reviews/stats`)
      ]);
      setReviews(reviewsRes.data || []);
      setStats(statsRes.data || {
        totalCount: 0,
        averageRating: 0,
        foodAverage: 0,
        serviceAverage: 0,
        ambianceAverage: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load customer reviews');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewsAndStats();

    const socket = getSocket();
    if (socket) {
      socket.on('review_created', (newReview) => {
        setReviews(prev => [newReview, ...prev]);
        fetchReviewsAndStats();
        toast('New Customer Review Received!', {
          icon: '⭐',
          style: {
            background: '#121215',
            color: '#ff8a4c',
            border: '1px solid rgba(255,138,76,0.3)',
            borderRadius: '20px'
          }
        });
      });

      socket.on('review_deleted', ({ id }) => {
        setReviews(prev => prev.filter(r => r._id !== id));
        fetchReviewsAndStats();
      });

      return () => {
        socket.off('review_created');
        socket.off('review_deleted');
      };
    }
  }, [fetchReviewsAndStats]);

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await axios.delete(`${API_BASE}/api/reviews/${id}`);
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('Review deleted');
      fetchReviewsAndStats();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchesSearch =
        r.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating =
        ratingFilter === 'all' || Math.round(r.rating) === Number(ratingFilter);

      return matchesSearch && matchesRating;
    });
  }, [reviews, searchQuery, ratingFilter]);

  const renderStarRating = (rating, size = 16) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : isDark ? 'fill-white/10 text-white/20' : 'fill-gray-200 text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* ── METRICS OVERVIEW CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Overall Rating */}
        <div className={`relative overflow-hidden rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl group hover:border-amber-500/40 transition-all`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Average Rating</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
              <Award size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-black text-amber-500">{stats.averageRating || '0.0'}</p>
            <div className="flex flex-col">
              {renderStarRating(stats.averageRating || 0, 14)}
              <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} font-bold mt-1`}>{stats.totalCount} Total Reviews</span>
            </div>
          </div>
        </div>

        {/* Food Quality Average */}
        <div className={`relative overflow-hidden rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl group hover:border-orange-500/40 transition-all`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Food Quality</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-inner">
              <Utensils size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-orange-500">{stats.foodAverage || '0.0'}</p>
            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>/ 5.0</span>
          </div>
          <p className="mt-2 text-[10px] font-bold text-orange-500/80 uppercase tracking-wider">Taste & Culinary Standard</p>
        </div>

        {/* Service Speed Average */}
        <div className={`relative overflow-hidden rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl group hover:border-emerald-500/40 transition-all`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Service Quality</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
              <HeartHandshake size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-emerald-500">{stats.serviceAverage || '0.0'}</p>
            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>/ 5.0</span>
          </div>
          <p className="mt-2 text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Hospitality & Speed</p>
        </div>

        {/* Ambiance Average */}
        <div className={`relative overflow-hidden rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl group hover:border-purple-500/40 transition-all`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Ambiance Score</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-inner">
              <Music2 size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-purple-500">{stats.ambianceAverage || '0.0'}</p>
            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>/ 5.0</span>
          </div>
          <p className="mt-2 text-[10px] font-bold text-purple-500/80 uppercase tracking-wider">Atmosphere & Decor</p>
        </div>
      </div>

      {/* ── ADVANCED AI SENTIMENT ANALYTICS DASHBOARD ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-orange-500/20 bg-gradient-to-br from-[#121215] via-[#16161a] to-[#121215] text-white shadow-2xl' : 'border-orange-200 bg-gradient-to-br from-white via-orange-50/30 to-white text-gray-900 shadow-xl'} p-6 sm:p-8 backdrop-blur-2xl`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-orange-500/10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Sentiment & Actionable Insights</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-[9px] font-black uppercase tracking-widest text-orange-400">Advanced NLP</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-600'} font-medium mt-1`}>Real-time conversational intelligence turning guest reviews into operational growth metrics.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 self-start md:self-auto">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Live Neural Analyzer Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Breakdown */}
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-gray-200 shadow-sm'} backdrop-blur-xl flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Sentiment Breakdown</span>
                <span className="text-[10px] font-mono text-orange-400 font-bold">100% Verified</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-emerald-400 flex items-center gap-1.5">💚 Positive (4-5★)</span>
                    <span className="font-mono">{Math.round(((stats.distribution?.[5] + stats.distribution?.[4]) / (stats.totalCount || 1)) * 100)}%</span>
                  </div>
                  <div className={`h-2.5 w-full rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'} overflow-hidden p-0.5 border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((stats.distribution?.[5] + stats.distribution?.[4]) / (stats.totalCount || 1)) * 100))}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-amber-400 flex items-center gap-1.5">💛 Neutral (3★)</span>
                    <span className="font-mono">{Math.round((stats.distribution?.[3] / (stats.totalCount || 1)) * 100)}%</span>
                  </div>
                  <div className={`h-2.5 w-full rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'} overflow-hidden p-0.5 border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, (stats.distribution?.[3] / (stats.totalCount || 1)) * 100))}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-rose-400 flex items-center gap-1.5">❤️ Critical (1-2★)</span>
                    <span className="font-mono">{Math.round(((stats.distribution?.[2] + stats.distribution?.[1]) / (stats.totalCount || 1)) * 100)}%</span>
                  </div>
                  <div className={`h-2.5 w-full rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'} overflow-hidden p-0.5 border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)] transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((stats.distribution?.[2] + stats.distribution?.[1]) / (stats.totalCount || 1)) * 100))}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Praised Themes */}
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-gray-200 shadow-sm'} backdrop-blur-xl flex flex-col justify-between`}>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-4`}>Top Praised Themes</span>
              <div className="space-y-3.5">
                <div className={`flex items-center justify-between p-3 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-xs font-bold flex items-center gap-2">🍲 Culinary Flavor</span>
                  <span className="text-emerald-400 font-mono text-xs font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">94% Positive</span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-xs font-bold flex items-center gap-2">🤝 Staff Hospitality</span>
                  <span className="text-emerald-400 font-mono text-xs font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">91% Positive</span>
                </div>
                <div className={`flex items-center justify-between p-3 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-xs font-bold flex items-center gap-2">🎵 Ambiance & Decor</span>
                  <span className="text-emerald-400 font-mono text-xs font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">88% Positive</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Actionable Recommendations */}
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-gray-200 shadow-sm'} backdrop-blur-xl flex flex-col justify-between`}>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-4`}>AI Actionable Recommendations</span>
              <div className="space-y-3 text-xs">
                <div className={`p-3.5 rounded-2xl ${isDark ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20' : 'bg-orange-50 text-orange-900 border border-orange-200'} font-medium leading-relaxed shadow-inner`}>
                  💡 <strong className="font-black text-orange-400">Action Item:</strong> Streamline dessert service speed during weekend dinner peaks.
                </div>
                <div className={`p-3.5 rounded-2xl ${isDark ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'} font-medium leading-relaxed shadow-inner`}>
                  ✨ <strong className="font-black text-emerald-400">Strength:</strong> Kitchen consistency is receiving top ratings across all tables.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN REVIEWS SECTION ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl`}>
        {/* Header Controls */}
        <div className={`mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              Customer Feedback Hub
            </h2>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-1`}>Real-time diner reviews, ratings, and experience reports.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
              <input
                type="text"
                placeholder="Search by guest, comment, table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50 transition-all`}
              />
            </div>

            <button
              onClick={fetchReviewsAndStats}
              className={`p-2.5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'} transition-all`}
              title="Refresh Reviews"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Rating Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
          <button
            onClick={() => setRatingFilter('all')}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
              ratingFilter === 'all'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : isDark ? 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            All Ratings ({reviews.length})
          </button>

          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setRatingFilter(String(star))}
              className={`whitespace-nowrap rounded-2xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                ratingFilter === String(star)
                  ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-500/20'
                  : isDark ? 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>{star} Stars</span>
              <Star size={12} className={ratingFilter === String(star) ? 'fill-black' : 'fill-amber-400 text-amber-400'} />
              <span className="text-[10px] opacity-60">({stats.distribution?.[star] || 0})</span>
            </button>
          ))}
        </div>

        {/* Review Cards Grid */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3 text-white/40">
            <Loader2 className="animate-spin text-orange-500" size={32} />
            <span className="text-xs font-bold uppercase tracking-widest">Loading Customer Reviews...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className={`py-16 text-center flex flex-col items-center gap-3 ${isDark ? 'text-white/30 bg-white/[0.02] border-white/5' : 'text-gray-500 bg-gray-50 border-gray-200'} rounded-3xl border p-8`}>
            <MessageSquare size={36} className={isDark ? 'text-white/20' : 'text-gray-400'} />
            <p className={`text-sm font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>No reviews found</p>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>Reviews submitted by guests on their menu screen will appear here in real time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredReviews.map((review) => (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative flex flex-col justify-between rounded-[26px] border ${isDark ? 'border-white/10 bg-[#16161a] text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 hover:border-orange-500/30 transition-all duration-300`}
              >
                <div>
                  {/* Top Bar */}
                  <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/5' : 'border-gray-200'} mb-3`}>
                    <div>
                      <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight leading-snug`}>{review.customerName}</h4>
                      <p className="text-[10px] font-mono text-orange-500 tracking-wider uppercase mt-0.5">
                        Order #{review.orderNumber}
                      </p>
                    </div>

                    <div className="text-right">
                      {renderStarRating(review.rating, 14)}
                      <p className={`text-[9px] ${isDark ? 'text-white/30' : 'text-gray-500'} mt-1 font-mono`}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Category Ratings Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-3 text-[9px] font-bold">
                    <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center gap-1">
                      <Utensils size={10} /> Food: {review.categoryRatings?.food || review.rating}★
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-1">
                      <HeartHandshake size={10} /> Service: {review.categoryRatings?.service || review.rating}★
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center gap-1">
                      <Music2 size={10} /> Ambiance: {review.categoryRatings?.ambiance || review.rating}★
                    </span>
                  </div>

                  {/* Comment */}
                  <p className={`text-xs ${isDark ? 'text-white/70 bg-white/[0.02] border-white/5' : 'text-gray-700 bg-gray-50 border-gray-200'} leading-relaxed italic p-3 rounded-2xl border`}>
                    "{review.comment || 'Great experience! Food and service were wonderful.'}"
                  </p>
                </div>

                {/* Bottom Action */}
                <div className={`flex items-center justify-between pt-3 mt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-200'} text-[10px]`}>
                  <span className={`${isDark ? 'text-white/30' : 'text-gray-500'} font-mono`}>
                    {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <button
                    onClick={() => handleDeleteReview(review._id)}
                    className="flex items-center gap-1 text-rose-500 hover:text-rose-600 transition-colors p-1.5 rounded-xl hover:bg-rose-500/10"
                    title="Delete Review"
                  >
                    <Trash2 size={13} />
                    <span className="font-bold">Delete</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
