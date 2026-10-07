import React, { useState, useEffect, useRef } from 'react';
import { FiMenu, FiX, FiActivity, FiSun, FiMoon } from 'react-icons/fi';
import { LuSparkles } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import gsap from 'gsap';

const NAV_ITEMS = [
  { label: 'Home', href: '#home' },
  { label: 'Menu', href: '#menu' },
  { label: 'Gallery', href: '#gallery' },
];

export default function Navbar({ onAIClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [activeTheme, setActiveTheme] = useState('orange'); // 'orange' or 'gold'
  const { theme, toggleTheme: toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const navRef = useRef(null);
  const logoRef = useRef(null);
  const linksRef = useRef([]);
  const actionsRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance Timeline
      const tl = gsap.timeline();

      if (navRef.current) {
        tl.from(navRef.current, {
          y: -100,
          opacity: 0,
          duration: 1,
          ease: 'power4.out'
        });
      }

      if (logoRef.current) {
        tl.from(logoRef.current, {
          x: -50,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out'
        }, '-=0.5');
      }

      const validLinks = (linksRef.current || []).filter(Boolean);
      if (validLinks.length > 0) {
        tl.from(validLinks, {
          y: -20,
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out'
        }, '-=0.4');
      }

      if (actionsRef.current?.children && actionsRef.current.children.length > 0) {
        const actionChildren = Array.from(actionsRef.current.children);
        tl.from(actionChildren, {
          scale: 0.8,
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'back.out(1.7)'
        }, '-=0.3');
      }
    });

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      if (currentScrollY > 120 && currentScrollY > lastScrollY.current) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      ctx.revert();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    gsap.to(navRef.current, {
      y: visible ? 0 : -100,
      opacity: visible ? 1 : 0,
      duration: 0.4,
      ease: 'power2.inOut'
    });
  }, [visible]);

  const toggleTheme = () => {
    const newTheme = activeTheme === 'orange' ? 'gold' : 'orange';
    setActiveTheme(newTheme);
    
    const root = document.documentElement;
    if (newTheme === 'gold') {
      root.style.setProperty('--color-primary', '#FFD700');
      root.style.setProperty('--color-secondary', '#FFA500');
    } else {
      root.style.setProperty('--color-primary', '#FF824D');
      root.style.setProperty('--color-secondary', '#FFB17A');
    }
  };

  const handleNavClick = (e, item) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (item.internal) {
      navigate(item.href);
    } else {
      const element = document.querySelector(item.href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleHover = (e, isEnter) => {
    gsap.to(e.currentTarget, {
      scale: isEnter ? 1.03 : 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    if (e.currentTarget.classList.contains('glass-panel') || e.currentTarget.classList.contains('border-primary/30')) {
      gsap.to(e.currentTarget, {
        boxShadow: isEnter ? '0 0 20px rgba(255, 130, 77, 0.3)' : '0 0 0px rgba(255, 130, 77, 0)',
        duration: 0.3
      });
    }
  };

  const handleClickAnimation = (e) => {
    gsap.to(e.currentTarget, {
      scale: 0.95,
      duration: 0.1,
      yEase: 'power2.inOut',
      onComplete: () => {
        gsap.to(e.currentTarget, { scale: 1, duration: 0.1 });
      }
    });
  };

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? isDark
            ? 'bg-[#090909]/85 backdrop-blur-2xl border-b border-white/10 shadow-lg py-4 text-white'
            : 'bg-white/85 backdrop-blur-2xl border-b border-gray-200 shadow-md py-4 text-gray-900'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        
        {/* LOGO */}
        <a
          ref={logoRef}
          href="#home"
          onClick={(e) => { handleNavClick(e, '#home'); handleClickAnimation(e); }}
          onMouseEnter={(e) => handleHover(e, true)}
          onMouseLeave={(e) => handleHover(e, false)}
          className="flex items-center gap-2 group"
        >
          <span className="text-primary text-2xl font-serif tracking-wider font-extrabold transition-colors duration-300">
            S A V O R Y
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block self-end mb-1.5 animate-pulse" />
        </a>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item, index) => (
            <a
              key={item.label}
              ref={el => linksRef.current[index] = el}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              onMouseEnter={(e) => handleHover(e, true)}
              onMouseLeave={(e) => handleHover(e, false)}
              className={`relative text-sm transition-colors duration-200 py-1 font-medium tracking-wide group ${
                isDark ? 'text-gray-dark hover:text-white' : 'text-gray-700 hover:text-gray-950 font-semibold'
              }`}
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* ACTIONS */}
        <div ref={actionsRef} className="hidden md:flex items-center gap-4">
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => toggleDarkMode()}
            onMouseEnter={(e) => handleHover(e, true)}
            onMouseLeave={(e) => handleHover(e, false)}
            aria-label="Toggle Dark / Light Mode"
            className={`p-2.5 rounded-full border transition-colors relative group ${
              isDark ? 'glass-panel text-gray-dark hover:text-primary border-white/10 hover:border-primary/20' : 'bg-white text-gray-700 hover:text-primary border-gray-200 hover:border-primary/40 shadow-sm'
            }`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Accent Theme Toggle */}
          <button
            onClick={() => { toggleTheme(); }}
            onMouseEnter={(e) => handleHover(e, true)}
            onMouseLeave={(e) => handleHover(e, false)}
            aria-label="Toggle Accent Theme"
            className={`p-2.5 rounded-full border transition-colors relative group ${
              isDark ? 'glass-panel text-gray-dark hover:text-primary border-white/10 hover:border-primary/20' : 'bg-white text-gray-700 hover:text-primary border-gray-200 hover:border-primary/40 shadow-sm'
            }`}
          >
            <LuSparkles className={`w-4 h-4 transition-transform duration-500 ${activeTheme === 'gold' ? 'rotate-180 text-[#FFD700]' : ''}`} />
          </button>

          {/* AI Button */}
          <button
            onClick={(e) => { onAIClick(); handleClickAnimation(e); }}
            onMouseEnter={(e) => handleHover(e, true)}
            onMouseLeave={(e) => handleHover(e, false)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-all shadow-[0_0_15px_rgba(255,130,77,0.05)]"
          >
            <FiActivity className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Concierge</span>
          </button>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full border transition-colors ${
              isDark ? 'glass-panel text-gray-dark hover:text-primary border-white/10' : 'bg-white text-gray-700 hover:text-primary border-gray-200 shadow-sm'
            }`}
            aria-label="Toggle Dark / Light Mode"
          >
            {theme === 'dark' ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full border transition-colors ${
              isDark ? 'glass-panel text-gray-dark hover:text-primary border-white/10' : 'bg-white text-gray-700 hover:text-primary border-gray-200 shadow-sm'
            }`}
          >
            <LuSparkles className={`w-4 h-4 ${activeTheme === 'gold' ? 'text-[#FFD700]' : ''}`} />
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-full border ${
              isDark ? 'glass-panel border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900 shadow-sm'
            }`}
          >
            {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OUT MENU */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-b overflow-hidden w-full absolute top-[100%] left-0 transition-colors ${
          isDark ? 'glass-panel border-white/10 bg-[#090909]/95 text-white' : 'bg-white/95 border-gray-200 text-gray-900 shadow-xl'
        }`}>
          <div className="px-6 py-8 flex flex-col gap-6">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`text-lg transition-colors duration-200 font-medium py-1 ${
                  isDark ? 'text-gray-dark hover:text-white' : 'text-gray-700 hover:text-gray-950 font-semibold'
                }`}
              >
                {item.label}
              </a>
            ))}
            <hr className="border-white/10" />
            <button
              onClick={() => { setMobileMenuOpen(false); onAIClick(); }}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-sm font-semibold"
            >
              <FiActivity className="w-4 h-4 animate-pulse" />
              <span>AI Concierge</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
