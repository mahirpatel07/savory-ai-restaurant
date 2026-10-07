import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { cyberSound } from '../utils/cyberSoundUtils';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export const useAdminVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isHudOpen, setIsHudOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [activeTelemetry, setActiveTelemetry] = useState(null);
  const [history, setHistory] = useState([
    {
      id: 'init-1',
      sender: 'sia',
      text: 'SIA Command Core Online. State your voice directive or click a quick action.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const toggleMute = useCallback(() => {
    const muted = cyberSound.toggleMute();
    setIsMuted(muted);
    toast.success(muted ? 'Voice Audio Muted' : 'Voice Audio Active', { id: 'voice-mute' });
  }, []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel') || v.name.includes('Natural')
    ) || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopAll = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsSpeaking(false);
    setIsListening(false);
    setIsThinking(false);
    cyberSound.playClick();
  }, []);

  const processCommand = useCallback(async (commandText) => {
    if (!commandText || !commandText.trim()) return;

    const cleanCommand = commandText.trim();
    cyberSound.playPulse();
    setIsThinking(true);
    setLiveTranscript(cleanCommand);

    // Add user message to transcript log
    const userMsg = {
      id: Date.now() + '-user',
      sender: 'user',
      text: cleanCommand,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setHistory(prev => [userMsg, ...prev]);

    // Handle stop/mute direct commands locally
    const lowerCmd = cleanCommand.toLowerCase();
    if (lowerCmd.includes('stop') || lowerCmd.includes('quiet') || lowerCmd.includes('shut up') || lowerCmd.includes('cancel')) {
      stopAll();
      setIsThinking(false);
      return;
    }

    try {
      // Call backend API for real-time MongoDB queries & AI processing
      const res = await axios.post(`${API_BASE}/api/admin/voice-command`, { command: cleanCommand });
      const data = res.data;

      setIsThinking(false);
      cyberSound.playSuccess();

      if (data.action && (data.action.startsWith('navigate') || data.route)) {
        if (data.route) {
          navigate(data.route);
        }
      }

      if (data.data) {
        setActiveTelemetry(data.data);
      }

      const siaReply = data.spokenText || data.displayText || `Executed: ${cleanCommand}`;

      // Add SIA response to transcript
      const siaMsg = {
        id: Date.now() + '-sia',
        sender: 'sia',
        text: siaReply,
        data: data.data || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setHistory(prev => [siaMsg, ...prev]);

      // Speak response
      speak(siaReply);

    } catch (err) {
      console.error('Voice Command Error:', err);
      setIsThinking(false);
      cyberSound.playError();

      // Fallback local processing
      let fallbackReply = `Executing command: ${cleanCommand}`;
      if (lowerCmd.includes('dashboard')) {
        navigate('/admin');
        fallbackReply = 'Opening Ops Dashboard.';
      } else if (lowerCmd.includes('inventory')) {
        navigate('/admin/inventory');
        fallbackReply = 'Loading Inventory levels.';
      } else if (lowerCmd.includes('pos')) {
        navigate('/admin/pos');
        fallbackReply = 'Switching to POS Terminal.';
      } else if (lowerCmd.includes('kitchen') || lowerCmd.includes('kds')) {
        navigate('/admin/kds');
        fallbackReply = 'Opening Kitchen Display.';
      } else if (lowerCmd.includes('table')) {
        navigate('/admin/table-management');
        fallbackReply = 'Opening Table Floor Plan.';
      } else {
        fallbackReply = `I heard: "${cleanCommand}". Ask me to check inventory, revenue, active kitchen orders, or table layout.`;
      }

      setHistory(prev => [{
        id: Date.now() + '-sia-err',
        sender: 'sia',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev]);

      speak(fallbackReply);
    }
  }, [navigate, speak, stopAll]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice Recognition is not supported in this browser.', { id: 'no-speech' });
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    cyberSound.playActivate();
    setIsHudOpen(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript('Listening...');
      };

      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setLiveTranscript(currentText);

        if (event.results[0].isFinal) {
          recognition.stop();
          processCommand(currentText);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          cyberSound.playError();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsListening(false);
    }
  }, [processCommand]);

  const clearHistory = useCallback(() => {
    cyberSound.playClick();
    setHistory([{
      id: Date.now() + '-init',
      sender: 'sia',
      text: 'Log cleared. SIA Command Core ready.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setActiveTelemetry(null);
  }, []);

  // Keyboard hotkey handler (Alt+V or Ctrl+Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey && e.key.toLowerCase() === 'v') || (e.ctrlKey && e.code === 'Space')) {
        e.preventDefault();
        if (isListening) {
          stopAll();
        } else {
          startListening();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, startListening, stopAll]);

  return {
    isListening,
    isSpeaking,
    isThinking,
    isHudOpen,
    setIsHudOpen,
    isMuted,
    toggleMute,
    liveTranscript,
    history,
    activeTelemetry,
    startListening,
    stopAll,
    processCommand,
    clearHistory,
    speak
  };
};
