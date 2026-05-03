import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Megaphone, Calendar, Dumbbell, Car, Users, User } from 'lucide-react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastContainer } from './components/UI'
import LoginPage from './pages/LoginPage'
import FeedPage from './pages/FeedPage'
import CalendarPage from './pages/CalendarPage'
import TrainingPage from './pages/TrainingPage'
import RidesPage from './pages/RidesPage'
import MembersPage from './pages/MembersPage'
import ProfilePage from './pages/ProfilePage'

// ── Install banner for PWA ──────────────────────────────────
function InstallBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show) return null

  return (
    <div className="install-banner">
      <span style={{ fontSize: 20 }}>🏃</span>
      <p>Adicione o Mover à sua tela inicial para acesso rápido!</p>
      <button className="install-close" onClick={async () => {
        if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice }
        setShow(false)
      }}>+</button>
      <button className="install-close" onClick={() => setShow(false)} style={{ marginLeft: 4 }}>✕</button>
    </div>
  )
}

// ── Bottom nav ───────────────────────────────────────────────
function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const navStyle = ({ isActive }: { isActive: boolean }) =>
    `tab-item${isActive ? ' active' : ''}`

  return (
    <nav className="tab-bar">
      <NavLink to="/feed" className={navStyle}>
        <Megaphone /><span className="tab-label">Avisos</span>
      </NavLink>
      <NavLink to="/calendar" className={navStyle}>
        <Calendar /><span className="tab-label">Calendário</span>
      </NavLink>
      <NavLink to="/training" className={navStyle}>
        <Dumbbell /><span className="tab-label">Treino</span>
      </NavLink>
      <NavLink to="/rides" className={navStyle}>
        <Car /><span className="tab-label">Caronas</span>
      </NavLink>
      {isAdmin && (
        <NavLink to="/members" className={navStyle}>
          <Users /><span className="tab-label">Membros</span>
        </NavLink>
      )}
      <NavLink to="/profile" className={navStyle}>
        <User /><span className="tab-label">Perfil</span>
      </NavLink>
    </nav>
  )
}

// ── App shell ────────────────────────────────────────────────
function AppShell() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div style={{ fontSize: 48 }}>🏃</div>
          <div className="loading-brand">MOVER</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-shell" style={{ display: 'flex', flexDirection: 'column' }}>
        <LoginPage />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <InstallBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/rides" element={<RidesPage />} />
        {isAdmin && <Route path="/members" element={<MembersPage />} />}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
      <BottomNav isAdmin={isAdmin} />
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
