import React, { useState, useMemo, useEffect, useRef } from 'react';
import CategoryTabs from '../CategoryTabs/CategoryTabs';
import FoodCard from '../FoodCard/FoodCard';
import { menuItems as initialMenuItems } from '../../utils/menuData';
import { FiSmile } from 'react-icons/fi';
import { LuSparkles } from 'react-icons/lu';
import { useTheme } from '../../context/ThemeContext';
import { getSocket } from '../../utils/socket';
import axios from 'axios';
import gsap from 'gsap';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

export default function Menu() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeCategory, setActiveCategory] = useState('ai');
  const [items, setItems] = useState([]);
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    fetchMenu();

    const socket = getSocket();
    if (socket) {
      socket.on('dish_created', (dish) => {
        setItems(prev => [dish, ...prev]);
      });
    }

    return () => {
      if (socket) {
        socket.off('dish_created');
      }
    };
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/menu`);
      const apiDishes = response.data;
      setItems(apiDishes);
    } catch (error) {
      console.error('Error fetching menu:', error);
      setItems(initialMenuItems); // Fallback to static
    }
  };

  const filteredItems = useMemo(() => {
    if (activeCategory === 'ai') {
      return items.filter(item =>
        (item.tags || []).includes('Chef Special') ||
        (item.tags || []).includes('Signature') ||
        (item.tags || []).includes('Luxury')
      );
    }
    return items.filter(item => item.category === activeCategory);
  }, [activeCategory, items]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading entrance
      if (headerRef.current?.children && headerRef.current.children.length > 0) {
        const headerChildren = Array.from(headerRef.current.children);
        gsap.from(headerChildren, {
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 85%',
          },
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out'
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      const cards = gridRef.current.children;
      gsap.fromTo(cards,
        { opacity: 0, scale: 0.9, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: 'power2.out',
          overwrite: 'auto'
        }
      );
    }
  }, [activeCategory]);

  return (
    <section
      ref={sectionRef}
      id="menu"
      className={`relative w-full py-24 md:py-32 transition-colors duration-300 ${
        isDark ? 'bg-[#090909] text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        <div ref={headerRef} className="text-center flex flex-col items-center mb-12">
          <span className="text-xs font-bold tracking-widest text-primary uppercase mb-2">
            OUR MENU
          </span>
          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Culinary Masterpieces
          </h2>
          <div className="w-16 h-[2px] bg-primary mt-6 mb-4" />
        </div>

        <CategoryTabs activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

        {activeCategory === 'ai' && (
          <div className={`mt-4 mb-12 p-6 rounded-[20px] flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto ai-panel border ${
            isDark
              ? 'glass-panel border-primary/20 bg-primary/5 text-white'
              : 'bg-white border-primary/20 text-gray-900 shadow-md'
          }`}>
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div className="p-3 rounded-full bg-primary/10 text-primary glow-primary border border-primary/30 flex-shrink-0 animate-pulse">
                <LuSparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className={`font-bold text-sm tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Palette-Optimized Molecular Gastronomy
                </h4>
                <p className={`text-xs font-light mt-1 max-w-xl ${isDark ? 'text-gray-dark' : 'text-gray-600'}`}>
                  These items are selected based on sensory neural-matching, featuring pure raw ingredients and tableside styling. Try our AI Chatbot helper for a fully customized pairing.
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-12"
        >
          {filteredItems.map((item, index) => (
            <FoodCard key={item._id || item.id || index} item={item} index={index} />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <FiSmile className={`w-10 h-10 ${isDark ? 'text-gray-dark' : 'text-gray-400'}`} />
            <p className={`text-sm ${isDark ? 'text-gray-dark' : 'text-gray-600'}`}>
              Dishes in this category are being prepared. Check back shortly!
            </p>
          </div>
        )}

      </div>
    </section>
  );
}
