import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { LogIn, Lock, Mail, Loader2, Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (logoRef.current) {
        gsap.from(logoRef.current, {
          y: -50,
          opacity: 0,
          duration: 1.5,
          ease: 'expo.out'
        });
      }

      if (formRef.current) {
        gsap.from(formRef.current, {
          y: 100,
          opacity: 0,
          duration: 1.2,
          delay: 0.5,
          ease: 'power4.out'
        });
      }

      // Ambient background animation
      const glowEls = document.querySelectorAll('.bg-glow');
      if (glowEls.length > 0) {
        gsap.to(glowEls, {
          scale: 1.2,
          opacity: 0.6,
          duration: 4,
          repeat: -1,
          yoyo: true,
          stagger: 1,
          ease: 'sine.inOut'
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success('Welcome back, Chef!', {
        style: {
          background: '#1a1a1a',
          color: '#ff6b00',
          border: '1px solid #ff6b00'
        }
      });
      navigate('/admin/dashboard');
    } else {
      toast.error(result.message);

      // Shake animation on error
      if (formRef.current) {
        gsap.to(formRef.current, {
          x: 10,
          duration: 0.1,
          repeat: 5,
          yoyo: true,
          ease: 'linear'
        });
      }
    }

    setIsLoading(false);
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] overflow-hidden relative"
    >
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="bg-glow absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ff6b00]/10 rounded-full blur-[120px]" />
        <div className="bg-glow absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ff6b00]/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      </div>

      <motion.div
        className="z-10 w-full max-w-md p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div ref={logoRef} className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ff6b00] to-[#e65100] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,107,0,0.3)] mb-4 rotate-12">
            <Utensils className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter">
            SAVORY <span className="text-[#ff6b00]">OS</span>
          </h1>
          <p className="text-gray-500 mt-2 font-light">Restaurant Management Excellence</p>
        </div>

        <div
          ref={formRef}
          className="bg-[#141414] border border-white/5 p-8 rounded-3xl shadow-2xl backdrop-blur-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#ff6b00] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chef@savory.com"
                  required
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#ff6b00]/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#ff6b00] transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#ff6b00]/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#ff6b00] to-[#e65100] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(255,107,0,0.2)] hover:shadow-[0_15px_30px_rgba(255,107,0,0.3)] hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In to Kitchen
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-600 text-sm">
              Authorized personnel only. All access is logged.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent opacity-30" />
    </div>
  );
};

export default LoginPage;
