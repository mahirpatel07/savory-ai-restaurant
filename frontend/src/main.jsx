import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { BrowserRouter } from 'react-router-dom'
import { ReservationProvider } from './context/ReservationContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AdminSkeletonLoader from './admin/components/AdminSkeletonLoader'
import AppRoutes from './AppRoutes'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins globally
gsap.registerPlugin(ScrollTrigger);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ReservationProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Suspense fallback={<AdminSkeletonLoader />}>
              <AppRoutes />
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </ReservationProvider>
    </AuthProvider>
  </StrictMode>,
)
