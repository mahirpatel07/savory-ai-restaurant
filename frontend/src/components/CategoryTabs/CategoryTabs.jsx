import React from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { categories } from '../../utils/menuData';
import { LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../context/ThemeContext';

import 'swiper/css';
import 'swiper/css/free-mode';

export default function CategoryTabs({ activeCategory, setActiveCategory }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="w-full relative z-10 py-6">
      {/* Category Slider Container */}
      <Swiper
        slidesPerView="auto"
        spaceBetween={12}
        freeMode={true}
        modules={[FreeMode]}
        className="w-full flex justify-center !px-4 md:!px-12"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          const isAI = category.id === 'ai';

          return (
            <SwiperSlide key={category.id} className="!w-auto">
              <button
                onClick={() => setActiveCategory(category.id)}
                className={`relative px-5 py-2.5 rounded-full text-xs uppercase tracking-wider transition-colors duration-300 flex items-center gap-2 cursor-pointer outline-none border ${
                  isActive
                    ? 'bg-primary text-black font-bold border-primary'
                    : `${isDark ? 'glass-panel border-white/10 text-gray-dark hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'} ${isAI ? 'text-primary/80 hover:text-primary' : ''}`
                }`}
              >
                {/* Framer Motion Magic Sliding Highlight */}
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 rounded-full bg-primary shadow-[0_0_20px_rgba(255,130,77,0.25)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}

                <span className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-black font-bold' : ''}`}>
                  {isAI ? (
                    <LuSparkles className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-primary/70'}`} />
                  ) : category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
                    />
                  ) : null}
                  <span>{category.name}</span>
                </span>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
