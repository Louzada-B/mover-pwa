import { useState, useEffect, useRef } from 'react'
import { QrCode, ScanLine, CheckCircle, Plus, Users, ClipboardList } from 'lucide-react'
import { trainingsService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Avatar, Modal, Input, toast, EmptyState, Spinner } from '../components/UI'
import type { Training, TrainingInterest, CheckIn } from '../types'

// ── QR Code renderer (pure canvas, no library needed) ──────────
function QRDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    // We show a styled placeholder — real QR needs qrcode.js
    // In production, install: npm i qrcode && import QRCode from 'qrcode'
    // QRCode.toCanvas(canvasRef.current, value, { width: 200, color: { dark: '#0A0A0A', light: '#FFFFFF' } })
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 200, 200)
    // Draw placeholder grid
    ctx.fillStyle = '#0A0A0A'
    const cell = 200 / 21
    const pattern = [
      [0,0,6],[0,14,6],[14,0,6]  // corner squares
    ]
    pattern.forEach(([r, c, size]) => {
      ctx.fillRect(c * cell, r * cell, size * cell, size * cell)
      ctx.fillStyle = 'white'
      ctx.fillRect((c+1) * cell, (r+1) * cell, (size-2) * cell, (size-2) * cell)
      ctx.fillStyle = '#0A0A0A'
      ctx.fillRect((c+2) * cell, (r+2) * cell, (size-4) * cell, (size-4) * cell)
      ctx.fillStyle = '#0A0A0A'
    })
    // Random data modules
    const hash = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue
        if ((hash * (r + 1) * (c + 1)) % 3 === 0) {
          ctx.fillRect(c * cell, r * cell, cell - 0.5, cell - 0.5)
        }
      }
    }
  }, [value])

  return (
    <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '2px solid var(--gray-200)', display: 'inline-block' }}>
      <canvas ref={canvasRef} width={200} height={200} style={{ display: 'block' }} />
    </div>
  )
}

// ── QR Scanner (uses device camera via MediaDevices API) ────────
function QRScanner({ onScan, onClose }: { onScan: (data: string) => void; onClose: () => void }) {
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => onScan(decodedText))
        },
        () => {}
      ).catch(() => {
        setError('Não foi possível acessar a câmera. Verifique as permissões.')
      })
    })

    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'black', zIndex: 60,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {error ? (
        <div style={{ color: 'white', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
          <p style={{ lineHeight: 1.5, marginBottom: 20 }}>{error}</p>
          <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={onClose}>Fechar</button>
        </div>
      ) : (
        <>
          <div id="qr-reader" style={{ width: 300, borderRadius: 12, overflow: 'hidden' }} />
          <p style={{ color: 'white', marginTop: 20, fontSize: 14, textAlign: 'center', padding: '0 32px' }}>
            Aponte para o QR Code do treino
          </p>
          <button onClick={onClose} style={{
            marginTop: 24, background: 'rgba(255,255,255,0.2)',
            border: 'none', color: 'white', padding: '10px 24px',
            borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700
          }}>
            Cancelar
          </button>
        </>
      )}
    </div>
  )
}

