import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { FiSend, FiX, FiMic } from 'react-icons/fi';
import { HiSpeakerWave, HiSpeakerXMark } from 'react-icons/hi2';
import { useReservation } from '../../context/ReservationContext';
import { useVoiceAgent, AGENT_STATE } from '../../hooks/useVoiceAgent';
import ReactConfetti from 'react-confetti';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';

import VoiceMode from './VoiceMode';
import VoiceWaveform from './VoiceWaveform';

const QUICK_ACTIONS = [
  { label: 'Reserve Table', icon: '🍽', prompt: 'I would like to reserve a table.' },
  { label: 'Availability', icon: '📅', prompt: 'Check table availability for today.' },
  { label: 'View Menu', icon: '📖', prompt: 'Show me the restaurant menu.' },
  { label: 'Information', icon: '📍', prompt: 'Tell me about Savory restaurant.' },
  { label: 'Ask Question', icon: '❓', prompt: 'focus_input' },
];

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatReservationId(rawId) {
  if (!rawId) return '#RSV-000000';
  return `#RSV-${String(rawId).slice(-6).toUpperCase()}`;
}

function renderTextWithMarkdown(text) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function TypingBubble() {
  const dotsRef = useRef([]);

  useEffect(() => {
    if (!dotsRef.current || dotsRef.current.length === 0) return;
    const activeDots = dotsRef.current.filter(Boolean);
    if (activeDots.length === 0) return;

    const tl = gsap.timeline({ repeat: -1 });
    tl.to(activeDots, {
      y: -6,
      duration: 0.4,
      stagger: 0.1,
      ease: 'power1.inOut'
    })
    .to(activeDots, {
      y: 0,
      duration: 0.4,
      stagger: 0.1,
      ease: 'power1.inOut'
    }, '-=0.2');

    return () => tl.kill();
  }, []);

  return (
    <div className="flex gap-1 py-1.5">
      {[1, 2, 3].map(i => (
        <span key={`dot-${i}`} ref={el => dotsRef.current[i-1] = el} className="h-1.5 w-1.5 rounded-full bg-white/40" />
      ))}
    </div>
  );
}

function MicWaveform({ state, volume }) {
  const bars = [0, 1, 2];

  const getAnimation = (i) => {
    if (state === AGENT_STATE.LISTENING) {
      return {
        height: [
          '8px',
          `${Math.min(16, 8 + (volume / (2 + i)))}px`,
          '8px'
        ],
        transition: { duration: 0.2, repeat: Infinity, ease: "linear" }
      };
    }
    if (state === AGENT_STATE.SPEAKING) {
      return {
        height: ['8px', '16px', '10px', '14px', '8px'],
        transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }
      };
    }
    if (state === AGENT_STATE.THINKING) {
        return {
          opacity: [0.3, 1, 0.3],
          height: ['10px', '12px', '10px'],
          transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }
        };
    }
    return { height: '12px' };
  };

  return (
    <div className="flex items-center gap-0.5 h-4">
      {bars.map((i) => (
        <motion.span
          key={i}
          animate={getAnimation(i)}
          className={`w-0.5 rounded-full ${state === AGENT_STATE.SPEAKING ? 'bg-white' : 'bg-white'}`}
        />
      ))}
    </div>
  );
}

