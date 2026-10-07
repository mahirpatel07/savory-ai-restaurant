import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Clock, Printer, Percent, DollarSign,
  Save, RefreshCw, Plus, Trash2, CheckCircle2, ShieldAlert,
  MapPin, Phone, Mail, Globe, Store, FileText, Check, Loader2, Zap
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RestaurantSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'tax', 'hours', 'printers'

  // Printer Modal State
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerData, setPrinterData] = useState({ name: '', type: 'receipt', connectionType: 'network', ipAddress: '192.168.1.100', port: 9100, active: true });

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/settings`);
      setSettings(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load restaurant settings');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const socket = getSocket();
    if (socket) {
      socket.on('settings_updated', (newSettings) => {
        setSettings(newSettings);
      });
      return () => {
        socket.off('settings_updated');
      };
    }
  }, [fetchSettings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.patch(`${API_BASE}/api/settings`, settings);
      setSettings(response.data);
      toast.success('Restaurant settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrinter = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/api/settings/printers`, printerData);
      setSettings(response.data);
      setPrinterModalOpen(false);
      setPrinterData({ name: '', type: 'receipt', connectionType: 'network', ipAddress: '192.168.1.100', port: 9100, active: true });
      toast.success('Printer configuration saved!');
    } catch (error) {
      toast.error('Failed to save printer');
    }
  };

  const handleTestPrint = async (printerId) => {
    try {
      const response = await axios.post(`${API_BASE}/api/settings/printers/${printerId}/test`);
      if (response.data?.success) {
        toast.success(response.data.message, { icon: '🖨️', duration: 3000 });
      }
    } catch (error) {
      toast.error('Test print failed');
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 size={36} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans pb-12">
      {/* ── HEADER BANNER ── */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2 block">System &amp; Hardware Configuration</span>
          <h2 className="text-3xl font-black tracking-tight">Restaurant Settings &amp; Setup</h2>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-1`}>
            Configure tax/GST rates, business operating hours, and hardware thermal printers.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-orange-500/25 hover:opacity-95 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Save Changes</span>
        </button>
      </div>

      {/* ── SETTINGS NAVIGATION TABS ── */}
      <div className={`flex items-center gap-2 p-1.5 rounded-2xl border ${isDark ? 'border-white/10 bg-[#121215]/90' : 'border-gray-200 bg-gray-100'} overflow-x-auto scrollbar-hide`}>
        {[
          { key: 'general', label: 'General & Business Info', icon: Store },
          { key: 'tax', label: 'Tax & Discounts', icon: Percent },
          { key: 'hours', label: 'Business Hours', icon: Clock },
          { key: 'printers', label: 'Printers & Receipts', icon: Printer }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                  : isDark ? 'text-white/50 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: GENERAL & BUSINESS INFO ── */}
      {activeTab === 'general' && (
        <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl space-y-6`}>
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-xl font-black">Business Identity &amp; Contact</h3>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-0.5`}>Information printed on receipts and invoice headers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-orange-500 block mb-1.5">Restaurant Name</label>
              <input
                type="text"
                value={settings.restaurantName || ''}
                onChange={e => setSettings({ ...settings, restaurantName: e.target.value })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
              />
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>Tagline / Slogan</label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
              />
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>Primary Contact Phone</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
              />
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>Contact Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={e => setSettings({ ...settings, email: e.target.value })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>Primary Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TAX & DISCOUNTS ── */}
      {activeTab === 'tax' && (
        <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl space-y-6`}>
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-xl font-black">Taxation &amp; Discount Governance</h3>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-0.5`}>Configure GST rate applied on invoices and staff discount rules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1.5">Tax / GST Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.taxRate ?? 5.0}
                onChange={e => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-emerald-400' : 'bg-gray-50 border-gray-200 text-emerald-600'} text-xs font-bold outline-none focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1.5`}>Tax Display Label</label>
              <input
                type="text"
                value={settings.taxName || 'GST'}
                onChange={e => setSettings({ ...settings, taxName: e.target.value })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none focus:border-orange-500`}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1.5">Max Manual Discount Limit (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.maxDiscountPercentage ?? 50}
                onChange={e => setSettings({ ...settings, maxDiscountPercentage: parseInt(e.target.value) || 0 })}
                className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-amber-400' : 'bg-gray-50 border-gray-200 text-amber-600'} text-xs font-bold outline-none focus:border-amber-500`}
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="allowManualDiscounts"
                checked={settings.allowManualDiscounts !== false}
                onChange={e => setSettings({ ...settings, allowManualDiscounts: e.target.checked })}
                className="h-5 w-5 rounded-lg border-white/20 text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
              />
              <label htmlFor="allowManualDiscounts" className="text-xs font-bold cursor-pointer">
                Allow Staff Manual Order Discounts at Checkout
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: BUSINESS OPERATING HOURS ── */}
      {activeTab === 'hours' && (
        <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl space-y-6`}>
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-xl font-black">Business Hours Schedule</h3>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-0.5`}>Specify opening and closing hours for online reservations &amp; POS ordering.</p>
          </div>

          <div className="space-y-3">
            {(settings.businessHours || []).map((h, idx) => (
              <div key={h.day || idx} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-200'} text-xs font-bold`}>
                <span className="w-28 font-bold text-sm">{h.day}</span>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 uppercase">Open:</span>
                    <input
                      type="time"
                      disabled={h.isClosed}
                      value={h.openTime || '11:00'}
                      onChange={e => {
                        const updated = [...settings.businessHours];
                        updated[idx].openTime = e.target.value;
                        setSettings({ ...settings, businessHours: updated });
                      }}
                      className={`p-2 rounded-xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-white border-gray-200 text-gray-900'} text-xs outline-none disabled:opacity-30`}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 uppercase">Close:</span>
                    <input
                      type="time"
                      disabled={h.isClosed}
                      value={h.closeTime || '00:00'}
                      onChange={e => {
                        const updated = [...settings.businessHours];
                        updated[idx].closeTime = e.target.value;
                        setSettings({ ...settings, businessHours: updated });
                      }}
                      className={`p-2 rounded-xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-white border-gray-200 text-gray-900'} text-xs outline-none disabled:opacity-30`}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(h.isClosed)}
                    onChange={e => {
                      const updated = [...settings.businessHours];
                      updated[idx].isClosed = e.target.checked;
                      setSettings({ ...settings, businessHours: updated });
                    }}
                    className="h-4 w-4 rounded border-white/20 text-rose-500 accent-rose-500 cursor-pointer"
                  />
                  <span className={h.isClosed ? 'text-rose-400 font-black' : 'text-white/50'}>Closed</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: PRINTERS & RECEIPT SETUP ── */}
      {activeTab === 'printers' && (
        <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl space-y-6`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-black">POS &amp; Kitchen Thermal Printers</h3>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-0.5`}>Configure receipt printers and kitchen order ticket (KOT) hardware.</p>
            </div>
            <button
              onClick={() => setPrinterModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-black uppercase text-black hover:bg-orange-400 transition-all cursor-pointer"
            >
              <Plus size={16} /> Add Printer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(settings.printers || []).map(printer => (
              <div key={printer._id || printer.name} className={`p-5 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${printer.type === 'kitchen' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    {printer.type?.toUpperCase()} PRINTER
                  </span>
                  <button
                    onClick={() => handleTestPrint(printer._id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase hover:bg-orange-500 hover:text-black transition-all cursor-pointer"
                  >
                    <Printer size={12} /> Test Print
                  </button>
                </div>

                <h4 className="text-base font-black">{printer.name}</h4>
                <div className="text-xs font-mono space-y-1 text-white/60">
                  <p>IP Address: <strong className="text-white">{printer.ipAddress}</strong></p>
                  <p>Port: <strong className="text-white">{printer.port}</strong></p>
                  <p>Interface: <strong className="text-white uppercase">{printer.connectionType}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADD PRINTER MODAL ── */}
      <AnimatePresence>
        {printerModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/75">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`w-full max-w-md rounded-[32px] border ${isDark ? 'border-white/15 bg-[#0e0e11] text-white' : 'border-gray-200 bg-white text-gray-900'} p-7 space-y-4 shadow-2xl`}>
              <h3 className="text-lg font-black uppercase">Configure Hardware Printer</h3>
              <form onSubmit={handleSavePrinter} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-orange-500 block mb-1">Printer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kitchen Hot Line Thermal Printer"
                    value={printerData.name}
                    onChange={e => setPrinterData({ ...printerData, name: e.target.value })}
                    className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-white/40 block mb-1">Type</label>
                    <select
                      value={printerData.type}
                      onChange={e => setPrinterData({ ...printerData, type: e.target.value })}
                      className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                    >
                      <option value="receipt">POS Receipt</option>
                      <option value="kitchen">Kitchen Ticket</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-white/40 block mb-1">Interface</label>
                    <select
                      value={printerData.connectionType}
                      onChange={e => setPrinterData({ ...printerData, connectionType: e.target.value })}
                      className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                    >
                      <option value="network">Network IP</option>
                      <option value="usb">USB Cable</option>
                      <option value="bluetooth">Bluetooth</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-white/40 block mb-1">IP Address</label>
                    <input
                      type="text"
                      value={printerData.ipAddress}
                      onChange={e => setPrinterData({ ...printerData, ipAddress: e.target.value })}
                      className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-white/40 block mb-1">Port</label>
                    <input
                      type="number"
                      value={printerData.port}
                      onChange={e => setPrinterData({ ...printerData, port: parseInt(e.target.value) || 9100 })}
                      className={`w-full p-3 rounded-2xl border ${isDark ? 'bg-black/50 border-white/15 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} text-xs font-bold outline-none`}
                    />
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setPrinterModalOpen(false)} className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-white/60">Cancel</button>
                  <button type="submit" className="flex-[2] py-3 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase">Save Printer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
