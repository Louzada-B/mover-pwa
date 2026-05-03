import { useState, useEffect } from 'react'
import { Pin, Plus, Trash2 } from 'lucide-react'
import { postsService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Avatar, Modal, Input, Textarea, toast, EmptyState, Confirm } from '../components/UI'
import type { Post } from '../types'

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function FeedPage() {
  const { user, isAdmin } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    try { setPosts(await postsService.getAll()) }
    catch { toast.error('Erro ao carregar avisos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      await postsService.create({ title: title.trim(), content: content.trim(), pinned, author_id: user!.id })
      toast.success('Aviso publicado!')
      setTitle(''); setContent(''); setPinned(false); setShowModal(false)
      load()
    } catch { toast.error('Erro ao publicar aviso') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await postsService.delete(deleteId)
    setDeleteId(null); toast.success('Aviso removido'); load()
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Avisos</h1>
        {isAdmin && <button className="btn-icon" onClick={() => setShowModal(true)}><Plus size={18} /></button>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner spinner-dark" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState icon="📢" title="Nenhum aviso ainda" sub="Os admins publicarão avisos aqui em breve." />
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => (
            <div key={post.id} className="card" style={post.pinned ? { borderLeft: '3px solid var(--orange)' } : {}}>
              {post.pinned && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <Pin size={10} color="var(--orange)" />
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--orange)', letterSpacing: 0.5 }}>FIXADO</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar name={post.author?.full_name || 'Admin'} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{post.author?.full_name || 'Admin'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{timeAgo(post.created_at)}</div>
                </div>
                {isAdmin && (
                  <button onClick={() => setDeleteId(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{post.title}</div>
              <div style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.55 }}>{post.content}</div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Novo Aviso" onClose={() => setShowModal(false)}
          footer={<button className="btn btn-primary" onClick={handlePost} disabled={saving || !title || !content}>{saving ? <div className="spinner" /> : 'Publicar'}</button>}>
          <Input label="Título" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do aviso" />
          <Textarea label="Conteúdo" value={content} onChange={e => setContent(e.target.value)} placeholder="Escreva o aviso..." rows={5} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--orange)' }} />
            <span style={{ fontSize: 14, color: 'var(--gray-700)' }}>Fixar no topo</span>
          </label>
        </Modal>
      )}

      {deleteId && (
        <Confirm message="Deseja excluir este aviso?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
      )}
    </div>
  )
}
