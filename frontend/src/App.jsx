import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ReactLenis } from 'lenis/react';
import { motion, useScroll, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { useTheme } from './context/ThemeContext';

// Always-visible components — load eagerly
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import AIButton from './components/AIButton/AIButton';

// Below-fold sections — lazy loaded (code split)
const Stats = lazy(() => import('./components/Stats/Stats'));
const Menu = lazy(() => import('./components/Menu/Menu'));
const Gallery = lazy(() => import('./components/Gallery/Gallery'));
const Footer = lazy(() => import('./components/Footer/Footer'));

// Heavy modals — lazy loaded only when opened
const AIDrawer = lazy(() => import('./components/AIButton/AIDrawer'));


export default function App() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Custom cursor refs
  const cursorRef = useRef(null);
  const dotRef = useRef(null);

  // Scroll Progress Hook
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  // Custom Cursor Interaction
  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    const onMouseMove = (e) => {
      // Smooth GSAP follower lag
      if (cursor) {
        gsap.to(cursor, {
          x: e.clientX - 16,
          y: e.clientY - 16,
          duration: 0.4,
          ease: 'power3.out'
        });
      }
      if (dot) {
        gsap.to(dot, {
          x: e.clientX - 4,
          y: e.clientY - 4,
          duration: 0.08,
          ease: 'power3.out'
        });
      }
    };

    const handleHoverStart = () => {
      gsap.to(cursor, {
        scale: 1.8,
        backgroundColor: 'rgba(255, 130, 77, 0.08)',
        borderColor: 'rgba(255, 130, 77, 0.4)',
        duration: 0.3
      });
      gsap.to(dot, {
        scale: 0.5,
        backgroundColor: '#FFB17A',
        duration: 0.3
      });
    };

    const handleHoverEnd = () => {
      gsap.to(cursor, {
        scale: 1.0,
        backgroundColor: 'rgba(255, 130, 77, 0.0)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        duration: 0.3
      });
      gsap.to(dot, {
        scale: 1.0,
        backgroundColor: '#FF824D',
        duration: 0.3
      });
    };

    const handleMouseOver = (e) => {
      const target = e.target.closest('button, a, input, select, textarea, [role="button"], .swiper-slide');
      if (target) {
        handleHoverStart();
      }
    };

    const handleMouseOut = (e) => {
      const target = e.target.closest('button, a, input, select, textarea, [role="button"], .swiper-slide');
      if (target) {
        handleHoverEnd();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return (
    <ReactLenis root>
      <div className={`relative min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#090909] text-white' : 'bg-white text-gray-900'} selection:bg-primary selection:text-black antialiased`}>

        {/* Scroll Progress Bar */}
        <motion.div className="scroll-progress" style={{ scaleX }} />

        {/* Cinematic Film-Grain Noise Texture */}
        <div className="noise-overlay" />

        {/* Dynamic Dual-Layered Custom Cursor Follower */}
        <div
          ref={cursorRef}
          className="fixed w-8 h-8 rounded-full border border-white/20 pointer-events-none z-50 blur-[1px] hidden md:block"
        />
        <div
          ref={dotRef}
          className="fixed w-2 h-2 rounded-full bg-primary pointer-events-none z-50 hidden md:block"
        />

        {/* Global Navigation */}
        <Navbar
          onAIClick={() => setIsAIOpen(true)}
        />

        {/* Pages / Sections */}
        <main>
          <Hero
            onAIClick={() => setIsAIOpen(true)}
          />
          <Suspense fallback={null}>
            <Stats />
            <Menu />
            <Gallery />
          </Suspense>
        </main>

        {/* Footer */}
        <Suspense fallback={null}>
          <Footer
            onAIClick={() => setIsAIOpen(true)}
          />
        </Suspense>

        {/* Floating Action Quick Shortcuts */}
        <AIButton onClick={() => setIsAIOpen(true)} />

        {/* Modals & Slide-out Panels — only fetched when first opened */}
        <Suspense fallback={null}>
          <AIDrawer isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
        </Suspense>

      </div>
      </ReactLenis>
    );
  }
