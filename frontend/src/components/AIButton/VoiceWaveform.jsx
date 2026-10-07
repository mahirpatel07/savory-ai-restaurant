import React, { useEffect, useRef, useMemo } from 'react';
import { AGENT_STATE } from '../../hooks/useVoiceAgent';

const VoiceWaveform = ({ agentState, analyserRef, customConfig = {} }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioDataRef = useRef(new Uint8Array(128));

  const config = useMemo(() => ({
    barCount: customConfig.barCount || 40,
    minHeight: customConfig.minHeight || 4,
    maxHeight: customConfig.maxHeight || 64,
    barWidth: customConfig.barWidth || 4,
    gap: customConfig.gap || 3,
    borderRadius: customConfig.borderRadius || 4,
    color: customConfig.color || '#FF7A45', // Savory Orange
    idleColor: customConfig.idleColor || 'rgba(255, 122, 69, 0.2)',
    smoothing: customConfig.smoothing || 0.2,
    displayWidth: customConfig.displayWidth || 400,
    displayHeight: customConfig.displayHeight || 100,
    isDotted: customConfig.isDotted || false,
  }), [customConfig]);

  // Keep track of current heights for smoothing
  const heightsRef = useRef(null);
  if (!heightsRef.current || heightsRef.current.length !== config.barCount) {
    heightsRef.current = new Float32Array(config.barCount).fill(config.minHeight);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.min(window.innerWidth * 0.9, config.displayWidth);
      const displayHeight = config.displayHeight;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      let level = 0;
      if (analyserRef?.current && (agentState === AGENT_STATE.LISTENING || agentState === AGENT_STATE.SPEAKING)) {
        analyserRef.current.getByteFrequencyData(audioDataRef.current);

        // Use a subset of frequencies that capture voice well
        let sum = 0;
        const startBin = 2;
        const endBin = 40;
        for (let i = startBin; i < endBin; i++) {
          sum += audioDataRef.current[i];
        }
        level = sum / (endBin - startBin) / 255.0;
      }

      // Calculate target heights for each bar
      const time = Date.now() * 0.002;

      for (let i = 0; i < config.barCount; i++) {
        // Distance from center (0 to 1)
        const distFromCenter = Math.abs(i - (config.barCount - 1) / 2) / ((config.barCount - 1) / 2);

        // Shape factor: center is taller
        const shapeFactor = Math.cos(distFromCenter * Math.PI * 0.5);

        let targetHeight = config.minHeight;

        if (agentState === AGENT_STATE.LISTENING || agentState === AGENT_STATE.SPEAKING) {
          // React to audio with more organic movement
          const wave1 = Math.sin(time * 3 + i * 0.3) * 4;
          const wave2 = Math.sin(time * 5 - i * 0.2) * 2;
          const audioImpact = level * config.maxHeight * shapeFactor * 2.0;
          targetHeight = config.minHeight + audioImpact + wave1 + wave2;

          // Ensure it doesn't go below minHeight or above maxHeight
          targetHeight = Math.max(config.minHeight, Math.min(targetHeight, config.maxHeight));
        } else if (agentState === AGENT_STATE.CONNECTING || agentState === AGENT_STATE.THINKING) {
          // Subtle movement for "processing" states
          targetHeight = config.minHeight + Math.sin(time * 8 + i * 0.4) * 8 * shapeFactor;
        } else if (agentState === AGENT_STATE.STOPPING) {
          // Animate down to minHeight
          targetHeight = config.minHeight;
        } else {
          // Idle breathing
          targetHeight = config.minHeight + Math.sin(time * 2 + i * 0.2) * 3 * shapeFactor;
        }

        // Apply smoothing (LERP)
        heightsRef.current[i] += (targetHeight - heightsRef.current[i]) * config.smoothing;

        // Draw bar or dot
        const barH = heightsRef.current[i];
        const totalBarWidth = config.barWidth + config.gap;
        const startX = (width - (config.barCount * totalBarWidth)) / 2;
        const x = startX + i * totalBarWidth;
        const y = centerY - barH / 2;

        ctx.fillStyle = agentState === AGENT_STATE.IDLE ? config.idleColor : config.color;

        if (config.isDotted) {
          // Dotted mode: draw one dot per horizontal position with dynamic vertical offset
          const dotRadius = config.barWidth / 2;
          const x = startX + i * totalBarWidth;

          // Use barH as the base for displacement, combined with a traveling wave
          const waveSpeed = 8;
          const waveFreq = 0.15;
          const travellingWave = Math.sin(time * waveSpeed - i * waveFreq);

          // Audio reactivity + wave movement
          const y = centerY + (travellingWave * (barH / 3)) + (Math.cos(time * 3 + i * 0.1) * 2);

          // Dynamic opacity that follows the wave
          const opacity = 0.3 + (travellingWave * 0.3 + 0.4);

          // Handle color with opacity
          let fillStyle = config.color;
          if (config.color.startsWith('#')) {
             const r = parseInt(config.color.slice(1, 3), 16);
             const g = parseInt(config.color.slice(3, 5), 16);
             const b = parseInt(config.color.slice(5, 7), 16);
             fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          }

          ctx.fillStyle = fillStyle;
          ctx.shadowBlur = 12;
          ctx.shadowColor = config.color;

          ctx.beginPath();
          ctx.arc(x + dotRadius, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Draw rounded rectangle
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, config.barWidth, barH, config.borderRadius);
          } else {
            // Fallback for older browsers
            ctx.rect(x, y, config.barWidth, barH);
          }
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resize);
    };
  }, [agentState, analyserRef, config]);

  return (
    <div className={`flex flex-col items-center justify-center w-full ${customConfig.paddingY || 'py-4'}`}>
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  );
};

export default VoiceWaveform;
