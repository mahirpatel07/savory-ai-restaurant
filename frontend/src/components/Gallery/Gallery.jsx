import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import gsap from 'gsap';

const GALLERY_IMAGES = [
  {
    id: 1,
    title: 'Michelin Star Plating',
    category: 'Gastronomy',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    gridClass: 'md:col-span-7 md:row-span-2'
  },
  {
    id: 2,
    title: 'tableside molecular prep',
    category: 'Innovation',
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80',
    gridClass: 'md:col-span-5 md:row-span-1'
  },
  {
    id: 3,
    title: 'Wagyu Sear',
    category: 'Flame Craft',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    gridClass: 'md:col-span-5 md:row-span-1'
  },
  {
    id: 4,
    title: 'The Golden Dining Room',
    category: 'Ambiance',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
    gridClass: 'md:col-span-6 md:row-span-1'
  },
  {
    id: 5,
    title: 'Rosewater Smoked Old Fashioned',
    category: 'Mixology',
    image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80',
    gridClass: 'md:col-span-6 md:row-span-1'
  }
];

export default function Gallery() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const sectionRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Reveal items
      (itemsRef.current || []).forEach((el) => {
        if (!el) return;
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
          },
          opacity: 0,
          y: 40,
          scale: 0.95,
          duration: 1,
          ease: 'power3.out'
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleHover = (e, isEnter) => {
    const img = e.currentTarget.querySelector('img');
    const text = e.currentTarget.querySelector('.reveal-text');

    gsap.to(img, {
      scale: isEnter ? 1.08 : 1,
      duration: 0.7,
      ease: 'power2.out'
    });

    gsap.to(text, {
      y: isEnter ? 0 : 16,
      opacity: isEnter ? 1 : 0.8,
      duration: 0.5,
      ease: 'power2.out'
    });
  };

  return (
    <section
      ref={sectionRef}
      id="gallery"
      className={`relative w-full py-24 md:py-32 transition-colors duration-300 ${
        isDark ? 'bg-[#090909] text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="absolute top-1/2 left-10 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        <div className="text-center flex flex-col items-center mb-16">
          <span className="text-xs font-bold tracking-widest text-primary uppercase mb-2">
            VISUAL JOURNEY
          </span>
          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Michelin Star Experience
          </h2>
          <div className="w-16 h-[2px] bg-primary mt-6 mb-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[250px] md:auto-rows-[280px]">
          {GALLERY_IMAGES.map((img, index) => (
            <div
              key={img.id}
              ref={el => itemsRef.current[index] = el}
              onMouseEnter={(e) => handleHover(e, true)}
              onMouseLeave={(e) => handleHover(e, false)}
              className={`group relative overflow-hidden rounded-[20px] border flex flex-col justify-end cursor-pointer ${
                isDark ? 'border-white/8 bg-zinc-950' : 'border-gray-200 bg-gray-100 shadow-md'
              } ${img.gridClass}`}
            >
              <img
                src={img.image}
                alt={img.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 pointer-events-none" />

              <div className="relative z-10 p-6 md:p-8 reveal-text translate-y-4 transition-transform duration-500 ease-out">
                <span className="text-[9px] font-bold tracking-widest text-primary uppercase mb-1.5 block select-none">
                  {img.category}
                </span>
                <h3 className="text-xl md:text-2xl font-serif !text-white font-bold leading-tight capitalize select-none drop-shadow-md">
                  {img.title}
                </h3>
                <p className="text-[10px] !text-white/80 font-light mt-2 select-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  Click to enlarge & explore pairing details.
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
