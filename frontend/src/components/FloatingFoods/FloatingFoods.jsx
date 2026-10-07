import React, { useEffect, useRef } from 'react';
import { FiStar } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import gsap from 'gsap';

const FLOATING_ITEMS = [
  {
    name: 'Truffle Pizza',
    price: '$28',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
    position: 'top-24 left-8 md:top-28 md:left-24',
    px: -1.2,
    py: -1.0,
    floatDuration: 5,
    floatDelay: 0,
    floatY: -15,
    rotateRange: [-3, 3]
  },
  {
    name: 'Organic Salad',
    price: '$18',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
    position: 'top-20 right-8 md:top-24 md:right-24',
    px: 1.4,
    py: -1.2,
    floatDuration: 6,
    floatDelay: 0.5,
    floatY: -20,
    rotateRange: [2, -4]
  },
  {
    name: 'Molten Sphere',
    price: '$18',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=300&q=80',
    position: 'bottom-28 left-8 md:bottom-32 md:left-28',
    px: -1.5,
    py: 1.3,
    floatDuration: 7,
    floatDelay: 1,
    floatY: -18,
    rotateRange: [-4, 2]
  },
  {
    name: 'Geisha Latté',
    price: '$14',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80',
    position: 'bottom-20 right-8 md:bottom-24 md:right-28',
    px: 1.1,
    py: 1.5,
    floatDuration: 5.5,
    floatDelay: 1.5,
    floatY: -12,
    rotateRange: [3, -3]
  }
];

export default function FloatingFoods() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const containerRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      itemsRef.current.forEach((el, i) => {
        if (!el) return;
        const item = FLOATING_ITEMS[i];

        // Entrance
        gsap.from(el, {
          opacity: 0,
          scale: 0.8,
          duration: 1.2,
          delay: i * 0.2,
          ease: 'power3.out'
        });

        // Idle Bobbing
        if (el.firstChild) {
          gsap.to(el.firstChild, {
            y: item.floatY,
            rotation: item.rotateRange[1],
            duration: item.floatDuration,
            delay: item.floatDelay,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          });
        }
      });
    }, containerRef);

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const mx = (e.clientX - innerWidth / 2);
      const my = (e.clientY - innerHeight / 2);

      itemsRef.current.forEach((el, i) => {
        if (!el) return;
        const item = FLOATING_ITEMS[i];
        gsap.to(el, {
          x: (mx / 30) * item.px,
          y: (my / 30) * item.py,
          duration: 0.8,
          ease: 'power2.out'
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      ctx.revert();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleHover = (e, isEnter) => {
    gsap.to(e.currentTarget, {
      scale: isEnter ? 1.1 : 1,
      rotation: isEnter ? 0 : 'inherit',
      duration: 0.4,
      ease: 'power3.out',
      boxShadow: isEnter ? '0 20px 40px rgba(255, 130, 77, 0.2)' : '0 10px 20px rgba(0,0,0,0.1)',
      borderColor: isEnter ? 'rgba(255,130,77,0.3)' : 'rgba(255,255,255,0.1)'
    });
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none hidden lg:block select-none">
      {FLOATING_ITEMS.map((item, index) => (
        <div
          key={index}
          ref={el => itemsRef.current[index] = el}
          className={`absolute ${item.position} pointer-events-auto`}
        >
          <div
            onMouseEnter={(e) => handleHover(e, true)}
            onMouseLeave={(e) => handleHover(e, false)}
            className={`p-3 rounded-[20px] border flex items-center gap-3 transition-colors duration-300 backdrop-blur-md cursor-grab active:cursor-grabbing shadow-xl w-[200px] ${
              isDark ? 'glass-panel border-white/10 text-white' : 'bg-white/90 border-gray-200 text-gray-900 shadow-2xl'
            }`}
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 border border-white/5 flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover select-none"
                loading="lazy"
              />
            </div>

            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-bold tracking-wide truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.name}</span>
              <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-dark">
                <FiStar className="w-2.5 h-2.5 fill-primary text-primary border-none" />
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.rating}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
