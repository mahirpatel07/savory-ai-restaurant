import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Info, Plus, Compass, RefreshCw,
  Scissors, Trash2, Edit2, CheckCircle2,
  X, ZoomIn, ZoomOut, Check, Grid, Link as LinkIcon, Search, QrCode,
  ArrowRightLeft, ShoppingCart, Clock, Layers
} from 'lucide-react';

import { useReservation } from '../../context/ReservationContext';
import { useTheme } from '../../context/ThemeContext';
import CountUpPkg from 'react-countup';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ReservationHoverCard from '../components/ReservationHoverCard';
import CombineModeToolbar from '../components/CombineModeToolbar';
import CombineConfirmationModal from '../components/CombineConfirmationModal';

const CountUp = CountUpPkg.default || CountUpPkg;

const getOccupancyDuration = (createdAt) => {
  if (!createdAt) return null;
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(1, Math.floor(elapsedMs / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
};

const TableCard = React.memo(({
  table,
  isCombineMode,
  isSelected,
  cleaningTimeLeft,
  activeOrder,
  onHover,
  onUnhover,
  onClick,
  getStatusBadgeStyles,
  isDark
}) => {
  const isSelectable = isCombineMode && table.status === 'available';
  const isDisabled = isCombineMode && !isSelectable && !isSelected;

  return (
    <motion.div
      layout
      id={`table-card-${table.tableNumber}`}
      onMouseEnter={(e) => !isDisabled && onHover(e, table)}
      onMouseLeave={onUnhover}
      onClick={() => !isDisabled && onClick(table)}
      className={`relative cursor-pointer overflow-hidden rounded-[24px] border ${
        isDark ? 'bg-[rgba(19,19,22,0.85)] text-white' : 'bg-white text-gray-900 shadow-md'
      } p-5 backdrop-blur-xl transition-all duration-300 ${
        isSelected
          ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)] ring-1 ring-orange-500/50'
          : isDisabled
            ? 'opacity-30 grayscale cursor-not-allowed border-white/5'
            : isDark ? 'border-white/10 hover:border-primary/40' : 'border-gray-200 hover:border-orange-500/40'
      }`}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute right-4 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-black shadow-lg"
        >
          <Check size={16} strokeWidth={4} />
        </motion.div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h4 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
            {table.isCombined ? table.combinedName : `Table ${table.tableNumber}`}
          </h4>
          {table.isCombined && (
            <span className={`text-[9px] font-black ${isDark ? 'text-white/30' : 'text-gray-500'} uppercase tracking-[0.15em] mt-0.5 flex items-center gap-1`}>
              <LinkIcon size={8} /> {table.combinedMembers?.length} Units Linked
            </span>
          )}
        </div>
        <div className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${getStatusBadgeStyles(table.status, table.isCombined)}`}>
          {table.status}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'} border`}>
            <Users size={12} className={isDark ? 'text-white/40' : 'text-gray-500'} />
          </div>
          <span className={`text-xs font-black ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{table.seats} Seats</span>
        </div>
        <div className={`h-4 w-px ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
        <span className={`text-[10px] ${isDark ? 'text-white/20' : 'text-gray-500'} font-black uppercase tracking-widest`}>{table.zone}</span>
      </div>

      {table.status === 'reserved' && (
        <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs">
          <div className="text-[8px] font-black uppercase tracking-widest text-orange-500/50 mb-2">Active Booking</div>
          <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>👤 {table.currentReservation?.name || table.reservedBy || 'Guest'}</div>
          <div className={`mt-1 text-[10px] ${isDark ? 'text-white/40' : 'text-gray-600'} font-bold`}>🕒 {table.currentReservation?.time || table.reservationTime || 'Pending'}</div>
        </div>
      )}

      {table.status === 'occupied' && (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-rose-500/50">In Service</span>
            {activeOrder?.createdAt && (
              <span className="text-[9px] font-bold text-rose-400 font-mono">
                🕒 {getOccupancyDuration(activeOrder.createdAt)}
              </span>
            )}
          </div>
          <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>👤 {table.currentReservation?.name || table.reservedBy || activeOrder?.customerName || 'Dining Guest'}</div>
          {activeOrder ? (
            <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-tight">{activeOrder.orderNumber}</span>
                <span className={`text-[10px] ${isDark ? 'text-white' : 'text-gray-900'} font-bold`}>${activeOrder.totalAmount.toFixed(2)}</span>
            </div>
          ) : (
            <div className={`mt-1 text-[10px] ${isDark ? 'text-white/40' : 'text-gray-600'} font-bold`}>Dining in progress</div>
          )}
        </div>
      )}

      {table.status === 'cleaning' && (
        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-sky-500/50">Sanitization</span>
            <span className="font-mono text-sky-500 font-black">{cleaningTimeLeft || 60}s</span>
          </div>
          <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-200'} overflow-hidden`}>
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${((cleaningTimeLeft || 60) / 60) * 100}%` }}
              transition={{ duration: 1, ease: 'linear' }}
              className="h-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
            />
          </div>
        </div>
      )}

      {table.isCombined && (
        <div className="absolute bottom-2 right-4">
           <span className={`text-[7px] font-black ${isDark ? 'text-white/10' : 'text-gray-400'} uppercase tracking-[0.3em]`}>Combined Unit</span>
        </div>
      )}
    </motion.div>
  );
});

export default function TableManagement() {
  const navigate = useNavigate();
  const {
    tables,
    updateReservation,
    addTableBackend, updateTableBackend, deleteTableBackend,
    mergeTablesBackend, splitTableBackend, transferOrderTableBackend,
    isRefreshing, refreshData, activeOrders
  } = useReservation();

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [viewMode, setViewMode] = useState('grid');
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isLayoutEdit] = useState(false);
  const [, setLocalLayout] = useState([]);
  const [isCombineMode, setIsCombineMode] = useState(false);
  const [selectedCombineIds, setSelectedCombineIds] = useState([]);
  const [cleaningTimers, setCleaningTimers] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [qrModal, setQrModal] = useState(null);

  // Status Action Handlers
  const handleTableAction = async (action) => {
    if (!selectedTable) return;
    const tableNum = selectedTable.tableNumber;
    const reservationId = selectedTable.currentReservation?._id || selectedTable.currentReservation?.id;

    try {
      if (action === 'check-in') {
        if (reservationId) {
          const res = await updateReservation(reservationId, { status: 'checked-in' });
          if (res.success) {
            toast.success(`Table T${tableNum} checked in`);
            setSelectedTable(null);
          }
        }
      } else if (action === 'cleaning') {
        if (reservationId) {
          const res = await updateReservation(reservationId, { status: 'completed' });
          if (res.success) {
            toast.success(`Table T${tableNum} is now being cleaned`);
            setSelectedTable(null);
          }
        } else {
          await updateTableBackend(tableNum, { status: 'cleaning' });
          toast.success(`Table T${tableNum} is now being cleaned`);
          setSelectedTable(null);
        }
      } else if (action === 'completed') {
        await updateTableBackend(tableNum, { status: 'available' });
        toast.success(`Table T${tableNum} is now available`);
        setSelectedTable(null);
      } else if (action === 'cancelled') {
        if (reservationId) {
          const res = await updateReservation(reservationId, { status: 'cancelled' });
          if (res.success) {
            toast.success(`Reservation for table T${tableNum} cancelled`);
            setSelectedTable(null);
          }
        }
      }
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleConfirmTransferOrder = async (targetTableNumber) => {
    if (!selectedTable) return;
    const res = await transferOrderTableBackend(selectedTable.tableNumber, targetTableNumber);
    if (res.success) {
      toast.success(`Transferred order from Table T${selectedTable.tableNumber} to Table T${targetTableNumber}`);
      setShowTransferModal(false);
      setSelectedTable(null);
    } else {
      toast.error(res.message || 'Failed to transfer order');
    }
  };

  // Hover card state
  const [hoveredTable, setHoveredTable] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const prevTableStatuses = useRef({});
  const gridRef = useRef(null);

  const [addForm, setAddForm] = useState({
    tableNumber: '', seats: '4', zone: 'Indoor', indoor: true, outdoor: false,
    vip: false, window: false, family: false, bar: false, status: 'available', notes: ''
  });

  const [editForm, setEditForm] = useState({
    tableNumber: '', seats: '', zone: '', indoor: true, outdoor: false,
    vip: false, window: false, family: false, bar: false, status: '', notes: ''
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCleaningTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((num) => {
          if (next[num] <= 1) {
            delete next[num];
            changed = true;
            updateTableBackend(num, { status: 'available' });
          } else {
            next[num] -= 1;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [updateTableBackend]);

  useEffect(() => {
    if (tables && tables.length > 0) {
      setLocalLayout(tables.map(t => ({ tableNumber: t.tableNumber, posX: t.posX || 100, posY: t.posY || 100 })));

      tables.forEach((t) => {
        const prevStatus = prevTableStatuses.current[t.tableNumber];
        if (prevStatus && prevStatus !== t.status) {
          const el = document.getElementById(`table-card-${t.tableNumber}`);
          if (el) {
            gsap.fromTo(el,
              { scale: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' },
              { scale: 1.05, backgroundColor: 'rgba(255, 122, 69, 0.2)', duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.out' }
            );
          }
        }
        prevTableStatuses.current[t.tableNumber] = t.status;

        if (t.status === 'cleaning' && !cleaningTimers[t.tableNumber]) {
          setCleaningTimers(prev => ({
            ...prev,
            [t.tableNumber]: prev[t.tableNumber] || Math.floor(Math.random() * 30) + 30
          }));
        }
      });
    }
  }, [tables, cleaningTimers, isDark]);

  useEffect(() => {
    if (gridRef.current?.children && gridRef.current.children.length > 0) {
      const gridChildren = Array.from(gridRef.current.children);
      gsap.fromTo(gridChildren,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.5, ease: 'power2.out', overwrite: 'auto' }
      );
    }
  }, [activeTab, viewMode]);

  const handleHover = useCallback((e, table) => {
    if (table.status === 'reserved' || table.status === 'occupied') {
      setHoveredTable(table);
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleUnhover = useCallback(() => {
    setHoveredTable(null);
  }, []);

  const handleClick = useCallback((table) => {
    if (isCombineMode) {
      if (table.status !== 'available' && !selectedCombineIds.includes(table.tableNumber)) return;
      setSelectedCombineIds((prev) =>
        selectedCombineIds.includes(table.tableNumber)
          ? prev.filter((id) => id !== table.tableNumber)
          : [...prev, table.tableNumber]
      );
    } else {
      setSelectedTable(table);
    }
  }, [isCombineMode, selectedCombineIds]);

  const handleAddTableSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.tableNumber || !addForm.seats) {
      alert('Please fill out Table Number and Capacity');
      return;
    }

    const payload = {
      tableNumber: Number(addForm.tableNumber),
      seats: Number(addForm.seats),
      zone: addForm.zone,
      indoor: addForm.indoor,
      outdoor: addForm.outdoor,
      vip: addForm.vip,
      window: addForm.window,
      family: addForm.family,
      bar: addForm.bar,
      status: 'available',
      notes: addForm.notes,
      posX: 150 + Math.random() * 300,
      posY: 150 + Math.random() * 200
    };

    const res = await addTableBackend(payload);
    if (res.success) {
      setShowAddModal(false);
      setAddForm({
        tableNumber: '', seats: '4', zone: 'Indoor', indoor: true, outdoor: false,
        vip: false, window: false, family: false, bar: false, status: 'available', notes: ''
      });
    } else {
      alert(res.message);
    }
  };

  const handleEditTableSubmit = async (e) => {
    e.preventDefault();
    const tableNum = selectedTable.tableNumber;
    const payload = {
      seats: Number(editForm.seats),
      zone: editForm.zone,
      indoor: editForm.indoor,
      outdoor: editForm.outdoor,
      vip: editForm.vip,
      window: editForm.window,
      family: editForm.family,
      bar: editForm.bar,
      status: editForm.status,
      notes: editForm.notes
    };

    const res = await updateTableBackend(tableNum, payload);
    if (res.success) {
      setIsEditMode(false);
      setSelectedTable(res.table);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteTable = async (tableNum) => {
    if (window.confirm(`Are you sure you want to delete table T${tableNum}?`)) {
      const res = await deleteTableBackend(tableNum);
      if (res.success) {
        setSelectedTable(null);
      } else {
        alert(res.message);
      }
    }
  };

  const handleConfirmCombine = async (name) => {
    const res = await mergeTablesBackend(selectedCombineIds, name);
    if (res.success) {
      setIsCombineMode(false);
      setSelectedCombineIds([]);
      setShowCombineModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleSplitTables = async (tableNum) => {
    if (window.confirm('Are you sure you want to split this combined unit? Original tables will return to Available status.')) {
      const res = await splitTableBackend(tableNum);
      if (res.success) {
        setSelectedTable(null);
      } else {
        alert(res.message);
      }
    }
  };

  const handleDragEnd = (tableNumber, event, info) => {
    setLocalLayout((prev) =>
      prev.map((item) =>
        item.tableNumber === tableNumber
          ? {
              ...item,
              posX: Math.max(20, Math.min(800, item.posX + info.offset.x)),
              posY: Math.max(20, Math.min(500, item.posY + info.offset.y))
            }
          : item
      )
    );
  };

  const filteredTables = tables.filter((t) => {
    const matchesSearch = (t.tableNumber ?? t.id ?? '').toString().includes(searchQuery);
    if (!matchesSearch) return false;
    if (t.status === 'combined' && activeTab !== 'combined' && activeTab !== 'all') return false;

    if (activeTab === 'all') return t.status !== 'combined';
    if (activeTab === 'available') return t.status === 'available';
    if (activeTab === 'occupied') return t.status === 'occupied';
    if (activeTab === 'reserved') return t.status === 'reserved';
    if (activeTab === 'cleaning') return t.status === 'cleaning';
    if (activeTab === 'combined') return t.isCombined || t.status === 'combined';
    if (activeTab === 'vip') return t.vip;
    if (activeTab === 'window') return t.window;
    if (activeTab === 'outdoor') return t.outdoor;
    return true;
  });

  const totalTables = tables.filter(t => t.status !== 'combined').length;
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const combinedCount = tables.filter((t) => t.isCombined).length;

  const getStatusBadgeStyles = useCallback((status, isCombined) => {
    if (isCombined) return 'bg-orange-500/10 border-orange-500/20 text-orange-500';
    switch (status) {
      case 'available': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
      case 'occupied': return 'bg-rose-500/10 border-rose-500/20 text-rose-500';
      case 'reserved': return 'bg-orange-500/10 border-orange-500/20 text-orange-500';
      case 'cleaning': return 'bg-sky-500/10 border-sky-500/20 text-sky-500';
      case 'combined': return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
      case 'out-of-service': return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
      default: return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
    }
  }, []);

  const selectedTablesForCombine = useMemo(() =>
    tables.filter(t => selectedCombineIds.includes(t.tableNumber)),
    [tables, selectedCombineIds]
  );

  const activeOrderForSelectedTable = useMemo(() =>
    selectedTable ? activeOrders?.find(o => o.tableNumber === selectedTable.tableNumber) : null,
    [selectedTable, activeOrders]
  );

  return (
    <div className="space-y-6 pb-24 relative" onMouseMove={(e) => mousePos.x && setMousePos({ x: e.clientX, y: e.clientY })}>
      <AnimatePresence>
        {hoveredTable && <ReservationHoverCard table={hoveredTable} mousePos={mousePos} />}
      </AnimatePresence>

      <AnimatePresence>
        {isCombineMode && (
          <CombineModeToolbar
            selectedTables={selectedTablesForCombine}
            onCancel={() => { setIsCombineMode(false); setSelectedCombineIds([]); }}
            onCombine={() => setShowCombineModal(true)}
          />
        )}
      </AnimatePresence>

      <CombineConfirmationModal
        isOpen={showCombineModal}
        onClose={() => setShowCombineModal(false)}
        selectedTables={selectedTablesForCombine}
        onConfirm={handleConfirmCombine}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total Tables', count: totalTables, color: isDark ? 'from-zinc-500/20 to-zinc-500/5' : 'from-gray-200 to-gray-50', icon: Grid, trend: 'Optimal occupancy' },
          { label: 'Available', count: availableCount, color: isDark ? 'from-emerald-500/20 to-emerald-500/5' : 'from-emerald-500/10 to-emerald-500/5', icon: CheckCircle2, trend: `${availableCount} open` },
          { label: 'Reserved', count: reservedCount, color: isDark ? 'from-orange-500/20 to-orange-500/5' : 'from-orange-500/10 to-orange-500/5', icon: Users, trend: 'Peak booking load' },
          { label: 'Occupied', count: occupiedCount, color: isDark ? 'from-rose-500/20 to-rose-500/5' : 'from-rose-500/10 to-rose-500/5', icon: Info, trend: 'High turn rate' },
          { label: 'Cleaning', count: cleaningCount, color: isDark ? 'from-sky-500/20 to-sky-500/5' : 'from-sky-500/10 to-sky-500/5', icon: RefreshCw, trend: 'Average: 5 min' },
          { label: 'Combined', count: combinedCount, color: isDark ? 'from-orange-500/20 to-orange-500/5' : 'from-orange-500/10 to-orange-500/5', icon: Layers, trend: 'Group configurations' }
        ].map((card, i) => {
          const CardIcon = card.icon;
          return (
            <motion.div
              key={i}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-gradient-to-br text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} ${card.color} p-5 backdrop-blur-xl transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/30' : 'text-gray-500'}`}>{card.label}</span>
                <CardIcon size={16} className={isDark ? 'text-white/40' : 'text-gray-500'} />
              </div>
              <div className={`mt-3 text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter`}>
                <CountUp end={card.count} duration={1.5} />
              </div>
              <div className={`mt-1 text-[9px] font-bold ${isDark ? 'text-white/20' : 'text-gray-600'} uppercase tracking-widest`}>{card.trend}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Control Bar */}
      <div className={`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-200 shadow-md'} p-4 rounded-[32px] backdrop-blur-xl border`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'} p-1.5 border`}>
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <Grid size={14} /> Grid
            </button>
            <button onClick={() => setViewMode('layout')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'layout' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <Compass size={14} /> Layout
            </button>
          </div>

          <div className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-gray-200'} mx-2`} />

          <button onClick={() => setShowAddModal(true)} className={`flex items-center gap-2 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'} px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all active:scale-95`}>
            <Plus size={16} /> Add Table
          </button>

          <button
            onClick={() => setIsCombineMode(true)}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
              isCombineMode
                ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                : 'border-orange-500/30 bg-orange-500/5 text-orange-500 hover:bg-orange-500/10'
            }`}
          >
            <LinkIcon size={16} /> Combine Tables
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/20' : 'text-gray-400'} group-focus-within:text-orange-500 transition-colors`} size={16} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tables..." className={`rounded-2xl border ${isDark ? 'border-white/10 bg-black/40 text-white placeholder-white/20' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} pl-12 pr-6 py-3 text-xs outline-none focus:border-orange-500/50 w-64 transition-all`} />
          </div>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-orange-500' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-orange-600'} p-3 transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-orange-500' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
        {['all', 'available', 'occupied', 'reserved', 'cleaning', 'combined'].map(id => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`rounded-full border px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === id
                ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                : isDark ? 'border-white/5 bg-white/5 text-white/40 hover:border-white/20 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:border-gray-300 hover:text-gray-900'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      {viewMode === 'grid' && (
        <div ref={gridRef} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredTables.map((table) => (
              <TableCard
                key={table.tableNumber}
                table={table}
                isCombineMode={isCombineMode}
                isSelected={selectedCombineIds.includes(table.tableNumber)}
                cleaningTimeLeft={cleaningTimers[table.tableNumber]}
                activeOrder={activeOrders?.find(o => o.tableNumber === table.tableNumber)}
                onHover={handleHover}
                onUnhover={handleUnhover}
                onClick={handleClick}
                getStatusBadgeStyles={getStatusBadgeStyles}
                isDark={isDark}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Layout View */}
      {viewMode === 'layout' && (
        <div className={`relative h-[600px] w-full overflow-hidden rounded-[40px] border ${isDark ? 'border-white/10 bg-[#0c0c0e]' : 'border-gray-200 bg-gray-50'} shadow-2xl`}>
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:32px_32px]" />
          <motion.div
            animate={{ scale: zoom }}
            className="absolute inset-0 origin-center p-12 h-full w-full flex items-center justify-center"
          >
            <div className="relative" style={{ width: '636px', height: '416px' }}>
              {filteredTables
                .sort((a, b) => (a.tableNumber || 0) - (b.tableNumber || 0))
                .map((table) => {
                  const tableIdx = (table.tableNumber - 1);
                  const row = Math.floor(tableIdx / 4);
                  const col = tableIdx % 4;
                  const posX = col * 180;
                  const posY = row * 160;

                  return (
                    <motion.div
                      key={table.tableNumber}
                      drag={isLayoutEdit}
                      onDragEnd={(e, info) => handleDragEnd(table.tableNumber, e, info)}
                      style={{ position: 'absolute', left: posX, top: posY, touchAction: 'none' }}
                      onClick={() => !isLayoutEdit && setSelectedTable(table)}
                      className={`flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-3xl border transition-all shadow-xl ${table.isCombined ? 'border-orange-500 bg-orange-950/20' : isDark ? 'border-white/10 bg-[#161618]' : 'border-gray-200 bg-white'} ${isLayoutEdit ? 'ring-2 ring-orange-500/40 cursor-move border-orange-500' : 'hover:scale-110 hover:border-primary/60'} ${table.status === 'occupied' ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : ''}`}
                    >
                      <div className={`text-xs font-black ${isDark ? 'text-white' : 'text-gray-900'} truncate px-2`}>{table.isCombined ? table.combinedName : `T${table.tableNumber}`}</div>
                      <div className={`mt-2 rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-widest ${getStatusBadgeStyles(table.status, table.isCombined)}`}>{table.status}</div>
                      {table.status === 'occupied' && activeOrders?.find(o => o.tableNumber === table.tableNumber) && (
                        <div className="absolute -top-1 -right-1 bg-rose-500 text-[8px] font-black px-1.5 py-0.5 rounded-lg text-white shadow-lg">
                           ${activeOrders.find(o => o.tableNumber === table.tableNumber).totalAmount.toFixed(0)}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>

          <div className={`absolute bottom-8 right-8 flex items-center gap-2 ${isDark ? 'bg-black/60 border-white/10 text-white' : 'bg-white/90 border-gray-200 text-gray-900'} backdrop-blur-xl border p-2 rounded-2xl z-20`}>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:text-orange-500 transition-colors"><ZoomOut size={16}/></button>
            <span className="text-[10px] font-black w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:text-orange-500 transition-colors"><ZoomIn size={16}/></button>
          </div>
        </div>
      )}



      {/* Table Details Side Drawer */}
      <AnimatePresence>
        {selectedTable && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTable(null)} className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 200 }} className={`fixed bottom-0 right-0 top-0 z-[201] flex h-full w-full max-w-lg flex-col border-l ${isDark ? 'border-white/10 bg-[#0c0c0e] text-white' : 'border-gray-200 bg-white text-gray-900'} shadow-[0_0_100px_rgba(0,0,0,0.5)] p-10 overflow-y-auto`}>
              <div className="flex items-center justify-between mb-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">Management Console</span>
                  <h3 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'} leading-none`}>
                    {selectedTable.isCombined ? selectedTable.combinedName : `Table ${selectedTable.tableNumber}`}
                  </h3>
                </div>
                <button onClick={() => setSelectedTable(null)} className={`p-3 rounded-2xl ${isDark ? 'bg-white/5 border-white/15 text-white/60 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900'} border transition-all`}><X size={20} /></button>
              </div>

              {!isEditMode ? (
                <div className="space-y-10">
                  {/* Status Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-3xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'} p-5`}>
                      <span className={`text-[9px] font-black ${isDark ? 'text-white/20' : 'text-gray-500'} uppercase tracking-widest block mb-2`}>Current Status</span>
                      <div className={`text-sm font-black uppercase tracking-wider ${getStatusBadgeStyles(selectedTable.status, selectedTable.isCombined)}`}>
                        {selectedTable.status}
                      </div>
                    </div>
                    <div className={`rounded-3xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'} p-5`}>
                      <span className={`text-[9px] font-black ${isDark ? 'text-white/20' : 'text-gray-500'} uppercase tracking-widest block mb-2`}>Seating Capacity</span>
                      <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTable.seats} Seats</div>
                    </div>
                  </div>

                  {/* Combined Info */}
                  {selectedTable.isCombined && (
                    <div className="space-y-4">
                      <span className={`text-[10px] font-black ${isDark ? 'text-white/20' : 'text-gray-500'} uppercase tracking-[0.3em] ml-2`}>Linked Units</span>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedTable.combinedMembers?.map(num => (
                          <div key={num} className={`flex items-center gap-3 p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'} border`}>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>Table {num}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Reservation Block */}
                  {(selectedTable.status === 'reserved' || selectedTable.status === 'occupied') && (
                    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-8 relative overflow-hidden">
                       <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
                       <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] block mb-6">Reservation Details</span>
                       <div className="space-y-6">
                          <div className="flex flex-col">
                            <span className={`text-[8px] font-black ${isDark ? 'text-white/20' : 'text-gray-500'} uppercase tracking-widest mb-1`}>Customer Name</span>
                            <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTable.currentReservation?.name || selectedTable.reservedBy || activeOrderForSelectedTable?.customerName || 'Dining Guest'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                             <div className="flex flex-col">
                                <span className={`text-[8px] font-black ${isDark ? 'text-white/20' : 'text-gray-500'} uppercase tracking-widest mb-1`}>Time / Duration</span>
                                <span className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {activeOrderForSelectedTable?.createdAt ? `Occupied ${getOccupancyDuration(activeOrderForSelectedTable.createdAt)}` : selectedTable.currentReservation?.time || selectedTable.reservationTime || 'Active Order'}
                                </span>
                             </div>
                             <div className="flex flex-col">
                                <span className={`text-[8px] font-black ${isDark ? 'text-white/20' : 'text-gray-500'} uppercase tracking-widest mb-1`}>Pax</span>
                                <span className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTable.currentReservation?.guests || selectedTable.seats} People</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Active Order Details */}
                  {selectedTable.status === 'occupied' && activeOrderForSelectedTable && (
                    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-8 relative overflow-hidden mt-4">
                       <div className="flex items-center justify-between mb-6">
                         <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Active Order ({activeOrderForSelectedTable.orderNumber})</span>
                         <span className="text-[10px] font-bold text-rose-400 font-mono">🕒 {getOccupancyDuration(activeOrderForSelectedTable.createdAt)}</span>
                       </div>
                       <div className="space-y-4">
                          {activeOrderForSelectedTable.items.map((item, idx) => (
                            <div key={idx} className={`flex justify-between items-center text-sm font-bold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                <span>{item.quantity}x {item.name}</span>
                                <span className={isDark ? 'text-white/40' : 'text-gray-500'}>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} flex justify-between items-center`}>
                             <span className={`text-xs font-black ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-widest`}>Total Amount</span>
                             <span className="text-lg font-black text-rose-500">${activeOrderForSelectedTable.totalAmount.toFixed(2)}</span>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className={`space-y-4 pt-10 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                    {selectedTable.isCombined ? (
                      <div className="grid grid-cols-1 gap-3">
                         <button
                          onClick={() => handleSplitTables(selectedTable.tableNumber)}
                          className="flex items-center justify-center gap-3 bg-orange-500 py-5 rounded-[24px] text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-orange-400 shadow-xl shadow-orange-500/10 transition-all cursor-pointer"
                         >
                           <Scissors size={18} /> Split Table Unit
                         </button>
                         <button
                           onClick={() => handleDeleteTable(selectedTable.tableNumber)}
                           className="flex items-center justify-center gap-3 bg-red-500/10 border border-red-500/20 py-5 rounded-[24px] text-red-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                         >
                           <Trash2 size={18} /> Delete Unit
                         </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Quick Access to POS Order */}
                        {selectedTable.status === 'occupied' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTable(null);
                                navigate('/admin/pos', { state: { tableNumber: selectedTable.tableNumber, order: activeOrderForSelectedTable } });
                              }}
                              className="w-full flex items-center justify-center gap-2 bg-orange-500 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
                            >
                              <ShoppingCart size={16} /> View / Edit Order in POS
                            </button>

                            {activeOrderForSelectedTable && (
                              <button
                                onClick={() => setShowTransferModal(true)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
                              >
                                <ArrowRightLeft size={16} /> Transfer Order to Table
                              </button>
                            )}

                            <button
                              onClick={() => handleTableAction('cleaning')}
                              className="w-full flex items-center justify-center gap-2 bg-rose-500/20 border border-rose-500/40 text-rose-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                            >
                              <RefreshCw size={16} /> Checkout / Start Cleaning
                            </button>
                          </>
                        )}

                        {selectedTable.status === 'available' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTable(null);
                                navigate('/admin/pos', { state: { tableNumber: selectedTable.tableNumber } });
                              }}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-500 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                            >
                              <ShoppingCart size={16} /> Take Order in POS
                            </button>

                            <button
                              onClick={() => { setEditForm({ ...selectedTable }); setIsEditMode(true); }}
                              className={`w-full flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'} border py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer`}
                            >
                              <Edit2 size={16} /> Edit Details
                            </button>
                          </>
                        )}

                        {selectedTable.status === 'reserved' && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleTableAction('check-in')}
                              className="flex items-center justify-center gap-2 bg-emerald-500 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all cursor-pointer"
                            >
                              <CheckCircle2 size={16} /> Check In
                            </button>
                            <button
                              onClick={() => handleTableAction('cancelled')}
                              className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 py-4 rounded-2xl text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            >
                              <X size={16} /> Cancel
                            </button>
                          </div>
                        )}

                        {selectedTable.status === 'cleaning' && (
                          <button
                            onClick={() => handleTableAction('completed')}
                            className="w-full flex items-center justify-center gap-2 bg-blue-500 py-4 rounded-2xl text-black font-black text-[10px] uppercase tracking-widest hover:bg-blue-400 transition-all cursor-pointer"
                          >
                            <Check size={16} /> Complete Cleaning
                          </button>
                        )}

                        <button
                          onClick={() => setQrModal(selectedTable)}
                          className="w-full flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/20 py-4 rounded-2xl text-orange-500 font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 hover:text-black transition-all mt-2 cursor-pointer"
                        >
                          <QrCode size={16} /> Generate Table QR
                        </button>

                        <button
                          onClick={() => handleDeleteTable(selectedTable.tableNumber)}
                          className={`flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 border-white/10 text-white/40' : 'bg-gray-100 border-gray-200 text-gray-500'} border py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all mt-2 cursor-pointer`}
                        >
                          <Trash2 size={16} /> Delete Table
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEditTableSubmit} className="space-y-8 mt-10 animate-fade-in">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3">
                      <label className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-500'} uppercase tracking-widest ml-2`}>Unit Capacity</label>
                      <input type="number" value={editForm.seats} onChange={(e) => setEditForm(prev => ({ ...prev, seats: e.target.value }))} className={`w-full ${isDark ? 'bg-black/45 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-2xl px-6 py-4 font-bold outline-none focus:border-orange-500/50 transition-all`} />
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-500'} uppercase tracking-widest ml-2`}>Operational Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))} className={`w-full ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-2xl px-6 py-4 font-bold outline-none focus:border-orange-500/50 transition-all`}>
                        <option value="available">Available</option>
                        <option value="out-of-service">Out of Service</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-10">
                    <button type="submit" className="flex-[2] bg-orange-500 py-5 rounded-[24px] text-black font-black uppercase tracking-widest text-xs hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20 cursor-pointer">Save Configuration</button>
                    <button type="button" onClick={() => setIsEditMode(false)} className={`flex-1 ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'} border py-5 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all cursor-pointer`}>Cancel</button>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Transfer Order Modal */}
      <AnimatePresence>
        {showTransferModal && selectedTable && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-md bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121217] text-white' : 'border-gray-200 bg-white text-gray-900'} p-6 shadow-2xl space-y-5`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-orange-500 font-black">
                  <ArrowRightLeft size={18} />
                  <h3 className="text-base uppercase tracking-tight">Transfer Order from T{selectedTable.tableNumber}</h3>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className={`p-1.5 rounded-xl ${isDark ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'} cursor-pointer`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Select destination available table:</p>
                <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {tables
                    .filter(t => t.status === 'available' && t.tableNumber !== selectedTable.tableNumber)
                    .map(t => (
                      <button
                        key={t.tableNumber}
                        type="button"
                        onClick={() => handleConfirmTransferOrder(t.tableNumber)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isDark
                            ? 'border-white/10 bg-white/5 hover:border-orange-500/50 hover:bg-orange-500/10'
                            : 'border-gray-200 bg-gray-50 hover:border-orange-500/50 hover:bg-orange-50'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-xs block">Table {t.tableNumber}</span>
                          <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{t.seats} Seats • {t.zone}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">Available</span>
                      </button>
                    ))}
                </div>
                {tables.filter(t => t.status === 'available' && t.tableNumber !== selectedTable.tableNumber).length === 0 && (
                  <p className="text-xs text-rose-500 font-bold p-3 text-center bg-rose-500/10 rounded-xl border border-rose-500/20">
                    No available tables to transfer order to.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Table Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`relative w-full max-w-xl rounded-[40px] border ${isDark ? 'border-white/10 bg-[#0e0e11] text-white' : 'border-gray-200 bg-white text-gray-900'} p-12 shadow-2xl overflow-hidden`}>
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full" />

              <div className="flex items-center justify-between mb-10">
                <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-4`}><Plus size={24} className="text-orange-500" /> New Unit</h3>
                <button onClick={() => setShowAddModal(false)} className={`p-2 ${isDark ? 'text-white/20 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors cursor-pointer`}><X size={24} /></button>
              </div>

              <form onSubmit={handleAddTableSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <label className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-500'} uppercase tracking-widest ml-2`}>Table Number</label>
                    <input type="number" placeholder="e.g. 15" value={addForm.tableNumber} onChange={e => setAddForm({...addForm, tableNumber: e.target.value})} className={`w-full ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-2xl px-6 py-4 outline-none focus:border-orange-500/50 transition-all`} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-500'} uppercase tracking-widest ml-2`}>Capacity</label>
                    <input type="number" placeholder="Pax" value={addForm.seats} onChange={e => setAddForm({...addForm, seats: e.target.value})} className={`w-full ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-2xl px-6 py-4 outline-none focus:border-orange-500/50 transition-all`} />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] font-black ${isDark ? 'text-white/30' : 'text-gray-500'} uppercase tracking-widest ml-2`}>Zone Assignment</label>
                  <select value={addForm.zone} onChange={e => setAddForm({...addForm, zone: e.target.value})} className={`w-full ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-2xl px-6 py-4 font-bold outline-none focus:border-orange-500/50 transition-all cursor-pointer`}>
                    <option value="Indoor">Main Hall (Indoor)</option>
                    <option value="Outdoor">Terrace (Outdoor)</option>
                    <option value="VIP">Executive VIP Lounge</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-[2] bg-orange-500 py-5 rounded-[24px] text-black font-black uppercase tracking-widest text-xs hover:bg-orange-400 transition-all shadow-xl shadow-orange-500/20 active:scale-95 cursor-pointer">Register Table</button>
                  <button type="button" onClick={() => setShowAddModal(false)} className={`flex-1 ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'} border py-5 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all cursor-pointer`}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {qrModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-md bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[40px] border ${isDark ? 'border-white/10 bg-[#0d0d0f] text-white' : 'border-gray-200 bg-white text-gray-900'} p-10 text-center shadow-3xl`}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Table {qrModal.tableNumber} QR</h2>
                <button onClick={() => setQrModal(null)} className={`rounded-full ${isDark ? 'bg-white/5 text-white/40 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'} p-2 cursor-pointer`}><X size={20} /></button>
              </div>

              <div className="bg-white p-6 rounded-[32px] inline-block mb-8 shadow">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/menu?table=${qrModal.tableNumber}`)}`}
                  alt={`QR for Table ${qrModal.tableNumber}`}
                  className="w-44 h-44 object-contain"
                />
              </div>

              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'} mb-6`}>Scan to open digital customer menu for Table {qrModal.tableNumber}</p>

              <button
                onClick={() => setQrModal(null)}
                className="w-full py-4 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-widest hover:bg-orange-400 transition-all cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
