import React, { useEffect, useRef } from 'react';
import { FiStar, FiUsers, FiCoffee } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import gsap from 'gsap';

const STATS_DATA = [
  {
    value: 4.9,
    suffix: '',
    decimals: 1,
    label: 'Palate Rating',
    sub: 'Over 10,000 reviews',
    icon: FiStar,
    color: 'text-primary'
  },
  {
    value: 50,
    suffix: 'K+',
    decimals: 0,
    label: 'Served Palates',
    sub: 'Verified food enthusiasts',
    icon: FiUsers,
    color: 'text-secondary'
  },
  {
    value: 120,
    suffix: '+',
    decimals: 0,
    label: 'Masterpieces',
    sub: 'Curated by AI & human chefs',
    icon: FiCoffee,
    color: 'text-primary'
  }
];

export default function Stats() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);
  const countsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered reveal
      const validCards = (cardsRef.current || []).filter(Boolean);
      if (validCards.length > 0 && sectionRef.current) {
        gsap.from(validCards, {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
          y: 60,
          opacity: 0,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out'
        });
      }

      // Count up animation
      countsRef.current.forEach((el, i) => {
        if (!el) return;
        const targetValue = STATS_DATA[i].value;
        const decimals = STATS_DATA[i].decimals;
        const suffix = STATS_DATA[i].suffix;

        const obj = { val: 0 };
        gsap.to(obj, {
          val: targetValue,
          duration: 2.5,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
          },
          onUpdate: () => {
            el.innerText = obj.val.toFixed(decimals) + suffix;
          }
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef}
      id="stats"
      className={`relative w-full border-y py-16 md:py-24 overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0b0b0b] border-white/8 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 divide-y md:divide-y-0 md:divide-x ${
          isDark ? 'divide-white/10' : 'divide-gray-200'
        }`}>
          
          {STATS_DATA.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                ref={el => cardsRef.current[index] = el}
                className="flex flex-col items-center text-center p-6 md:p-8"
              >
                <div className={`p-4 rounded-2xl mb-6 text-primary glow-primary shadow-[0_0_15px_rgba(255,130,77,0.03)] border ${
                  isDark ? 'glass-panel border-white/10' : 'bg-gray-50 border-gray-200'
                }`}>
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>

                <span
                  ref={el => countsRef.current[index] = el}
                  className={`text-5xl md:text-6xl font-serif font-black tracking-tight mb-2 select-none ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  0{stat.suffix}
                </span>

                <h3 className="text-sm font-semibold tracking-widest text-primary uppercase mb-1">
                  {stat.label}
                </h3>
                <p className={`text-xs font-light ${isDark ? 'text-gray-dark' : 'text-gray-600'}`}>
                  {stat.sub}
                </p>
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
