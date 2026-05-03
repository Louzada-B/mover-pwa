import { useState, useEffect } from 'react'
import { UserPlus, UserMinus, UserCheck, Search } from 'lucide-react'
import { membersService } from '../services/api'
import { Avatar, Modal, Input, toast, EmptyState, Confirm, Spinner } from '../components/UI'
import type { User } from '../types'

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([])
  const [filtered, setFiltered] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)

  const load = async () => {
    try { const data = await membersService.getAll(); setMembers(data); setFiltered(data) }
    catch { toast.error('Erro ao carregar membros') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(members.filter(m => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)))
  }, [search, members])

  const handleInvite = async () => {
    if (!form.email || !form.full_name) return
    setSaving(true)
    try {
      await membersService.invite(form.email.trim().toLowerCase(), form.full_name.trim(), form.phone || undefined)
      toast.success(`Convite enviado para ${form.email}! 🎉`)
      setForm({ email: '', full_name: '', phone: '' }); setShowInvite(false); load()
    } catch (e: any) {
      toast.error(e?.message?.includes('already') ? 'Email já cadastrado' : 'Erro ao convidar membro')
    } finally { setSaving(false) }
  }

  const handleToggle = async () => {
    if (!toggleTarget) return
    await membersService.setActive(toggleTarget.id, !toggleTarget.is_active)
    toast.success(toggleTarget.is_active ? 'Membro desativado' : 'Membro reativado')
    setToggleTarget(null); load()
  }

  const active = members.filter(m => m.is_active).length
  const inactive = members.filter(m => !m.is_active).length

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner dark /></div>

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Membros</h1>
        <button className="btn-icon" onClick={() => setShowInvite(true)}><UserPlus size={18} /></button>
      </div>

      {/* Stats */}
      <div style={{ background: 'white', display: 'flex', gap: 24, padding: '10px 20px 14px', borderBottom: '1px solid var(--gray-100)' }}>
        {[
          { n: members.length, label: 'Total', color: 'var(--orange)' },
          { n: active, label: 'Ativos', color: 'var(--success)' },
          { n: inactive, label: 'Inativos', color: 'var(--gray-400)' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.n}</div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 700, letterSpacing: 0.5 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ margin: '12px 16px', background: 'white', border: '1.5px solid var(--gray-200)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={16} color="var(--gray-400)" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', fontFamily: 'var(--font-body)', color: 'var(--black)' }} />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex' }}>✕</button>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum membro encontrado" />
      ) : (
        filtered.map(member => (
          <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'white', borderBottom: '1px solid var(--gray-100)', opacity: member.is_active ? 1 : 0.55 }}>
            <Avatar name={member.full_name} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{member.full_name}</span>
                {member.role === 'admin' && (
                  <span className="badge" style={{ background: 'var(--orange-faded)', color: 'var(--orange)' }}>ADMIN</span>
                )}
                {!member.is_active && (
                  <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}>INATIVO</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
              {member.phone && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>📱 {member.phone}</div>}
            </div>
            {member.role !== 'admin' && (
              <button onClick={() => setToggleTarget(member)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: member.is_active ? 'var(--gray-300)' : 'var(--success)', display: 'flex' }}>
                {member.is_active ? <UserMinus size={20} /> : <UserCheck size={20} />}
              </button>
            )}
          </div>
        ))
      )}

      {showInvite && (
        <Modal title="Adicionar Membro" onClose={() => setShowInvite(false)}
          footer={<button className="btn btn-primary" onClick={handleInvite} disabled={saving || !form.email || !form.full_name}>{saving ? <div className="spinner" /> : 'Enviar Convite'}</button>}>
          <div style={{ background: 'var(--orange-faded)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--orange-dark)', marginBottom: 16, lineHeight: 1.5, display: 'flex', gap: 8 }}>
            <span>ℹ️</span>
            <span>O membro receberá um email com link para criar sua senha e acessar o app.</span>
          </div>
          <Input label="Nome completo *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="João da Silva" autoCapitalize="words" />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@email.com" />
          <Input label="Telefone (opcional)" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
        </Modal>
      )}

      {toggleTarget && (
        <Confirm
          message={`Deseja ${toggleTarget.is_active ? 'desativar' : 'reativar'} o acesso de ${toggleTarget.full_name}?`}
          onConfirm={handleToggle} onCancel={() => setToggleTarget(null)} danger={toggleTarget.is_active}
        />
      )}
    </div>
  )
}
