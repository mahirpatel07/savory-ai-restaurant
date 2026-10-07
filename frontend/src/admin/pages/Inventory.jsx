import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Trash2,
  Edit2,
  X,
  Loader2,
  Package,
  Sparkles,
  Zap,
  Tag,
  Scale,
  Layers,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Check,
  ArrowDownRight,
  ArrowUpRight,
  History,
  FileText,
  Truck,
  MinusCircle,
  PlusCircle,
  AlertOctagon
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import CalendarPicker from '../components/CalendarPicker';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

const PRESET_CATEGORIES = ['Proteins', 'Fresh Produce', 'Dairy & Cheese', 'Pantry & Oils', 'Beverages'];
const WASTAGE_REASONS = ['Spoilage', 'Expired', 'Damaged', 'Over-preparation', 'Other'];

export default function Inventory() {
  const [ingredients, setIngredients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'movements'
  const [logTypeFilter, setLogTypeFilter] = useState('All');

  // Modals State
  const [modalOpen, setModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Ingredient Add/Edit Form
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    currentStock: 0,
    minStockLevel: 5,
    costPerUnit: 0,
    category: 'General',
    supplier: '',
    expiryDate: ''
  });

  // Stock In / Out / Wastage Movement Form
  const [movementData, setMovementData] = useState({
    ingredientId: '',
    type: 'Stock In', // 'Stock In', 'Stock Out', 'Wastage', 'Adjustment'
    quantity: 1,
    reason: 'Restocked',
    notes: '',
    supplier: ''
  });

  const fetchInventory = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/inventory`);
      setIngredients(response.data || []);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load inventory');
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/inventory/logs`);
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error loading inventory logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchLogs();

    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => {
        fetchInventory();
        fetchLogs();
      };
      socket.on('inventory_updated', handleUpdate);
      socket.on('low_stock_alert', (data) => {
        toast(`Low Stock: ${data.ingredientName} (${data.currentStock} ${data.unit} left)`, {
          icon: '⚠️',
          style: { background: '#f59e0b', color: '#fff', borderRadius: '16px' }
        });
      });
      return () => {
        socket.off('inventory_updated', handleUpdate);
        socket.off('low_stock_alert');
      };
    }
  }, [fetchInventory, fetchLogs]);

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(ingredients.map(i => i.category || 'General'))];
    return cats;
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing => {
      const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase()) ||
                            ing.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || ing.category === selectedCategory;
      const matchesLowStock = !showLowStockOnly || (ing.currentStock <= ing.minStockLevel);
      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [ingredients, search, selectedCategory, showLowStockOnly]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !search || log.ingredientName?.toLowerCase().includes(search.toLowerCase()) ||
                            log.reason?.toLowerCase().includes(search.toLowerCase()) ||
                            log.orderNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesType = logTypeFilter === 'All' || log.type === logTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [logs, search, logTypeFilter]);

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await axios.post(`${API_BASE}/api/inventory/seed`);
      if (res.data?.success) {
        setIngredients(res.data.ingredients || []);
        toast.success('Default inventory items seeded successfully!');
        fetchLogs();
      }
    } catch (err) {
      toast.error('Failed to seed default inventory');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleQuickRestock = async (ing) => {
    try {
      await axios.post(`${API_BASE}/api/inventory/movement`, {
        ingredientId: ing._id,
        type: 'Stock In',
        quantity: 10,
        reason: 'Quick Restock (+10)',
        supplier: ing.supplier || 'General Supplier'
      });
      toast.success(`Restocked ${ing.name} (+10 ${ing.unit})`);
      fetchInventory();
      fetchLogs();
    } catch (err) {
      toast.error('Failed to quick restock');
    }
  };

  const handleSubmitIngredient = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.patch(`${API_BASE}/api/inventory/${editingId}`, formData);
        toast.success('Ingredient updated');
      } else {
        await axios.post(`${API_BASE}/api/inventory`, formData);
        toast.success('Ingredient added to stock');
      }
      setModalOpen(false);
      setEditingId(null);
      setFormData({ name: '', unit: 'kg', currentStock: 0, minStockLevel: 5, costPerUnit: 0, category: 'General', supplier: '', expiryDate: '' });
      fetchInventory();
      fetchLogs();
    } catch (error) {
      toast.error('Failed to save ingredient');
    }
  };

  const handleSubmitMovement = async (e) => {
    e.preventDefault();
    if (!movementData.ingredientId) {
      toast.error('Please select an ingredient');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE}/api/inventory/movement`, movementData);
      if (response.data?.success) {
        toast.success(`Recorded ${movementData.type} for ${response.data.ingredient?.name}!`);
        setMovementModalOpen(false);
        setMovementData({ ingredientId: '', type: 'Stock In', quantity: 1, reason: 'Restocked', notes: '', supplier: '' });
        fetchInventory();
        fetchLogs();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record stock movement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?')) return;
    try {
      await axios.delete(`${API_BASE}/api/inventory/${id}`);
      toast.success('Ingredient deleted');
      fetchInventory();
      fetchLogs();
    } catch (error) {
      toast.error('Failed to delete ingredient');
    }
  };

  const lowStockCount = ingredients.filter(ing => ing.currentStock <= ing.minStockLevel).length;
  const totalValuation = ingredients.reduce((sum, ing) => sum + ((ing.currentStock || 0) * (ing.costPerUnit || 0)), 0);
  const wastageCount = logs.filter(l => l.type === 'Wastage').length;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* ── TOP METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Items */}
        <div className={`relative overflow-hidden rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl group hover:border-orange-500/40 transition-all duration-300`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Total Items</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-inner">
              <Package size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{ingredients.length}</p>
            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Ingredients</span>
          </div>
          <p className={`mt-2 text-[10px] font-bold ${isDark ? 'text-white/30' : 'text-gray-500'} uppercase tracking-wider flex items-center gap-1`}>
            <Layers size={11} className="text-orange-500" />
            {categories.length > 1 ? `${categories.length - 1} Categories` : 'General Stock'}
          </p>
        </div>

        {/* Metric 2: Low Stock Alerts */}
        <button
          onClick={() => {
            setActiveTab('inventory');
            setShowLowStockOnly(!showLowStockOnly);
          }}
          className={`relative overflow-hidden rounded-[26px] border p-6 shadow-xl backdrop-blur-xl text-left transition-all active:scale-[0.98] ${
            showLowStockOnly
              ? 'border-amber-500 bg-amber-500/15 text-white shadow-amber-500/10'
              : isDark ? 'border-white/10 bg-[#121215]/90 text-white hover:border-amber-500/40' : 'border-gray-200 bg-white text-gray-900 shadow-md hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Low Stock Alerts</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <AlertTriangle size={20} className={lowStockCount > 0 ? 'animate-bounce' : ''} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-amber-500">{lowStockCount}</p>
            <span className="text-[10px] font-bold text-amber-500/80">Below threshold</span>
          </div>
          <p className="mt-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
            {showLowStockOnly ? '● Filter Active (Click to Reset)' : 'Click to filter low stock'}
          </p>
        </button>

        {/* Metric 3: Inventory Value */}
        <div className={`relative overflow-hidden rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-xl group hover:border-emerald-500/40 transition-all duration-300`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Inventory Value</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-500">${totalValuation.toFixed(2)}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={11} />
            Estimated Total Stock Value
          </p>
        </div>

        {/* Metric 4: Primary Action Buttons */}
        <div className={`flex flex-col gap-2 justify-center rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-4 backdrop-blur-xl`}>
          <button
            onClick={() => {
              setMovementData({ ingredientId: ingredients[0]?._id || '', type: 'Stock In', quantity: 1, reason: 'Restocked', notes: '', supplier: '' });
              setMovementModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 px-3 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/25 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Stock In / Out / Wastage</span>
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', unit: 'kg', currentStock: 0, minStockLevel: 5, costPerUnit: 0, category: 'General', supplier: '', expiryDate: '' });
              setModalOpen(true);
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200'} py-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer`}
          >
            <Plus size={14} />
            <span>New Ingredient</span>
          </button>
        </div>
      </div>

      {/* ── TAB SELECTOR & MAIN PANEL ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6`}>
        {/* Table Navigation Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex gap-1.5 p-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'}`}>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-orange-500 text-white shadow-md'
                    : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stock Inventory
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'movements'
                    ? 'bg-orange-500 text-white shadow-md'
                    : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History size={14} />
                <span>Movements &amp; Usage Log</span>
                <span className="px-2 py-0.5 rounded-full bg-black/40 text-[9px] font-mono">{logs.length}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
              <input
                type="text"
                placeholder={activeTab === 'inventory' ? "Search ingredients or category..." : "Search logs or order #..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50 transition-all shadow-inner`}
              />
              {search && (
                <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className={`p-2.5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-all cursor-pointer disabled:opacity-50`}
              title="Seed Default Inventory"
            >
              <Zap size={16} className={isSeeding ? 'animate-spin text-orange-500' : 'text-orange-500'} />
            </button>
          </div>
        </div>

        {/* TAB 1: STOCK INVENTORY */}
        {activeTab === 'inventory' && (
          <>
            {/* Category Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap rounded-2xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : isDark ? 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Inventory Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 text-white/30' : 'border-gray-200 text-gray-500'} text-[10px] font-bold uppercase tracking-[0.2em]`}>
                    <th className="pb-4 text-left pl-4">Ingredient</th>
                    <th className="pb-4 text-left">Category</th>
                    <th className="pb-4 text-left">Stock Level</th>
                    <th className="pb-4 text-left">Unit</th>
                    <th className="pb-4 text-left">Threshold</th>
                    <th className="pb-4 text-left">Supplier</th>
                    <th className="pb-4 text-left">Cost / Unit</th>
                    <th className="pb-4 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-200'} text-xs`}>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-white/40">
                          <Loader2 className="animate-spin text-orange-500" size={32} />
                          <span className="text-xs font-bold tracking-widest uppercase">Loading Inventory Items...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredIngredients.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-20 text-center">
                        <div className={`flex flex-col items-center gap-3 ${isDark ? 'text-white/40' : 'text-gray-600'} max-w-sm mx-auto`}>
                          <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10 text-white/30' : 'bg-gray-100 border-gray-200 text-gray-400'} border`}>
                            <Boxes size={36} />
                          </div>
                          <p className={`text-sm font-bold ${isDark ? 'text-white/80' : 'text-gray-900'}`}>No ingredients found</p>
                          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} leading-relaxed`}>
                            There are no ingredients matching your search or filters. Click <span className="text-orange-500 font-bold">"Seed Sample Stock"</span> to populate sample data.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const stock = ing.currentStock || 0;
                      const min = ing.minStockLevel || 1;
                      const isLow = stock <= min;
                      const isWarning = stock > min && stock <= min * 1.5;
                      const healthPercent = Math.min(100, Math.round((stock / (min * 3 || 1)) * 100));

                      return (
                        <tr key={ing._id} className={`group hover:${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} transition-colors`}>
                          {/* Name & Icon */}
                          <td className="py-4 pl-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0 ${
                                isLow ? 'border-amber-500/40 bg-amber-500/10 text-amber-500' : isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-gray-200 bg-gray-100 text-gray-600'
                              }`}>
                                <Package size={18} />
                              </div>
                              <div>
                                <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-sm leading-tight`}>{ing.name}</p>
                                {isLow && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-500 mt-0.5">
                                    <AlertTriangle size={10} /> Low Stock
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4">
                            <span className={`rounded-xl ${isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-gray-100 border-gray-200 text-gray-700'} border px-3 py-1 text-[10px] font-bold uppercase`}>
                              {ing.category || 'General'}
                            </span>
                          </td>

                          {/* Stock Level Progress Bar */}
                          <td className="py-4 w-44">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className={isLow ? 'text-amber-500 font-black' : isWarning ? 'text-yellow-500' : 'text-emerald-500'}>
                                  {stock} {ing.unit}
                                </span>
                                <span className={`text-[10px] font-mono ${isDark ? 'text-white/30' : 'text-gray-500'}`}>{healthPercent}%</span>
                              </div>
                              <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isLow ? 'bg-amber-500' : isWarning ? 'bg-yellow-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${healthPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Unit */}
                          <td className={`py-4 text-xs font-medium ${isDark ? 'text-white/60' : 'text-gray-600'} uppercase`}>
                            {ing.unit}
                          </td>

                          {/* Threshold */}
                          <td className={`py-4 text-xs font-medium ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                            {min} {ing.unit}
                          </td>

                          {/* Supplier */}
                          <td className="py-4 text-xs font-medium">
                            {ing.supplier ? (
                              <span className="text-orange-400 font-semibold">{ing.supplier}</span>
                            ) : (
                              <span className={isDark ? 'text-white/20' : 'text-gray-400'}>—</span>
                            )}
                          </td>

                          {/* Cost per unit */}
                          <td className="py-4 text-xs font-bold text-emerald-500">
                            ${ing.costPerUnit ? ing.costPerUnit.toFixed(2) : '0.00'}
                          </td>

                          {/* Actions */}
                          <td className="py-4 pr-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleQuickRestock(ing)}
                                title="Restock +10 units"
                                className="flex items-center gap-1 rounded-xl bg-orange-500/10 border border-orange-500/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-500 hover:bg-orange-500 hover:text-white transition-all active:scale-95 cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>+10</span>
                              </button>

                              <button
                                onClick={() => {
                                  setMovementData({
                                    ingredientId: ing._id,
                                    type: 'Wastage',
                                    quantity: 1,
                                    reason: 'Spoilage',
                                    notes: '',
                                    supplier: ing.supplier || ''
                                  });
                                  setMovementModalOpen(true);
                                }}
                                title="Record Wastage"
                                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                              >
                                <AlertOctagon size={14} />
                              </button>

                              <button
                                onClick={() => { setEditingId(ing._id); setFormData(ing); setModalOpen(true); }}
                                title="Edit Item"
                                className={`p-2 rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'} transition-all cursor-pointer`}
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                onClick={() => handleDelete(ing._id)}
                                title="Delete Item"
                                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 2: MOVEMENTS & USAGE HISTORY LOG */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            {/* Filter Types Bar */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
              {['All', 'Stock In', 'Stock Out', 'Order Deduction', 'Wastage', 'Adjustment'].map(type => (
                <button
                  key={type}
                  onClick={() => setLogTypeFilter(type)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    logTypeFilter === type
                      ? 'bg-orange-500 text-white shadow-md'
                      : isDark ? 'bg-white/5 text-white/40 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 text-white/30' : 'border-gray-200 text-gray-500'} text-[10px] font-bold uppercase tracking-[0.2em]`}>
                    <th className="pb-3 pl-4">Timestamp</th>
                    <th className="pb-3">Ingredient</th>
                    <th className="pb-3">Movement Type</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Reason / Ref</th>
                    <th className="pb-3 pr-4 text-right">Supplier / Notes</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-200'}`}>
                  {logsLoading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-white/40">
                        <Loader2 size={24} className="animate-spin text-orange-500 inline-block mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider">Loading Movement History...</p>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-white/40">
                        <p className="text-xs font-bold uppercase tracking-wider">No movement logs recorded yet.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => {
                      const isAddition = log.type === 'Stock In';
                      const isDeduction = log.type === 'Order Deduction' || log.type === 'Stock Out';
                      const isWastage = log.type === 'Wastage';

                      return (
                        <tr key={log._id} className={`hover:${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} transition-colors`}>
                          <td className="py-3.5 pl-4 font-mono text-[11px] text-white/50">
                            {new Date(log.date || log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 font-bold">{log.ingredientName}</td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                              isAddition
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : isWastage
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                : isDeduction
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono font-bold">
                            <span className={isAddition ? 'text-emerald-400' : 'text-rose-400'}>
                              {isAddition ? '+' : '-'}{log.quantity} {log.unit}
                            </span>
                          </td>
                          <td className="py-3.5 font-semibold text-white/70">
                            {log.reason || (log.orderNumber ? `Order #${log.orderNumber}` : '—')}
                          </td>
                          <td className="py-3.5 pr-4 text-right text-white/50 italic">
                            {log.supplier || log.notes || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── STOCK IN / OUT / WASTAGE MOVEMENT MODAL ── */}
      <AnimatePresence>
        {movementModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/75">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`w-full max-w-md rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e12] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-7 shadow-2xl space-y-5`}
            >
              <div className={`flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-gray-200'} pb-3`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <PlusCircle size={20} />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Record Stock Movement</h3>
                </div>
                <button onClick={() => setMovementModalOpen(false)} className="p-1.5 rounded-xl bg-white/5 text-white/50 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitMovement} className="space-y-4 text-xs">
                {/* Movement Type Tabs */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-orange-500 block mb-1.5">Movement Type</label>
                  <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'}`}>
                    {['Stock In', 'Stock Out', 'Wastage'].map(mType => (
                      <button
                        key={mType}
                        type="button"
                        onClick={() => setMovementData({ ...movementData, type: mType, reason: mType === 'Wastage' ? 'Spoilage' : 'Restocked' })}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          movementData.type === mType
                            ? 'bg-orange-500 text-white shadow-md'
                            : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {mType}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ingredient Selector */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider text-orange-500/90 block mb-2 leading-none`}>Select Ingredient *</label>
                  <select
                    value={movementData.ingredientId}
                    onChange={(e) => {
                      const selIng = ingredients.find(i => i._id === e.target.value);
                      setMovementData({
                        ...movementData,
                        ingredientId: e.target.value,
                        supplier: selIng?.supplier || movementData.supplier
                      });
                    }}
                    className={`w-full h-11 px-4 py-2.5 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500 cursor-pointer`}
                  >
                    <option value="">-- Choose Ingredient --</option>
                    {ingredients.map(ing => (
                      <option key={ing._id} value={ing._id}>
                        {ing.name} ({ing.currentStock} {ing.unit} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-2 leading-none`}>Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    required
                    value={movementData.quantity}
                    onChange={(e) => setMovementData({ ...movementData, quantity: parseFloat(e.target.value) || 0 })}
                    className={`w-full h-11 px-4 py-2.5 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
                  />
                </div>

                {/* Reason Select */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-2 leading-none`}>Reason / Cause</label>
                  {movementData.type === 'Wastage' ? (
                    <select
                      value={movementData.reason}
                      onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
                      className={`w-full h-11 px-4 py-2.5 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500 cursor-pointer`}
                    >
                      {WASTAGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Reason (e.g., Supplier Delivery, Usage Adjustment)"
                      value={movementData.reason}
                      onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
                      className={`w-full h-11 px-4 py-2.5 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
                    />
                  )}
                </div>

                {/* Supplier & Notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>Supplier</label>
                    <input
                      type="text"
                      placeholder="Supplier Name"
                      value={movementData.supplier}
                      onChange={(e) => setMovementData({ ...movementData, supplier: e.target.value })}
                      className={`w-full p-2.5 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>Notes / Ref</label>
                    <input
                      type="text"
                      placeholder="PO # / Batch Ref"
                      value={movementData.notes}
                      onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                      className={`w-full p-2.5 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMovementModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
                  >
                    Confirm {movementData.type}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ADD / EDIT INGREDIENT MODAL ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/75">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className={`relative w-full max-w-lg overflow-hidden rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-6 sm:p-8 shadow-[0_0_80px_rgba(249,115,22,0.15)]`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between mb-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} pb-4`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                    <Package size={22} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>
                      {editingId ? 'Edit Ingredient' : 'New Ingredient'}
                    </h2>
                    <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-widest mt-0.5`}>
                      Inventory Material Setup
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'} p-2 transition cursor-pointer`}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitIngredient} className="space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 mb-1.5 block">
                    Ingredient Name
                  </label>
                  <div className="relative">
                    <Package size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Matcha Powder / Almond Flakes"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-3 pl-10 pr-4 text-xs outline-none focus:border-orange-500 shadow-inner`}
                    />
                  </div>
                </div>

                {/* Category + Presets */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>
                    Category
                  </label>
                  <div className="relative mb-2">
                    <Tag size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Proteins, Dairy, Produce"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-3 pl-10 pr-4 text-xs outline-none focus:border-orange-500 shadow-inner`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CATEGORIES.map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormData({...formData, category: cat})}
                        className={`rounded-xl px-2.5 py-1 text-[9px] font-bold transition border cursor-pointer ${
                          formData.category === cat
                            ? 'border-orange-500/50 bg-orange-500/20 text-orange-500'
                            : isDark ? 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unit, Supplier & Unit Cost */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>
                      Unit
                    </label>
                    <div className="relative">
                      <Scale size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                      <select
                        value={formData.unit}
                        onChange={e => setFormData({...formData, unit: e.target.value})}
                        className={`w-full appearance-none rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white/90' : 'border-gray-200 bg-gray-50 text-gray-900'} py-3 pl-10 pr-2 text-xs outline-none focus:border-orange-500`}
                      >
                        <option value="kg">Kilograms (kg)</option>
                        <option value="g">Grams (g)</option>
                        <option value="liters">Liters (l)</option>
                        <option value="pcs">Pieces (pcs)</option>
                        <option value="box">Boxes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>
                      Supplier
                    </label>
                    <div className="relative">
                      <Truck size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                      <input
                        type="text"
                        placeholder="Supplier"
                        value={formData.supplier || ''}
                        onChange={e => setFormData({...formData, supplier: e.target.value})}
                        className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-3 pl-10 pr-3 text-xs outline-none focus:border-orange-500 shadow-inner`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-1.5 block">
                      Cost/Unit ($)
                    </label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.costPerUnit}
                        onChange={e => setFormData({...formData, costPerUnit: Number(e.target.value)})}
                        className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-emerald-400' : 'border-gray-200 bg-gray-50 text-emerald-600'} py-3 pl-10 pr-3 text-xs outline-none focus:border-emerald-500 shadow-inner`}
                      />
                    </div>
                  </div>
                </div>

                {/* Current Stock & Threshold */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>
                      Current Stock
                    </label>
                    <div className="relative">
                      <Layers size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                      <input
                        type="number"
                        required
                        value={formData.currentStock}
                        onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})}
                        className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} py-3 pl-10 pr-4 text-xs outline-none focus:border-orange-500 shadow-inner`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-1.5 block">
                      Min Alert Threshold
                    </label>
                    <div className="relative">
                      <AlertTriangle size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
                      <input
                        type="number"
                        required
                        value={formData.minStockLevel}
                        onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})}
                        className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-amber-400' : 'border-gray-200 bg-gray-50 text-amber-600'} py-3 pl-10 pr-4 text-xs outline-none focus:border-amber-500 shadow-inner`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expiration Date Picker */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-500'} mb-1.5 block`}>
                    Expiration Date (Optional)
                  </label>
                  <CalendarPicker
                    value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''}
                    onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                    placeholder="Select Expiration Date"
                    align="left"
                  />
                </div>

                {/* Action Buttons */}
                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} flex gap-3`}>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className={`flex-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'} py-3.5 font-bold uppercase tracking-wider transition cursor-pointer`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/20 hover:opacity-95 transition active:scale-95 cursor-pointer"
                  >
                    <Plus size={16} />
                    {editingId ? 'Save Changes' : 'Add Material'}
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
