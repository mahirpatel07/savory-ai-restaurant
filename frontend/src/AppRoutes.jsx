import React, { lazy, useEffect, useRef } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import gsap from 'gsap'
import App from './App.jsx'
import AdminLayout from './admin/AdminLayout'
import { useAuth } from './context/AuthContext'

const Dashboard = lazy(() => import('./admin/pages/Dashboard.jsx'))
const Reservations = lazy(() => import('./admin/pages/Reservations.jsx'))
const DailyReservations = lazy(() => import('./admin/pages/DailyReservations.jsx'))
const TableManagement = lazy(() => import('./admin/pages/TableManagement.jsx'))
const MenuManagement = lazy(() => import('./admin/pages/MenuManagement.jsx'))
const AIAssistant = lazy(() => import('./admin/pages/AIAssistant.jsx'))
const POS = lazy(() => import('./admin/pages/POS.jsx'))
const KDS = lazy(() => import('./admin/pages/KDS.jsx'))
const Inventory = lazy(() => import('./admin/pages/Inventory.jsx'))
const CustomerReviews = lazy(() => import('./admin/pages/CustomerReviews.jsx'))
const StaffManagement = lazy(() => import('./admin/pages/StaffManagement.jsx'))
const RestaurantSettings = lazy(() => import('./admin/pages/RestaurantSettings.jsx'))
const LoginPage = lazy(() => import('./admin/pages/LoginPage.jsx'))
const CustomerMenu = lazy(() => import('./components/CustomerMenu.jsx'))

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default function AppRoutes() {
  const location = useLocation();
  const pageRef = useRef(null);

  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(pageRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.inOut' }
      );
    }
  }, [location.pathname]);

  return (
    <div ref={pageRef}>
      <Routes location={location}>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/menu" element={<CustomerMenu />} />
        <Route path="/menu/t/:tableNumber" element={<CustomerMenu />} />
        <Route path="/menu/:tableNumber" element={<CustomerMenu />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="daily-reservations" element={<DailyReservations />} />
          <Route path="table-management" element={<TableManagement />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="pos" element={<POS />} />
          <Route path="kds" element={
            <ProtectedRoute allowedRoles={['admin', 'chef', 'manager']}>
              <KDS />
            </ProtectedRoute>
          } />
          <Route path="inventory" element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'chef']}>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="reviews" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <CustomerReviews />
            </ProtectedRoute>
          } />
          <Route path="staff" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <RestaurantSettings />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </div>
  )
}
