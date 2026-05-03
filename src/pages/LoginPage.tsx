import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Preencha email e senha.'); return }
    setLoading(true); setError('')
    try {
      await signIn(email.trim().toLowerCase(), password)
    } catch {
      setError('Email ou senha incorretos.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      flex: 1, background: 'linear-gradient(160deg, #FF6B2B 0%, #E55A1B 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 28px', gap: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 14,
        }}>🏃</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, letterSpacing: 10, color: 'white' }}>MOVER</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', letterSpacing: 1, marginTop: 2 }}>
          GRUPO COLETIVO DE CORRIDA
        </div>
      </div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 380 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Entrar</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20, lineHeight: 1.5 }}>
          Sua conta foi criada pelo admin. Acesse com seu email e senha.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="input-group">
            <label className="input-label">Senha</label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          {error && (
            <div style={{ background: '#FFF0F0', color: 'var(--error)', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Entrar'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
          Ainda não tem acesso? Apareça no treino de sábado e fale com um admin. 🧡
        </p>
      </div>
    </div>
  )
}
