import React, { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Float } from '@react-three/drei';
import * as THREE from 'three';
import { AGENT_STATE } from '../../hooks/useVoiceAgent';

// Fluid Orb Shader
const FluidOrbMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('#3d1a0a') }, // Dark Orange/Brown
    uColor2: { value: new THREE.Color('#FF824D') }, // Primary Orange
    uColor3: { value: new THREE.Color('#FFB17A') }, // Secondary Orange
    uColor4: { value: new THREE.Color('#ffffff') }, // White Highlight
    uIntensity: { value: 0.5 },
    uAudioLevel: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uAudioLevel;

    // Classic Perlin 3D Noise
    // by Stefan Gustavson
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

    float cnoise(vec3 P){
      vec3 Pi0 = floor(P);
      vec3 Pi1 = Pi0 + vec3(1.0);
      Pi0 = mod(Pi0, 289.0);
      Pi1 = mod(Pi1, 289.0);
      vec3 Pf0 = fract(P);
      vec3 Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;

      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);

      vec4 gx0 = ixy0 / 7.0;
      vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);

      vec4 gx1 = ixy1 / 7.0;
      vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);

      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
      vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
      vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
      vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
      vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g100, g100), dot(g010, g010), dot(g110, g110)));
      g000 *= norm0.x;
      g100 *= norm0.y;
      g010 *= norm0.z;
      g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g101, g101), dot(g011, g011), dot(g111, g111)));
      g001 *= norm1.x;
      g101 *= norm1.y;
      g011 *= norm1.z;
      g111 *= norm1.w;

      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);

      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
      return 2.2 * n_xyz;
    }

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;

      float noise = cnoise(position * 3.0 + uTime * 0.5);
      float displacement = noise * (uIntensity + uAudioLevel * 0.5);
      vec3 newPosition = position + normal * displacement;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform float uAudioLevel;

    // Classic Perlin 3D Noise
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

    float cnoise(vec3 P){
      vec3 Pi0 = floor(P);
      vec3 Pi1 = Pi0 + vec3(1.0);
      Pi0 = mod(Pi0, 289.0);
      Pi1 = mod(Pi1, 289.0);
      vec3 Pf0 = fract(P);
      vec3 Pf1 = Pf0 - vec3(1.0);
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;

      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);

      vec4 gx0 = ixy0 / 7.0;
      vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);

      vec4 gx1 = ixy1 / 7.0;
      vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);

      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
      vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
      vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
      vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
      vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g100, g100), dot(g010, g010), dot(g110, g110)));
      g000 *= norm0.x;
      g100 *= norm0.y;
      g010 *= norm0.z;
      g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g101, g101), dot(g011, g011), dot(g111, g111)));
      g001 *= norm1.x;
      g101 *= norm1.y;
      g011 *= norm1.z;
      g111 *= norm1.w;

      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);

      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
      return 2.2 * n_xyz;
    }

    void main() {
      vec3 color = uColor1;

      float n1 = cnoise(vPosition * 1.5 + uTime * 0.2);
      float n2 = cnoise(vPosition * 3.0 - uTime * 0.3);
      float n3 = cnoise(vPosition * 5.0 + uTime * 0.4);

      float mix1 = smoothstep(-0.5, 0.5, n1);
      float mix2 = smoothstep(-0.2, 0.8, n2);
      float mix3 = smoothstep(0.0, 1.0, n3);

      color = mix(color, uColor2, mix1);
      color = mix(color, uColor3, mix2);
      color = mix(color, uColor4, mix3 * (0.4 + uAudioLevel * 0.6));

      // Fresnel effect
      float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      color += uColor4 * fresnel * 0.6;

      gl_FragColor = vec4(color, 0.9);
    }
  `,
};

function Orb({ agentState, analyserRef }) {
  const meshRef = useRef();
  const materialRef = useRef();

  const audioData = useMemo(() => new Uint8Array(128), []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;

      let level = 0;
      if (analyserRef?.current && (agentState === AGENT_STATE.LISTENING || agentState === AGENT_STATE.SPEAKING)) {
        analyserRef.current.getByteFrequencyData(audioData);
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += audioData[i];
        }
        level = (sum / audioData.length) / 255.0;
      }

      // Smoothly interpolate audio level
      materialRef.current.uniforms.uAudioLevel.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uAudioLevel.value,
        level,
        0.1
      );

      // Base intensity based on state
      let targetIntensity = 0.1;
      if (agentState === AGENT_STATE.LISTENING) targetIntensity = 0.3;
      if (agentState === AGENT_STATE.THINKING) targetIntensity = 0.2;
      if (agentState === AGENT_STATE.SPEAKING) targetIntensity = 0.4;

      materialRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uIntensity.value,
        targetIntensity,
        0.05
      );
    }

    if (meshRef.current) {
        // Slow rotation
        meshRef.current.rotation.y += delta * 0.1;
        meshRef.current.rotation.x += delta * 0.05;

        // Controlled Audio Reactivity (Limit scale boost)
        const breathing = Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
        const levelBoost = materialRef.current.uniforms.uAudioLevel.value * 0.15; // Max 0.15 boost
        const scale = 1 + breathing + levelBoost;
        meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 128, 128]}>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        args={[FluidOrbMaterial]}
        transparent
        side={THREE.DoubleSide}
      />
    </Sphere>
  );
}

import VoiceWaveform from './VoiceWaveform';

const VoiceMode = ({ isOpen, onClose, agentState, analyserRef }) => {
  // Status mapping
  const getStatusText = () => {
    switch (agentState) {
      case AGENT_STATE.CONNECTING: return 'CONNECTING';
      case AGENT_STATE.LISTENING: return 'LISTENING';
      case AGENT_STATE.THINKING: return 'THINKING';
      case AGENT_STATE.SPEAKING: return 'SPEAKING';
      case AGENT_STATE.ERROR: return 'VOICE ERROR';
      case AGENT_STATE.IDLE: return 'IDLE';
      default: return 'VOICE OFFLINE';
    }
  };

  const statusText = getStatusText();

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-[#0b0b0b] flex flex-col items-center justify-start overflow-hidden pt-20"
    >
      {/* Noise Overlay to match website */}
      <div className="noise-overlay" />

      {/* Close Button */}
      <button
        onClick={onClose}
        aria-label="Close voice assistant"
        className="absolute top-8 right-8 p-3 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all z-[1001]"
      >
        <FiX size={24} />
      </button>

      {/* Three.js Fluid Orb Container */}
      <div className="relative flex flex-col items-center justify-center w-full h-full pt-8 pb-24">
        <div
          className="relative mb-8"
          style={{
            width: 'clamp(260px, 25vw, 340px)',
            height: 'clamp(260px, 25vw, 340px)',
            maxWidth: '85vw'
          }}
        >
          <div className="w-full h-full absolute inset-0">
            <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} color="#FF824D" intensity={0.5} />
              <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <Orb agentState={agentState} analyserRef={analyserRef} />
              </Float>
            </Canvas>
          </div>
        </div>

        {/* Status Text overlay */}
        <div className="relative z-10 pointer-events-none mb-12">
          <AnimatePresence mode="wait">
            <motion.h2
              key={statusText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-2xl font-light tracking-[0.5em] uppercase text-center font-sans ${agentState === AGENT_STATE.ERROR ? 'text-red-500' : 'text-white/80'}`}
              style={{ textShadow: '0 0 20px rgba(255, 130, 77, 0.4)' }}
            >
              {statusText}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* Waveform Component */}
        <div className="relative w-full flex flex-col items-center mb-12">
          <VoiceWaveform agentState={agentState} analyserRef={analyserRef} />
          <p className="mt-4 text-[#FF7A45]/30 text-[8px] font-bold tracking-[0.5em] uppercase">
            {agentState === AGENT_STATE.ERROR ? 'VOICE OFFLINE' : 'VOICE ONLINE'}
          </p>
        </div>

        {/* Stop Button */}
        <div className="relative flex flex-col items-center gap-3 z-20">
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#ff9d75' }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            aria-label="Stop voice assistant"
            className="w-16 h-16 rounded-full bg-[#FF7A45] flex items-center justify-center text-black transition-all shadow-[0_10px_30px_rgba(255,122,69,0.3)] group"
          >
            <div className="w-6 h-6 bg-current rounded-[6px] shadow-[0_0_10px_rgba(0,0,0,0.2)]" />
          </motion.button>
          <span className="text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase font-sans">End Session</span>
        </div>
      </div>
    </motion.div>
  );
};

export default VoiceMode;
