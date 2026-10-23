import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, Clock, Calendar, CheckCircle2, AlertTriangle, RefreshCw,
  X, Shield, ArrowRight, Printer, Download, FileSpreadsheet, Lock, Unlock,
  Plus, Minus, TrendingUp, AlertCircle, FileText, Check, HelpCircle, History
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function CashDrawerModal({ isOpen, onClose, isDark, currentUser }) {
  const [drawerData, setDrawerData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('station'); // 'station', 'history'

  // Opening Float State
  const [openingFloat, setOpeningFloat] = useState('200.00');
  const [isOpening, setIsOpening] = useState(false);

  // Cash Drop / Payout Modal State
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState('drop'); // 'drop' or 'payout'
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Z-Report Closure Reconciliation State
  const [actualCountedCash, setActualCountedCash] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [isClosingZReport, setIsClosingZReport] = useState(false);
  const [zReportSummary, setZReportSummary] = useState(null);

  // Denomination Counter State
  const [denominations, setDenominations] = useState({
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0
  });

  // Calculate total from denominations
  const totalFromDenominations = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [denom, count]) => {
      return sum + (Number(denom) * (Number(count) || 0));
    }, 0);
  }, [denominations]);

  // Sync denominations to actualCountedCash if changed
  useEffect(() => {
    if (totalFromDenominations > 0) {
      setActualCountedCash(totalFromDenominations.toFixed(2));
    }
  }, [totalFromDenominations]);

  // Fetch current open drawer session
  const fetchDrawerStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [statusRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/api/cash-drawer/status`, { headers }),
        axios.get(`${API_BASE}/api/cash-drawer/z-report-history`, { headers })
      ]);

      setDrawerData(statusRes.data || null);
      setHistoryList(historyRes.data || []);
      if (statusRes.data?.expectedCash) {
        setActualCountedCash(statusRes.data.expectedCash.toFixed(2));
      }
    } catch (err) {
      console.error('Error fetching cash drawer status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDrawerStatus();
    }
  }, [isOpen, fetchDrawerStatus]);

  // Record Opening Cash Float
  const handleOpenRegister = async (e) => {
    e.preventDefault();
    const floatVal = Number(openingFloat);
    if (isNaN(floatVal) || floatVal < 0) {
      toast.error('Please enter a valid starting cash float');
      return;
    }

    setIsOpening(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/api/cash-drawer/open`, {
        openingFloat: floatVal
      }, { headers });

      if (res.data?.success) {
        toast.success(`Register drawer opened with starting float $${floatVal.toFixed(2)}`);
        fetchDrawerStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open register drawer');
    } finally {
      setIsOpening(false);
    }
  };

  // Record Mid-Day Cash Drop / Payout
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txReason.trim()) {
      toast.error('A mandatory reason is required for cash transactions');
      return;
    }

    const amtVal = Number(txAmount);
    if (isNaN(amtVal) || amtVal <= 0) {
      toast.error('Please enter a valid positive cash amount');
      return;
    }

    setIsSubmittingTx(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/api/cash-drawer/transaction`, {
        type: txType,
        amount: amtVal,
        reason: txReason
      }, { headers });

      if (res.data?.success) {
        toast.success(`${txType === 'drop' ? 'Cash Drop' : 'Petty Cash Payout'} recorded!`);
        setShowTxModal(false);
        setTxAmount('');
        setTxReason('');
        fetchDrawerStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Close Register & Generate End-of-Day Z-Report Reconciliation
  const handleCloseZReport = async (e) => {
    e.preventDefault();
    const countedVal = Number(actualCountedCash);
    if (isNaN(countedVal) || countedVal < 0) {
      toast.error('Please enter a valid counted cash amount');
      return;
    }

    setIsClosingZReport(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/api/cash-drawer/close-z-report`, {
        actualCountedCash: countedVal,
        notes: closureNotes
      }, { headers });

      if (res.data?.success) {
        toast.success('End-of-Day Z-Report closure completed!');
        setZReportSummary(res.data.zReportSummary);
        fetchDrawerStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete Z-Report closure');
    } finally {
      setIsClosingZReport(false);
    }
  };

  if (!isOpen) return null;

  const expectedCash = drawerData?.expectedCash || 0;
  const liveSales = drawerData?.liveSales || {};
  const liveTx = drawerData?.liveTransactions || {};
  const countedNum = Number(actualCountedCash) || 0;
  const liveVariance = Math.round((countedNum - expectedCash) * 100) / 100;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/80 font-sans">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[36px] border ${isDark ? 'border-orange-500/30 bg-[#0e0e11] text-white' : 'border-gray-200 bg-white text-gray-900 shadow-2xl'} p-6 sm:p-8 shadow-2xl custom-scrollbar`}
      >
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${drawerData ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">
                  {drawerData ? 'Register Drawer Active' : 'Register Drawer Closed'}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-0.5">Daily Cash Register &amp; Shift Drawer Closure (Z-Report)</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('station')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'station' ? 'bg-orange-500 text-black shadow-md' : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              Drawer HUD
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'history' ? 'bg-orange-500 text-black shadow-md' : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              Z-Report History
            </button>
            <button onClick={onClose} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white cursor-pointer ml-2">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── TAB 1: DRAWER HUD / RECONCILIATION STATION ── */}
        {activeTab === 'station' && (
          <>
            {/* IF NO DRAWER IS OPEN: STARTING FLOAT SCREEN */}
            {!drawerData ? (
              <div className="py-8 max-w-md mx-auto text-center">
                <div className="h-16 w-16 rounded-3xl bg-orange-500/10 text-orange-500 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
                  <Unlock size={32} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">Record Opening Cash Float</h3>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-600'} mb-6`}>
                  Record starting cash drawer float to begin daily sales operations and enable cash reconciliation.
                </p>

                <form onSubmit={handleOpenRegister} className="space-y-4 text-xs text-left">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-2">
                      Opening Cash Float ($) *
                    </label>
                    <input
                      type="number"
                      step="5.00"
                      min="0"
                      required
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(e.target.value)}
                      placeholder="200.00"
                      className={`w-full text-center text-3xl font-black font-mono py-3.5 rounded-2xl border ${
                        isDark ? 'border-orange-500/50 bg-black/60 text-orange-400' : 'border-orange-500/50 bg-white text-orange-600'
                      } outline-none focus:border-orange-500 shadow-inner`}
                    />
                  </div>

                  {/* Preset Float Chips */}
                  <div>
                    <span className="text-[9px] font-bold text-white/40 block mb-2 uppercase tracking-wider">Quick Preset Floats:</span>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {['100.00', '150.00', '200.00', '250.00', '300.00', '500.00'].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setOpeningFloat(val)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                            openingFloat === val
                              ? 'bg-orange-500 text-black border-orange-400 font-black shadow-md'
                              : 'border-white/10 bg-white/5 text-white/80 hover:bg-orange-500/20'
                          }`}
                        >
                          ${val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isOpening}
                    className="w-full py-4 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-widest hover:bg-orange-400 transition-all cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50 mt-4"
                  >
                    {isOpening ? 'Opening Register...' : 'Confirm & Open Register Drawer'}
                  </button>
                </form>
              </div>
            ) : zReportSummary ? (
              /* Z-REPORT FINAL SUMMARY DISPLAY */
              <div className="space-y-6 font-mono text-xs">
                <div className="p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 text-center relative overflow-hidden">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-[10px] uppercase tracking-widest block w-fit mx-auto mb-2">
                    ✅ Z-Report Daily Closure Complete
                  </span>
                  <h3 className="text-2xl font-black text-white">{zReportSummary.zReportNumber}</h3>
                  <p className="text-xs text-emerald-400 font-bold mt-1">
                    Closed by {zReportSummary.closedByName} on {new Date(zReportSummary.closedAt).toLocaleString()}
                  </p>
                </div>

                {/* Z-Report Financial Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} space-y-2`}>
                    <p className="font-bold text-orange-400 uppercase text-[10px] tracking-wider mb-2">1. Sales Channel Breakdown</p>
                    <div className="flex justify-between"><span>Cash Sales:</span><span className="font-bold text-emerald-400">${zReportSummary.cashSalesTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Card Sales:</span><span className="font-bold text-sky-400">${zReportSummary.cardSalesTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>UPI / Online Sales:</span><span className="font-bold text-purple-400">${zReportSummary.upiSalesTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-2 font-black text-sm"><span>Gross Sales Total:</span><span className="text-white">${zReportSummary.grossSalesTotal.toFixed(2)}</span></div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} space-y-2`}>
                    <p className="font-bold text-orange-400 uppercase text-[10px] tracking-wider mb-2">2. Cash Drawer Reconciliation</p>
                    <div className="flex justify-between"><span>Opening Float:</span><span>${zReportSummary.openingFloat.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Cash Sales:</span><span className="text-emerald-400">+${zReportSummary.cashSalesTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Safe Drops:</span><span className="text-sky-400">+${zReportSummary.totalDrops.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Petty Cash Payouts:</span><span className="text-rose-400">-${zReportSummary.totalPayouts.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-2 font-bold"><span>Expected Cash:</span><span className="text-amber-400">${zReportSummary.expectedCash.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Actual Counted:</span><span className="text-white font-black">${zReportSummary.actualCountedCash.toFixed(2)}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-2 font-black text-sm">
                      <span>Drawer Variance:</span>
                      <span className={zReportSummary.drawerVariance === 0 ? 'text-emerald-400' : zReportSummary.drawerVariance > 0 ? 'text-amber-400' : 'text-rose-400'}>
                        ${zReportSummary.drawerVariance.toFixed(2)} ({zReportSummary.varianceStatus.toUpperCase()})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setZReportSummary(null);
                      fetchDrawerStatus();
                    }}
                    className="w-full py-3.5 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 cursor-pointer shadow-lg shadow-orange-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE OPEN DRAWER MANAGEMENT HUD */
              <div className="space-y-6">
                {/* Active Session Info Bar */}
                <div className={`p-5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}>
                  <div>
                    <p className="font-bold text-sm">Opened by {drawerData.openedByName} ({drawerData.openedBy?.role || 'Staff'})</p>
                    <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} font-mono`}>
                      Session Opened: {new Date(drawerData.openedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setTxType('drop'); setShowTxModal(true); }}
                      className="px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs hover:bg-sky-500 hover:text-black transition-all cursor-pointer"
                    >
                      + Cash Drop
                    </button>
                    <button
                      onClick={() => { setTxType('payout'); setShowTxModal(true); }}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                    >
                      - Petty Cash Payout
                    </button>
                  </div>
                </div>

                {/* Live Financial Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
                  <div className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50'}`}>
                    <span className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} block uppercase mb-1`}>Opening Float</span>
                    <span className="text-xl font-black text-white">${drawerData.openingFloat.toFixed(2)}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50'}`}>
                    <span className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} block uppercase mb-1`}>POS Cash Sales</span>
                    <span className="text-xl font-black text-emerald-400">+${liveSales.cashSales.toFixed(2)}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50'}`}>
                    <span className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} block uppercase mb-1`}>Safe Drops</span>
                    <span className="text-xl font-black text-sky-400">+${liveTx.totalDrops.toFixed(2)}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50'}`}>
                    <span className={`text-[9px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} block uppercase mb-1`}>Petty Cash Payouts</span>
                    <span className="text-xl font-black text-rose-400">-${liveTx.totalPayouts.toFixed(2)}</span>
                  </div>

                  <div className={`p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 col-span-2 lg:col-span-1`}>
                    <span className="text-[9px] font-bold text-amber-400 block uppercase mb-1">Expected Cash</span>
                    <span className="text-xl font-black text-amber-400">${expectedCash.toFixed(2)}</span>
                  </div>
                </div>

                {/* END-OF-DAY Z-REPORT RECONCILIATION FORM */}
                <div className={`p-6 rounded-3xl border border-orange-500/30 ${isDark ? 'bg-black/50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight">End-of-Day Z-Report Reconciliation</h3>
                      <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} font-bold uppercase`}>
                        Count physical cash drawer and record drawer variance
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCloseZReport} className="space-y-5 text-xs">
                    {/* Denomination Counter Helper */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-2">
                        Physical Cash Denomination Counter (Optional):
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono">
                        {[100, 50, 20, 10, 5, 1].map(denom => (
                          <div key={denom} className={`p-2 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                            <span className="text-[10px] font-bold block text-orange-400">${denom}s</span>
                            <input
                              type="number"
                              min="0"
                              value={denominations[denom]}
                              onChange={(e) => setDenominations({ ...denominations, [denom]: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-full text-center font-bold text-xs bg-transparent border-b border-white/20 outline-none mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                          Actual Counted Physical Cash ($) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={actualCountedCash}
                          onChange={(e) => setActualCountedCash(e.target.value)}
                          placeholder="615.00"
                          className={`w-full text-center text-2xl font-black font-mono py-3 rounded-2xl border ${
                            isDark ? 'border-white/20 bg-black text-emerald-400' : 'border-gray-300 bg-white text-emerald-600'
                          } outline-none focus:border-emerald-500`}
                        />
                      </div>

                      <div className={`p-4 rounded-2xl border font-mono text-center flex flex-col justify-center ${
                        liveVariance === 0
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : liveVariance > 0
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                      }`}>
                        <span className="text-[9px] font-bold block uppercase tracking-widest mb-0.5">Calculated Drawer Variance</span>
                        <span className="text-2xl font-black">
                          ${liveVariance.toFixed(2)} ({liveVariance === 0 ? 'BALANCED' : liveVariance > 0 ? 'OVERAGE' : 'SHORTAGE'})
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-1`}>
                        Closure Notes &amp; Variance Explanation
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Counted cash verified. $0.00 variance."
                        value={closureNotes}
                        onChange={(e) => setClosureNotes(e.target.value)}
                        className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/60 text-white' : 'border-gray-300 bg-white text-gray-900'} p-3 text-xs outline-none focus:border-orange-500`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isClosingZReport}
                      className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-widest hover:bg-rose-400 transition-all cursor-pointer shadow-lg shadow-rose-500/20 disabled:opacity-50"
                    >
                      {isClosingZReport ? 'Closing Register...' : 'Close Register & Generate Immutable Z-Report'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: Z-REPORT HISTORY ── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-base font-black uppercase tracking-tight mb-2">Z-Report Closure History</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-hide text-xs font-mono">
              {historyList.length === 0 ? (
                <p className={`text-center py-8 text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>No Z-Report closures recorded yet.</p>
              ) : (
                historyList.map((rep) => {
                  const z = rep.zReportSummary || {};
                  return (
                    <div key={rep._id} className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-orange-400">{z.zReportNumber || 'Z-Report'}</span>
                          <span className="text-[10px] text-white/50">{new Date(rep.closedAt || rep.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-white/70">Closed By: {rep.closedByName || 'Manager'}</p>
                        <p className="text-[10px] text-white/40">Gross Sales: ${(rep.grossSalesTotal || 0).toFixed(2)} | Tax: ${(rep.taxCollectedTotal || 0).toFixed(2)}</p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-white">Counted: ${(rep.actualCountedCash || 0).toFixed(2)}</p>
                        <p className={`text-[10px] font-black ${rep.drawerVariance === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Variance: ${(rep.drawerVariance || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── CASH DROP / PETTY CASH PAYOUT SUB-MODAL ── */}
      <AnimatePresence>
        {showTxModal && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/85 font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-[32px] border border-orange-500/30 ${isDark ? 'bg-[#0e0e11] text-white' : 'bg-white text-gray-900 shadow-2xl'} p-6 shadow-2xl`}
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
                <h3 className="text-base font-black uppercase tracking-tight">
                  {txType === 'drop' ? 'Record Mid-Day Safe Drop' : 'Record Petty Cash Payout'}
                </h3>
                <button onClick={() => setShowTxModal(false)} className="text-white/50 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-1">
                    Cash Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="100.00"
                    className={`w-full text-center text-2xl font-black font-mono py-3 rounded-2xl border ${
                      isDark ? 'border-white/15 bg-black/60 text-white' : 'border-gray-300 bg-white text-gray-900'
                    } outline-none focus:border-orange-500`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-1">
                    Mandatory Reason / Notes *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={txType === 'drop' ? 'e.g. Mid-day safe drop deposit to main safe' : 'e.g. Emergency kitchen ingredient purchase (Fresh Herbs)'}
                    value={txReason}
                    onChange={(e) => setTxReason(e.target.value)}
                    className={`w-full rounded-2xl border ${isDark ? 'border-white/15 bg-black/60 text-white' : 'border-gray-300 bg-white text-gray-900'} p-3 text-xs outline-none focus:border-orange-500`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="w-full py-3.5 rounded-2xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 cursor-pointer shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSubmittingTx ? 'Recording...' : 'Record Transaction & Audit Log'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
