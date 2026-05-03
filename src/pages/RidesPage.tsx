import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, X, Car } from 'lucide-react'
import { ridesService, trainingsService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Avatar, Modal, Input, Textarea, toast, EmptyState, Confirm, Spinner } from '../components/UI'
import type { RideOffer, Training } from '../types'

export default function RidesPage() {
  const { user } = useAuth()
  const [training, setTraining] = useState<Training | null>(null)
  const [offers, setOffers] = useState<RideOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ origin: '', departure_time: '', available_seats: '2', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const t = await trainingsService.getNext()
      setTraining(t)
      if (t) setOffers(await ridesService.getForTraining(t.id))
    } catch { toast.error('Erro ao carregar caronas') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const myOffer = offers.find(o => o.user_id === user?.id)

  const handleCreate = async () => {
    if (!form.origin || !form.departure_time || !training) return
    setSaving(true)
    try {
      await ridesService.createOffer({
        user_id: user!.id, training_id: training.id,
        origin: form.origin, departure_time: form.departure_time,
        available_seats: parseInt(form.available_seats) || 2,
        notes: form.notes || undefined,
      })
      toast.success('Carona publicada!'); setShowModal(false); setForm({ origin: '', departure_time: '', available_seats: '2', notes: '' }); load()
    } catch { toast.error('Erro ao publicar carona') }
    finally { setSaving(false) }
  }

  const handleRequest = async (offerId: string) => {
    try {
      await ridesService.requestRide(offerId, user!.id)
      toast.success('Solicitação enviada!'); load()
    } catch (e: any) {
      toast.error(e?.code === '23505' ? 'Você já solicitou esta carona' : 'Erro ao solicitar')
    }
  }

  const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
    await ridesService.updateRequest(requestId, status)
    toast.success(status === 'accepted' ? 'Solicitação aceita!' : 'Solicitação recusada')
    load()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner dark /></div>

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Caronas</h1>
          {training && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 1 }}>
            {new Date(training.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </div>}
        </div>
        {!myOffer && <button className="btn-icon" onClick={() => setShowModal(true)}><Car size={18} /></button>}
      </div>

      <div style={{ padding: '12px 16px 16px' }}>
        {!myOffer && (
          <div onClick={() => setShowModal(true)} style={{ background: 'var(--orange-faded)', borderRadius: 12, padding: 14, border: '1.5px solid var(--orange)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, cursor: 'pointer' }}>
            <Car size={24} color="var(--orange)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>Tem vagas no carro?</div>
              <div style={{ fontSize: 12, color: 'var(--orange-dark)' }}>Ofereça carona para o treino</div>
            </div>
            <span style={{ color: 'var(--orange)' }}>›</span>
          </div>
        )}

        {offers.length === 0 ? (
          <EmptyState icon="🚗" title="Nenhuma carona ainda" sub="Seja o primeiro a oferecer carona para o treino!" />
        ) : (
          offers.map(offer => {
            const isOwner = offer.user_id === user?.id
            const myReq = offer.requests?.find(r => r.user_id === user?.id)
            const accepted = offer.requests?.filter(r => r.status === 'accepted').length ?? 0
            const free = offer.available_seats - accepted

            return (
              <div key={offer.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar name={offer.user?.full_name || '?'} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{offer.user?.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>📍 {offer.origin}</div>
                  </div>
                  {isOwner && (
                    <button onClick={() => setDeleteId(offer.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: offer.notes ? 8 : 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>⏰ {offer.departure_time}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: free > 0 ? 'var(--success)' : 'var(--error)' }}>
                    ● {free} vaga{free !== 1 ? 's' : ''} livre{free !== 1 ? 's' : ''}
                  </span>
                </div>

                {offer.notes && <div style={{ fontSize: 12, color: 'var(--gray-500)', fontStyle: 'italic', marginBottom: 10 }}>💬 {offer.notes}</div>}

                {/* Owner: requests */}
                {isOwner && offer.requests && offer.requests.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 10, marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Solicitações:</div>
                    {offer.requests.map(req => (
                      <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Avatar name={req.user?.full_name || '?'} size={28} />
                        <span style={{ flex: 1, fontSize: 13 }}>{req.user?.full_name}</span>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleRespond(req.id, 'accepted')} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--success)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} /></button>
                            <button onClick={() => handleRespond(req.id, 'rejected')} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--error)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: req.status === 'accepted' ? 'var(--success)' : 'var(--error)' }}>
                            {req.status === 'accepted' ? '✓ Aceito' : '✕ Recusado'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Member: request */}
                {!isOwner && (
                  myReq ? (
                    <div style={{ background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 8, textAlign: 'center', fontSize: 13, color: 'var(--gray-600)' }}>
                      {myReq.status === 'pending' ? '⏳ Solicitação enviada' : myReq.status === 'accepted' ? '✅ Solicitação aceita!' : '❌ Solicitação recusada'}
                    </div>
                  ) : free > 0 ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleRequest(offer.id)}>Solicitar carona</button>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>Carona lotada</div>
                  )
                )}
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <Modal title="Oferecer Carona" onClose={() => setShowModal(false)}
          footer={<button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.origin || !form.departure_time}>{saving ? <div className="spinner" /> : 'Publicar Carona'}</button>}>
          <Input label="Ponto de saída *" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} placeholder="Ex: Metrô Consolação, Av. Paulista..." />
          <Input label="Horário de saída *" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} placeholder="Ex: 06:30" />
          <Input label="Vagas disponíveis" type="number" min="1" max="7" value={form.available_seats} onChange={e => setForm(f => ({ ...f, available_seats: e.target.value }))} />
          <Textarea label="Observações (opcional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: carro prata, placa ABC-1234..." rows={3} />
        </Modal>
      )}

      {deleteId && <Confirm message="Remover sua oferta de carona?" onConfirm={async () => { await ridesService.deleteOffer(deleteId!); setDeleteId(null); load() }} onCancel={() => setDeleteId(null)} danger />}
    </div>
  )
}
