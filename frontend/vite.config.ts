import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('three') || id.includes('@react-three/fiber') || id.includes('@react-three/drei')) return 'three-vendor';
          if (id.includes('framer-motion') || id.includes('gsap') || id.includes('lenis')) return 'motion-vendor';
          if (id.includes('swiper') || id.includes('react-parallax-tilt') || id.includes('react-type-animation') || id.includes('react-fast-marquee')) return 'ui-vendor';
          if (id.includes('react-hook-form') || id.includes('react-hot-toast') || id.includes('react-confetti') || id.includes('react-countup')) return 'form-vendor';
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
        }
      }
    }
  }
})

