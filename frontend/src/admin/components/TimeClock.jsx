import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, Camera, CheckCircle2, AlertCircle, RefreshCw,
  UserCheck, UserX, Lock, ShieldCheck, Zap, Sparkles, User, Image as ImageIcon,
  AlertTriangle, Eye, EyeOff, Keyboard, Smartphone, CornerDownLeft, X, Shield
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cyberSound } from '../../utils/cyberSoundUtils';
import { getSocket } from '../../utils/socket';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function TimeClock({ isDark, staffList = [], onRefreshStaff, currentUser }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [activePhysicalKey, setActivePhysicalKey] = useState(null);
  const [verifiedStaff, setVerifiedStaff] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [selfieImage, setSelfieImage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [activeClockedIn, setActiveClockedIn] = useState([]);
  const [clockHistory, setClockHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const pinInputRef = useRef(null);

  // Live server-sync digital clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active staff and history
  const fetchTimeClockData = useCallback(async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/api/attendance/active`),
        axios.get(`${API_BASE}/api/attendance/history`)
      ]);
      setActiveClockedIn(activeRes.data || []);
      setClockHistory(historyRes.data || []);
    } catch (err) {
      console.error('Error fetching timeclock data:', err);
    }
  }, []);

  useEffect(() => {
    fetchTimeClockData();

    const socket = getSocket();
    if (socket) {
      socket.on('attendance_updated', fetchTimeClockData);
      socket.on('staff_updated', fetchTimeClockData);
      return () => {
        socket.off('attendance_updated', fetchTimeClockData);
        socket.off('staff_updated', fetchTimeClockData);
      };
    }
  }, [fetchTimeClockData]);

  // Real-time PIN verification on 4 digits
  const verifyPinCode = useCallback(async (code) => {
    if (!code || code.length !== 4) {
      setVerifiedStaff(null);
      setVerifyError('');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await axios.post(`${API_BASE}/api/attendance/verify-pin`, { pin: code });
      if (res.data?.success) {
        setVerifiedStaff(res.data);
        setVerifyError('');
        cyberSound.playSuccess();
      }
    } catch (err) {
      setVerifiedStaff(null);
      const errMsg = err.response?.data?.message || (err.message ? `Error: ${err.message}` : 'Invalid 4-digit PIN');
      setVerifyError(errMsg);
      cyberSound.playError();
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (pin.length === 4) {
      verifyPinCode(pin);
    } else {
      setVerifiedStaff(null);
      setVerifyError('');
    }
  }, [pin, verifyPinCode]);

  // Start Webcam
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraActive(true);
      cyberSound.playActivate();
    } catch (err) {
      console.error('Webcam access error:', err);
      setCameraError('Camera permission denied or camera unavailable. Selfie photo capture is optional.');
      toast.error('Webcam unavailable. Selfie photo capture is optional.');
      cyberSound.playError();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setSelfieImage(dataUrl);
      toast.success('Selfie evidence captured!');
      cyberSound.playSuccess();
      stopCamera();
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const triggerKeyHighlight = (keyVal) => {
    setActivePhysicalKey(keyVal);
    cyberSound.playPulse();
    setTimeout(() => setActivePhysicalKey(null), 150);
  };

  const handlePinKey = (val) => {
    setVerifyError('');
    setPin(prev => {
      if (prev.length < 4) {
        triggerKeyHighlight(val);
        return prev + val;
      }
      return prev;
    });
  };

  const handleClearPin = () => {
    triggerKeyHighlight('Clear');
    setPin('');
    setVerifiedStaff(null);
    setVerifyError('');
  };

  const handleBackspace = () => {
    triggerKeyHighlight('⌫');
    setPin(prev => prev.slice(0, -1));
    setVerifiedStaff(null);
    setVerifyError('');
  };

  const handleClockIn = async () => {
    if (pin.length !== 4) {
      toast.error('Please enter your 4-digit PIN');
      cyberSound.playError();
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/attendance/clock-in`, {
        pin,
        selfieImage
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Clocked in successfully!');
        cyberSound.playSuccess();
        setPin('');
        setSelfieImage('');
        setVerifiedStaff(null);
        setVerifyError('');
        fetchTimeClockData();
        if (onRefreshStaff) onRefreshStaff();
      } else if (res.data?.alreadyClockedIn) {
        toast.error(`${res.data.staff?.name || 'Staff'} is already clocked in. Auto-clocking out now...`);
        handleClockOut();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock-in failed. Please verify PIN.');
      cyberSound.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (pin.length !== 4) {
      toast.error('Please enter your 4-digit PIN');
      cyberSound.playError();
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/attendance/clock-out`, {
        pin,
        selfieImage
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Clocked out successfully!');
        cyberSound.playSuccess();
        setPin('');
        setSelfieImage('');
        setVerifiedStaff(null);
        setVerifyError('');
        fetchTimeClockData();
        if (onRefreshStaff) onRefreshStaff();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock-out failed. Please verify PIN.');
      cyberSound.playError();
    } finally {
      setLoading(false);
    }
  };

  // Smart Clock Action: Auto-determines Clock In or Clock Out if employee verified
  const handleSmartClock = () => {
    if (verifiedStaff) {
      if (verifiedStaff.isClockedIn) {
        handleClockOut();
      } else {
        handleClockIn();
      }
    } else {
      handleClockIn();
    }
  };

  // Physical Keypad Listener (handles physical keyboard / USB numpad)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid intercepting if typing inside textareas or selects
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'textarea' || targetTag === 'select') return;

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        handlePinKey(key);
      } else if (key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (key === 'Enter') {
        e.preventDefault();
        if (pin.length === 4) {
          handleSmartClock();
        }
      } else if (key === 'Escape' || key === 'Delete' || key === 'c' || key === 'C') {
        e.preventDefault();
        handleClearPin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, verifiedStaff, loading]);

  const getElapsedTime = (checkIn) => {
    if (!checkIn) return '0h 0m';
    const start = new Date(checkIn);
    const diffMs = currentTime - start;
    if (diffMs < 0) return '0h 0m';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  // Available staff accounts with PINs for quick selection chip bar
  const activeStaffWithPin = staffList.filter(s => s.status === 'active' && s.pin);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* TIME CLOCK STATION & ACTIVE STAFF GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TIME CLOCK STATION */}
        <div className={`lg:col-span-6 rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex flex-col justify-between relative overflow-hidden`}>
          <div>
            {/* Server Timestamp Clock Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Staff Time Clock Station</h3>
                  <p className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider`}>
                    4-Digit Security PIN • Physical &amp; Touch Keypads Supported
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-2xl font-black font-mono text-orange-500 whitespace-nowrap">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-500'} whitespace-nowrap`}>
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Keypad Capability Badge */}
            <div className="flex items-center justify-between gap-2 px-4 py-2 rounded-2xl border border-orange-500/20 bg-orange-500/5 mb-4 text-[10px] font-bold uppercase tracking-wider text-orange-400">
              <div className="flex items-center gap-2">
                <Keyboard size={14} className="text-orange-500" />
                <span>Physical Keypad Ready</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-2">
                <Smartphone size={14} className="text-orange-500" />
                <span>On-Screen Touch Keypad</span>
              </div>
            </div>

            {/* Quick Staff PIN Chips */}
            {activeStaffWithPin.length > 0 && (
              <div className="mb-5 p-3 rounded-2xl border border-white/10 bg-white/[0.02]">
                <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-gray-500'} block mb-2`}>
                  Select Staff Account to Auto-Fill PIN:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeStaffWithPin.map((s) => {
                    const cleanP = String(s.pin).trim();
                    const isSelected = pin === cleanP;

                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => {
                          setPin(cleanP);
                          setVerifyError('');
                          setVerifiedStaff(null);
                          verifyPinCode(cleanP);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-orange-500 text-black border-orange-400 font-black shadow-md scale-105'
                            : isDark
                            ? 'border-white/10 bg-white/5 text-white/80 hover:bg-orange-500/20 hover:text-orange-400'
                            : 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-orange-100'
                        }`}
                      >
                        <span>{s.name}</span>
                        <span className="font-mono text-[10px] opacity-70">({s.pin})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PIN Display Boxes */}
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-600'}`}>
                  Enter 4-Digit Security PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className={`p-1 rounded-lg ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* 4 Digit Boxes Display */}
              <div className="flex justify-center items-center gap-3 mb-2">
                {[0, 1, 2, 3].map((index) => {
                  const digit = pin[index];
                  const isFilled = digit !== undefined;

                  return (
                    <div
                      key={index}
                      className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black font-mono transition-all ${
                        isFilled
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)] scale-105'
                          : isDark
                          ? 'border-white/10 bg-black/40 text-white/20'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      }`}
                    >
                      {isFilled ? (showPin ? digit : '•') : ''}
                    </div>
                  );
                })}
              </div>

              {/* Hidden Focusable Input for direct physical keyboard typing */}
              <input
                ref={pinInputRef}
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => {
                  setVerifyError('');
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                }}
                className="sr-only"
                autoFocus
              />

              {/* Verified Staff Card Preview */}
              <AnimatePresence>
                {verifying && (
                  <p className="text-xs font-bold text-orange-400 animate-pulse mt-2">
                    Verifying PIN code...
                  </p>
                )}

                {verifyError && !verifying && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mt-3 flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={16} />
                    <span>{verifyError}</span>
                  </motion.div>
                )}

                {verifiedStaff && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-4 p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-left flex items-center justify-between gap-4 shadow-lg shadow-emerald-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-lg">
                        {(verifiedStaff.staff.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-sm text-white">{verifiedStaff.staff.name}</p>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          {verifiedStaff.staff.role} • {verifiedStaff.isClockedIn ? 'Currently Clocked In' : 'Ready to Clock In'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${
                        verifiedStaff.isClockedIn
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      }`}>
                        {verifiedStaff.isClockedIn ? 'Shift In Progress' : 'Off Shift'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* On-Screen Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => {
                const isActive = activePhysicalKey === num;

                return (
                  <button
                    key={num}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePinKey(num)}
                    className={`py-3.5 rounded-2xl border font-mono font-black text-xl transition-all cursor-pointer select-none active:scale-95 ${
                      isActive
                        ? 'bg-orange-500 text-black border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.6)] scale-105'
                        : isDark
                        ? 'border-white/10 bg-white/5 text-white hover:bg-orange-500/20 hover:border-orange-500/40 hover:text-orange-400'
                        : 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-orange-100 hover:text-orange-600'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearPin}
                className={`py-3.5 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activePhysicalKey === 'Clear'
                    ? 'bg-rose-500 text-white border-rose-400 shadow-lg scale-105'
                    : 'text-rose-500 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white'
                }`}
              >
                Clear
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePinKey('0')}
                className={`py-3.5 rounded-2xl border font-mono font-black text-xl transition-all cursor-pointer select-none active:scale-95 ${
                  activePhysicalKey === '0'
                    ? 'bg-orange-500 text-black border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.6)] scale-105'
                    : isDark
                    ? 'border-white/10 bg-white/5 text-white hover:bg-orange-500/20 hover:border-orange-500/40 hover:text-orange-400'
                    : 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-orange-100 hover:text-orange-600'
                }`}
              >
                0
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleBackspace}
                className={`py-3.5 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activePhysicalKey === '⌫'
                    ? 'bg-orange-500 text-black border-orange-400 shadow-lg scale-105'
                    : isDark
                    ? 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                    : 'border-gray-200 bg-gray-100 text-gray-700'
                }`}
              >
                ⌫
              </button>
            </div>

            {/* Webcam / Selfie Evidence Section */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'} mb-6`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Camera size={16} className="text-orange-500" />
                  <span>Optional Selfie Evidence Verification</span>
                </div>
                {!isCameraActive && !selfieImage && (
                  <button
                    onClick={startCamera}
                    className="px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase hover:bg-orange-500 hover:text-black transition-all cursor-pointer"
                  >
                    Open Webcam
                  </button>
                )}
              </div>

              {isCameraActive && (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-xs mx-auto mb-2 border border-orange-500/40">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <button
                    onClick={captureSelfie}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-orange-500 text-black font-black text-xs uppercase tracking-wider hover:bg-orange-400 shadow-lg cursor-pointer"
                  >
                    Snap Photo
                  </button>
                </div>
              )}

              {selfieImage && (
                <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <img src={selfieImage} alt="Selfie" className="h-9 w-9 rounded-lg object-cover border border-emerald-500/50" />
                    <span className="font-bold text-emerald-400">Selfie Evidence Attached</span>
                  </div>
                  <button
                    onClick={() => setSelfieImage('')}
                    className="text-white/40 hover:text-rose-400 cursor-pointer"
                    title="Remove Selfie"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* Clock In / Out Main Actions */}
          {verifiedStaff ? (
            <button
              onClick={handleSmartClock}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                verifiedStaff.isClockedIn
                  ? 'bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400'
                  : 'bg-emerald-500 text-black shadow-emerald-500/20 hover:bg-emerald-400'
              }`}
            >
              {verifiedStaff.isClockedIn ? (
                <>
                  <UserX size={20} /> Clock Out Now ({verifiedStaff.staff.name})
                </>
              ) : (
                <>
                  <UserCheck size={20} /> Clock In Now ({verifiedStaff.staff.name})
                </>
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleClockIn}
                disabled={loading}
                className="py-4 rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserCheck size={18} /> Clock In
              </button>
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="py-4 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserX size={18} /> Clock Out
              </button>
            </div>
          )}
        </div>

        {/* ACTIVE CLOCKED-IN STAFF & RECENT LOGS */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl`}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                <h3 className="text-lg font-black uppercase tracking-tight">Active Working Staff</h3>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                {activeClockedIn.length} On Shift
              </span>
            </div>

            {activeClockedIn.length === 0 ? (
              <div className="py-12 text-center">
                <UserX size={36} className={`mx-auto mb-2 ${isDark ? 'text-white/20' : 'text-gray-400'}`} />
                <p className={`text-xs font-bold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  No staff members currently clocked in.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-hide">
                {activeClockedIn.map((item) => {
                  const staffUser = item.userId || {};
                  return (
                    <div
                      key={item._id}
                      className={`p-4 rounded-2xl border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'} flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {item.selfieImage ? (
                            <img src={item.selfieImage} alt="Selfie" className="h-10 w-10 rounded-xl object-cover border border-orange-500/40" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/30 flex items-center justify-center font-black text-sm">
                              {(staffUser.name || 'S').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-black" />
                        </div>

                        <div>
                          <p className="font-bold text-sm">{staffUser.name || 'Staff Member'}</p>
                          <p className={`text-[10px] font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider`}>
                            {staffUser.role || 'Staff'} • Rate: ${staffUser.hourlyRate || 18.5}/hr
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black font-mono text-emerald-400">
                          ⏱ {getElapsedTime(item.checkIn)}
                        </p>
                        <p className={`text-[9px] ${isDark ? 'text-white/40' : 'text-gray-500'} font-mono`}>
                          In at {new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl flex-1`}>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <h3 className="text-lg font-black uppercase tracking-tight">Recent Attendance Logs</h3>
              <button
                onClick={fetchTimeClockData}
                className={`p-2 rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:text-white' : 'border-gray-200 bg-gray-100 text-gray-600'} transition-all cursor-pointer`}
                title="Refresh Logs"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
              {clockHistory.length === 0 ? (
                <p className={`text-center py-8 text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>No attendance logs recorded yet.</p>
              ) : (
                clockHistory.slice(0, 8).map((log) => {
                  const u = log.userId || {};
                  const isCompleted = log.status === 'Completed' || log.checkOut;

                  return (
                    <div
                      key={log._id}
                      className={`p-3.5 rounded-2xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'} flex items-center justify-between text-xs`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                          {isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <p className="font-bold">{u.name || 'Staff Member'}</p>
                          <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            {log.date} • {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {log.checkOut ? ` → ${new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Working)'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        {log.totalHours ? (
                          <>
                            <p className="font-black text-amber-400">{log.totalHours} hrs</p>
                            <p className="text-[10px] text-emerald-400 font-bold">${(log.estimatedPay || 0).toFixed(2)}</p>
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">In Progress</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
