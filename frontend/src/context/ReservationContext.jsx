import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getSocket } from '../utils/socket';

const ReservationContext = createContext();

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

// Initialize tables with 12 tables
const initialTables = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  tableNumber: i + 1,
  seats: [2, 4, 6, 8][i % 4],
  status: 'available', // available, reserved, occupied, cleaning
  reservedBy: null,
  reservationDate: null,
  reservationTime: null,
  phone: null
}));

function emitReservationEvent(type, detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('reservation:updated', { detail: { type, ...detail } }));
  }
}

export function ReservationProvider({ children }) {
  const [tables, setTables] = useState(initialTables);
  const [reservations, setReservations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ customers: 0, loading: true });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeOrders, setActiveOrders] = useState([]);

  const syncOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/orders/active`);
      if (!response.ok) throw new Error('Server unreachable');
      const data = await response.json();
      setActiveOrders(data);
    } catch (err) {
      console.error('Error syncing orders:', err);
    }
  }, []);

  const syncNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications`);
      if (!response.ok) throw new Error('Server unreachable');
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error syncing notifications:', err);
    }
  }, []);

  const syncStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/stats`);
      if (!response.ok) throw new Error('Server unreachable');
      const data = await response.json();
      setDashboardStats({ ...data, loading: false });
    } catch (err) {
      console.error('Error syncing stats:', err);
      setDashboardStats(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const syncTables = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tables`);
      if (!response.ok) throw new Error('Server unreachable');
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const nextTables = data.map((t) => ({
          ...t,
          id: t.tableNumber
        }));
        setTables(nextTables);
      }
      setIsServerOffline(false);
    } catch (err) {
      console.error('Error syncing tables:', err);
      setIsServerOffline(true);
    }
  }, []);

  const syncReservations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/reservations`);
      if (!response.ok) throw new Error('Server unreachable');
      const data = await response.json();
      setReservations(data);
      const nextPending = data.filter((item) => item.status === 'pending');
      setPendingRequests(nextPending);
      await syncTables();
      setIsServerOffline(false);
    } catch (err) {
      console.error('Error syncing reservations:', err);
      setIsServerOffline(true);
    }
  }, [syncTables]);

  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      if (response.ok) {
        if (isServerOffline) {
          toast.success('Server back online!');
          syncReservations();
        }
        setIsServerOffline(false);
      } else {
        setIsServerOffline(true);
      }
    } catch {
      setIsServerOffline(true);
    }
  }, [isServerOffline, syncReservations]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedReservations = localStorage.getItem('reservations');
    const savedTables = localStorage.getItem('tables');
    const savedPendingRequests = localStorage.getItem('pendingRequests');

    if (savedReservations) {
      setReservations(JSON.parse(savedReservations));
    }
    if (savedTables) {
      setTables(JSON.parse(savedTables));
    }
    if (savedPendingRequests) {
      setPendingRequests(JSON.parse(savedPendingRequests));
    }

    syncReservations();
    syncTables();
    syncStats();
    syncNotifications();
    syncOrders();

    const healthInterval = setInterval(checkServerHealth, 10000);

    // Initialize Global Socket Listeners
    const socket = getSocket();
    if (socket) {
      console.log('Socket Connected');
      socket.emit('join-admin');
      socket.emit('join-chat');

      const liveEvents = [
        'tables_updated',
        'reservation_updated',
        'reservation_confirmed',
        'reservation_declined',
        'reservation_completed',
        'timeline_updated',
        'new-reservation',
        'table_status_updated',
        'stats_updated',
        'new_notification',
        'unread_count_updated',
        'order_created',
        'order_updated',
        'waiter_call'
      ];

      liveEvents.forEach(event => {
        socket.on(event, (data) => {
          console.log(`Socket Event Received: ${event}`, data);
          if (event === 'stats_updated') {
            setDashboardStats({ ...data, loading: false });
          } else if (event === 'new_notification') {
            setNotifications(prev => [data, ...prev]);
          } else if (event === 'unread_count_updated') {
            setUnreadCount(data.count);
          } else if (event === 'order_created' || event === 'order_updated') {
            syncOrders();
          } else if (event === 'waiter_call') {
            toast(`Table ${data.tableNumber} is calling for service!`, {
              icon: '🔔',
              duration: 5000,
              style: {
                background: '#1a1a1a',
                color: '#ff6b00',
                border: '1px solid #ff6b00',
                fontWeight: 'bold'
              }
            });
            syncNotifications();
          } else {
            syncReservations();
            syncTables();
          }
        });
      });

      return () => {
        clearInterval(healthInterval);
        liveEvents.forEach(event => socket.off(event));
      };
    }

    return () => clearInterval(healthInterval);
  }, [syncReservations, syncTables, syncStats, syncNotifications, checkServerHealth]);

  // Show toast when server goes offline
  useEffect(() => {
    if (isServerOffline) {
      toast.error('Server Offline. Please start backend server.', {
        id: 'server-offline',
        duration: Infinity
      });
    } else {
      toast.dismiss('server-offline');
    }
  }, [isServerOffline]);

  // Save to localStorage whenever reservations, tables, or pending requests change
  useEffect(() => {
    localStorage.setItem('reservations', JSON.stringify(reservations));
    localStorage.setItem('tables', JSON.stringify(tables));
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
  }, [reservations, tables, pendingRequests]);

  const addPendingRequest = (name, phone, date, time, guests, imageUrl = null, metadata = {}, requestId = null) => {
    const request = {
      id: requestId || `req-${Date.now()}`,
      name,
      phone,
      date,
      time,
      guests,
      imageUrl,
      preference: metadata.preference || 'No Preference',
      suggestedTable: metadata.suggestedTable || null,
      confidence: metadata.confidence || 0,
      source: metadata.source || 'manual',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setPendingRequests(prev => [...prev, request]);
    emitReservationEvent('pending-request-added', { request });
    return { success: true, request };
  };

  const updateReservation = useCallback(async (reservationId, updateData) => {
    try {
      const response = await fetch(`${API_BASE}/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();
      if (!data.success) {
        return { success: false, message: data.message || 'Unable to update reservation' };
      }
      await syncReservations();
      return { success: true, reservation: data.reservation };
    } catch (err) {
      console.error('Error updating reservation:', err);
      return { success: false, message: 'Server error updating reservation' };
    }
  }, [syncReservations]);

  const approvePendingRequest = useCallback(async (requestId) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return { success: false, message: 'Request not found' };

    try {
      const response = await fetch(`${API_BASE}/api/reservations/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', tableId: request.suggestedTable || request.tableId || undefined })
      });
      const data = await response.json();
      if (!data.success) {
        return { success: false, message: data.message || 'Unable to confirm request' };
      }
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      await syncReservations();
      return { success: true, reservation: data.reservation };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Unable to confirm request' };
    }
  }, [pendingRequests, syncReservations]);

  const declinePendingRequest = useCallback(async (requestId) => {
    try {
      const response = await fetch(`${API_BASE}/api/reservations/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', reason: 'Cancelled by admin' })
      });
      const data = await response.json();
      if (!data.success) {
        return { success: false, message: data.message || 'Unable to cancel request' };
      }
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      await syncReservations();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Unable to cancel request' };
    }
  }, [syncReservations]);

  const addReservation = useCallback(async (name, phone, date, time, guests, imageUrl = null, preferredTableId = null, duration = 120, vip = false) => {
    try {
      const response = await fetch(`${API_BASE}/api/reservation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          date,
          time,
          guests: parseInt(guests),
          suggestedTable: preferredTableId ? parseInt(preferredTableId) : undefined,
          duration: parseInt(duration),
          vip: Boolean(vip),
          source: 'manual'
        })
      });
      const data = await response.json();
      if (data.success) {
        await syncReservations();
        return { success: true, reservation: data.formattedReservation || data.reservation };
      }
      return { success: false, message: data.message || 'Unable to add reservation' };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Server error' };
    }
  }, [syncReservations]);

  const cancelReservation = useCallback(async (reservationId) => {
    const result = await updateReservation(reservationId, { status: 'cancelled' });
    return result;
  }, [updateReservation]);

  const updateTableStatus = useCallback(async (tableId, status) => {
    try {
      // Optimistic UI update
      setTables(prev =>
        prev.map(t => (t.id === tableId ? { ...t, status } : t))
      );
      await fetch(`${API_BASE}/api/tables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      await syncTables();
    } catch {
      // ignore
    }
  }, [syncTables]);

  const addTableBackend = useCallback(async (tableData) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        return { success: true, table: data.table };
      }
      return { success: false, message: data.message || 'Unable to add table' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables]);

  const updateTableBackend = useCallback(async (tableIdOrNumber, tableData) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/${tableIdOrNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        return { success: true, table: data.table };
      }
      return { success: false, message: data.message || 'Unable to update table' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables]);

  const deleteTableBackend = useCallback(async (tableIdOrNumber) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/${tableIdOrNumber}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        return { success: true };
      }
      return { success: false, message: data.message || 'Unable to delete table' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables]);

  const mergeTablesBackend = useCallback(async (tableNumbers, combinedName) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumbers, combinedName })
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        return { success: true, table: data.table };
      }
      return { success: false, message: data.message || 'Unable to merge tables' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables]);

  const splitTableBackend = useCallback(async (tableNumber) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/split/${tableNumber}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        return { success: true };
      }
      return { success: false, message: data.message || 'Unable to split table' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables]);

  const moveReservationBackend = useCallback(async (sourceTableNumber, targetTableNumber) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/move-reservation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTableNumber, targetTableNumber })
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        await syncReservations();
        return { success: true };
      }
      return { success: false, message: data.message || 'Unable to move reservation' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables, syncReservations]);

  const swapReservationsBackend = useCallback(async (tableNumberA, tableNumberB) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/swap-reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumberA, tableNumberB })
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        await syncReservations();
        return { success: true };
      }
      return { success: false, message: data.message || 'Unable to swap reservations' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables, syncReservations]);

  const transferOrderTableBackend = useCallback(async (sourceTableNumber, targetTableNumber) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/transfer-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTableNumber, targetTableNumber })
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        await syncOrders();
        return { success: true, order: data.order };
      }
      return { success: false, message: data.message || 'Unable to transfer order' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables, syncOrders]);

  const saveLayoutBackend = useCallback(async (layout) => {
    try {
      const response = await fetch(`${API_BASE}/api/tables/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout })
      });
      const data = await response.json();
      if (data.success) {
        await syncTables();
        return { success: true };
      }
      return { success: false, message: data.message || 'Unable to save layout' };
    } catch {
      return { success: false, message: 'Server error' };
    }
  }, [syncTables]);

  const markNotificationAsRead = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PATCH'
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, read: true } : n));
        // unread_count_updated will be sent by server
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const toastId = toast.loading('Refreshing data...');
    try {
      // Parallel fetch for speed
      await Promise.all([
        syncReservations(),
        syncTables(),
        syncStats(),
        syncNotifications()
      ]);
      toast.success('Data refreshed from database', { id: toastId });
    } catch (err) {
      console.error('Refresh failed:', err);
      toast.error('Failed to refresh data', { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, syncReservations, syncTables, syncStats, syncNotifications]);

  const getAvailableTables = () => {
    return tables.filter(t => t.status === 'available');
  };

  const getTotalReservations = () => {
    return reservations.length;
  };

  const value = {
    tables,
    reservations,
    pendingRequests,
    dashboardStats,
    notifications,
    unreadCount,
    activeOrders,
    addReservation,
    addPendingRequest,
    approvePendingRequest,
    declinePendingRequest,
    cancelReservation,
    updateReservation,
    updateTableStatus,
    getAvailableTables,
    getTotalReservations,
    setTables,
    syncReservations,
    syncTables,
    syncOrders,
    isServerOffline,
    isRefreshing,
    refreshData,
    addTableBackend,
    updateTableBackend,
    deleteTableBackend,
    mergeTablesBackend,
    splitTableBackend,
    moveReservationBackend,
    swapReservationsBackend,
    transferOrderTableBackend,
    saveLayoutBackend,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };

  return (
    <ReservationContext.Provider value={value}>
      {children}
    </ReservationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReservation() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation must be used within ReservationProvider');
  }
  return context;
}
