import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  RefreshCw,
  Clock,
  User,
  Hash,
  UtensilsCrossed,
  Plus,
  Ban,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  CreditCard,
  Banknote,
  Trash2,
  MapPin,
  Truck,
  FileText,
  QrCode,
  Layers,
  HeartHandshake,
  DollarSign
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getSocket } from '../../utils/socket';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function ActiveOrdersDrawer({
  isOpen,
  onClose,
  onAddItemsToOrder,
  activeOrdersCount,
  onOrdersCountChange
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'dine-in', 'takeaway', 'delivery'
  const [expandedOrders, setExpandedOrders] = useState({});
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [confirmCancelModal, setConfirmCancelModal] = useState(null);

  // Payment Modal State
  const [payingOrder, setPayingOrder] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [payMethod, setPayMethod] = useState('cash'); // 'cash', 'card', 'upi', 'multiple'
  const [tipVal, setTipVal] = useState(0);
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmountVal, setPartialAmountVal] = useState('');
  const [splitBreakdown, setSplitBreakdown] = useState({ cash: 0, card: 0, upi: 0 });

  // Fetch active orders from backend
  const fetchActiveOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/orders/active`);
      setOrders(response.data || []);
      if (onOrdersCountChange) {
        onOrdersCountChange(response.data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching active orders:', error);
      toast.error('Failed to load active orders');
    } finally {
      setLoading(false);
    }
  }, [onOrdersCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchActiveOrders();
    }
  }, [isOpen, fetchActiveOrders]);

  // Socket listener for real-time order updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOrderEvent = () => {
      fetchActiveOrders();
    };

    socket.on('order_created', handleOrderEvent);
    socket.on('order_updated', handleOrderEvent);
    socket.on('bill_paid', handleOrderEvent);

    return () => {
      socket.off('order_created', handleOrderEvent);
      socket.off('order_updated', handleOrderEvent);
      socket.off('bill_paid', handleOrderEvent);
    };
  }, [fetchActiveOrders]);

  // Toggle expanded view for order items
  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Handle Order Status Update
  const handleUpdateOrderStatus = async (order, newStatus) => {
    try {
      const response = await axios.patch(`${API_BASE}/api/orders/${order._id}`, {
        status: newStatus,
        ...(newStatus === 'completed' || newStatus === 'paid' ? { paymentStatus: 'completed' } : {})
      });
      if (response.data) {
        toast.success(`Order #${order.orderNumber} updated to ${newStatus.toUpperCase()}`);
        fetchActiveOrders();
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  // Handle Complete or Partial Payment
  const handleCompletePayment = async (order) => {
    if (order.paymentStatus === 'completed' || order.paymentStatus === 'paid') {
      toast.error(`Order #${order.orderNumber} is already fully paid.`);
      setPayingOrder(null);
      return;
    }

    setIsProcessingPayment(true);
    try {
      let paymentsArr = [];
      let payAmt = Math.max(0, (order.remainingAmount !== undefined && order.remainingAmount > 0 ? order.remainingAmount : order.totalAmount) - (order.amountPaid || 0));

      if (payMethod === 'multiple') {
        const sumMult = (parseFloat(splitBreakdown.cash) || 0) +
                        (parseFloat(splitBreakdown.card) || 0) +
                        (parseFloat(splitBreakdown.upi) || 0);
        if (sumMult <= 0) {
          toast.error('Please enter valid split payment amounts');
          setIsProcessingPayment(false);
          return;
        }
        if (parseFloat(splitBreakdown.cash) > 0) paymentsArr.push({ method: 'cash', amount: parseFloat(splitBreakdown.cash) });
        if (parseFloat(splitBreakdown.card) > 0) paymentsArr.push({ method: 'card', amount: parseFloat(splitBreakdown.card) });
        if (parseFloat(splitBreakdown.upi) > 0) paymentsArr.push({ method: 'upi', amount: parseFloat(splitBreakdown.upi) });
        payAmt = sumMult;
      } else if (isPartial && parseFloat(partialAmountVal) > 0) {
        payAmt = Math.min(order.totalAmount, parseFloat(partialAmountVal));
        paymentsArr = [{ method: payMethod, amount: payAmt }];
      } else {
        paymentsArr = [{ method: payMethod, amount: payAmt }];
      }

      const payload = {
        paymentMethod: payMethod,
        amount: payAmt,
        payments: paymentsArr,
        tip: tipVal || 0
      };

      const response = await axios.post(`${API_BASE}/api/orders/${order._id}/pay`, payload);
      if (response.data) {
        toast.success(`Payment recorded for Order #${order.orderNumber}!`);
        setPayingOrder(null);
        setTipVal(0);
        setIsPartial(false);
        setPartialAmountVal('');
        setSplitBreakdown({ cash: 0, card: 0, upi: 0 });
        fetchActiveOrders();
      }
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error(error.response?.data?.message || 'Failed to complete payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Delete Item from Order
  const handleDeleteItemFromOrder = async (order, itemIndex) => {
    const itemToDelete = order.items[itemIndex];
    const updatedItems = order.items.filter((_, idx) => idx !== itemIndex);

    if (updatedItems.length === 0) {
      if (window.confirm(`Removing "${itemToDelete?.name}" will leave Order #${order.orderNumber} empty. Cancel order instead?`)) {
        handleCancelOrder(order);
      }
      return;
    }

    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newTax = Math.max(0, newSubtotal) * 0.05;
    const newTotalAmount = newSubtotal + newTax;

    try {
      const response = await axios.patch(`${API_BASE}/api/orders/${order._id}`, {
        items: updatedItems,
        subtotal: newSubtotal,
        tax: newTax,
        totalAmount: newTotalAmount
      });

      if (response.data) {
        toast.success(`Removed "${itemToDelete?.name}" from Order #${order.orderNumber}`);
        fetchActiveOrders();
      }
    } catch (error) {
      console.error('Failed to delete item from order:', error);
      toast.error(error.response?.data?.message || 'Failed to remove item');
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (order) => {
    setCancellingOrderId(order._id);
    try {
      const response = await axios.patch(`${API_BASE}/api/orders/${order._id}`, {
        status: 'cancelled'
      });
      if (response.data) {
        toast.success(`Order #${order.orderNumber} cancelled successfully`);
        fetchActiveOrders();
        setConfirmCancelModal(null);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesFilter = filterType === 'all' || order.orderType === filterType;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      order.orderNumber?.toLowerCase().includes(q) ||
      (order.tableNumber && String(order.tableNumber).includes(q)) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerPhone && order.customerPhone.includes(q)) ||
      (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending
          </span>
        );
      case 'preparing':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-spin" />
            Preparing
          </span>
        );
      case 'ready':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Ready
          </span>
        );
      case 'served':
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            Completed
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white/60">
            {status}
          </span>
        );
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[990] bg-black/70 backdrop-blur-md"
          />

          {/* Centered Modal Container */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto flex w-full max-w-4xl max-h-[85vh] flex-col rounded-[32px] border border-white/15 bg-[#101014] p-6 shadow-2xl text-white font-sans overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-black uppercase tracking-tight text-white">Active Orders</h2>
                      <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-black text-black">
                        {orders.length} Active
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      Live Restaurant POS Orders Command Center
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchActiveOrders}
                    disabled={loading}
                    className="p-2.5 rounded-2xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                    title="Refresh orders"
                  >
                    <RefreshCw size={18} className={loading ? 'animate-spin text-orange-400' : ''} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-2xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="py-4 space-y-3 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search by Order #, Table #, Customer Name, Address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 outline-none focus:border-orange-500/50 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Order Type Tabs */}
                <div className="flex gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/5 shrink-0">
                  {['all', 'dine-in', 'takeaway'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 rounded-xl py-2 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        filterType === type
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {type === 'all' ? 'All Active' : type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Grid Body */}
              <div className="flex-1 overflow-y-auto pt-4 pr-1 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
                {loading && orders.length === 0 ? (
                  <div className="col-span-full flex h-48 flex-col items-center justify-center gap-2 text-white/40">
                    <RefreshCw size={28} className="animate-spin text-orange-400" />
                    <span className="text-xs font-bold">Loading active orders...</span>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="col-span-full flex h-64 flex-col items-center justify-center p-8 text-center text-white/30 rounded-3xl border border-white/5 bg-white/[0.02]">
                    <UtensilsCrossed size={42} className="mb-3 text-white/20" />
                    <p className="text-sm font-bold text-white/60">No Active Orders Found</p>
                    <p className="text-xs text-white/40 mt-1">
                      {searchQuery
                        ? 'No active orders match your search query.'
                        : 'There are currently no pending or active orders.'}
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const isExpanded = expandedOrders[order._id] !== false;
                    const itemsCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                    const isFullyPaid = order.paymentStatus === 'completed' || order.status === 'paid' || order.status === 'completed';
                    const isPartiallyPaid = order.paymentStatus === 'partially_paid';

                    return (
                      <motion.div
                        key={order._id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-white/10 bg-[#16161c] p-4 shadow-lg hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-3"
                      >
                        {/* Top Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-orange-400">
                                {order.orderNumber}
                              </span>
                              {getStatusBadge(order.status)}
                            </div>

                            <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-white/70">
                              <span className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-lg">
                                {order.orderType === 'dine-in' ? (
                                  <>
                                    <Hash size={11} className="text-orange-400" />
                                    <span>Table {order.tableNumber || 'N/A'}</span>
                                  </>
                                ) : order.orderType === 'delivery' ? (
                                  <>
                                    <Truck size={11} className="text-orange-400" />
                                    <span>Delivery</span>
                                  </>
                                ) : (
                                  <span>Takeaway</span>
                                )}
                              </span>
                              <span className="flex items-center gap-1 text-white/40 text-[10px]">
                                <Clock size={11} />
                                {formatTime(order.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-white">
                              ${(order.totalAmount || 0).toFixed(2)}
                            </span>
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${isFullyPaid ? 'text-emerald-400' : isPartiallyPaid ? 'text-blue-400' : 'text-amber-400'}`}>
                              {isFullyPaid ? `PAID (${order.paymentMethod || 'completed'})` : isPartiallyPaid ? `PARTIAL ($${(order.amountPaid||0).toFixed(2)})` : 'UNPAID'}
                            </p>
                          </div>
                        </div>

                        {/* Status Management Dropdown */}
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Change Status:</span>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order, e.target.value)}
                            className="bg-black/50 text-orange-400 font-bold text-xs rounded-lg px-2 py-1 outline-none border border-orange-500/30 cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Customer & Delivery Info */}
                        {(order.customerName || order.deliveryAddress) && (
                          <div className="space-y-1 text-[10px] text-white/60 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                            {order.customerName && order.customerName !== 'Guest' && (
                              <div className="flex items-center gap-1.5">
                                <User size={11} className="text-orange-400 shrink-0" />
                                <span className="font-semibold text-white/80">{order.customerName}</span>
                                {order.customerPhone && (
                                  <span className="text-white/40">({order.customerPhone})</span>
                                )}
                              </div>
                            )}
                            {order.deliveryAddress && (
                              <div className="flex items-center gap-1.5 text-orange-400">
                                <MapPin size={11} className="shrink-0" />
                                <span className="truncate">{order.deliveryAddress}</span>
                              </div>
                            )}
                            {order.notes && (
                              <div className="flex items-center gap-1.5 text-amber-400 italic pt-0.5 border-t border-white/5">
                                <FileText size={10} className="shrink-0" />
                                <span className="truncate">Note: {order.notes}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Items Preview / Collapsible */}
                        <div className="rounded-xl border border-white/5 bg-black/30 p-2.5 space-y-2 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(order._id)}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-white/50 uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
                          >
                            <span>Items Ordered ({itemsCount})</span>
                            <span className="flex items-center gap-1">
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="space-y-1.5 pt-1.5 border-t border-white/5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                              {order.items?.map((item, idx) => (
                                <div
                                  key={item._id || idx}
                                  className="flex flex-col text-xs py-1 border-b border-white/[0.03] last:border-0"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-orange-500/20 text-orange-400 font-bold text-[10px] shrink-0">
                                        {item.quantity}x
                                      </span>
                                      <span className="text-white/90 font-medium truncate text-[11px]">
                                        {item.name}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-bold text-white/60 text-[11px]">
                                        ${((item.price || 0) * item.quantity).toFixed(2)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteItemFromOrder(order, idx);
                                        }}
                                        className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all opacity-80 hover:opacity-100 cursor-pointer"
                                        title={`Delete ${item.name}`}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>

                                  {item.notes && (
                                    <p className="text-[10px] text-orange-400 italic pl-6 pt-0.5">
                                      * Note: {item.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {!isFullyPaid ? (
                            <button
                              type="button"
                              onClick={() => setPayingOrder(order)}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all active:scale-95 cursor-pointer shadow-md"
                            >
                              <CreditCard size={14} />
                              <span>{isPartiallyPaid ? 'Settle Balance' : 'Pay Bill'}</span>
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-400">
                              <CheckCircle2 size={14} />
                              <span>Paid</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onAddItemsToOrder(order);
                              onClose();
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-500 hover:text-white transition-all active:scale-95 cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Edit Order</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmCancelModal(order)}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95 cursor-pointer"
                            title="Cancel Order"
                          >
                            <Ban size={14} />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>

          {/* Payment Modal */}
          <AnimatePresence>
            {payingOrder && (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 backdrop-blur-md bg-black/75">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="w-full max-w-md rounded-[32px] border border-white/15 bg-[#0e0e12] p-7 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-white">
                          Settle Order #{payingOrder.orderNumber}
                        </h3>
                        <p className="text-[10px] text-white/50 uppercase font-semibold">
                          Invoice: {payingOrder.invoiceNumber || payingOrder.orderNumber.replace('ORD-', 'INV-')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPayingOrder(null)}
                      className="p-2 rounded-xl bg-white/5 text-white/50 hover:text-white cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Total Due</span>
                      <span className="text-2xl font-black text-orange-400">
                        ${(payingOrder.remainingAmount !== undefined && payingOrder.remainingAmount > 0 ? payingOrder.remainingAmount : (payingOrder.totalAmount || 0) - (payingOrder.amountPaid || 0)).toFixed(2)}
                      </span>
                    </div>
                    {payingOrder.amountPaid > 0 && (
                      <div className="flex justify-between text-xs text-emerald-400 font-bold pt-1 border-t border-white/5">
                        <span>Already Paid</span>
                        <span>${payingOrder.amountPaid.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'card', label: 'Card', icon: CreditCard },
                        { id: 'upi', label: 'UPI', icon: QrCode },
                        { id: 'multiple', label: 'Split', icon: Layers }
                      ].map(m => {
                        const Icon = m.icon;
                        const isSel = payMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPayMethod(m.id)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                              isSel
                                ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <Icon size={16} className="mb-1" />
                            <span className="text-[9px] uppercase font-black">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* UPI QR Code Preview */}
                  {payMethod === 'upi' && (
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                      <div className="bg-white p-2 rounded-xl inline-block shadow-md">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=savory@upi&pn=SAVORY&am=${payingOrder.remainingAmount || payingOrder.totalAmount}&cu=USD`)}`}
                          alt="UPI QR Code"
                          className="w-24 h-24 object-contain"
                        />
                      </div>
                      <p className="text-[10px] font-mono text-white/70">UPI ID: <span className="font-bold text-white">savory@upi</span></p>
                    </div>
                  )}

                  {/* Split Methods Breakdown */}
                  {payMethod === 'multiple' && (
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                      <p className="font-bold text-orange-400 uppercase text-[10px]">Split Payment Breakdown</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-white/50 uppercase font-bold">Cash ($)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={splitBreakdown.cash || ''}
                            onChange={(e) => setSplitBreakdown({ ...splitBreakdown, cash: parseFloat(e.target.value) || 0 })}
                            className="w-full mt-1 p-2 rounded-xl border bg-black/40 border-white/10 text-white text-xs font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-white/50 uppercase font-bold">Card ($)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={splitBreakdown.card || ''}
                            onChange={(e) => setSplitBreakdown({ ...splitBreakdown, card: parseFloat(e.target.value) || 0 })}
                            className="w-full mt-1 p-2 rounded-xl border bg-black/40 border-white/10 text-white text-xs font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-white/50 uppercase font-bold">UPI ($)</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={splitBreakdown.upi || ''}
                            onChange={(e) => setSplitBreakdown({ ...splitBreakdown, upi: parseFloat(e.target.value) || 0 })}
                            className="w-full mt-1 p-2 rounded-xl border bg-black/40 border-white/10 text-white text-xs font-bold outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Partial Payment Option */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="partialCheckDrawer"
                        checked={isPartial}
                        onChange={(e) => setIsPartial(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="partialCheckDrawer" className="font-bold cursor-pointer">Partial Payment</label>
                    </div>
                    {isPartial && (
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={partialAmountVal}
                        onChange={(e) => setPartialAmountVal(e.target.value)}
                        className="w-28 p-1.5 rounded-xl border bg-black/40 border-white/10 text-white text-xs font-bold outline-none"
                      />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={isProcessingPayment}
                      onClick={() => handleCompletePayment(payingOrder)}
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingPayment ? 'Processing...' : 'Confirm & Process Payment'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayingOrder(null)}
                      className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Confirm Cancel Modal */}
          <AnimatePresence>
            {confirmCancelModal && (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 backdrop-blur-md bg-black/70">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#121217] p-6 shadow-2xl text-white space-y-4"
                >
                  <div className="flex items-center gap-3 text-rose-400">
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-white">
                        Cancel Order #{confirmCancelModal.orderNumber}?
                      </h3>
                      <p className="text-[10px] text-white/50 uppercase font-semibold">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                    Are you sure you want to cancel order <span className="font-bold text-white">{confirmCancelModal.orderNumber}</span>?
                    {confirmCancelModal.orderType === 'dine-in' && confirmCancelModal.tableNumber && (
                      <span className="block mt-1 text-orange-400">
                        • Table {confirmCancelModal.tableNumber} will be freed up.
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmCancelModal(null)}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white/70 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      No, Keep Order
                    </button>
                    <button
                      type="button"
                      disabled={cancellingOrderId === confirmCancelModal._id}
                      onClick={() => handleCancelOrder(confirmCancelModal)}
                      className="flex-1 py-2.5 rounded-xl bg-rose-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-500/25 hover:bg-rose-600 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {cancellingOrderId === confirmCancelModal._id ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