function ReservationPreviewCard({ preview, onConfirm, onCancel }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (preview && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
      );
    }
  }, [preview]);

  if (!preview) return null;
  const tables = preview.tableIds && preview.tableIds.length > 0
    ? preview.tableIds.map(id => `T${id}`).join(', ')
    : `T${preview.table?.id}`;

  return (
    <div className="w-full pb-4">
      <div ref={cardRef} className="bg-[#1B1B1B] border border-white/5 p-4 rounded-[18px] shadow-xl w-full">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-semibold text-white">Reservation Preview</p>
            <p className="text-[9px] text-white/40 uppercase tracking-wider">Review Details</p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#16C784]/10 text-[8px] font-bold text-[#16C784] uppercase tracking-wider">Available</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <DetailRow label="Guests" value={preview.guests} />
          <DetailRow label="Date" value={preview.requestedDate || preview.date} />
          <DetailRow label="Time" value={preview.requestedTime || preview.time} />
          <DetailRow label="Table" value={tables} />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onConfirm} className="flex-1 h-9 rounded-full bg-[#FF7A45] text-black text-[11px] font-bold hover:bg-[#ff8c5d] transition-all">Confirm</button>
          <button onClick={onCancel} className="flex-1 h-9 rounded-full bg-white/5 border border-white/10 text-white text-[11px] hover:bg-white/10 transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ReservationConfirmationCard({ reservation }) {
  const cardRef = useRef(null);
  const idRef = useRef(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    if (reservation && cardRef.current) {
      const tl = gsap.timeline();

      tl.fromTo(cardRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
      );

      if (idRef.current) {
        tl.fromTo(idRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5 },
          '-=0.2'
        );
      }

      if (pulseRef.current) {
        gsap.to(pulseRef.current, {
          scale: 1.5,
          opacity: 0,
          duration: 1.5,
          repeat: -1,
          ease: 'power2.out'
        });
      }
    }
  }, [reservation]);

  if (!reservation) return null;
  const tables = reservation.tableNumbers && reservation.tableNumbers.length > 0
    ? reservation.tableNumbers.map(n => `T${n}`).join(', ')
    : `T${reservation.tableId}`;

  return (
    <div className="w-full pb-4">
      <div ref={cardRef} className="bg-[#111111] border border-[#16C784]/20 p-4 rounded-[18px] shadow-lg w-full relative overflow-hidden">
        <div ref={pulseRef} className="absolute top-4 right-4 w-4 h-4 bg-[#16C784] rounded-full pointer-events-none opacity-20" />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-semibold text-[#16C784]">Reservation Confirmed</p>
            <p ref={idRef} className="text-[9px] text-white/40 uppercase tracking-wider">{formatReservationId(reservation.id)}</p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#16C784]/10 text-[8px] font-bold text-[#16C784] uppercase tracking-wider">Confirmed</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <DetailRow label="Guests" value={reservation.guests} />
          <DetailRow label="Table" value={tables} />
          <DetailRow label="Date" value={reservation.date} />
          <DetailRow label="Time" value={reservation.time} />
        </div>
        <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white/60 text-center">
          Please arrive 10 minutes before your time.
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="bg-[#141414] p-2 rounded-xl border border-white/5">
      <p className="text-[7px] uppercase tracking-[0.1em] text-white/30 mb-0.5">{label}</p>
      <p className="text-[10px] font-semibold text-white truncate">{value}</p>
    </div>
  );
}

