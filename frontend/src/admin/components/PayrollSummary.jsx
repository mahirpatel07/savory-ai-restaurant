import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign, Clock, Calendar, Download, FileSpreadsheet,
  Users, TrendingUp, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportPayrollCSV, exportPayrollExcel } from '../../utils/reportExporter';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function PayrollSummary({ isDark, staffList }) {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month'); // 'week', 'month', 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      let sDate = startDate;
      let eDate = endDate;
      const now = new Date();

      if (dateFilter === 'week' && !sDate) {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        sDate = monday.toISOString().split('T')[0];
        eDate = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'month' && !sDate) {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        sDate = firstDay.toISOString().split('T')[0];
        eDate = new Date().toISOString().split('T')[0];
      }

      const queryParts = [];
      if (sDate) queryParts.push(`startDate=${sDate}`);
      if (eDate) queryParts.push(`endDate=${eDate}`);

      const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${API_BASE}/api/payroll/summary${queryStr}`, { headers });
      setPayrollData(res.data || []);
    } catch (err) {
      console.error('Error fetching payroll summary:', err);
      toast.error('Failed to load payroll summary report');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, startDate, endDate]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  // Totals
  const totalPayrollCost = useMemo(() => {
    return payrollData.reduce((sum, item) => sum + (item.estimatedGrossPay || 0), 0);
  }, [payrollData]);

  const totalHoursWorked = useMemo(() => {
    return payrollData.reduce((sum, item) => sum + (item.actualElapsedHours || 0), 0);
  }, [payrollData]);

  const totalRegularHours = useMemo(() => {
    return payrollData.reduce((sum, item) => sum + (item.regularHours || 0), 0);
  }, [payrollData]);

  const totalOvertimeHours = useMemo(() => {
    return payrollData.reduce((sum, item) => sum + (item.overtimeHours || 0), 0);
  }, [payrollData]);

  // Export CSV
  const handleExportCSV = () => {
    if (payrollData.length === 0) {
      toast.error('No payroll records to export');
      return;
    }
    exportPayrollCSV(payrollData, dateFilter);
    toast.success('Payroll Summary exported as CSV!');
  };

  // Export Excel
  const handleExportExcel = () => {
    if (payrollData.length === 0) {
      toast.error('No payroll records to export');
      return;
    }
    exportPayrollExcel(payrollData, dateFilter);
    toast.success('Payroll Summary exported as Excel (.xlsx)!');
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* HEADER & CONTROLS */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1 block">Financial Oversight</span>
          <h2 className="text-2xl font-black tracking-tight">Payroll &amp; Hours Summary</h2>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-600'} font-medium mt-0.5`}>
            Automated calculations for regular working hours, overtime pay (1.5x), and estimated shift compensation.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className={`inline-flex items-center rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-100'} p-1 text-xs font-bold shrink-0 h-11`}>
            {['week', 'month', 'all'].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => {
                  setDateFilter(filterKey);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`h-full px-4 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center ${
                  dateFilter === filterKey
                    ? 'bg-orange-500 text-black font-black shadow-md'
                    : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filterKey === 'week' ? 'This Week' : filterKey === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Export as CSV"
            >
              <Download size={14} /> CSV
            </button>

            <button
              onClick={handleExportExcel}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-4 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Export as Excel (.xlsx)"
            >
              <FileSpreadsheet size={14} /> Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Total Estimated Payroll</span>
            <DollarSign size={20} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-500">${totalPayrollCost.toFixed(2)}</p>
          <p className="text-[10px] font-bold text-emerald-400 mt-2 uppercase tracking-wider">💰 Estimated Gross Compensation</p>
        </div>

        <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Total Elapsed Hours</span>
            <Clock size={20} className="text-orange-500" />
          </div>
          <p className="text-3xl font-black">{totalHoursWorked.toFixed(1)} hrs</p>
          <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} mt-2 uppercase tracking-wider`}>Logged Duration Total</p>
        </div>

        <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Regular Hours</span>
            <CheckCircle2 size={20} className="text-sky-400" />
          </div>
          <p className="text-3xl font-black text-sky-400">{totalRegularHours.toFixed(1)} hrs</p>
          <p className="text-[10px] font-bold text-sky-400 mt-2 uppercase tracking-wider">Standard Hours (1.0x Rate)</p>
        </div>

        <div className={`p-6 rounded-[26px] border ${isDark ? 'border-white/10 bg-[#121215]/90 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} backdrop-blur-xl`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Overtime Hours</span>
            <TrendingUp size={20} className="text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">{totalOvertimeHours.toFixed(1)} hrs</p>
          <p className="text-[10px] font-bold text-amber-400 mt-2 uppercase tracking-wider">⚡ Overtime Hours (1.5x Rate)</p>
        </div>
      </div>

      {/* BREAKDOWN TABLE */}
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl overflow-x-auto`}>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
          <h3 className="text-lg font-black uppercase tracking-tight">Employee Payroll &amp; Hours Matrix</h3>
          <button
            onClick={fetchPayroll}
            className={`p-2 rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700'} transition-all cursor-pointer`}
            title="Refresh Payroll"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b ${isDark ? 'border-white/10 text-white/40' : 'border-gray-200 text-gray-500'} uppercase font-black tracking-widest text-[10px]`}>
              <th className="pb-4 pl-4">Staff Member</th>
              <th className="pb-4">Hourly Rate</th>
              <th className="pb-4">Completed Shifts</th>
              <th className="pb-4">Regular Hours</th>
              <th className="pb-4">Overtime Hours</th>
              <th className="pb-4">Total Paid Hours</th>
              <th className="pb-4 pr-4 text-right">Estimated Gross Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payrollData.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-white/40 font-bold">
                  No payroll records found for selected period.
                </td>
              </tr>
            ) : (
              payrollData.map((item) => (
                <tr key={item.userId} className={`group hover:${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'} transition-colors`}>
                  <td className="py-4 pl-4 font-bold flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center font-black shrink-0">
                      {(item.employeeName || 'E').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{item.employeeName}</p>
                      <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase font-semibold`}>{item.role} • {item.department}</p>
                    </div>
                  </td>

                  <td className="py-4 font-mono font-bold text-orange-400">
                    ${item.hourlyRate.toFixed(2)}/hr
                  </td>

                  <td className="py-4 font-mono font-bold">
                    {item.totalShiftsWorked} Shifts
                  </td>

                  <td className="py-4 font-mono font-bold text-sky-400">
                    {item.regularHours} hrs (${(item.regularEarnings || 0).toFixed(2)})
                  </td>

                  <td className="py-4 font-mono font-bold text-amber-400">
                    {item.overtimeHours > 0 ? `${item.overtimeHours} hrs ($${(item.overtimeEarnings || 0).toFixed(2)})` : '0 hrs'}
                  </td>

                  <td className="py-4 font-mono font-black text-white text-sm">
                    {item.paidHours} hrs
                  </td>

                  <td className="py-4 pr-4 text-right font-mono font-black text-emerald-400 text-sm">
                    ${item.estimatedGrossPay.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
