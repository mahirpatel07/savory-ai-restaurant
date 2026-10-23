import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Clock, DollarSign, Plus, Calendar,
  CheckCircle2, AlertCircle, Search, RefreshCw, ShieldCheck,
  Edit2, Trash2, X, Lock, Zap, Loader2, ShoppingBag, Shield
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';
import CustomDropdown from '../../components/CustomDropdown';

import TimeClock from '../components/TimeClock';
import ShiftScheduler from '../components/ShiftScheduler';
import AttendanceDashboard from '../components/AttendanceDashboard';
import PayrollSummary from '../components/PayrollSummary';
import AuditLogsViewer from '../components/AuditLogsViewer';
import LiveStaffDashboard from '../components/LiveStaffDashboard';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Restaurant Manager' },
  { value: 'waiter', label: 'Waitstaff / Server' },
  { value: 'chef', label: 'Chef / Kitchen Staff' },
  { value: 'cashier', label: 'Cashier / Billing' },
  { value: 'admin', label: 'Administrator' }
];

export default function StaffManagement() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'live', 'timeclock', 'scheduler', 'attendance', 'payroll', 'audit'
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStaffId, setEditingId] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter',
    phone: '',
    pin: '',
    hourlyRate: '18.50',
    department: 'Operations',
    status: 'active'
  });

  const fetchStaff = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/staff`);
      setStaffList(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Failed to load staff accounts');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();

    const socket = getSocket();
    if (socket) {
      socket.on('staff_updated', fetchStaff);
      return () => {
        socket.off('staff_updated', fetchStaff);
      };
    }
  }, [fetchStaff]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.phone && s.phone.includes(searchQuery));
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, searchQuery, roleFilter, statusFilter]);

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await axios.post(`${API_BASE}/api/staff/seed`);
      if (res.data?.success) {
        setStaffList(res.data.staff || []);
        toast.success('Sample staff accounts created!');
      }
    } catch (err) {
      toast.error('Failed to seed staff members');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaffId) {
        await axios.patch(`${API_BASE}/api/staff/${editingStaffId}`, formData);
        toast.success('Staff account updated successfully');
      } else {
        await axios.post(`${API_BASE}/api/staff`, formData);
        toast.success('New staff member added');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', email: '', password: '', role: 'waiter', phone: '', pin: '', hourlyRate: '18.50', department: 'Operations', status: 'active' });
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save staff account');
    }
  };

  const handleToggleStatus = async (staffMember) => {
    try {
      const res = await axios.patch(`${API_BASE}/api/staff/${staffMember._id}/toggle`);
      if (res.data) {
        toast.success(`${staffMember.name} is now ${res.data.status.toUpperCase()}`);
        fetchStaff();
      }
    } catch (err) {
      toast.error('Failed to update staff status');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff account?')) return;
    try {
      await axios.delete(`${API_BASE}/api/staff/${id}`);
      toast.success('Staff member removed');
      fetchStaff();
    } catch (err) {
      toast.error('Failed to delete staff member');
    }
  };

  const activeStaffCount = staffList.filter(s => s.status === 'active').length;
  const totalTips = staffList.reduce((acc, s) => acc + (s.tipsEarned || 0), 0);
  const totalOrdersHandled = staffList.reduce((acc, s) => acc + (s.ordersHandled || 0), 0);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* ── HEADER BANNER ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2 block">Staff &amp; Shift Operations Command</span>
          <h2 className="text-3xl font-black tracking-tight">Staff Management, Time Clock &amp; Roster</h2>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-1`}>
            Manage staff roles, 4-digit PIN selfie time clock, weekly shift scheduler, attendance dashboard, and payroll calculations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', email: '', password: '', role: 'waiter', phone: '', pin: '', hourlyRate: '18.50', department: 'Operations', status: 'active' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-orange-500/20 hover:bg-orange-400 transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Add Staff Account
          </button>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className={`rounded-2xl border ${isDark ? 'border-white/10 bg-[#121215]/90' : 'border-gray-200 bg-white shadow-sm'} p-2 flex items-center gap-2 overflow-x-auto scrollbar-hide relative z-30`}>
        {[
          { key: 'directory', label: 'Staff Directory', icon: Users },
          { key: 'live', label: 'Live Shift Monitor', icon: Zap },
          { key: 'timeclock', label: 'Time Clock Station', icon: Clock },
          { key: 'scheduler', label: 'Weekly Shift Scheduler', icon: Calendar },
          { key: 'attendance', label: 'Attendance Dashboard', icon: CheckCircle2 },
          { key: 'payroll', label: 'Payroll Summary', icon: DollarSign },
          { key: 'audit', label: 'Audit Trail Logs', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: STAFF DIRECTORY ── */}
      {activeTab === 'directory' && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Active Staff</span>
                <Users size={18} className="text-orange-500" />
              </div>
              <p className="text-3xl font-black">{activeStaffCount} / {staffList.length}</p>
              <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase tracking-wider">🟢 Active Roster Accounts</p>
            </div>

            <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Orders Processed</span>
                <ShoppingBag size={18} className="text-sky-400" />
              </div>
              <p className="text-3xl font-black text-sky-400">{totalOrdersHandled}</p>
              <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} mt-2 uppercase tracking-wider`}>Staff Fulfillment Volume</p>
            </div>

            <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Tips Collected</span>
                <DollarSign size={18} className="text-emerald-500" />
              </div>
              <p className="text-3xl font-black text-emerald-500">${totalTips.toFixed(2)}</p>
              <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} mt-2 uppercase tracking-wider`}>Logged Gratuity Total</p>
            </div>

            <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Security Status</span>
                <ShieldCheck size={18} className="text-amber-500" />
              </div>
              <p className="text-3xl font-black text-amber-500">RBAC Active</p>
              <p className="text-[10px] font-bold text-amber-400 mt-2 uppercase tracking-wider">🔒 Role-Based Access Enforced</p>
            </div>
          </div>

          {/* Staff Table */}
          <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
              <div>
                <h3 className="text-xl font-black">Staff Accounts &amp; Performance Roster</h3>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-0.5`}>Real-time system roles, security PINs, hourly pay, and metrics.</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-full sm:w-64">
                  <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} size={16} />
                  <input
                    type="text"
                    placeholder="Search staff by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500/50`}
                  />
                </div>

                <CustomDropdown
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'admin', label: 'Administrator' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'cashier', label: 'Cashier' },
                    { value: 'waiter', label: 'Waitstaff' },
                    { value: 'chef', label: 'Chef / Kitchen' }
                  ]}
                  className="w-36 sm:w-44"
                  isDark={isDark}
                />

                <CustomDropdown
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Inactive Only' }
                  ]}
                  className="w-36 sm:w-40"
                  isDark={isDark}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 text-white/40' : 'border-gray-200 text-gray-500'} uppercase font-black tracking-widest text-[10px]`}>
                    <th className="pb-4 pl-4">Staff Member</th>
                    <th className="pb-4">Role</th>
                    <th className="pb-4">Contact Email</th>
                    <th className="pb-4">POS PIN</th>
                    <th className="pb-4">Hourly Pay</th>
                    <th className="pb-4">Orders Handled</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-white/40">
                        <Loader2 size={28} className="animate-spin text-orange-500 inline-block mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider">Loading Staff Accounts...</p>
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-white/40">
                        <p className="text-sm font-bold">No staff members found matching filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => {
                      const isActive = staff.status === 'active';

                      return (
                        <tr key={staff._id} className={`group hover:${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} transition-colors`}>
                          <td className="py-4 pl-4 font-bold flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 font-black shrink-0">
                              {staff.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{staff.name}</p>
                              {staff.phone && <p className="text-[10px] text-white/40 font-mono">{staff.phone}</p>}
                            </div>
                          </td>

                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                              staff.role === 'admin'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : staff.role === 'manager'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : staff.role === 'chef'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : staff.role === 'cashier'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}>
                              {staff.role}
                            </span>
                          </td>

                          <td className={`py-4 font-mono text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                            {staff.email}
                          </td>

                          <td className="py-4 font-mono font-black text-amber-400">
                            {staff.pin ? `**** (${staff.pin})` : '—'}
                          </td>

                          <td className="py-4 font-mono font-bold text-emerald-400">
                            ${(staff.hourlyRate || 18.50).toFixed(2)}/hr
                          </td>

                          <td className="py-4 font-mono font-bold text-sky-400">
                            {staff.ordersHandled || 0} Orders
                          </td>

                          <td className="py-4">
                            <button
                              onClick={() => handleToggleStatus(staff)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-black'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white'
                              }`}
                            >
                              {isActive ? '● Active' : '○ Inactive'}
                            </button>
                          </td>

                          <td className="py-4 pr-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingId(staff._id);
                                  setFormData({
                                    name: staff.name,
                                    email: staff.email,
                                    password: '',
                                    role: staff.role || 'waiter',
                                    phone: staff.phone || '',
                                    pin: staff.pin || '',
                                    hourlyRate: staff.hourlyRate ? String(staff.hourlyRate) : '18.50',
                                    department: staff.department || 'Operations',
                                    status: staff.status || 'active'
                                  });
                                  setShowModal(true);
                                }}
                                title="Edit Staff Member"
                                className={`p-2 rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900'} transition-all cursor-pointer`}
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                onClick={() => handleDeleteStaff(staff._id)}
                                title="Delete Staff Member"
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
          </div>
        </>
      )}

      {/* ── TAB 2: LIVE SHIFT MONITOR ── */}
      {activeTab === 'live' && (
        <LiveStaffDashboard isDark={isDark} staffList={staffList} onRefreshStaff={fetchStaff} />
      )}

      {/* ── TAB 3: TIME CLOCK STATION ── */}
      {activeTab === 'timeclock' && (
        <TimeClock isDark={isDark} staffList={staffList} onRefreshStaff={fetchStaff} currentUser={currentUser} />
      )}

      {/* ── TAB 4: SHIFT SCHEDULER ── */}
      {activeTab === 'scheduler' && (
        <ShiftScheduler isDark={isDark} staffList={staffList} currentUser={currentUser} />
      )}

      {/* ── TAB 5: ATTENDANCE DASHBOARD ── */}
      {activeTab === 'attendance' && (
        <AttendanceDashboard isDark={isDark} staffList={staffList} />
      )}

      {/* ── TAB 6: PAYROLL SUMMARY ── */}
      {activeTab === 'payroll' && (
        <PayrollSummary isDark={isDark} staffList={staffList} />
      )}

      {/* ── TAB 7: AUDIT TRAIL LOGS ── */}
      {activeTab === 'audit' && (
        <AuditLogsViewer isDark={isDark} />
      )}

      {/* ── ADD / EDIT STAFF MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/75">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              className={`w-full max-w-lg rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-6 sm:p-8 shadow-2xl`}
            >
              <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {editingStaffId ? 'Edit Staff Account' : 'Add Staff Account'}
                    </h3>
                    <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider`}>
                      User Permissions &amp; Access Controls
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-2xl bg-white/5 text-white/50 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-1.5">
                    Staff Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Johnson"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} p-3 text-xs outline-none focus:border-orange-500`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-600'} block mb-1.5`}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex@savory.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} p-3 text-xs outline-none focus:border-orange-500`}
                    />
                  </div>

                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-600'} block mb-1.5`}>
                      Assigned Role *
                    </label>
                    <CustomDropdown
                      value={formData.role}
                      onChange={(val) => setFormData({ ...formData, role: val })}
                      options={ROLE_OPTIONS}
                      className="w-full"
                      isDark={isDark}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-600'} block mb-1.5`}>
                      {editingStaffId ? 'New Password (Optional)' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      required={!editingStaffId}
                      placeholder={editingStaffId ? 'Leave blank to keep' : 'Minimum 6 chars'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} p-3 text-xs outline-none focus:border-orange-500`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 block mb-1.5">
                      POS Security PIN (4 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength="4"
                      placeholder="e.g. 1234"
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-amber-400' : 'border-gray-200 bg-gray-50 text-amber-600'} p-3 text-xs font-mono font-bold outline-none focus:border-amber-500`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-600'} block mb-1.5`}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+1 555-0192"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'} p-3 text-xs outline-none focus:border-orange-500`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-1.5">
                      Hourly Pay Rate ($/hr)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      placeholder="18.50"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/50 text-emerald-400' : 'border-gray-200 bg-gray-50 text-emerald-600'} p-3 text-xs font-mono font-bold outline-none focus:border-emerald-500`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-600'} block mb-1.5`}>
                    Account Status
                  </label>
                  <CustomDropdown
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { value: 'active', label: 'Active (Full Access)' },
                      { value: 'inactive', label: 'Inactive (Access Blocked)' }
                    ]}
                    className="w-full"
                    isDark={isDark}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
                  >
                    {editingStaffId ? 'Save Changes' : 'Create Staff Account'}
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
