import React, { useState } from 'react';
import {
  Truck, Mail, MessageSquare, AlertTriangle, CheckCircle2,
  Package, Send, Plus, RefreshCw, ArrowRight, ShieldAlert
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function SupplierOrders() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [suppliers, setSuppliers] = useState([
    { id: 1, name: 'FreshValley Produce Co.', category: 'Vegetables & Fruits', contact: '+1 (555) 234-5678', email: 'orders@freshvalley.com', status: 'Active Supplier', leadTime: '24 hrs' },
    { id: 2, name: 'Prime Cuts Meats', category: 'Meat & Poultry', contact: '+1 (555) 876-5432', email: 'dispatch@primecuts.com', status: 'Active Supplier', leadTime: '12 hrs' },
    { id: 3, name: 'Artisan Dairy & Cheese', category: 'Dairy & Eggs', contact: '+1 (555) 345-6789', email: 'sales@artisandairy.com', status: 'Active Supplier', leadTime: '24 hrs' }
  ]);

  const [lowStockItems, setLowStockItems] = useState([
    { id: 1, name: 'Organic Avocados', stock: 4, minThreshold: 10, unit: 'crates', supplier: 'FreshValley Produce Co.' },
    { id: 2, name: 'Wagyu Beef Ribeye', stock: 6, minThreshold: 15, unit: 'kg', supplier: 'Prime Cuts Meats' },
    { id: 3, name: 'Unsalted Artisan Butter', stock: 3, minThreshold: 12, unit: 'blocks', supplier: 'Artisan Dairy & Cheese' }
  ]);

  const [sentOrders, setSentOrders] = useState([
    { id: 101, supplier: 'FreshValley Produce Co.', items: 'Organic Avocados (30 crates)', date: '2025-05-14 09:30', method: 'WhatsApp', status: 'Confirmed & Dispatched' },
    { id: 102, supplier: 'Prime Cuts Meats', items: 'Wagyu Beef Ribeye (25 kg)', date: '2025-05-13 16:45', method: 'Email', status: 'Delivered' }
  ]);

  const handleSendPO = (item, method) => {
    const newOrder = {
      id: Date.now(),
      supplier: item.supplier,
      items: `${item.name} (${item.minThreshold * 3} ${item.unit}) - Auto PO`,
      date: new Date().toLocaleString(),
      method: method,
      status: 'Drafted & Sent'
    };
    setSentOrders([newOrder, ...sentOrders]);
    setLowStockItems(prev => prev.filter(i => i.id !== item.id));
    toast.success(`Purchase Order for ${item.name} sent to ${item.supplier} via ${method}!`);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2 block">Supply Chain Automation</span>
          <h2 className="text-3xl font-black tracking-tight">Automated Supplier Purchase Orders</h2>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-1`}>AI threshold monitoring automatically generates and dispatches purchase orders to suppliers.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider">
          <Truck size={16} /> Auto-Dispatch Active
        </div>
      </div>

      {/* Low Stock Alerts Section */}
      <div className={`rounded-[32px] border ${isDark ? 'border-rose-500/30 bg-rose-500/[0.03]' : 'border-rose-200 bg-rose-50/50'} p-6 sm:p-8 backdrop-blur-2xl`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Low Inventory Threshold Alerts ({lowStockItems.length})</h3>
            <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium`}>These items have fallen below their minimum stock thresholds and require immediate purchase orders.</p>
          </div>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="py-10 text-center text-emerald-500 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <CheckCircle2 size={18} /> All inventory levels are optimal! No POs required.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {lowStockItems.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#16161a] text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} flex flex-col justify-between`}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-base font-black">{item.name}</h4>
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase">Low Stock</span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-600'} font-medium`}>Supplier: <span className="text-orange-500 font-bold">{item.supplier}</span></p>
                  <div className="mt-4 flex items-center justify-between text-xs font-mono">
                    <span>Current: <strong className="text-rose-500 font-black">{item.stock} {item.unit}</strong></span>
                    <span>Min Required: <strong className="text-white/70">{item.minThreshold} {item.unit}</strong></span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2">
                  <button
                    onClick={() => handleSendPO(item, 'WhatsApp')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <MessageSquare size={14} /> WhatsApp PO
                  </button>
                  <button
                    onClick={() => handleSendPO(item, 'Email')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-sky-600/20 transition-all active:scale-95"
                  >
                    <Mail size={14} /> Email PO
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Dispatched Purchase Orders Log */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl`}>
        <h3 className="text-xl font-black mb-6">Dispatched Purchase Orders History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/10 text-white/40' : 'border-gray-200 text-gray-500'} uppercase font-black tracking-widest text-[10px]`}>
                <th className="pb-4">Supplier Name</th>
                <th className="pb-4">Ordered Items</th>
                <th className="pb-4">Timestamp</th>
                <th className="pb-4">Dispatch Channel</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 font-bold">{order.supplier}</td>
                  <td className={`py-4 font-semibold ${isDark ? 'text-white/70' : 'text-gray-700'}`}>{order.items}</td>
                  <td className="py-4 font-mono text-[11px] text-orange-500">{order.date}</td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-bold text-[10px]">
                      {order.method === 'WhatsApp' ? '💬 WhatsApp' : '📧 Email'}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase">
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