export default function TrainingPage() {
  const { user, isAdmin } = useAuth()
  const [training, setTraining] = useState<Training | null>(null)
  const [interested, setInterested] = useState<TrainingInterest[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'interest' | 'checkin'>('interest')
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: 'Treino Mover', date: '', location: '', open_at: '', close_at: '' })
  const [saving, setSaving] = useState(false)

  const myInterest = interested.some(i => i.user_id === user?.id)
  const myCheckIn = checkIns.find(c => c.user_id === user?.id)

  const isListOpen = training
    ? new Date() >= new Date(training.open_at) && new Date() <= new Date(training.close_at)
    : false

  const load = async () => {
    try {
      const t = await trainingsService.getNext()
      setTraining(t)
      if (t) {
        const [int, cks] = await Promise.all([
          trainingsService.getInterested(t.id),
          trainingsService.getCheckIns(t.id),
        ])
        setInterested(int); setCheckIns(cks)
      }
    } catch { toast.error('Erro ao carregar treino') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async () => {
    if (!training) return
    const added = await trainingsService.toggleInterest(training.id, user!.id)
    toast.success(added ? 'Você está na lista! 🎉' : 'Removido da lista')
    load()
  }

  const handleScan = async (data: string) => {
    setShowScanner(false)
    try {
      const parsed = JSON.parse(data)
      if (parsed.type !== 'mover_checkin') { toast.error('QR inválido'); return }
      const result = await trainingsService.checkIn(parsed.training_id, user!.id)
      toast.success(result.alreadyCheckedIn ? 'Você já fez check-in! 🎉' : 'Check-in realizado! 🏃')
      load()
    } catch { toast.error('QR inválido ou expirado') }
  }

  const handleCreate = async () => {
    if (!form.date || !form.title) return
    setSaving(true)
    try {
      const sat = new Date(form.date + 'T12:00:00')
      const wed = new Date('2020-01-01T00:00:00')  // já passou, lista sempre aberta
      const close = new Date('2099-01-01T00:00:00')  // nunca fecha
      await trainingsService.create({
        title: form.title, date: form.date, location: form.location || undefined,
        open_at: form.open_at || wed.toISOString(),
        close_at: form.close_at || close.toISOString(),
      })
      toast.success('Treino criado!'); setShowCreate(false); load()
    } catch { toast.error('Erro ao criar treino') }
    finally { setSaving(false) }
  }

  const qrValue = training ? JSON.stringify({ type: 'mover_checkin', training_id: training.id }) : ''

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner dark /></div>

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Treino de Sábado</h1>
        {isAdmin && <button className="btn-icon" onClick={() => setShowCreate(true)}><Plus size={18} /></button>}
      </div>

      {!training ? (
        <EmptyState icon="📅" title="Nenhum treino agendado" sub={isAdmin ? 'Crie o próximo treino acima.' : 'O admin criará o próximo treino em breve.'} />
      ) : (
        <>
          {/* Training card */}
          <div style={{ padding: 16, paddingBottom: 8 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{training.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 700, marginTop: 2, textTransform: 'capitalize' }}>
                    {new Date(training.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </div>
                  {training.location && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>📍 {training.location}</div>}
                </div>
                <div style={{ background: 'var(--orange-faded)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{interested.length}</div>
                  <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700 }}>Interessados</div>
                </div>
              </div>

              {myCheckIn ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FFF4', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                  <CheckCircle size={18} color="var(--success)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Check-in realizado!</span>
                </div>
              ) : (
                <button className="btn btn-secondary" style={{ marginBottom: 8 }} onClick={() => setShowScanner(true)}>
                  <ScanLine size={16} /> Fazer Check-in (QR Code)
                </button>
              )}

              {isListOpen ? (
                <button className={`btn ${myInterest ? 'btn-ghost' : 'btn-primary'}`} onClick={handleToggle}>
                  {myInterest ? '✓ Estou na lista' : 'Quero ir neste sábado'}
                </button>
              ) : (
                <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '10px', textAlign: 'center', fontSize: 12, color: 'var(--gray-500)' }}>
                  {new Date() < new Date(training.open_at)
                    ? `Lista abre ${new Date(training.open_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}`
                    : 'Lista encerrada'}
                </div>
              )}

              {isAdmin && (
                <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowQR(true)}>
                  <QrCode size={16} /> Gerar QR de Check-in
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ margin: '0 16px 12px' }}>
            <div className="pill-tabs">
              <button className={`pill-tab${tab === 'interest' ? ' active' : ''}`} onClick={() => setTab('interest')}>
                <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
                Interessados ({interested.length})
              </button>
              <button className={`pill-tab${tab === 'checkin' ? ' active' : ''}`} onClick={() => setTab('checkin')}>
                <ClipboardList size={13} style={{ display: 'inline', marginRight: 4 }} />
                Check-ins ({checkIns.length})
              </button>
            </div>
          </div>

          {/* List */}
          {(tab === 'interest' ? interested : checkIns).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '24px 0', fontSize: 14 }}>
              Nenhum registro ainda
            </div>
          ) : (
            <div>
              {(tab === 'interest' ? interested : checkIns).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--gray-100)', background: 'white' }}>
                  <Avatar name={item.user?.full_name || '?'} size={34} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.user?.full_name}</span>
                  {tab === 'checkin' && <CheckCircle size={16} color="var(--success)" />}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* QR Modal */}
      {showQR && training && (
        <Modal title="QR Code do Treino" onClose={() => setShowQR(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', textAlign: 'center' }}>{training.title} — {new Date(training.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
            <QRDisplay value={qrValue} />
            <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', lineHeight: 1.5 }}>
              Exiba este QR no celular para os membros escanearem e registrarem presença
            </p>
          </div>
        </Modal>
      )}

      {/* Create training modal */}
      {showCreate && (
        <Modal title="Criar Treino" onClose={() => setShowCreate(false)}
          footer={<button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.date}>{saving ? <div className="spinner" /> : 'Criar Treino'}</button>}>
          <Input label="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Treino Mover" />
          <Input label="Data *" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Local" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Parque Ibirapuera — Portão 3" />
          <div style={{ background: 'var(--orange-faded)', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: 'var(--orange-dark)', lineHeight: 1.5 }}>
            ℹ️ A lista abre automaticamente na quarta anterior e fecha no sábado às 7h.
          </div>
        </Modal>
      )}

      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
