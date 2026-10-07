import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { LogIn, UserPlus, Phone, Lock, Mail, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

export default function CustomerAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (cardRef.current) {
        gsap.from(cardRef.current, {
          y: 60,
          opacity: 0,
          duration: 1.2,
          ease: 'power4.out'
        });
      }

      const glowEls = document.querySelectorAll('.bg-glow');
      if (glowEls.length > 0) {
        gsap.to(glowEls, {
          scale: 1.5,
          opacity: 0.4,
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register({ ...formData, role: 'customer' });
    }

    if (result.success) {
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div ref={containerRef} className="min-h-screen w-full flex items-center justify-center bg-[#0b0b0b] relative overflow-hidden px-6">
      <Toaster />

      <div className="absolute inset-0 z-0">
        <div className="bg-glow absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-orange-500/10 rounded-full blur-[140px]" />
        <div className="bg-glow absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-fuchsia-500/5 rounded-full blur-[140px]" />
      </div>

      <div ref={cardRef} className="z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mb-6 border border-orange-500/20">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">SAVORY <span className="text-orange-500">GUEST</span></h1>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Exclusive Dining Portal</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-2xl shadow-2xl">
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:bg-white/5'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-4">
                <input
                  type="text" required placeholder="Full Name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
                <input
                  type="tel" required placeholder="Phone Number"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>
            )}

            <input
              type="email" required placeholder="Email Address"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500/50"
            />
            <input
              type="password" required placeholder="Password"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:border-orange-500/50"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 rounded-[24px] bg-orange-500 text-black font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-500/20 active:scale-95 transition-all mt-6 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (isLogin ? 'Enter Portal' : 'Join the Club')}
            </button>
          </form>
        </div>

        <p className="text-center text-[8px] font-black text-white/10 uppercase tracking-[0.3em] mt-8 leading-loose">
          By continuing, you agree to Savory's <br/> Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
