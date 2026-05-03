import { useState } from 'react'
import { Lock, LogOut, ChevronRight } from 'lucide-react'
import { authService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Avatar, Input, toast, Confirm } from '../components/UI'

export default function ProfilePage() {
  const { user, signOut, isAdmin } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSignOut, setShowSignOut] = useState(false)

  const handlePassword = async () => {
    if (newPwd.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    if (newPwd !== confirmPwd) { toast.error('Senhas não coincidem'); return }
    setSaving(true)
    try {
      await authService.updatePassword(newPwd)
      toast.success('Senha atualizada!')
      setShowPassword(false); setNewPwd(''); setConfirmPwd('')
    } catch { toast.error('Erro ao atualizar senha') }
    finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <div className="page-content">
      <div style={{ background: 'white', padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--gray-100)' }}>
        <Avatar name={user.full_name} size={72} />
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>{user.full_name}</div>
        {isAdmin && <span className="badge" style={{ background: 'var(--orange-faded)', color: 'var(--orange)', marginTop: 6 }}>⚡ ADMIN</span>}
        <div style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 6 }}>{user.email}</div>
        {user.phone && <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>📱 {user.phone}</div>}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Member since */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>📅</span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 700 }}>MEMBRO DESDE</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1, textTransform: 'capitalize' }}>
              {new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="card">
          <button onClick={() => setShowPassword(!showPassword)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)' }}>
            <Lock size={20} color="var(--gray-600)" />
            <span style={{ flex: 1, fontSize: 14, color: 'var(--gray-700)', textAlign: 'left' }}>Alterar senha</span>
            <ChevronRight size={18} color="var(--gray-300)" style={{ transform: showPassword ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showPassword && (
            <div style={{ marginTop: 16 }}>
              <Input label="Nova senha" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
              <Input label="Confirmar senha" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repita a senha" />
              <button className="btn btn-primary btn-sm" onClick={handlePassword} disabled={saving}>
                {saving ? <div className="spinner" /> : 'Salvar senha'}
              </button>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button className="btn btn-danger" onClick={() => setShowSignOut(true)}>
          <LogOut size={16} /> Sair do app
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray-300)', marginTop: 8 }}>Mover v1.0.0 — PWA</div>
      </div>

      {showSignOut && (
        <Confirm message="Deseja sair do app?" onConfirm={signOut} onCancel={() => setShowSignOut(false)} danger />
      )}
    </div>
  )
}
