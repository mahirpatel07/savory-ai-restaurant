import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  Bell,
  Phone,
  ArrowRight,
  Trash2,
  Search,
  Sparkles,
  Send,
  Tv,
  RefreshCw,
  AlertCircle,
  X,
  Loader2,
  Check,
  UserCheck,
  UserX,
  Timer,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function DigitalWaitlist() {
  const [waitlist, setWaitlist] = useState([]);
  const [stats, setStats] = useState({
    waitingCount: 0,
    seatedCount: 0,
    cancelledCount: 0,
    totalToday: 0,
    avgWaitMinutes: 15
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setWaitlistFilterStatus] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    partySize: 2,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWaitlistAndStats = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/waitlist`),
        axios.get(`${API_BASE}/api/waitlist/stats`)
      ]);
      setWaitlist(listRes.data || []);
      setStats(statsRes.data || { waitingCount: 0, seatedCount: 0, cancelledCount: 0, totalToday: 0, avgWaitMinutes: 15 });
      setLoading(false);
    } catch (error) {
      console.error('Waitlist fetch error:', error);
      toast.error('Failed to load waitlist data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitlistAndStats();

    const socket = getSocket();
    if (socket) {
      socket.on('waitlist_updated', () => {
        fetchWaitlistAndStats();
      });

      socket.on('waitlist_notified', (item) => {
        toast(`Notified Token #${item.tokenNumber} (${item.name})`, {
          icon: '🔔',
          style: {
            background: '#121215',
            color: '#38bdf8',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: '20px'
          }
        });
      });

      return () => {
        socket.off('waitlist_updated');
        socket.off('waitlist_notified');
      };
    }
  }, [fetchWaitlistAndStats]);

  const handleAddParty = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone number are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/api/waitlist`, formData);
      if (res.data?.success) {
        toast.success(`Token #${res.data.item.tokenNumber} assigned to ${res.data.item.name}`);
        setModalOpen(false);
        setFormData({ name: '', phone: '', partySize: 2, notes: '' });
        fetchWaitlistAndStats();
      }
    } catch (error) {
      toast.error('Failed to add party to waitlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_BASE}/api/waitlist/${id}/status`, { status: newStatus });
      toast.success(`Token status marked as ${newStatus}`);
      fetchWaitlistAndStats();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Remove this entry from waitlist?')) return;
    try {
      await axios.delete(`${API_BASE}/api/waitlist/${id}`);
      toast.success('Waitlist entry deleted');
      fetchWaitlistAndStats();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const getTimeElapsed = (createdAt) => {
    const minutes = Math.floor((new Date() - new Date(createdAt)) / 60000);
    return Math.max(0, minutes);
  };

  const filteredWaitlist = useMemo(() => {
    return waitlist.filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        String(item.tokenNumber).includes(searchQuery);

      if (filterStatus === 'active') {
        return matchesSearch && ['waiting', 'notified'].includes(item.status);
      }
      if (filterStatus === 'seated') {
        return matchesSearch && item.status === 'seated';
      }
      if (filterStatus === 'cancelled') {
        return matchesSearch && item.status === 'cancelled';
      }
      return matchesSearch;
    });
  }, [waitlist, searchQuery, filterStatus]);

  const currentlyNotified = useMemo(() => {
    return waitlist.filter(i => i.status === 'notified');
  }, [waitlist]);

  const nextWaiting = useMemo(() => {
    return waitlist.filter(i => i.status === 'waiting');
  }, [waitlist]);

  // Render Kiosk Mode (Public Lobby Display Screen)
  if (kioskMode) {
    return (
      <div className="fixed inset-0 z-[2000] bg-[#060608] text-white p-8 sm:p-12 flex flex-col justify-between font-sans">
        {/* Kiosk Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-2xl text-black font-black shadow-[0_0_30px_rgba(249,115,22,0.4)]">
              🍽
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter">SAVORY DIGITAL WAITLIST</h1>
              <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mt-1">Smart Lobby Queue Display</p>
            </div>
          </div>

          <button
            onClick={() => setKioskMode(false)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <X size={16} /> Exit Kiosk View
          </button>
        </div>

        {/* Kiosk Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8 flex-1">
          {/* NOW CALLING / READY TO SEAT */}
          <div className="rounded-[36px] border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-[#0e0e12] p-8 shadow-[0_0_80px_rgba(0,242,254,0.15)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-black text-sm uppercase tracking-widest mb-6">
                <Bell size={20} className="animate-bounce text-cyan-400" />
                <span>NOW CALLING / READY TO BE SEATED</span>
              </div>

              {currentlyNotified.length === 0 ? (
                <div className="py-12 text-center text-white/30 font-mono">
                  <p className="text-xl font-bold">No active calls right now</p>
                  <p className="text-xs mt-2">Next available table will be called shortly.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentlyNotified.map(item => (
                    <div key={item._id} className="flex items-center justify-between p-6 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-white shadow-xl animate-pulse">
                      <div>
                        <span className="text-4xl font-black text-cyan-400 font-mono">#{item.tokenNumber}</span>
                        <h3 className="text-2xl font-bold mt-1">{item.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="px-4 py-2 rounded-2xl bg-cyan-500 text-black text-sm font-black uppercase tracking-widest shadow">
                          {item.partySize} Guests
                        </span>
                        <p className="text-xs text-cyan-300/80 mt-2 font-mono">Please Proceed to Host Counter</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/40 font-mono">
              <span>Avg Wait Time: ~{stats.avgWaitMinutes} Minutes</span>
              <span>Updated Live via Savory AI Engine</span>
            </div>
          </div>

          {/* UPCOMING WAITING QUEUE */}
          <div className="rounded-[36px] border border-white/10 bg-[#0e0e12] p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-orange-400 font-black text-sm uppercase tracking-widest">
                  <Clock size={20} />
                  <span>UPCOMING IN QUEUE ({nextWaiting.length})</span>
                </div>
                <span className="text-xs font-mono text-white/40">Tokens Waiting</span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin">
                {nextWaiting.slice(0, 6).map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 font-mono">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black text-orange-400">#{item.tokenNumber}</span>
                      <div>
                        <p className="text-base font-bold text-white">{item.name}</p>
                        <p className="text-xs text-white/40">{item.partySize} Guests</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white/50 bg-white/5 px-3 py-1 rounded-xl">
                      ~{item.estimatedWait} min wait
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center pt-4 border-t border-white/10 text-xs text-white/30 font-mono">
              Please watch this screen for your token number notification.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans pb-12">
      <Toaster position="top-right" />

      {/* ── METRICS OVERVIEW ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Waiting Queue Size */}
        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#121215]/90 p-6 shadow-xl backdrop-blur-xl group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Active Queue</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-amber-400">{stats.waitingCount}</p>
            <span className="text-[10px] font-bold text-amber-400/80 uppercase">Parties Waiting</span>
          </div>
          <p className="mt-2 text-[10px] font-bold text-white/30 uppercase tracking-wider">
            {stats.totalToday} total registrations today
          </p>
        </div>

        {/* Avg Smart Wait Estimate */}
        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#121215]/90 p-6 shadow-xl backdrop-blur-xl group hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Est. Wait Time</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-inner">
              <Timer size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-orange-400">~{stats.avgWaitMinutes}</p>
            <span className="text-[10px] font-bold text-orange-400/80 uppercase">Minutes</span>
          </div>
          <p className="mt-2 text-[10px] font-bold text-orange-400/60 uppercase tracking-wider">AI Queue Turnaround Estimate</p>
        </div>

        {/* Seated Today */}
        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#121215]/90 p-6 shadow-xl backdrop-blur-xl group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Seated Today</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <UserCheck size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">{stats.seatedCount}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Parties Accommodated</p>
        </div>

        {/* Actions Hub */}
        <div className="flex flex-col gap-2.5 justify-center rounded-[26px] border border-white/10 bg-[#121215]/90 p-5 backdrop-blur-xl">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 px-4 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus size={18} />
            <span>Add Party To Queue</span>
          </button>

          <button
            onClick={() => setKioskMode(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Tv size={14} className="text-cyan-400" />
            <span>Open Kiosk Display</span>
          </button>
        </div>
      </div>

      {/* ── MAIN QUEUE SECTION ── */}
      <div className="rounded-[32px] border border-white/10 bg-[#121215]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
        {/* Header Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setWaitlistFilterStatus('active')}
              className={`whitespace-nowrap rounded-2xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterStatus === 'active'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              Active Queue ({stats.waitingCount})
            </button>
            <button
              onClick={() => setWaitlistFilterStatus('all')}
              className={`whitespace-nowrap rounded-2xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Today ({stats.totalToday})
            </button>
            <button
              onClick={() => setWaitlistFilterStatus('seated')}
              className={`whitespace-nowrap rounded-2xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterStatus === 'seated'
                  ? 'bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              Seated ({stats.seatedCount})
            </button>
            <button
              onClick={() => setWaitlistFilterStatus('cancelled')}
              className={`whitespace-nowrap rounded-2xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterStatus === 'cancelled'
                  ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/20'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              Cancelled ({stats.cancelledCount})
            </button>
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input
                type="text"
                placeholder="Search token, guest name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 outline-none focus:border-orange-500/50 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={fetchWaitlistAndStats}
              className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Live Queue Cards Grid */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3 text-white/40">
            <Loader2 className="animate-spin text-orange-500" size={32} />
            <span className="text-xs font-bold uppercase tracking-widest">Loading Live Waitlist...</span>
          </div>
        ) : filteredWaitlist.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3 text-white/30 bg-white/[0.02] rounded-3xl border border-white/5 p-8">
            <Users size={36} className="text-white/20" />
            <p className="text-sm font-bold text-white/70">No queue entries found</p>
            <p className="text-xs text-white/40">Click <span className="text-orange-400 font-bold">"Add Party To Queue"</span> to register walk-in guests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredWaitlist.map((item) => {
              const elapsedMin = getTimeElapsed(item.createdAt);
              const isNotified = item.status === 'notified';
              const isSeated = item.status === 'seated';
              const isCancelled = item.status === 'cancelled';

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group relative flex flex-col justify-between rounded-[28px] border p-5 shadow-xl transition-all duration-300 ${
                    isNotified
                      ? 'border-cyan-500/50 bg-gradient-to-br from-cyan-950/30 to-[#121215] shadow-[0_0_30px_rgba(0,242,254,0.12)]'
                      : isSeated
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : isCancelled
                      ? 'border-rose-500/20 bg-rose-950/10 opacity-60'
                      : 'border-white/10 bg-[#16161a] hover:border-orange-500/40'
                  }`}
                >
                  <div>
                    {/* Token & Status Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xl font-black font-mono px-3.5 py-1.5 rounded-2xl border flex-shrink-0 ${
                          isNotified
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        }`}>
                          #{item.tokenNumber}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-white tracking-tight leading-snug truncate">{item.name}</h4>
                          <p className="text-[10px] font-mono text-white/40 flex items-center gap-1 mt-0.5 truncate">
                            <Phone size={10} /> {item.phone}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                          isNotified
                            ? 'bg-cyan-500 text-black border-cyan-400 animate-pulse'
                            : isSeated
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : isCancelled
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {item.status}
                        </span>
                        <p className="text-[10px] font-mono text-white/40 mt-1">
                          {elapsedMin}m in queue
                        </p>
                      </div>
                    </div>

                    {/* Party Details */}
                    <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5 text-xs font-mono mb-3">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-orange-400" />
                        <span className="font-bold text-white">{item.partySize} Guests</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/50">
                        <Clock size={12} />
                        <span>Est: ~{item.estimatedWait}m</span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-white/60 italic bg-white/5 p-2.5 rounded-xl border border-white/5 mb-3">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    {item.status === 'waiting' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleUpdateStatus(item._id, 'notified')}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold text-xs hover:bg-cyan-500 hover:text-black transition-all active:scale-95 cursor-pointer"
                        >
                          <Bell size={13} />
                          <span>Notify Guest</span>
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(item._id, 'seated')}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95 cursor-pointer"
                        >
                          <UserCheck size={13} />
                          <span>Seat Party</span>
                        </button>
                      </div>
                    )}

                    {item.status === 'notified' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleUpdateStatus(item._id, 'seated')}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black uppercase text-xs tracking-wider shadow-lg shadow-emerald-500/25 hover:opacity-95 transition-all active:scale-95 cursor-pointer"
                        >
                          <UserCheck size={16} />
                          <span>Confirm Seated</span>
                        </button>

                        <div className="flex items-center justify-between text-[10px] pt-1">
                          <button
                            onClick={() => handleUpdateStatus(item._id, 'cancelled')}
                            className="text-rose-400/80 hover:text-rose-300 font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Mark Cancelled / No-Show
                          </button>

                          <button
                            onClick={() => handleDeleteEntry(item._id)}
                            className="text-white/30 hover:text-white cursor-pointer"
                            title="Delete Entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                    {['seated', 'cancelled'].includes(item.status) && (
                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="text-white/40 uppercase font-bold tracking-wider">
                          Status: {item.status}
                        </span>

                        <button
                          onClick={() => handleDeleteEntry(item._id)}
                          className="text-white/30 hover:text-white cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ADD PARTY MODAL ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-xl bg-black/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-orange-500/30 bg-[#121215] p-6 sm:p-8 shadow-[0_0_80px_rgba(249,115,22,0.15)] text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight uppercase">Add Guest to Waitlist</h2>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Smart Queue Token System</p>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddParty} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-400/80 mb-1.5 block">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Alex Morgan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl bg-black/50 border border-white/15 px-4 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-orange-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
                    Phone Number (SMS Notifications)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g., +1 (555) 234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-2xl bg-black/50 border border-white/15 px-4 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-orange-500 transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
                      Party Size (Guests)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={formData.partySize}
                      onChange={(e) => setFormData({ ...formData, partySize: Number(e.target.value) })}
                      className="w-full rounded-2xl bg-black/50 border border-white/15 px-4 py-3 text-xs text-white outline-none focus:border-orange-500 transition-all font-mono"
                    />
                  </div>

                  <div className="bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20 text-center flex flex-col justify-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-orange-400">AI Est. Wait</span>
                    <span className="text-lg font-black text-white">~{Math.max(10, (stats.waitingCount * 10) + (formData.partySize > 4 ? 15 : 0))} min</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
                    Special Seating Preferences / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., High chair needed / Booth preferred"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-2xl bg-black/50 border border-white/15 px-4 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-orange-500 transition-all"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white/60 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin text-black" />
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>Assign Token & Add</span>
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
