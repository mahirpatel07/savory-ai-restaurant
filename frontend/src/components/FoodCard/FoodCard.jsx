import React, { useState, useRef } from 'react';
import { FiStar, FiHeart, FiClock, FiActivity } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import gsap from 'gsap';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function FoodCard({ item }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isFavorite, setIsFavorite] = useState(false);
  const cardRef = useRef(null);
  const imageRef = useRef(null);

  const imageUrl = item.image?.startsWith('http') ? item.image : `${API_BASE}${item.image}`;

  const handleMouseEnter = () => {
    gsap.to(cardRef.current, {
      y: -8,
      scale: 1.02,
      duration: 0.4,
      ease: 'power2.out',
      borderColor: 'rgba(255, 130, 77, 0.3)',
      boxShadow: '0 20px 45px rgba(0,0,0,0.5)'
    });
    gsap.to(imageRef.current, {
      scale: 1.1,
      duration: 0.6,
      ease: 'power2.out'
    });
  };

  const handleMouseLeave = () => {
    gsap.to(cardRef.current, {
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: 'power2.out',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(229, 231, 235, 1)',
      boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    });
    gsap.to(imageRef.current, {
      scale: 1,
      duration: 0.6,
      ease: 'power2.out'
    });
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    const target = e.currentTarget;
    gsap.fromTo(target,
      { scale: 1 },
      { scale: 1.4, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }
    );
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group rounded-[20px] overflow-hidden border transition-all duration-300 flex flex-col justify-between h-full cursor-pointer ${
        isDark
          ? 'glass-panel border-white/8 bg-[#111111]/70 text-white'
          : 'bg-white border-gray-200 text-gray-900 shadow-md'
      }`}
    >
      <div className={`relative aspect-square overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-gray-100'}`}>
        <img
          ref={imageRef}
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 select-none">
          <FiStar className="w-3.5 h-3.5 fill-primary text-primary border-none" />
          <span className="text-[11px] font-bold !text-white">{item.rating}</span>
          <span className="text-[9px] !text-white/80">({item.reviews})</span>
        </div>

        <button
          onClick={handleFavoriteClick}
          className={`absolute top-4 right-4 p-2.5 rounded-full border backdrop-blur-md cursor-pointer transition-colors duration-300 ${
            isFavorite
              ? 'bg-primary/30 border-primary/50 text-primary'
              : 'bg-black/60 border-white/20 !text-white hover:text-primary'
          }`}
          aria-label="Add to Favorites"
        >
          <FiHeart className={`w-4 h-4 ${isFavorite ? 'fill-primary' : ''}`} />
        </button>

        <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
          {(item.tags || []).slice(0, 2).map((tag, i) => (
            <span 
              key={i} 
              className="text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-primary text-black font-bold"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6 flex flex-col justify-between flex-grow">
        <div>
          <div className={`flex items-center gap-4 text-[10px] font-medium mb-2.5 ${
            isDark ? 'text-gray-dark' : 'text-gray-500'
          }`}>
            <span className="flex items-center gap-1">
              <FiClock className="w-3 h-3 text-primary" />
              {item.prepTime}
            </span>
            <span className="flex items-center gap-1">
              <FiActivity className="w-3 h-3 text-secondary" />
              {item.calories}
            </span>
          </div>

          <h3 className={`text-xl font-serif font-bold group-hover:text-primary transition-colors duration-300 mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {item.name}
          </h3>

          <p className={`text-xs font-light leading-relaxed line-clamp-2 ${
            isDark ? 'text-gray-dark' : 'text-gray-600'
          }`}>
            {item.description}
          </p>
        </div>

        <div className={`flex items-center justify-between mt-6 pt-4 border-t ${
          isDark ? 'border-white/5' : 'border-gray-100'
        }`}>
          <span className="text-primary font-bold text-lg">${item.price}</span>
        </div>
      </div>
    </div>
  );
}