function MenuDisplay({ data }) {
  if (!data || !Array.isArray(data)) return null;
  return (
    <div className="w-full space-y-4 mt-2">
      {data.map((cat, idx) => (
        <div key={`cat-${cat.category || idx}`} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF7A45] ml-1">{cat.category}</p>
          <div className="grid grid-cols-1 gap-2">
            {cat.items.map((item, i) => (
              <div key={item._id || item.id || `item-${i}`} className="bg-[#1B1B1B] border border-white/5 p-3 rounded-xl flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[12px] font-semibold text-white">{item.name}</p>
                    <p className="text-[11px] font-bold text-[#FF7A45]">{item.price}</p>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoDisplay({ data }) {
  if (!data) return null;
  const rows = [
    { id: 'address', label: 'Address', value: data.address },
    { id: 'hours', label: 'Hours', value: `${data.openingHours} - ${data.closingHours}` },
    { id: 'phone', label: 'Phone', value: data.phone },
    { id: 'email', label: 'Email', value: data.email },
    { id: 'cuisine', label: 'Cuisine', value: data.cuisine },
    { id: 'parking', label: 'Parking', value: data.parking },
    { id: 'wifi', label: 'WiFi', value: data.wifi },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
      {rows.map((row) => (
        <div key={row.id} className="bg-[#1B1B1B] border border-white/5 p-2.5 rounded-xl">
          <p className="text-[7px] uppercase tracking-wider text-white/30 mb-0.5">{row.label}</p>
          <p className="text-[10px] font-medium text-white/90">{row.value}</p>
        </div>
      ))}
      <div className="bg-[#1B1B1B] border border-white/5 p-2.5 rounded-xl sm:col-span-2">
        <p className="text-[7px] uppercase tracking-wider text-white/30 mb-0.5">Payment Methods</p>
        <p className="text-[10px] font-medium text-white/90">{data.paymentMethods.join(', ')}</p>
      </div>
    </div>
  );
}

export default function AIDrawer({ isOpen, onClose }) {
  const { syncReservations } = useReservation();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [graphState, setGraphState] = useState({
    extraction: { name: null, phone: null, guests: null, date: null, time: null, preference: null },
    current_state: 'WELCOME',
    is_completed: false,
    preview: null,
    reservation_result: null
  });

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isVoiceViewOpen, setIsVoiceViewOpen] = useState(false);

  const drawerRef = useRef(null);
  const overlayRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const micRef = useRef(null);
  const micGlowRef = useRef(null);
  const micRingRef = useRef(null);
  const lastMessageId = useRef(null);

  const { agentState, setAgentState, volume, toggleListening, speak, stopSpeaking, analyserRef } = useVoiceAgent({
    onTranscript: (text, speaker) => {
      console.log(`[AIDrawer onTranscript] speaker: ${speaker}, text: ${text}`);
      if (!hasInteracted) setHasInteracted(true);
      setMessages(prev => {
        // De-duplication check: avoid adding the same text from the same sender twice in a row
        const lastMsg = prev[prev.length - 1];
        const currentSender = speaker === 'agent' ? 'bot' : 'user';

        if (lastMsg && lastMsg.text === text && lastMsg.sender === currentSender) {
          console.warn(`[AIDrawer] Skipping duplicate transcript message: ${text}`);
          return prev;
        }

        const newMessage = {
          id: `voice-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sender: currentSender,
          text: text,
          timestamp: new Date().toISOString()
        };
        console.log(`[AIDrawer] Adding message: ${newMessage.id}`, newMessage);
        return [...prev, newMessage];
      });
      if (speaker === 'agent') {
        setAgentState(AGENT_STATE.SPEAKING);
      }
    },
    onToolResult: (toolName, data) => {
      console.log(`[onToolResult] tool: ${toolName}`, data);
      if (toolName === 'checkAvailability') {
        setGraphState(prev => ({
          ...prev,
          current_state: 'WAITING_FOR_CONFIRMATION',
          intent: 'MAKE_RESERVATION', // Transition to reservation flow
          preview: {
            ...data,
            guests: data.table?.guestCount || prev.extraction?.guests,
            date: data.table?.date || prev.extraction?.date,
            time: data.table?.time || prev.extraction?.time
          }
        }));
      } else if (toolName === 'createBooking') {
        setGraphState(prev => ({
          ...prev,
          current_state: 'RESERVATION_CONFIRMED',
          is_completed: true,
          reservation_result: data.reservation || data.formattedReservation,
          preview: null
        }));
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        syncReservations();
      }
    }
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const ctx = gsap.context(() => {
        if (overlayRef.current) gsap.to(overlayRef.current, { opacity: 1, duration: 0.5 });
        if (drawerRef.current) {
          gsap.fromTo(drawerRef.current,
            { opacity: 0, scale: 0.9, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out' }
          );
        }
      });

      setTimeout(() => inputRef.current?.focus(), 300);

      setMessages([
        {
          id: `bot-welcome-${Date.now()}`,
          sender: 'bot',
          text: `👋 Welcome to Savory!\nI'm your AI Reservation Assistant.\nI can help you:\n🍽 Reserve a table\n📅 Check table availability\n⏰ Find the best dining time\n👨‍👩‍👧 Reserve for individuals, families or groups\n✨ Answer restaurant questions\nI'll guide you through the reservation process.\nHow can I help you today?`,
          timestamp: new Date().toISOString()
        }
      ]);
      setHasInteracted(false);
      setGraphState({
        extraction: { name: null, phone: null, guests: null, date: null, time: null, preference: null },
        current_state: 'WELCOME',
        is_completed: false,
        preview: null,
        reservation_result: null
      });
      return () => {
        document.body.style.overflow = '';
        ctx.revert();
      };
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id !== lastMessageId.current) {
        lastMessageId.current = lastMsg.id;

        // Auto-scroll logic: only scroll if user was already at bottom or it's a user message
        if (isAtBottom || lastMsg.sender === 'user') {
          setTimeout(() => scrollToBottom(), 100);
        }

        // Find the DOM element for the new message
        const messageElements = messagesContainerRef.current?.querySelectorAll('.chat-message-wrapper');
        const lastEl = messageElements?.[messageElements.length - 1];

        if (lastEl) {
          gsap.from(lastEl, {
            x: lastMsg.sender === 'user' ? 30 : -30,
            opacity: 0,
            duration: 0.35,
            ease: 'power2.out'
          });
        }

        // Stagger welcome message content
        if (lastMsg.id === 'welcome' && lastEl) {
          const paragraphs = lastEl.querySelectorAll('p');
          const buttons = drawerRef.current?.querySelectorAll('.quick-action-btn');

          if (paragraphs && paragraphs.length > 0) {
            gsap.from(paragraphs, {
              opacity: 0,
              y: 10,
              scale: 0.98,
              stagger: 0.1,
              duration: 0.5,
              ease: 'power2.out'
            });
          }

          if (buttons && buttons.length > 0) {
            gsap.from(buttons, {
              opacity: 0,
              y: 10,
              stagger: 0.08,
              duration: 0.4,
              ease: 'back.out(1.7)',
              delay: 0.5
            });
          }
        }
      }

      scrollToBottom();
    }
  }, [messages, isAtBottom, graphState.current_state, graphState.preview, graphState.reservation_result]);

  // Handle Voice Agent Visuals
  useEffect(() => {
    let micTl;
    let ringTl;

    if (agentState === AGENT_STATE.LISTENING) {
      // Large green glow
      if (micGlowRef.current) {
        gsap.to(micGlowRef.current, {
          opacity: 0.4,
          backgroundColor: '#16C784',
          scale: 1.8,
          duration: 0.5
        });
      }

      // Pulse ring
      if (micRingRef.current) {
        ringTl = gsap.to(micRingRef.current, {
          scale: 2,
          opacity: 0,
          duration: 1.5,
          repeat: -1,
          ease: 'power1.out'
        });
      }

      // Waveform animation removed (Handled by MicWaveform component)
    } else if (agentState === AGENT_STATE.THINKING) {
      // Orange rotating ring
      if (micGlowRef.current) {
        gsap.to(micGlowRef.current, {
          opacity: 0.3,
          backgroundColor: '#FF7A45',
          scale: 1.2,
          duration: 0.3
        });
      }

      if (micRingRef.current) {
        micTl = gsap.to(micRingRef.current, {
          rotation: 360,
          duration: 2,
          repeat: -1,
          ease: 'none'
        });
      }
    } else if (agentState === AGENT_STATE.SPEAKING) {
      // Blue waveform + glow
      if (micGlowRef.current) {
        gsap.to(micGlowRef.current, {
          opacity: 0.4,
          backgroundColor: '#3b82f6',
          scale: 1.5,
          duration: 0.5
        });
      }

      // Waveform animation removed (Handled by MicWaveform component)
    } else {
      // Idle Breathing
      if (micGlowRef.current) {
        gsap.to(micGlowRef.current, {
          opacity: 0.1,
          scale: 1,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }

      // Waveform animation removed (Handled by MicWaveform component)
    }

    return () => {
      if (micTl) micTl.kill();
      if (ringTl) ringTl.kill();
    };
  }, [agentState, volume]);

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
      setIsAtBottom(true);
      setShowScrollButton(false);
    }
  };

  // Track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - clientHeight - scrollTop < 50;
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom && scrollHeight > clientHeight);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleSendMessage(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || isThinking) return;

    if (!hasInteracted) setHasInteracted(true);

    stopSpeaking();
    setAgentState(AGENT_STATE.THINKING);

    const userMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);
    inputRef.current?.focus();

    try {
      const requestId = Math.random().toString(36).substring(7);
      console.log(`[CHAT REQUEST] requestId: ${requestId}, message: ${trimmed}`);
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          state: graphState,
          history: messages.slice(-10),
          voiceMode: isVoiceEnabled
        })
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      console.log(`[CHAT RESPONSE] requestId: ${requestId}`, data);

      if (data.state) setGraphState(data.state);

      const botMessage = {
        id: `bot-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        sender: 'bot',
        text: data.message || 'Sorry, I could not process that request.',
        timestamp: new Date().toISOString(),
        menuData: data.menuData,
        infoData: data.infoData
      };

      console.log(`[CHAT MESSAGE]\nrequestId: ${requestId}\nmessageId: ${botMessage.id}`);

      setMessages((prev) => {
        // Simple deduplication for text chat too
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text === botMessage.text && lastMsg.sender === 'bot') {
           console.warn(`[AIDrawer] Skipping duplicate bot message from chat API: ${botMessage.text}`);
           return prev;
        }
        return [...prev, botMessage];
      });

      if (isVoiceEnabled && data.message) {
        speak(data.message);
      } else {
        setAgentState(AGENT_STATE.IDLE);
      }

      if (data.success && data.reservation) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        syncReservations();
      }
    } catch (error) {
      console.error('Chat error:', error);
      setAgentState(AGENT_STATE.IDLE);
      setMessages((prev) => [...prev, {
        id: Date.now(),
        sender: 'bot',
        text: '⚠ AI service unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsThinking(false);
    }
  }

  const handleConfirm = () => handleSendMessage('Confirm reservation');
  const handleCancel = () => handleSendMessage('Cancel reservation');

  const getStatusInfo = () => {
    switch(agentState) {
        case AGENT_STATE.CONNECTING: return { text: 'Connecting...', color: 'text-[#FF7A45]/40', icon: '⏳' };
        case AGENT_STATE.LISTENING: return { text: 'Listening...', color: 'text-[#FF7A45]', icon: '🎤' };
        case AGENT_STATE.THINKING: return { text: 'Thinking...', color: 'text-[#FF7A45]/60', icon: '✨' };
        case AGENT_STATE.SPEAKING: return { text: 'Speaking...', color: 'text-[#16C784]', icon: '🔊' };
        case AGENT_STATE.STOPPING: return { text: 'Stopping...', color: 'text-white/20', icon: '⏹' };
        case AGENT_STATE.ERROR: return { text: 'Connection Error', color: 'text-red-500', icon: '⚠️' };
        default: return { text: 'Tap to Talk', color: 'text-white/40', icon: '●' };
    }
  };

  const status = getStatusInfo();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div
        ref={overlayRef}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md opacity-0"
      />

      <aside
        ref={drawerRef}
        className="w-full max-w-[560px] h-full max-h-[92vh] flex flex-col bg-[#0b0b0b] rounded-[24px] overflow-hidden shadow-2xl relative savory-glow border border-white/5 opacity-0"
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-white/5 bg-[#0b0b0b]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <div className="relative h-2 w-2">
              <span className={`block h-2 w-2 rounded-full ${
                agentState === AGENT_STATE.LISTENING ? 'bg-[#FF7A45]' :
                agentState === AGENT_STATE.SPEAKING ? 'bg-[#16C784]' :
                agentState === AGENT_STATE.CONNECTING ? 'bg-[#FF7A45]/40 animate-pulse' :
                agentState === AGENT_STATE.STOPPING ? 'bg-white/10 animate-pulse' :
                'bg-white/20'
              }`} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white tracking-tight"></h2>
              <p className={`text-[9px] font-medium uppercase tracking-[0.18em] transition-colors ${status.color}`}>{status.text}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2 rounded-lg border transition-all ${isVoiceEnabled ? 'border-[#FF7A45]/30 bg-[#FF7A45]/10 text-[#FF7A45]' : 'border-white/5 text-white/40 hover:text-white'}`}
            >
              {isVoiceEnabled ? <HiSpeakerWave size={16} /> : <HiSpeakerXMark size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-white/5 text-white/40 hover:text-white transition-colors"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-4 chat-scrollbar relative overscroll-contain outline-none min-h-0"
          data-lenis-prevent
        >
          <div className="max-w-[480px] mx-auto w-full space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message-wrapper flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} w-full`}>
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} w-full`}>
                  <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-white/30 mb-1.5 ml-1">
                    {msg.sender === 'user' ? 'GUEST' : ''}
                  </p>
                  <div className={msg.sender === 'user' ? 'ai-chat-bubble-user self-end' : 'ai-chat-bubble-assistant self-start'}>
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{renderTextWithMarkdown(msg.text)}</div>
                    {msg.menuData && <MenuDisplay data={msg.menuData} />}
                    {msg.infoData && <InfoDisplay data={msg.infoData} />}
                  </div>

                  {/* Persistent Quick Options for the Welcome Message - Sleek Horizontal Pills */}
                  {msg.id === 'welcome' && !hasInteracted && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-1 mt-4 scroll-smooth w-full"
                      data-lenis-prevent
                    >
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => action.prompt === 'focus_input' ? inputRef.current?.focus() : handleSendMessage(action.prompt)}
                          className={`flex-none flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all duration-300 whitespace-nowrap active:scale-95 ${
                            action.label === 'Reserve Table'
                              ? 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20 font-black'
                              : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5 hover:text-white hover:border-white/20 font-bold'
                          } text-[10px] uppercase tracking-[0.1em]`}
                        >
                          <span className="text-xs">{action.icon}</span>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  <p className="mt-2 text-[8px] font-medium text-white/20 ml-1 uppercase tracking-wider">
                    {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {graphState.current_state === 'WAITING_FOR_CONFIRMATION' && graphState.preview && (
              <ReservationPreviewCard preview={graphState.preview} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
            {graphState.reservation_result && (
              <ReservationConfirmationCard reservation={graphState.reservation_result} />
            )}

            {isThinking && (
              <div className="chat-message-wrapper flex flex-col items-start w-full relative">
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1.5 ml-1"></p>
                <div className="ai-chat-bubble-assistant inline-block relative overflow-hidden">
                  <TypingBubble />
                </div>
              </div>
            )}
          </div>

          {/* Floating Scroll to Latest Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                onClick={() => scrollToBottom()}
                className="absolute bottom-6 right-6 z-30 p-3 rounded-full bg-orange-500 text-black shadow-[0_10px_30px_rgba(249,115,22,0.4)] hover:bg-orange-400 transition-all active:scale-95 flex items-center gap-2 group"
              >
                <span className="text-[9px] font-black uppercase tracking-widest pl-1 overflow-hidden w-0 group-hover:w-24 transition-all duration-300">Latest</span>
                <FiSend size={14} className="rotate-90" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="flex-none px-4 sm:px-5 py-3 bg-[#0b0b0b] border-t border-white/5 z-20">
          <div className="max-w-[480px] mx-auto relative">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
              className="flex items-center gap-2 bg-[#141414] rounded-full px-2 h-10 border border-white/5 transition-all duration-300 overflow-hidden"
            >
              <div className="relative flex-1 flex items-center h-full">
                <AnimatePresence mode="wait">
                  {(agentState !== AGENT_STATE.IDLE && agentState !== AGENT_STATE.ERROR && agentState !== AGENT_STATE.STOPPED) ? (
                    <motion.div
                      key="voice-animation"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <VoiceWaveform
                        agentState={agentState}
                        analyserRef={analyserRef}
                        customConfig={{
                          barCount: 70,
                          barWidth: 3,
                          gap: 3,
                          maxHeight: 24,
                          minHeight: 2,
                          displayHeight: 40,
                          displayWidth: 440,
                          borderRadius: 2,
                          paddingY: 'py-0',
                          color: '#FF7A45',
                          smoothing: 0.2,
                          isDotted: true
                        }}
                      />
                    </motion.div>
                  ) : (
                    <motion.input
                      key="text-input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="How can I help you today?"
                      className="flex-1 bg-transparent border-none outline-none px-3 text-[12px] text-white placeholder:text-white/20 h-full w-full"
                    />
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  ref={micRef}
                  onClick={() => {
                    // Auto-enable voice feedback when using mic
                    if (!isVoiceEnabled) {
                      setIsVoiceEnabled(true);
                    }

                    toggleListening();
                    // Full screen voice mode disabled as per requirement for chatbox-only animation
                    // setIsVoiceViewOpen(true);
                  }}
                  className="relative flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300 text-white/30 hover:text-white"
                >
                  {/* Subtle pulsing effect around mic button when recording */}
                  {(agentState === AGENT_STATE.LISTENING || agentState === AGENT_STATE.SPEAKING) && (
                    <motion.div
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full bg-[#FF7A45]"
                    />
                  )}

                  <div ref={micGlowRef} className="absolute inset-0 rounded-full bg-white opacity-0 pointer-events-none" />
                  <div ref={micRingRef} className="absolute inset-0 rounded-full border border-white/20 opacity-0 pointer-events-none" />

                  {agentState === AGENT_STATE.SPEAKING || agentState === AGENT_STATE.LISTENING || agentState === AGENT_STATE.THINKING || agentState === AGENT_STATE.CONNECTING || agentState === AGENT_STATE.STOPPING ? (
                    <MicWaveform state={agentState} volume={volume} />
                  ) : (
                    <FiMic size={16} />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isThinking || agentState === AGENT_STATE.LISTENING}
                  className="bg-[#FF7A45] text-black h-8 w-8 flex items-center justify-center rounded-full hover:bg-[#ff8c5d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSend size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </aside>

      {showConfetti && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
          <ReactConfetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} gravity={0.1} />
        </div>
      )}

      <AnimatePresence>
        {isVoiceViewOpen && (
          <VoiceMode
            isOpen={isVoiceViewOpen}
            onClose={async () => {
              setIsVoiceViewOpen(false);
              // Ensure we stop the voice agent when closing the full screen view
              if (agentState !== AGENT_STATE.IDLE && agentState !== AGENT_STATE.ERROR) {
                await toggleListening();
              }
            }}
            agentState={agentState}
            analyserRef={analyserRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
