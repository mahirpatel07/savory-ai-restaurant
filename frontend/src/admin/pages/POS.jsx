import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Banknote,
  ChevronDown,
  User,
  Hash,
  X,
  Printer,
  FileText,
  Tag,
  Receipt,
  Sparkles,
  UtensilsCrossed,
  Edit3,
  Percent,
  DollarSign,
  QrCode,
  Layers,
  HeartHandshake,
  Check
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useReservation } from '../../context/ReservationContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import AIUpsellWidget from '../../components/AIUpsellWidget';
import ActiveOrdersDrawer from '../components/ActiveOrdersDrawer';

import { getSocket } from '../../utils/socket';
import { getCategoryImage } from '../../utils/menuData';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

function TableDropdown({ tables, selectedTable, onSelect, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableTables = useMemo(() => {
    return (tables || [])
      .filter(t => t.status === 'available' || t.status === 'occupied' || t.status === 'reserved')
      .sort((a, b) => a.tableNumber - b.tableNumber);
  }, [tables]);

  const selectedObj = useMemo(() => {
    return availableTables.find(t => t.tableNumber === selectedTable);
  }, [availableTables, selectedTable]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Available
          </span>
        );
      case 'occupied':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-500">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Occupied
          </span>
        );
      case 'reserved':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Reserved
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full z-30" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-2xl border ${
          isDark ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'
        } px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer outline-none ${
          isOpen
            ? 'border-orange-500/60 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/10'
            : isDark ? 'hover:border-orange-500/40 hover:bg-white/10' : 'hover:border-orange-500/40 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Hash className="text-orange-500 shrink-0" size={15} />
          {selectedObj ? (
            <div className="flex items-center gap-2 truncate">
              <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Table {selectedObj.tableNumber}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md shrink-0">
                <User size={11} className="text-orange-500" />
                <span>{selectedObj.capacity || selectedObj.seats || 4} Persons</span>
              </span>
              {getStatusBadge(selectedObj.status)}
            </div>
          ) : (
            <span className={isDark ? 'text-white/40' : 'text-gray-500'}>Select Table Number</span>
          )}
        </div>
        <ChevronDown
          className={`${
            isDark ? 'text-white/40' : 'text-gray-500'
          } transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
          size={16}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 right-0 top-full z-50 max-h-60 overflow-y-auto rounded-2xl border ${
              isDark ? 'border-white/15 bg-[#16161a] text-white' : 'border-gray-200 bg-white text-gray-900 shadow-xl'
            } p-1.5 backdrop-blur-2xl custom-scrollbar`}
          >
            {availableTables.length === 0 ? (
              <div className={`p-3 text-center text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                No tables found
              </div>
            ) : (
              availableTables.map((t) => {
                const isSelected = selectedTable === t.tableNumber;
                const seatsCount = t.capacity || t.seats || 4;
                return (
                  <button
                    key={t.tableNumber}
                    type="button"
                    onClick={() => {
                      onSelect(t.tableNumber);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all cursor-pointer my-0.5 ${
                      isSelected
                        ? 'bg-orange-500/20 border border-orange-500/40 text-orange-500 font-black'
                        : isDark
                        ? 'hover:bg-white/10 text-white/80 border border-transparent'
                        : 'hover:bg-gray-100 text-gray-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Table {t.tableNumber}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                        <User size={10} className="text-orange-500" />
                        <span>{seatsCount} Persons</span>
                      </span>
                    </div>
                    {getStatusBadge(t.status)}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function POS() {
  const location = useLocation();
  const { tables, syncTables } = useReservation();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const isDark = theme === 'dark';

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in', 'takeaway', or 'delivery'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [notes, setNotes] = useState('');

  // Discount & Tip State
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' ($) or 'percentage' (%)
  const [tipAmount, setTipAmount] = useState(0);

  // Payment Selection State in Checkout Modal
  const [selectedPayMethod, setSelectedPayMethod] = useState('cash'); // 'cash', 'card', 'upi', 'multiple', 'unpaid'
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialPayAmount, setPartialPayAmount] = useState('');
  const [multiplePayBreakdown, setMultiplePayBreakdown] = useState({ cash: 0, card: 0, upi: 0 });

  // Special instructions note editing for individual cart items
  const [editingNoteItemId, setEditingNoteItemId] = useState(null);

  // Active Orders Sidebar & Editing Order State
  const [activeOrdersDrawerOpen, setActiveOrdersDrawerOpen] = useState(false);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [editingOrder, setEditingOrder] = useState(null);
  const [activeTableOrder, setActiveTableOrder] = useState(null);

  // Modals
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [splitModal, setSplitModal] = useState(false);

  const [splitCount, setSplitCount] = useState(2);
  const [lastOrder, setLastOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.tableNumber) {
      setSelectedTable(location.state.tableNumber);
      setOrderType('dine-in');
    }
    if (location.state?.order) {
      handleStartAddItems(location.state.order);
    }
  }, [location.state]);

  const fetchDishes = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/menu`);
      setDishes(response.data);
      setLoading(false);
    } catch (_error) {
      toast.error('Failed to load menu');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDishes();
    syncTables();

    const socket = getSocket();
    if (socket) {
      socket.on('menu_updated', (updatedDish) => {
        setDishes(prev => prev.map(d => d._id === updatedDish._id ? updatedDish : d));
        if (updatedDish.available === false) {
          setCart(prev => prev.filter(item => item.dishId !== updatedDish._id));
        }
      });

      return () => {
        socket.off('menu_updated');
      };
    }
  }, [fetchDishes, syncTables]);

  // Check if selected table has active orders
  useEffect(() => {
    if (orderType === 'dine-in' && selectedTable) {
      axios.get(`${API_BASE}/api/orders/table/${selectedTable}`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            setActiveTableOrder(res.data[0]);
          } else {
            setActiveTableOrder(null);
          }
        })
        .catch(() => setActiveTableOrder(null));
    } else {
      setActiveTableOrder(null);
    }
  }, [selectedTable, orderType]);

  const categories = useMemo(() => {
    const cats = ['all', ...new Set(dishes.map(d => d.category))];
    return cats;
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    return dishes.filter(dish => {
      const matchesCategory = activeCategory === 'all' || dish.category === activeCategory;
      const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            dish.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [dishes, activeCategory, searchQuery]);

  const addToCart = (dish) => {
    if (dish.available === false) {
      toast.error(`Sorry, ${dish.name} is Sold Out`, { id: 'pos-sold-out' });
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.dishId === dish._id);
      if (existing) {
        return prev.map(item =>
          item.dishId === dish._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        dishId: dish._id,
        name: dish.name,
        price: dish.price,
        quantity: 1,
        image: dish.image,
        notes: ''
      }];
    });
    toast.success(`${dish.name} added`, { duration: 800 });
  };

  const removeFromCart = (dishId) => {
    setCart(prev => prev.filter(item => item.dishId !== dishId));
  };

  const updateQuantity = (dishId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.dishId === dishId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateItemNotes = (dishId, itemNotes) => {
    setCart(prev => prev.map(item => {
      if (item.dishId === dishId) {
        return { ...item, notes: itemNotes };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const loyaltyDiscount = (pointsToUse / 100) * 5;
  const manualDiscount = discountType === 'percentage'
    ? (subtotal * (discountValue || 0) / 100)
    : (discountValue || 0);

  const totalDiscount = Math.min(subtotal, loyaltyDiscount + manualDiscount);
  const tax = Math.max(0, subtotal - totalDiscount) * 0.05; // 5% GST/Tax
  const total = Math.max(0, subtotal - totalDiscount + tax + (tipAmount || 0));

  const existingSubtotal = editingOrder ? (editingOrder.subtotal || 0) : 0;
  const combinedSubtotal = existingSubtotal + subtotal;
  const combinedTax = Math.max(0, combinedSubtotal - totalDiscount) * 0.05;
  const combinedTotal = Math.max(0, combinedSubtotal - totalDiscount + combinedTax + (tipAmount || 0));

  const searchCustomer = async (query) => {
    if (query.length < 3) return;
    try {
      const response = await axios.get(`${API_BASE}/api/customers/search?query=${query}`);
      if (response.data.length > 0) {
        const customer = response.data[0];
        setSelectedCustomer(customer);
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
        toast.success(`Loyalty Member Found: ${customer.name}`);
      }
    } catch (error) {
      console.error('Customer search error:', error);
    }
  };

  const handleStartAddItems = (order) => {
    setEditingOrder(order);
    setCart([]);
    setNotes(order.notes || '');
    if (order.orderType === 'takeaway' || order.orderType === 'dine-in') {
      setOrderType(order.orderType);
    } else {
      setOrderType('dine-in');
    }
    if (order.tableNumber) setSelectedTable(order.tableNumber);
    if (order.customerName) setCustomerName(order.customerName);
    if (order.customerPhone) setCustomerPhone(order.customerPhone);
    toast.success(`Editing Order #${order.orderNumber}. Select dishes to add or update.`, { duration: 3000 });
  };

  const handleAppendItemsToOrder = async () => {
    if (!editingOrder) return;
    if (cart.length === 0) {
      toast.error('Please select at least one item from the menu to add');
      return;
    }

    setIsSubmitting(true);
    try {
      const existingItems = [...(editingOrder.items || [])];

      const updatedItems = existingItems.map(item => ({
        dishId: item.dishId?._id || item.dishId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || '',
        status: item.status || 'pending'
      }));

      cart.forEach(cartItem => {
        const existingIdx = updatedItems.findIndex(
          i => String(i.dishId) === String(cartItem.dishId)
        );
        if (existingIdx >= 0) {
          updatedItems[existingIdx].quantity += cartItem.quantity;
          if (cartItem.notes) {
            updatedItems[existingIdx].notes = cartItem.notes;
          }
        } else {
          updatedItems.push({
            dishId: cartItem.dishId,
            name: cartItem.name,
            price: cartItem.price,
            quantity: cartItem.quantity,
            notes: cartItem.notes || '',
            status: 'pending'
          });
        }
      });

      const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const newTax = Math.max(0, newSubtotal - totalDiscount) * 0.05;
      const newTotalAmount = Math.max(0, newSubtotal - totalDiscount + newTax + (tipAmount || 0));

      const updatePayload = {
        items: updatedItems,
        subtotal: newSubtotal,
        tax: newTax,
        discount: totalDiscount,
        tip: tipAmount || editingOrder.tip || 0,
        totalAmount: newTotalAmount,
        notes: notes || editingOrder.notes || '',
        customerName: customerName || editingOrder.customerName || 'Guest',
        customerPhone: customerPhone || editingOrder.customerPhone || '',
        status: 'pending'
      };

      const response = await axios.patch(`${API_BASE}/api/orders/${editingOrder._id}`, updatePayload);

      if (response.data) {
        toast.success(`Updated Order #${editingOrder.orderNumber} with ${cart.length} new item(s)!`);
        setEditingOrder(null);
        setCart([]);
        setNotes('');
        setTipAmount(0);
        syncTables();
      }
    } catch (error) {
      console.error('Error adding items to order:', error);
      toast.error(error.response?.data?.message || 'Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async (paymentMethod = selectedPayMethod) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (orderType === 'dine-in' && !selectedTable) {
      toast.error('Please select a table number for Dine-In order');
      return;
    }

    setIsSubmitting(true);
    try {
      let paymentsToSubmit = [];
      let payStatus = paymentMethod === 'unpaid' ? 'unpaid' : 'completed';
      let paidVal = paymentMethod === 'unpaid' ? 0 : total;

      if (paymentMethod === 'multiple') {
        const sumMult = (parseFloat(multiplePayBreakdown.cash) || 0) +
                        (parseFloat(multiplePayBreakdown.card) || 0) +
                        (parseFloat(multiplePayBreakdown.upi) || 0);
        if (sumMult <= 0) {
          toast.error('Please enter non-zero amounts for multiple payment methods');
          setIsSubmitting(false);
          return;
        }
        if (parseFloat(multiplePayBreakdown.cash) > 0) paymentsToSubmit.push({ method: 'cash', amount: parseFloat(multiplePayBreakdown.cash) });
        if (parseFloat(multiplePayBreakdown.card) > 0) paymentsToSubmit.push({ method: 'card', amount: parseFloat(multiplePayBreakdown.card) });
        if (parseFloat(multiplePayBreakdown.upi) > 0) paymentsToSubmit.push({ method: 'upi', amount: parseFloat(multiplePayBreakdown.upi) });
        paidVal = sumMult;
        payStatus = paidVal >= total ? 'completed' : 'partially_paid';
      } else if (isPartialPayment && parseFloat(partialPayAmount) > 0) {
        paidVal = Math.min(total, parseFloat(partialPayAmount));
        paymentsToSubmit = [{ method: paymentMethod, amount: paidVal }];
        payStatus = paidVal >= total ? 'completed' : 'partially_paid';
      } else if (paymentMethod !== 'unpaid') {
        paymentsToSubmit = [{ method: paymentMethod, amount: total }];
        paidVal = total;
        payStatus = 'completed';
      }

      const orderData = {
        tableNumber: orderType === 'dine-in' ? selectedTable : null,
        items: cart,
        subtotal,
        tax,
        discount: totalDiscount,
        discountType: pointsToUse > 0 ? 'loyalty' : discountType,
        tip: tipAmount || 0,
        totalAmount: total,
        amountPaid: paidVal,
        remainingAmount: Math.max(0, total - paidVal),
        orderType,
        customerName: customerName || 'Guest',
        customerPhone: customerPhone,
        pointsUsed: pointsToUse,
        paymentMethod,
        payments: paymentsToSubmit,
        paymentStatus: payStatus,
        status: payStatus === 'completed' ? 'completed' : 'pending',
        notes
      };

      const response = await axios.post(`${API_BASE}/api/orders`, orderData);
      toast.success(payStatus === 'partially_paid' ? 'Partial payment recorded & order placed!' : 'Order placed & bill generated!');

      setLastOrder(response.data);
      setReceiptModal(true);

      setCart([]);
      setSelectedTable(null);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedCustomer(null);
      setPointsToUse(0);
      setDiscountValue(0);
      setTipAmount(0);
      setIsPartialPayment(false);
      setPartialPayAmount('');
      setMultiplePayBreakdown({ cash: 0, card: 0, upi: 0 });
      setNotes('');
      setCheckoutModal(false);
      syncTables();
    } catch (error) {
      console.error('POS Order Error:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to place order';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-sans items-start w-full h-auto pb-12">
      {/* ── LEFT COLUMN: DISH SELECTION GRID ── */}
      <div className="flex flex-1 flex-col gap-5 min-w-0 w-full h-auto">
        {/* Search & Category Filter Bar */}
        <div className={`flex flex-col gap-3 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-4 backdrop-blur-2xl shadow-xl`}>
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
              <input
                type="text"
                placeholder="Search dishes or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50 transition-all`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveOrdersDrawerOpen(true)}
              className="relative h-10 px-4 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-md active:scale-95 cursor-pointer"
            >
              <Receipt size={16} />
              <span className="hidden sm:inline">Active Orders</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-black">
                {activeOrdersCount}
              </span>
            </button>


          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide w-full">
            {categories.map(cat => {
              const catImg = getCategoryImage(cat, dishes);
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap h-9 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 flex items-center justify-center gap-2 ${
                    activeCategory === cat
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : isDark ? 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {catImg && (
                    <img
                      src={catImg}
                      alt={cat}
                      className="w-4.5 h-4.5 rounded-full object-cover border border-white/20 shrink-0"
                    />
                  )}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dish Grid */}
        <div className="w-full h-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-500" />
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className={`flex h-full flex-col items-center justify-center py-20 ${isDark ? 'text-white/30 bg-white/[0.02] border-white/5' : 'text-gray-500 bg-gray-50 border-gray-200'} rounded-3xl border`}>
              <p className={`text-sm font-bold ${isDark ? 'text-white/60' : 'text-gray-800'}`}>No dishes found</p>
              <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-600'} mt-1`}>Try searching for a different keyword or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredDishes.map(dish => {
                const isSoldOut = dish.available === false;
                const inCart = cart.find(i => i.dishId === dish._id);

                return (
                  <motion.div
                    key={dish._id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: isSoldOut ? 0 : -3 }}
                    onClick={() => addToCart(dish)}
                    className={`group relative flex flex-col justify-between h-[210px] w-full overflow-hidden rounded-[24px] border p-3 transition-all duration-300 ${
                      isSoldOut
                        ? 'border-rose-500/20 bg-rose-950/10 opacity-60 grayscale-[20%] cursor-not-allowed'
                        : inCart
                        ? isDark ? 'border-orange-500/60 bg-[#18181c] shadow-[0_8px_24px_rgba(249,115,22,0.15)] cursor-pointer text-white' : 'border-orange-500/60 bg-orange-50 shadow-md cursor-pointer text-gray-900'
                        : isDark ? 'border-white/10 bg-[#121215] hover:border-orange-500/40 hover:bg-[#161619] cursor-pointer text-white' : 'border-gray-200 bg-white hover:border-orange-500/40 hover:bg-gray-50 cursor-pointer text-gray-900 shadow-md'
                    }`}
                  >
                    <div className="relative h-28 w-full flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
                      <img
                        src={dish.image?.startsWith('http') ? dish.image : `${API_BASE}${dish.image}`}
                        alt={dish.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                      {isSoldOut ? (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-2 text-center">
                          <span className="bg-rose-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-md tracking-wider shadow-lg border border-rose-400/30">
                            SOLD OUT
                          </span>
                        </div>
                      ) : (
                        <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md transition-all scale-90 group-hover:scale-100">
                          <Plus size={15} />
                        </div>
                      )}

                      {inCart && (
                        <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-black shadow-lg">
                          {inCart.quantity}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between pt-2">
                      <h3 className={`font-bold text-xs ${isDark ? 'text-white/90' : 'text-gray-900'} line-clamp-1 leading-snug group-hover:text-orange-500 transition-colors`}>
                        {dish.name}
                      </h3>

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-orange-500 font-black text-sm">${dish.price.toFixed(2)}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                          {dish.category}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN: CURRENT ORDER CART PANEL (DYNAMIC HEIGHT GROWING VERTICALLY) ── */}
      <div className={`flex w-full lg:w-[380px] flex-shrink-0 flex-col rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 shadow-2xl backdrop-blur-2xl transition-all duration-300 h-auto lg:sticky lg:top-0`}>
        {/* Cart Header */}
        <div className={`mb-4 flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingOrder ? 'Update Order' : 'Current Order'}
              </h2>
              <p className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider`}>
                {editingOrder ? `Appending Order #${editingOrder.orderNumber}` : 'POS Terminal Basket'}
              </p>
            </div>
          </div>
          <span className={`rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50' : 'border-gray-200 bg-gray-100 text-gray-600'} px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}>
            {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
          </span>
        </div>

        {/* Editing Order Mode Banner */}
        {editingOrder ? (
          <div className="mb-4 p-3 rounded-2xl bg-orange-500/15 border border-orange-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-orange-500 font-black text-xs uppercase tracking-tight">
                <Sparkles size={14} />
                <span>Adding to #{editingOrder.orderNumber}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setCart([]);
                  setNotes('');
                }}
                className={`px-2.5 py-1 rounded-xl ${isDark ? 'bg-white/10 text-white/80' : 'bg-gray-200 text-gray-800'} hover:bg-rose-500/20 hover:text-rose-500 text-[10px] font-bold transition-colors`}
              >
                Cancel Edit
              </button>
            </div>

            <div className={`text-[11px] ${isDark ? 'text-white/70' : 'text-gray-700'} font-semibold flex items-center gap-2`}>
              <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                {editingOrder.orderType === 'dine-in' ? `Table ${editingOrder.tableNumber}` : 'Takeaway'}
              </span>
              <span>•</span>
              <span>Customer: {editingOrder.customerName || 'Guest'}</span>
            </div>

            {editingOrder.items && editingOrder.items.length > 0 && (
              <div className={`pt-2 border-t border-orange-500/20 text-[10px] ${isDark ? 'text-white/60' : 'text-gray-600'} space-y-1`}>
                <p className="font-bold uppercase tracking-wider text-orange-500">
                  Existing Items in Order ({editingOrder.items.reduce((s, i) => s + i.quantity, 0)}):
                </p>
                <p className={`truncate ${isDark ? 'text-white/80' : 'text-gray-800'} italic`}>
                  {editingOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {/* Order Type Tabs: Dine-In & Takeaway ONLY */}
            <div className={`flex gap-1.5 p-1 rounded-2xl border ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-100'}`}>
              <button
                onClick={() => setOrderType('dine-in')}
                className={`flex-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  orderType === 'dine-in' ? 'bg-orange-500 text-white shadow-md' : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dine-In
              </button>
              <button
                onClick={() => setOrderType('takeaway')}
                className={`flex-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  orderType === 'takeaway' ? 'bg-orange-500 text-white shadow-md' : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Takeaway
              </button>
            </div>

            {/* Dine-In Table Selection */}
            {orderType === 'dine-in' && (
              <div className="space-y-2">
                <TableDropdown
                  tables={tables}
                  selectedTable={selectedTable}
                  onSelect={(tableNum) => setSelectedTable(tableNum)}
                  isDark={isDark}
                />
                {activeTableOrder && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center justify-between">
                    <span className="font-semibold text-[11px]">Table #{selectedTable} is OCCUPIED with Order #{activeTableOrder.orderNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleStartAddItems(activeTableOrder)}
                      className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Append Items
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Customer Information Input */}
            <div className="relative">
              <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={15} />
              <input
                type="text"
                placeholder="Customer Phone or Name"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  if (e.target.value.length >= 3) searchCustomer(e.target.value);
                }}
                className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50 transition-all`}
              />
            </div>

            {selectedCustomer && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Loyalty Member</span>
                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedCustomer.loyaltyPoints} pts</span>
                </div>
                <div className="flex gap-2">
                  {[0, 100, 500].map(pts => (
                    <button
                      key={pts}
                      disabled={selectedCustomer.loyaltyPoints < pts}
                      onClick={() => setPointsToUse(pts)}
                      className={`flex-1 rounded-xl py-1 text-[9px] font-bold transition-all ${
                        pointsToUse === pts
                          ? 'bg-orange-500 text-white'
                          : isDark ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pts === 0 ? 'None' : `Use ${pts}`}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Cart Items List - Content-Based Dynamic Height (GROWS VERTICALLY) */}
        <div className="flex flex-col gap-2.5 my-2">
          <AnimatePresence initial={false}>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center opacity-30 py-8 text-center">
                <ShoppingCart size={36} className={`mb-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {editingOrder ? 'No new items selected' : 'Cart is empty'}
                </p>
                <p className={`text-[10px] ${isDark ? 'text-white/50' : 'text-gray-600'} mt-0.5`}>
                  {editingOrder
                    ? 'Click dishes on the left to append to this order.'
                    : 'Click dishes on the left to add items.'}
                </p>
              </div>
            ) : (
              cart.map(item => {
                const hasNotes = Boolean(item.notes);
                const isEditingNote = editingNoteItemId === item.dishId;

                return (
                  <motion.div
                    key={item.dishId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`flex flex-col gap-1.5 rounded-2xl border ${isDark ? 'border-white/5 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} p-2.5 transition-all`}
                  >
                    <div className="flex items-center gap-2.5 w-full min-w-0">
                      <img
                        src={item.image?.startsWith('http') ? item.image : `${API_BASE}${item.image}`}
                        alt={item.name}
                        className="h-11 w-11 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate leading-snug`}>{item.name}</h4>
                        <p className="text-[10px] font-black text-orange-500">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>

                      {/* Quantity Modifier */}
                      <div className={`flex items-center gap-1.5 ${isDark ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'} rounded-xl p-1 border shrink-0`}>
                        <button
                          onClick={() => updateQuantity(item.dishId, -1)}
                          className={`h-5 w-5 flex items-center justify-center ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors cursor-pointer`}
                        >
                          <Minus size={11} />
                        </button>
                        <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'} min-w-[14px] text-center`}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.dishId, 1)}
                          className={`h-5 w-5 flex items-center justify-center ${isDark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors cursor-pointer`}
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Add Special Instructions / Kitchen Note */}
                      <button
                        type="button"
                        onClick={() => setEditingNoteItemId(isEditingNote ? null : item.dishId)}
                        className={`p-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                          hasNotes
                            ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                            : isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
                        }`}
                        title="Special Instructions / Kitchen Notes"
                      >
                        <FileText size={13} />
                      </button>

                      {/* Delete Item */}
                      <button
                        onClick={() => removeFromCart(item.dishId)}
                        className="p-1 text-gray-400 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {(isEditingNote || hasNotes) && (
                      <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                        <AlertCircle size={12} className="text-orange-500 shrink-0" />
                        <input
                          type="text"
                          placeholder="Special instructions (e.g. No onions)..."
                          value={item.notes || ''}
                          onChange={(e) => updateItemNotes(item.dishId, e.target.value)}
                          className={`w-full rounded-xl border ${
                            isDark ? 'border-white/10 bg-black/40 text-white placeholder-white/30' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
                          } px-2 py-1 text-[10px] outline-none focus:border-orange-500/50`}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Order Special Instructions / Kitchen Notes */}
        <div className="mt-2 mb-3">
          <input
            type="text"
            placeholder="Order Kitchen Notes (e.g. Serve appetizers first)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2 px-3 text-xs outline-none focus:border-orange-500/50 transition-all`}
          />
        </div>

        {/* Summary Breakdown (Pushed down naturally as items are added) */}
        <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'} space-y-2 mt-auto`}>
          {editingOrder ? (
            <>
              <div className={`flex justify-between text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>
                <span>Existing Items Subtotal</span>
                <span className={`font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>${existingSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-orange-500 font-semibold">
                <span>New Items Subtotal</span>
                <span className="font-bold">+${subtotal.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>
                <span>Total GST / Tax (5%)</span>
                <span className={`font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>${combinedTax.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-lg font-black ${isDark ? 'text-white border-white/5' : 'text-gray-900 border-gray-200'} pt-1 border-t`}>
                <span>Updated Order Total</span>
                <span className="text-orange-500">${combinedTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handleAppendItemsToOrder}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full mt-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/25 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? 'Updating Order...' : `Save & Update Order #${editingOrder.orderNumber}`}
              </button>
            </>
          ) : (
            <>
              <div className={`flex justify-between text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>
                <span>Subtotal</span>
                <span className={`font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>${subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Row */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={isDark ? 'text-white/40' : 'text-gray-600'}>Discount</span>
                  <button
                    type="button"
                    onClick={() => setDiscountModalOpen(true)}
                    className="text-[10px] text-orange-500 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Tag size={10} />
                    <span>{totalDiscount > 0 ? 'Edit' : '+ Add'}</span>
                  </button>
                </div>
                <span className="font-bold text-emerald-500">
                  {totalDiscount > 0 ? `-$${totalDiscount.toFixed(2)}` : '$0.00'}
                </span>
              </div>

              <div className={`flex justify-between text-xs ${isDark ? 'text-white/40' : 'text-gray-600'}`}>
                <span>GST / Tax (5%)</span>
                <span className={`font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>${tax.toFixed(2)}</span>
              </div>

              {/* Tip / Gratuity Row */}
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? 'text-white/40' : 'text-gray-600'}>Tip / Gratuity</span>
                <div className="flex items-center gap-1">
                  <span className="text-orange-500 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={tipAmount || ''}
                    onChange={(e) => setTipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={`w-14 text-right rounded-lg border ${isDark ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} py-0.5 px-1.5 text-xs font-bold outline-none focus:border-orange-500`}
                  />
                </div>
              </div>

              <div className={`flex justify-between text-lg font-black ${isDark ? 'text-white border-white/5' : 'text-gray-900 border-gray-200'} pt-1 border-t`}>
                <span>Total</span>
                <span className="text-orange-500">${total.toFixed(2)}</span>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setSplitModal(true)}
                  className={`w-full py-2.5 rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'} text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer`}
                >
                  <span>Split Bill</span>
                </button>
              </div>

              <button
                onClick={() => setCheckoutModal(true)}
                disabled={cart.length === 0 || (orderType === 'dine-in' && !selectedTable)}
                className="w-full mt-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/25 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Checkout &amp; Bill
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Orders Drawer Component */}
      <ActiveOrdersDrawer
        isOpen={activeOrdersDrawerOpen}
        onClose={() => setActiveOrdersDrawerOpen(false)}
        onAddItemsToOrder={handleStartAddItems}
        activeOrdersCount={activeOrdersCount}
        onOrdersCountChange={(count) => setActiveOrdersCount(count)}
      />

      {/* Discount Modal */}
      <AnimatePresence>
        {discountModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[32px] border ${isDark ? 'border-white/10 bg-[#0e0e11] text-white' : 'border-gray-200 bg-white text-gray-900 shadow-2xl'} p-6 shadow-2xl space-y-5`}
            >
              <div className={`flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-gray-200'} pb-3`}>
                <div className="flex items-center gap-2 text-orange-500 font-black">
                  <Tag size={18} />
                  <h3 className="text-base uppercase tracking-tight">Apply Custom Discount</h3>
                </div>
                <button
                  onClick={() => setDiscountModalOpen(false)}
                  className={`p-1.5 rounded-xl ${isDark ? 'bg-white/5 text-white/50 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className={`flex p-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'}`}>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                      discountType === 'fixed' ? 'bg-orange-500 text-white shadow-md' : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <DollarSign size={13} />
                    <span>Fixed ($)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                      discountType === 'percentage' ? 'bg-orange-500 text-white shadow-md' : isDark ? 'text-white/40 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Percent size={13} />
                    <span>Percentage (%)</span>
                  </button>
                </div>

                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Discount Amount ({discountType === 'percentage' ? '%' : '$'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : subtotal}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={`w-full mt-1 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} py-2.5 px-4 text-base font-bold outline-none focus:border-orange-500/50`}
                  />
                </div>

                <div className="flex gap-2">
                  {[5, 10, 15, 20].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDiscountValue(val)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-bold ${
                        discountValue === val
                          ? 'bg-orange-500 text-white border-orange-500'
                          : isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {discountType === 'percentage' ? `${val}%` : `$${val}`}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setDiscountModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
                >
                  Apply Discount
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout & Bill Payment Modal */}
      <AnimatePresence>
        {checkoutModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-lg rounded-[32px] border ${isDark ? 'border-white/10 bg-[#0e0e11] text-white' : 'border-gray-200 bg-white text-gray-900 shadow-2xl'} p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar`}
            >
              <div className={`flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-gray-200'} pb-4`}>
                <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>Complete Payment &amp; Bill</h2>
                <button
                  onClick={() => setCheckoutModal(false)}
                  className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900'} p-2 cursor-pointer`}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Summary Box */}
                <div className={`rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} p-4 space-y-2.5`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} uppercase font-bold tracking-wider`}>Final Payable</span>
                    <span className="text-2xl font-black text-orange-500">${total.toFixed(2)}</span>
                  </div>
                  <div className={`grid grid-cols-3 gap-2 text-[10px] font-bold ${isDark ? 'text-white/50' : 'text-gray-600'} pt-2 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                    <div>Subtotal: ${(subtotal - totalDiscount).toFixed(2)}</div>
                    <div>Tax (5%): ${tax.toFixed(2)}</div>
                    <div>Tip: ${(tipAmount || 0).toFixed(2)}</div>
                  </div>
                </div>

                {/* Tip / Gratuity Selector */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-1 mb-1.5`}>
                    <HeartHandshake size={12} className="text-orange-500" /> Add Tip / Gratuity
                  </label>
                  <div className="flex gap-2">
                    {[0, 2, 5, 10].map(tipVal => (
                      <button
                        key={tipVal}
                        type="button"
                        onClick={() => setTipAmount(tipVal)}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          tipAmount === tipVal
                            ? 'bg-orange-500 text-white border-orange-500'
                            : isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tipVal === 0 ? 'None' : `$${tipVal}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Tabs */}
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'card', label: 'Card', icon: CreditCard },
                      { id: 'upi', label: 'UPI', icon: QrCode },
                      { id: 'multiple', label: 'Split', icon: Layers }
                    ].map(method => {
                      const Icon = method.icon;
                      const isSel = selectedPayMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedPayMethod(method.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                              : isDark ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon size={18} className="mb-1" />
                          <span className="text-[10px] uppercase font-black">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UPI QR / ID Preview */}
                {selectedPayMethod === 'upi' && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                    <p className="text-xs font-bold text-orange-400">Scan QR or Pay to UPI ID</p>
                    <div className="bg-white p-3 rounded-2xl inline-block shadow-md">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x180&data=${encodeURIComponent(`upi://pay?pa=savory@upi&pn=SAVORY&am=${total.toFixed(2)}&cu=USD`)}`}
                        alt="UPI Payment QR"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                    <p className="text-[11px] font-mono text-white/70">UPI ID: <span className="font-bold text-white">savory@upi</span></p>
                  </motion.div>
                )}

                {/* Multiple Payment Method Breakdown Input */}
                {selectedPayMethod === 'multiple' && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
                    <p className="font-bold text-orange-400 uppercase text-[10px] tracking-wider">Split Across Methods</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] text-white/50 uppercase font-bold">Cash ($)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={multiplePayBreakdown.cash || ''}
                          onChange={(e) => setMultiplePayBreakdown({ ...multiplePayBreakdown, cash: parseFloat(e.target.value) || 0 })}
                          className={`w-full mt-1 p-2 rounded-xl border ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-white/50 uppercase font-bold">Card ($)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={multiplePayBreakdown.card || ''}
                          onChange={(e) => setMultiplePayBreakdown({ ...multiplePayBreakdown, card: parseFloat(e.target.value) || 0 })}
                          className={`w-full mt-1 p-2 rounded-xl border ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-white/50 uppercase font-bold">UPI ($)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={multiplePayBreakdown.upi || ''}
                          onChange={(e) => setMultiplePayBreakdown({ ...multiplePayBreakdown, upi: parseFloat(e.target.value) || 0 })}
                          className={`w-full mt-1 p-2 rounded-xl border ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Partial Payment Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="partialCheck"
                      checked={isPartialPayment}
                      onChange={(e) => setIsPartialPayment(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 text-orange-500 focus:ring-orange-500"
                    />
                    <label htmlFor="partialCheck" className="font-bold cursor-pointer">Accept Partial Payment</label>
                  </div>
                  {isPartialPayment && (
                    <input
                      type="number"
                      placeholder={`Max $${total.toFixed(2)}`}
                      value={partialPayAmount}
                      onChange={(e) => setPartialPayAmount(e.target.value)}
                      className={`w-28 p-1.5 rounded-xl border ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                    />
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => handleCheckout(selectedPayMethod)}
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/25 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Processing Payment...' : `Settle & Generate Invoice ($${total.toFixed(2)})`}
                  </button>

                  <button
                    onClick={() => handleCheckout('unpaid')}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 py-3 text-xs font-bold uppercase tracking-wider text-orange-500 hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Clock size={16} />
                    <span>Send to Kitchen (Pay Later)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bill Splitting Modal */}
      <AnimatePresence>
        {splitModal && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`w-full max-w-sm rounded-[32px] border ${isDark ? 'border-white/10 bg-[#0e0e11] text-white' : 'border-gray-200 bg-white text-gray-900 shadow-2xl'} p-6 shadow-2xl`}>
              <div className={`flex items-center justify-between mb-6 pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                 <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>Split Bill Calculator</h2>
                 <button onClick={() => setSplitModal(false)} className={`p-2 rounded-2xl ${isDark ? 'bg-white/5 text-white/40 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}><X size={18} /></button>
              </div>

              <div className="space-y-5">
                 <div className={`text-center p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-white/40' : 'text-gray-600'} tracking-wider mb-1`}>Each Person Pays</p>
                    <p className="text-3xl font-black text-orange-500">${(total / splitCount).toFixed(2)}</p>
                 </div>

                 <div className={`flex items-center justify-between px-2 font-bold text-xs ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                    <span className={isDark ? 'text-white/50' : 'text-gray-600'}>Number of Ways</span>
                    <div className="flex items-center gap-3">
                       <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className={`h-9 w-9 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-200 text-gray-800'} flex items-center justify-center font-black text-base cursor-pointer`}>-</button>
                       <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{splitCount}</span>
                       <button onClick={() => setSplitCount(splitCount + 1)} className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-base hover:bg-orange-600 cursor-pointer">+</button>
                    </div>
                 </div>

                 <button onClick={() => setSplitModal(false)} className={`w-full py-3 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200'} text-xs font-bold uppercase tracking-wider cursor-pointer`}>Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Receipt & Digital Invoice Modal */}
      <AnimatePresence>
        {receiptModal && lastOrder && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div
              id="printable-receipt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-[32px] border border-white/10 bg-white p-7 text-black shadow-2xl"
            >
              <div className="text-center mb-5 flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white font-black mb-2 shadow-sm border border-black">
                  <UtensilsCrossed size={22} className="text-white" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic text-black leading-none">SAVORY</h2>
                <p className="text-[9px] font-bold text-black/60 tracking-[0.3em] uppercase mt-1">POS Digital Invoice &amp; Receipt</p>
              </div>

              <div className="space-y-1.5 border-y border-black/10 py-3 my-3 border-dashed text-[11px]">
                <div className="flex justify-between font-bold text-black/50 uppercase">
                  <span>Invoice No</span>
                  <span className="text-black font-mono font-bold">{lastOrder.invoiceNumber || lastOrder.orderNumber?.replace('ORD-', 'INV-')}</span>
                </div>
                <div className="flex justify-between font-bold text-black/50 uppercase">
                  <span>Order No</span>
                  <span className="text-black font-mono font-bold">{lastOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between font-bold text-black/50 uppercase">
                  <span>Type</span>
                  <span className="text-black font-bold uppercase">
                    {lastOrder.orderType} {lastOrder.tableNumber ? `(Table ${lastOrder.tableNumber})` : ''}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-black/50 uppercase">
                  <span>Customer</span>
                  <span className="text-black font-bold">{lastOrder.customerName || 'Guest'}</span>
                </div>
                <div className="flex justify-between font-bold text-black/50 uppercase">
                  <span>Date &amp; Time</span>
                  <span className="text-black">{new Date(lastOrder.createdAt || Date.now()).toLocaleString()}</span>
                </div>
              </div>

              {/* Receipt Items */}
              <div className="space-y-1.5 my-3 text-xs">
                <div className="flex justify-between font-black text-black/40 uppercase text-[9px] pb-1 border-b border-black/10">
                  <span>Item</span>
                  <span>Qty x Price</span>
                  <span>Amount</span>
                </div>
                {lastOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="flex justify-between font-bold text-black text-[11px]">
                      <span className="truncate max-w-[140px]">{item.name}</span>
                      <span className="text-black/60 font-medium">{item.quantity} x ${item.price}</span>
                      <span className="font-mono">${(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                    {item.notes && (
                      <span className="text-[9px] text-black/60 italic pl-2">
                        * Note: {item.notes}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Financial Totals Breakdown */}
              <div className="border-t border-black/10 pt-2.5 space-y-1 text-xs font-bold">
                <div className="flex justify-between text-black/60">
                  <span>Subtotal</span>
                  <span>${(lastOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                {(lastOrder.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-${(lastOrder.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-black/60">
                  <span>GST / Tax (5%)</span>
                  <span>${(lastOrder.tax || 0).toFixed(2)}</span>
                </div>
                {(lastOrder.tip || 0) > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Tip / Gratuity</span>
                    <span>+${(lastOrder.tip || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-black pt-1.5 border-t border-black/10">
                  <span>Final Total</span>
                  <span>${(lastOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 font-bold pt-1">
                  <span>Amount Paid ({lastOrder.paymentMethod?.toUpperCase() || 'PAID'})</span>
                  <span>${(lastOrder.amountPaid || lastOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
                {(lastOrder.remainingAmount || 0) > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-black">
                    <span>Remaining Balance</span>
                    <span>${(lastOrder.remainingAmount || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Receipt Footer & Actions */}
              <div className="mt-5 pt-3 border-t border-dashed border-black/20 flex flex-col items-center gap-2.5">
                <p className="text-[9px] font-bold text-black/50 uppercase tracking-widest text-center">
                  Thank you for dining with us!
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={() => setReceiptModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-black/20 text-xs font-bold uppercase hover:bg-black/5 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
