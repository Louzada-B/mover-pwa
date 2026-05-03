import { useState, useEffect, useCallback } from 'react'
import { QrCode, CheckCircle, Plus, Users, ClipboardList, MapPin, Navigation } from 'lucide-react'
import { trainingsService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Avatar, Modal, Input, toast, EmptyState, Spinner } from '../components/UI'
import type { Training, TrainingInterest, CheckIn } from '../types'

// ── Calcula distância entre dois pontos em metros ────────────
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Verifica se está no horário permitido ────────────────────
function isCheckinTime(start: string, end: string): boolean {
  const now = new Date()
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin >= startMin && nowMin <= endMin
}

// ── Verifica se é sábado ─────────────────────────────────────
function isSaturday(): boolean {
  return new Date().getDay() === 6
}

export default function TrainingPage() {
  const { user, isAdmin } = useAuth()
  const [training, setTraining] = useState<Training | null>(null)
  const [interested, setInterested] = useState<TrainingInterest[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'interest' | 'checkin'>('interest')
  const [showCreate, setShowCreate] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [form, setForm] = useState({
    title: 'Treino Mover',
    date: '',
    location: '',
    checkin_start: '06:30',
    checkin_end: '10:00',
    checkin_radius: '300',
  })
  const [locationForm, setLocationForm] = useState({
    checkin_lat: '',
    checkin_lng: '',
    checkin_radius: '300',
    checkin_start: '06:30',
    checkin_end: '10:00',
  })
  const [saving, setSaving] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  const myInterest = interested.some(i => i.user_id === user?.id)
  const myCheckIn = checkIns.find(c => c.user_id === user?.id)

  const isListOpen = training
    ? new Date() >= new Date(training.open_at) && new Date() <= new Date(training.close_at)
    : false

  // Verifica se check-in por geo está disponível
  const canGeoCheckIn = training
    && training.checkin_lat
    && training.checkin_lng
    && isCheckinTime(training.checkin_start || '06:30', training.checkin_end || '10:00')
    && isSaturday()
    && !myCheckIn

  // Para teste: ignora restrição de sábado e horário
  const canGeoCheckInTest = training
    && training.checkin_lat
    && training.checkin_lng
    && !myCheckIn

  const load = useCallback(async () => {
    try {
      const t = await trainingsService.getNext()
      setTraining(t)
      if (t) {
        const [int, cks] = await Promise.all([
          trainingsService.getInterested(t.id),
          trainingsService.getCheckIns(t.id),
        ])
        setInterested(int)
        setCheckIns(cks)
        if (t.checkin_lat) {
          setLocationForm({
            checkin_lat: String(t.checkin_lat),
            checkin_lng: String(t.checkin_lng || ''),
            checkin_radius: String(t.checkin_radius || 300),
            checkin_start: t.checkin_start || '06:30',
            checkin_end: t.checkin_end || '10:00',
          })
        }
      }
    } catch { toast.error('Erro ao carregar treino') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = async () => {
    if (!training) return
    const added = await trainingsService.toggleInterest(training.id, user!.id)
    toast.success(added ? 'Você está na lista! 🎉' : 'Removido da lista')
    load()
  }

  // ── Check-in por geolocalização ──────────────────────────
  const handleGeoCheckIn = async () => {
    if (!training) return
    setCheckingIn(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const distance = getDistance(
          latitude, longitude,
          training.checkin_lat!, training.checkin_lng!
        )
        const radius = training.checkin_radius || 300

        if (distance <= radius) {
          const result = await trainingsService.checkIn(training.id, user!.id)
          if (result.alreadyCheckedIn) {
            toast.show('Você já fez check-in! 🎉')
          } else {
            toast.success('Check-in realizado! 🏃 Bom treino!')
          }
          load()
        } else {
          toast.error(`Você está a ${Math.round(distance)}m do local. Máximo: ${radius}m`)
        }
        setCheckingIn(false)
      },
      (err) => {
        if (err.code === 1) {
          toast.error('Permita o acesso à localização nas configurações do navegador.')
        } else {
          toast.error('Não foi possível obter sua localização. Tente novamente.')
        }
        setCheckingIn(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // ── Admin: usar localização atual ────────────────────────
  const handleUseCurrentLocation = () => {
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationForm(f => ({
          ...f,
          checkin_lat: String(position.coords.latitude),
          checkin_lng: String(position.coords.longitude),
        }))
        toast.success('Localização obtida!')
        setGettingLocation(false)
      },
      () => {
        toast.error('Não foi possível obter a localização.')
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Admin: salvar configuração de check-in ───────────────
  const handleSaveLocation = async () => {
    if (!training || !locationForm.checkin_lat || !locationForm.checkin_lng) {
      toast.error('Defina a localização primeiro.')
      return
    }
    setSaving(true)
    try {
      await trainingsService.updateCheckinConfig(training.id, {
        checkin_lat: parseFloat(locationForm.checkin_lat),
        checkin_lng: parseFloat(locationForm.checkin_lng),
        checkin_radius: parseInt(locationForm.checkin_radius) || 300,
        checkin_start: locationForm.checkin_start,
        checkin_end: locationForm.checkin_end,
      })
      toast.success('Configuração salva!')
      setShowLocation(false)
      load()
    } catch { toast.error('Erro ao salvar configuração.') }
    finally { setSaving(false) }
  }

  // ── Admin: criar treino ──────────────────────────────────
  const handleCreate = async () => {
    if (!form.date || !form.title) return
    setSaving(true)
    try {
      const sat = new Date(form.date + 'T12:00:00')
      const wed = new Date('2020-01-01T00:00:00')
      const close = new Date('2099-01-01T00:00:00')
      await trainingsService.create({
        title: form.title,
        date: form.date,
        location: form.location || undefined,
        open_at: wed.toISOString(),
        close_at: close.toISOString(),
      })
      toast.success('Treino criado!')
      setShowCreate(false)
      load()
    } catch { toast.error('Erro ao criar treino') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <Spinner dark />
    </div>
  )

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Treino de Sábado</h1>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            {training && (
              <button className="btn-icon" style={{ background: 'var(--gray-200)' }}
                onClick={() => setShowLocation(true)}>
                <MapPin size={18} color="var(--orange)" />
              </button>
            )}
            <button className="btn-icon" onClick={() => setShowCreate(true)}>
              <Plus size={18} />
            </button>
          </div>
        )}
      </div>

      {!training ? (
        <EmptyState icon="📅" title="Nenhum treino agendado"
          sub={isAdmin ? 'Crie o próximo treino acima.' : 'O admin criará o próximo treino em breve.'} />
      ) : (
        <>
          {/* Card do treino */}
          <div style={{ padding: 16, paddingBottom: 8 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{training.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 700, marginTop: 2, textTransform: 'capitalize' }}>
                    {new Date(training.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </div>
                  {training.location && (
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>📍 {training.location}</div>
                  )}
                  {training.checkin_lat && (
                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>
                      ✅ Check-in configurado · {training.checkin_start} às {training.checkin_end} · raio {training.checkin_radius}m
                    </div>
                  )}
                </div>
                <div style={{ background: 'var(--orange-faded)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{interested.length}</div>
                  <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700 }}>Interessados</div>
                </div>
              </div>

              {/* Check-in */}
              {myCheckIn ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FFF4', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                  <CheckCircle size={18} color="var(--success)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Check-in realizado!</span>
                </div>
              ) : training.checkin_lat ? (
                // Usa canGeoCheckInTest para testes — troque por canGeoCheckIn em produção
                canGeoCheckInTest ? (
                  <button className="btn btn-secondary" style={{ marginBottom: 8 }}
                    onClick={handleGeoCheckIn} disabled={checkingIn}>
                    <Navigation size={16} />
                    {checkingIn ? 'Verificando localização...' : 'Fazer Check-in por Localização'}
                  </button>
                ) : (
                  <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '10px', textAlign: 'center', fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                    📍 Check-in disponível sábado das {training.checkin_start} às {training.checkin_end}
                  </div>
                )
              ) : (
                <div style={{ background: 'var(--orange-faded)', borderRadius: 8, padding: '10px', textAlign: 'center', fontSize: 12, color: 'var(--orange)', marginBottom: 8 }}>
                  {isAdmin ? '⚙️ Configure a localização do check-in tocando no ícone 📍 acima' : '⏳ Check-in será configurado pelo admin'}
                </div>
              )}

              {/* Lista de interesse */}
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

          {/* Lista */}
          {(tab === 'interest' ? interested : checkIns).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '24px 0', fontSize: 14 }}>
              Nenhum registro ainda
            </div>
          ) : (
            (tab === 'interest' ? interested : checkIns).map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--gray-100)', background: 'white' }}>
                <Avatar name={item.user?.full_name || '?'} size={34} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.user?.full_name}</span>
                {tab === 'checkin' && <CheckCircle size={16} color="var(--success)" />}
              </div>
            ))
          )}
        </>
      )}

      {/* Modal configurar localização (admin) */}
      {showLocation && training && (
        <Modal title="Configurar Check-in" onClose={() => setShowLocation(false)}
          footer={
            <button className="btn btn-primary" onClick={handleSaveLocation} disabled={saving || !locationForm.checkin_lat}>
              {saving ? <div className="spinner" /> : 'Salvar Configuração'}
            </button>
          }>
          <div style={{ background: 'var(--orange-faded)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--orange-dark)', marginBottom: 16, lineHeight: 1.5 }}>
            ℹ️ Vá até o local do treino e toque em "Usar minha localização atual", ou insira as coordenadas manualmente.
          </div>

          <button className="btn btn-secondary" onClick={handleUseCurrentLocation} disabled={gettingLocation} style={{ marginBottom: 16 }}>
            <Navigation size={16} />
            {gettingLocation ? 'Obtendo localização...' : 'Usar minha localização atual'}
          </button>

          {locationForm.checkin_lat && (
            <div style={{ background: 'var(--success-bg)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--success)', marginBottom: 16 }}>
              📍 {parseFloat(locationForm.checkin_lat).toFixed(6)}, {parseFloat(locationForm.checkin_lng).toFixed(6)}
            </div>
          )}

          <Input label="Latitude (opcional — preenchida automaticamente)"
            value={locationForm.checkin_lat}
            onChange={e => setLocationForm(f => ({ ...f, checkin_lat: e.target.value }))}
            placeholder="-23.550520" />

          <Input label="Longitude (opcional — preenchida automaticamente)"
            value={locationForm.checkin_lng}
            onChange={e => setLocationForm(f => ({ ...f, checkin_lng: e.target.value }))}
            placeholder="-46.633308" />

          <Input label="Raio de distância (metros)"
            type="number" value={locationForm.checkin_radius}
            onChange={e => setLocationForm(f => ({ ...f, checkin_radius: e.target.value }))}
            placeholder="300" />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Input label="Check-in abre às"
                type="time" value={locationForm.checkin_start}
                onChange={e => setLocationForm(f => ({ ...f, checkin_start: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Check-in fecha às"
                type="time" value={locationForm.checkin_end}
                onChange={e => setLocationForm(f => ({ ...f, checkin_end: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal criar treino */}
      {showCreate && (
        <Modal title="Criar Treino" onClose={() => setShowCreate(false)}
          footer={
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.date}>
              {saving ? <div className="spinner" /> : 'Criar Treino'}
            </button>
          }>
          <Input label="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Treino Mover" />
          <Input label="Data *" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Local" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Orla do Guaíba — Em frente à pista de skate" />
          <div style={{ background: 'var(--orange-faded)', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: 'var(--orange-dark)', lineHeight: 1.5 }}>
            ℹ️ Após criar o treino, configure a localização do check-in tocando no ícone 📍 no cabeçalho.
          </div>
        </Modal>
      )}
    </div>
  )
}