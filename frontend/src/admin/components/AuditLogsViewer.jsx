import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, FileText, Filter, Clock, User, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function AuditLogsViewer({ isDark }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('savory_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const queryStr = actionFilter !== 'all' ? `?action=${actionFilter}` : '';
      const res = await axios.get(`${API_BASE}/api/audit-logs${queryStr}`, { headers });
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      toast.error('Failed to load system audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl`}>
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <Shield size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">System Audit &amp; Governance Trail</h3>
              <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider`}>
                Immutable record of clock-ins, corrections, roster publications, and PIN failures
              </p>
            </div>
          </div>

          <button
            onClick={fetchAuditLogs}
            className={`p-2.5 rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/60 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-700'} transition-all cursor-pointer`}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
          {logs.length === 0 ? (
            <p className={`text-center py-8 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>No audit logs recorded yet.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log._id}
                className={`p-4 rounded-2xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-[10px] uppercase">
                      {log.action}
                    </span>
                    <span className="font-bold">{log.actorName || 'System'}</span>
                  </div>
                  {log.reason && <p className={`text-[11px] ${isDark ? 'text-white/70' : 'text-gray-700'} font-medium`}>"{log.reason}"</p>}
                </div>

                <div className="text-right font-mono text-[10px] text-white/40">
                  <p>{new Date(log.timestamp).toLocaleString()}</p>
                  <p>{log.targetModel} #{log.targetId?.slice(-6) || ''}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
