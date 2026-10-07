import React, { useEffect, useRef } from 'react';
import { FiInstagram, FiFacebook, FiTwitter, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import gsap from 'gsap';

export default function Footer({ onAIClick }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const footerRef = useRef(null);
  const columnsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const validCols = (columnsRef.current || []).filter(Boolean);
      if (validCols.length > 0 && footerRef.current) {
        gsap.from(validCols, {
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 90%',
          },
          y: 40,
          opacity: 0,
          duration: 1,
          stagger: 0.1,
          ease: 'power3.out'
        });
      }
    }, footerRef);

    return () => ctx.revert();
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHover = (e, isEnter) => {
    gsap.to(e.currentTarget, {
      color: isEnter ? '#FF824D' : (isDark ? '#AFAFAF' : '#4B5563'),
      x: isEnter ? 5 : 0,
      duration: 0.3
    });
  };

  return (
    <footer
      ref={footerRef}
      className={`w-full border-t pt-20 pb-10 overflow-hidden relative z-10 select-none transition-colors duration-300 ${
        isDark ? 'bg-[#090909] border-white/8 text-white' : 'bg-gray-100 border-gray-200 text-gray-900'
      }`}
    >
      <div className="absolute bottom-0 right-10 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[250px] h-[250px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 pb-16">
        
        {/* COL 1: LOGO & ABOUT */}
        <div ref={el => columnsRef.current[0] = el} className="flex flex-col gap-4">
          <a href="#home" onClick={(e) => handleNavClick(e, '#home')} className="flex items-center gap-2 group w-fit">
            <span className={`text-2xl font-serif tracking-widest font-black transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              S A V O R Y
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block self-end mb-1.5 animate-pulse" />
          </a>
          <p className={`text-xs font-light leading-relaxed max-w-xs mt-2 ${
            isDark ? 'text-gray-dark' : 'text-gray-600'
          }`}>
            A symphony of molecular culinary artistry, premium ingredients, and dynamic palates. Merging sensory science with Michelin-caliber gastronomy.
          </p>
        </div>

        {/* COL 2: QUICK LINKS */}
        <div ref={el => columnsRef.current[1] = el} className="flex flex-col gap-5">
          <h4 className={`text-xs font-bold uppercase tracking-widest border-b pb-2 w-fit ${
            isDark ? 'text-white border-white/10' : 'text-gray-900 border-gray-300'
          }`}>
            Quick Links
          </h4>
          <ul className="space-y-3">
            {['#home', '#menu', '#gallery'].map((href, index) => {
              const label = href.replace('#', '');
              return (
                <li key={index}>
                  <a
                    href={href}
                    onClick={(e) => handleNavClick(e, href)}
                    onMouseEnter={(e) => handleHover(e, true)}
                    onMouseLeave={(e) => handleHover(e, false)}
                    className={`text-xs transition-colors duration-200 capitalize inline-block ${
                      isDark ? 'text-gray-dark' : 'text-gray-600'
                    }`}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
            <li>
              <button 
                onClick={onAIClick}
                onMouseEnter={(e) => handleHover(e, true)}
                onMouseLeave={(e) => handleHover(e, false)}
                className={`text-xs transition-colors duration-200 capitalize text-left cursor-pointer outline-none inline-block ${
                  isDark ? 'text-gray-dark' : 'text-gray-600'
                }`}
              >
                AI Concierge
              </button>
            </li>
          </ul>
        </div>

        {/* COL 3: CONTACT DETAILS */}
        <div ref={el => columnsRef.current[2] = el} className="flex flex-col gap-5">
          <h4 className={`text-xs font-bold uppercase tracking-widest border-b pb-2 w-fit ${
            isDark ? 'text-white border-white/10' : 'text-gray-900 border-gray-300'
          }`}>
            Contact
          </h4>
          <ul className={`space-y-3.5 text-xs font-light ${isDark ? 'text-gray-dark' : 'text-gray-600'}`}>
            <li className="flex items-start gap-2">
              <FiMapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>452 Culinary Heights, <br />Upper Manhattan, NY 10022</span>
            </li>
            <li className="flex items-center gap-2">
              <FiPhone className="w-4 h-4 text-primary flex-shrink-0" />
              <span>+1 (212) 555-8942</span>
            </li>
            <li className="flex items-center gap-2">
              <FiMail className="w-4 h-4 text-primary flex-shrink-0" />
              <a href="mailto:concierge@savory.com" className="hover:text-primary transition-colors">
                concierge@savory.com
              </a>
            </li>
          </ul>
        </div>

        {/* COL 4: SOCIAL CONNECTIONS */}
        <div ref={el => columnsRef.current[3] = el} className="flex flex-col gap-5">
          <h4 className={`text-xs font-bold uppercase tracking-widest border-b pb-2 w-fit ${
            isDark ? 'text-white border-white/10' : 'text-gray-900 border-gray-300'
          }`}>
            Follow Us
          </h4>
          <p className={`text-xs font-light leading-relaxed ${isDark ? 'text-gray-dark' : 'text-gray-600'}`}>
            Follow our culinary laboratory updates and seasonal reservations list.
          </p>
          <div className="flex items-center gap-3 mt-1">
            {[
              { icon: FiInstagram, href: 'https://instagram.com' },
              { icon: FiFacebook, href: 'https://facebook.com' },
              { icon: FiTwitter, href: 'https://twitter.com' }
            ].map((social, idx) => {
              const IconComp = social.icon;
              return (
                <a
                  key={idx}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`p-2.5 rounded-xl border transition-all duration-300 ${
                    isDark
                      ? 'bg-white/5 border-white/8 text-white hover:border-primary hover:text-primary'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-primary hover:text-primary shadow-sm'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        </div>

      </div>

      <div className={`max-w-7xl mx-auto px-6 md:px-12 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDark ? 'border-white/5' : 'border-gray-200'
      }`}>
        <p className={`text-[10px] font-light text-center sm:text-left ${
          isDark ? 'text-gray-dark' : 'text-gray-500'
        }`}>
          &copy; {new Date().getFullYear()} Savory Culinary Laboratory. All rights reserved.
        </p>
        <p className={`text-[9px] tracking-wider uppercase font-semibold ${
          isDark ? 'text-gray-dark/50' : 'text-gray-400'
        }`}>
          Design curated for Michelin Experience
        </p>
      </div>

    </footer>
  );
}
