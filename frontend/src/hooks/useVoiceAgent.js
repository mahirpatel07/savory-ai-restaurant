import { useState, useRef, useEffect, useCallback } from 'react';
import { UltravoxSession, UltravoxSessionStatus } from 'ultravox-client';

export const AGENT_STATE = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  ERROR: 'ERROR',
  STOPPED: 'STOPPED',
  STOPPING: 'STOPPING'
};

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

export const useVoiceAgent = ({ onTranscript, onToolResult }) => {
  const [agentState, setAgentState] = useState(AGENT_STATE.IDLE);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const sessionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const animationFrameRef = useRef(null);

  const lastProcessedOrdinalRef = useRef(-1);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const onToolResultRef = useRef(onToolResult);
  onToolResultRef.current = onToolResult;

  const agentStateRef = useRef(agentState);
  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    setVolume(0);
  }, []);

  const stopVoiceAgent = useCallback(async () => {
    stopRequestedRef.current = true;
    const session = sessionRef.current;

    try {
      setAgentState(AGENT_STATE.STOPPING);
      if (session) {
        await session.leaveCall();
      }
    } catch (error) {
      console.error("Ultravox leaveCall failed:", error);
    } finally {
      sessionRef.current = null;
      stopAudioAnalysis();
      setAgentState(AGENT_STATE.IDLE);
      setTranscript('');

      // Clean up audio context if it exists
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // audioContextRef.current.close(); // Optional: depend on if we want to reuse it
      }
    }
  }, [stopAudioAnalysis]);

  const startAudioAnalysis = useCallback(() => {
    if (!sessionRef.current || !audioContextRef.current) return;

    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const connectedNodes = new Set();

    const updateVolume = () => {
      if (sessionRef.current && analyserRef.current) {
        const session = sessionRef.current;
        const analyser = analyserRef.current;

        // Connect agent source if available and not already connected
        if (session.agentSourceNode && !connectedNodes.has(session.agentSourceNode)) {
          try {
            session.agentSourceNode.connect(analyser);
            connectedNodes.add(session.agentSourceNode);
          } catch (e) {
            console.warn("Failed to connect agentSourceNode:", e);
          }
        }

        // Connect mic source if available and not already connected
        if (session.micSourceNode && !connectedNodes.has(session.micSourceNode)) {
          try {
            session.micSourceNode.connect(analyser);
            connectedNodes.add(session.micSourceNode);
          } catch (e) {
            console.warn("Failed to connect micSourceNode:", e);
          }
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setVolume(average);
      }
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };
    updateVolume();
  }, []);

  const toggleListening = useCallback(async () => {
    // If voice is active in any state, clicking the mic stops it
    if (sessionRef.current || agentStateRef.current === AGENT_STATE.CONNECTING || agentStateRef.current === AGENT_STATE.STOPPING) {
      await stopVoiceAgent();
      return;
    }

    try {
      stopRequestedRef.current = false;
      lastProcessedOrdinalRef.current = -1;
      setAgentState(AGENT_STATE.CONNECTING);
      setError(null);

      const response = await fetch(`${API_BASE}/api/voice/join`, { method: 'POST' });

      // Critical check after async fetch
      if (stopRequestedRef.current) {
        await stopVoiceAgent();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend Voice Error Detail:', errorData);
        throw new Error(errorData.details || 'Failed to create voice session');
      }
      const { joinUrl } = await response.json();

      // Another check before creating session
      if (stopRequestedRef.current) {
        await stopVoiceAgent();
        return;
      }

      // Create or resume AudioContext before session initialization
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const session = new UltravoxSession({ audioContext: audioContextRef.current });
      sessionRef.current = session;

      session.addEventListener('status', () => {
        console.log('Ultravox Status:', session.status);

        // If user requested stop, ignore incoming status changes that might restart things
        if (stopRequestedRef.current && session.status !== UltravoxSessionStatus.DISCONNECTED) {
          return;
        }

        switch (session.status) {
          case UltravoxSessionStatus.IDLE:
            setAgentState(AGENT_STATE.IDLE);
            break;
          case UltravoxSessionStatus.CONNECTING:
            setAgentState(AGENT_STATE.CONNECTING);
            break;
          case UltravoxSessionStatus.LISTENING:
            setAgentState(AGENT_STATE.LISTENING);
            break;
          case UltravoxSessionStatus.THINKING:
            setAgentState(AGENT_STATE.THINKING);
            break;
          case UltravoxSessionStatus.SPEAKING:
            setAgentState(AGENT_STATE.SPEAKING);
            break;
          case UltravoxSessionStatus.DISCONNECTED:
            sessionRef.current = null;
            stopAudioAnalysis();
            setAgentState(AGENT_STATE.IDLE);
            break;
        }
      });

      session.addEventListener('transcripts', () => {
        const transcripts = session.transcripts;
        if (transcripts && transcripts.length > 0) {
          // Update the current transcript display for the last one (could be partial)
          const lastTranscript = transcripts[transcripts.length - 1];
          setTranscript(lastTranscript.text);

          // Process all final transcripts that haven't been processed yet
          transcripts.forEach(transcript => {
            if (transcript.isFinal && transcript.ordinal > lastProcessedOrdinalRef.current) {
              console.log(`[TRANSCRIPT FINAL] ordinal: ${transcript.ordinal}, speaker: ${transcript.speaker}, text: ${transcript.text}`);
              lastProcessedOrdinalRef.current = transcript.ordinal;
              onTranscriptRef.current?.(transcript.text, transcript.speaker);
            }
          });
        }
      });

      // Tool Implementations
      session.registerToolImplementation('checkAvailability', async ({ date, time, guestCount }) => {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`[AVAILABILITY TOOL CALL]\nrequestId: ${requestId}`);
        const res = await fetch(`${API_BASE}/api/ai/check-table`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, time, guestCount })
        });
        const data = await res.json();
        console.log(`[AVAILABILITY TOOL RESPONSE] requestId: ${requestId}`, data);

        // Notify the UI to show the Reservation Preview card
        if (data.available) {
          onToolResultRef.current?.('checkAvailability', data);
        }

        return JSON.stringify(data);
      });

      session.registerToolImplementation('createBooking', async (params) => {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`[CREATE BOOKING TOOL CALL] requestId: ${requestId}`, params);
        const res = await fetch(`${API_BASE}/api/reservation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...params, source: 'voice-agent' })
        });
        const data = await res.json();
        console.log(`[CREATE BOOKING TOOL RESPONSE] requestId: ${requestId}`, data);

        if (data.success) {
          onToolResultRef.current?.('createBooking', data);
        }

        return JSON.stringify(data);
      });

      session.registerToolImplementation('getMenu', async () => {
        return "Our menu includes Artisanal Pizzas (Truffle & Wild Mushroom, Prosciutto Di Parma), Gourmet Burgers (The Wagyu Gold Standard, Black Truffle Crispy Chicken), Handcrafted Pastas (Lobster Tagliolini, Wild Boar Pappardelle), and decadent desserts like the Chocolate Sphere and Saffron Tres Leches.";
      });

      session.registerToolImplementation('getRestaurantInfo', async () => {
        return "Savory is a premier dining destination specializing in Molecular Gastronomy & Modern Italian cuisine. We are located at 452 Culinary Heights, Upper Manhattan. Open daily from 11 AM to 11 PM. We offer valet parking, complimentary WiFi, and have indoor, outdoor, and VIP seating options.";
      });

      // Another check before joining call
      if (stopRequestedRef.current) {
        await stopVoiceAgent();
        return;
      }

      session.addEventListener('error', (event) => {
        console.error('Ultravox Error Event:', event);
        setError(event.error?.message || 'An unexpected voice error occurred.');
        setAgentState(AGENT_STATE.ERROR);
        stopVoiceAgent();
      });

      session.joinCall(joinUrl);
      startAudioAnalysis();

    } catch (err) {
      console.error('Voice Session Error:', err);
      // Only set error state if we didn't manually stop
      if (!stopRequestedRef.current) {
        setAgentState(AGENT_STATE.ERROR);
        setError(err.message);
      }
      await stopVoiceAgent();
    }
  }, [stopVoiceAgent, startAudioAnalysis, stopAudioAnalysis]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.leaveCall();
      }
    };
  }, []);

  const speak = useCallback(() => {}, []);
  const stopSpeaking = useCallback(() => {}, []);

  return {
    agentState,
    setAgentState,
    volume,
    transcript,
    toggleListening,
    speak,
    stopSpeaking,
    isSupported: true,
    error,
    analyserRef
  };
};
