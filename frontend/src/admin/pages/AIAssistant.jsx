import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SendHorizontal,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Loader2,
  Terminal,
  Zap,
  CheckCircle2,
  HelpCircle,
  Clock,
  Table
} from 'lucide-react'
import { useReservation } from '../../context/ReservationContext'
import { useTheme } from '../../context/ThemeContext'

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

const prompts = [
  'I want a table for 4 tomorrow at 8 PM',
  'Book me for 2 people tonight at 7:30 PM',
  'Reserve a table for 6 on Friday at 9 PM',
  'I need a table for 4 this Saturday at 6 PM'
]

export default function AIAssistant() {
  const { syncReservations } = useReservation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', text: 'Hello! I am your AI Reservation Copilot. Tell me the date, time, guest count, customer name, and phone number to reserve a table automatically.' }
  ])
  const [input, setInput] = useState('')
  const [pendingState, setPendingState] = useState({})
  const [isSending, setIsSending] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleUpdated = () => syncReservations()
      window.addEventListener('reservation:updated', handleUpdated)
      return () => window.removeEventListener('reservation:updated', handleUpdated)
    }
  }, [syncReservations])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const handleClearChat = () => {
    setMessages([
      { id: 1, role: 'assistant', text: 'Hello! I am your AI Reservation Copilot. Tell me the date, time, guest count, customer name, and phone number to reserve a table automatically.' }
    ])
    setPendingState({})
  }

  const send = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || isSending) return

    const userText = input.trim()
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: userText }])
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, state: pendingState })
      })
      const data = await response.json()

      if (data.state) {
        setPendingState(data.state)
      }

      if (data.message) {
        setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text: data.message }])
      }

      if (data.success && data.reservation) {
        syncReservations()
      }
    } catch {
      setMessages((current) => [...current, { id: Date.now() + 2, role: 'assistant', text: 'I hit a connection issue. Please verify server connection and try again.' }])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* ── HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 sm:p-8 backdrop-blur-2xl shadow-2xl`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-500">
              <Sparkles size={14} className="animate-pulse" />
              <span>AI Reservation Copilot Engine v2.5</span>
            </div>
            <h1 className={`mt-4 text-3xl sm:text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>Restaurant Reservation AI</h1>
            <p className={`mt-2 text-xs sm:text-sm ${isDark ? 'text-white/50' : 'text-gray-600'} font-medium max-w-2xl leading-relaxed`}>
              Chat naturally to book tables. The assistant captures date, time, guest count, customer name, and phone number, automatically assigning the optimal table.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold self-start lg:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Copilot Ready</span>
          </div>
        </div>
      </motion.div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left Side: Quick Directives & Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="flex flex-col gap-5"
        >
          {/* Suggested Directives Card */}
          <div className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl shadow-xl`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} mb-4`}>
              <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-2">
                <Zap size={14} /> Quick Directives
              </span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-gray-500'}`}>SUGGESTIONS</span>
            </div>

            <div className="space-y-2.5">
              {prompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  className={`group flex w-full items-center justify-between rounded-2xl border ${isDark ? 'border-white/10 bg-white/5 text-white/80 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-800 hover:border-orange-500/40 hover:bg-orange-50 hover:text-gray-900'} p-3.5 text-left text-xs transition-all active:scale-[0.98]`}
                >
                  <span className="font-medium pr-2">{prompt}</span>
                  <Sparkles size={14} className="text-orange-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          {/* AI Features Summary Card */}
          <div className={`rounded-[28px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-6 backdrop-blur-2xl shadow-xl text-xs ${isDark ? 'text-white/70' : 'text-gray-600'} space-y-3`}>
            <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'} border-b ${isDark ? 'border-white/10' : 'border-gray-200'} pb-3`}>
              <Bot size={16} className="text-orange-500" />
              <span>Copilot Capabilities</span>
            </div>

            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span>Natural Language Date & Time Parsing</span>
              </div>
              <div className={`flex items-center gap-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span>Automatic Table Capacity Assignment</span>
              </div>
              <div className={`flex items-center gap-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span>Real-Time Reservation Synchronization</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Chat Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={`flex h-[68vh] flex-col overflow-hidden rounded-[32px] border ${isDark ? 'border-white/10 bg-[#121215]/95 text-white' : 'border-gray-200 bg-white text-gray-900 shadow-md'} p-5 backdrop-blur-2xl shadow-2xl`}
        >
          {/* Chat Header */}
          <div className={`flex items-center justify-between pb-3.5 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} mb-4`}>
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-500">
                <Bot size={20} />
                <span className={`absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 ${isDark ? 'border-[#121215]' : 'border-white'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>SIA Reservation Copilot</h3>
                <p className={`text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider`}>Online // Ready for Directives</p>
              </div>
            </div>

            <button
              onClick={handleClearChat}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${isDark ? 'border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10' : 'border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'} text-[10px] font-bold uppercase tracking-wider transition-all`}
              title="Clear Conversation"
            >
              <RotateCcw size={13} />
              <span>Clear Log</span>
            </button>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant';

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500 flex-shrink-0 mt-0.5">
                        <Bot size={16} />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-[22px] p-4 text-xs leading-relaxed shadow-lg ${
                        isAssistant
                          ? isDark ? 'border border-white/10 bg-white/[0.04] text-white/90' : 'border border-gray-200 bg-gray-100 text-gray-800'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-semibold'
                      }`}
                    >
                      {message.text}
                    </div>

                    {!isAssistant && (
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${isDark ? 'border-white/15 bg-white/10 text-white' : 'border-gray-300 bg-gray-200 text-gray-800'} flex-shrink-0 mt-0.5`}>
                        <User size={16} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-xs text-orange-500 font-mono bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20 max-w-xs"
              >
                <Loader2 size={14} className="animate-spin text-orange-500" />
                <span>Processing intent...</span>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Dock */}
          <form onSubmit={send} className={`mt-4 flex gap-2.5 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="relative flex-1">
              <Terminal size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your reservation request (e.g., 'Table for 4 tomorrow at 8 PM')"
                className={`w-full rounded-2xl border ${isDark ? 'border-white/10 bg-black/40 text-white placeholder-white/30' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400'} py-3 pl-10 pr-4 text-xs outline-none focus:border-orange-500/60 shadow-inner`}
              />
            </div>

            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-orange-500/20 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin text-black" />
              ) : (
                <>
                  <SendHorizontal size={16} />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
