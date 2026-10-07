import React, { useEffect, useRef } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { LuSparkles } from 'react-icons/lu';
import FloatingFoods from '../FloatingFoods/FloatingFoods';
import { useTheme } from '../../context/ThemeContext';
import gsap from 'gsap';

export default function Hero({ onAIClick }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const heroRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);
  const subRef = useRef(null);
  const btnRef = useRef(null);
  const bgRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Ken Burns Effect
      if (bgRef.current) {
        gsap.to(bgRef.current, {
          scale: 1.1,
          duration: 20,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        });
      }

      // Entrance Animations
      const targets = [badgeRef.current, titleRef.current, subRef.current, btnRef.current].filter(Boolean);
      if (targets.length > 0) {
        const tl = gsap.timeline();

        tl.from(targets, {
          y: 50,
          opacity: 0,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out'
        });

        if (scrollRef.current) {
          tl.from(scrollRef.current, {
            opacity: 0,
            y: 20,
            duration: 0.8
          }, '-=0.5');
        }
      }

      // Parallax on Scroll
      if (bgRef.current && heroRef.current) {
        gsap.to(bgRef.current, {
          y: -50,
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true
          }
        });
      }
    }, heroRef);

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / 40;
      const y = (e.clientY - innerHeight / 2) / 40;

      const heroEls = document.querySelectorAll('.hero-content');
      if (heroEls.length > 0) {
        gsap.to(heroEls, {
          x: x,
          y: y,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      ctx.revert();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleHover = (e, isEnter) => {
    gsap.to(e.currentTarget, {
      scale: isEnter ? 1.05 : 1,
      y: isEnter ? -4 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });

    if (isEnter) {
      gsap.to(e.currentTarget, {
        boxShadow: '0 0 30px rgba(255, 130, 77, 0.2)',
        duration: 0.3
      });
    } else {
      gsap.to(e.currentTarget, {
        boxShadow: '0 0 0px rgba(255, 130, 77, 0)',
        duration: 0.3
      });
    }
  };

  const handleClickAnimation = (e) => {
    gsap.to(e.currentTarget, {
      scale: 0.95,
      duration: 0.1,
      onComplete: () => {
        gsap.to(e.currentTarget, { scale: 1, duration: 0.1 });
      }
    });
  };

  return (
    <section 
      ref={heroRef}
      id="home"
      className={`relative w-full min-h-screen overflow-hidden flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#090909]' : 'bg-gray-50'}`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          ref={bgRef}
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=80')`,
          }}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-300 ${isDark ? 'opacity-40' : 'opacity-15'}`}
        />
      </div>

      <div className={`absolute inset-0 backdrop-blur-[2px] pointer-events-none transition-colors duration-300 ${isDark ? 'bg-gradient-to-b from-black/80 via-[#090909]/70 to-[#090909]' : 'bg-gradient-to-b from-white/95 via-white/90 to-gray-50'}`} />

      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[150px] pointer-events-none" />

      <FloatingFoods />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center select-none hero-content">
        <div
          ref={badgeRef}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8 text-xs tracking-widest text-primary uppercase font-semibold transition-all ${isDark ? 'glass-panel border-white/10' : 'bg-white/90 border-gray-200 shadow-sm'}`}
        >
          <LuSparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
          <span>AI-Curated Gastronomy Experience</span>
        </div>

        <h1
          ref={titleRef}
          className={`text-5xl md:text-7xl lg:text-8xl font-serif font-black leading-[1.1] tracking-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          Taste the <br />
          <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent bg-[size:200%_auto] animate-pulse">
            Extraordinary
          </span> <br />
          at Savory
        </h1>

        <p
          ref={subRef}
          className={`text-base md:text-xl font-sans font-light max-w-2xl leading-relaxed mb-10 ${isDark ? 'text-gray-dark' : 'text-gray-700'}`}
        >
          A culinary journey merging molecular artistry with personalized, AI-driven recommendations. Relish Michelin-star masterpieces crafted for your unique palate.
        </p>

        <div
          ref={btnRef}
          className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto"
        >
          <button
            onClick={(e) => { onAIClick(); handleClickAnimation(e); }}
            onMouseEnter={(e) => handleHover(e, true)}
            onMouseLeave={(e) => handleHover(e, false)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-primary/40 text-primary bg-primary/5 font-semibold text-sm hover:bg-primary/10 hover:border-primary/60 transition-all duration-300 shadow-[0_0_20px_rgba(255,130,77,0.05)] group"
          >
            <LuSparkles className="w-4 h-4 text-primary animate-pulse group-hover:rotate-12 transition-transform" />
            <span>Ask AI Assistant</span>
            <FiArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-10 opacity-70 hover:opacity-100 transition-opacity"
        onClick={() => {
          const stats = document.getElementById('stats');
          if (stats) stats.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="text-[10px] text-gray-dark tracking-widest uppercase font-semibold">Scroll</span>
        <div className="w-[24px] h-[40px] rounded-full border-2 border-white/20 flex justify-center p-[6px]">
          <div className="w-[4px] h-[8px] rounded-full bg-primary hero-scroll-dot" />
        </div>
      </div>
    </section>
  );
}
