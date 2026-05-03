import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { eventsService } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Modal, Input, Textarea, toast, EmptyState, Confirm } from '../components/UI'
import type { Event } from '../types'
import { eventsService, trainingsService } from '../services/api'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS = ['D','S','T','Q','Q','S','S']
const TYPE_CFG = {
  treino:  { label: 'Treino',  color: '#FF6B2B', bg: '#FFF0E9', emoji: '🏃' },
  corrida: { label: 'Corrida', color: '#7C3AED', bg: '#EDE9FE', emoji: '🏅' },
  social:  { label: 'Social',  color: '#059669', bg: '#ECFDF5', emoji: '🎉' },
  outro:   { label: 'Outro',   color: '#9E9E9E', bg: '#F5F5F5', emoji: '📌' },
}

export default function CalendarPage() {
  const { isAdmin, user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Partial<Event>>({ type: 'treino' })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

const load = async () => {
  try {
    const [evts, trainings] = await Promise.all([
      eventsService.getAll(),
      trainingsService.getAll(),
    ])
    // Converte treinos em eventos para exibir no calendário
    const trainingEvents = trainings.map(t => ({
      id: t.id,
      title: t.title,
      date: t.date,
      time: '07:00',
      location: t.location,
      type: 'treino' as const,
      description: `Check-in: ${t.checkin_start || '06:30'} às ${t.checkin_end || '10:00'}`,
      created_by: '',
      created_at: t.created_at,
    }))
    setEvents([...evts, ...trainingEvents])
  } catch { toast.error('Erro ao carregar eventos') }
}
  useEffect(() => { load() }, [])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const eventsThisMonth = events.filter(e => {
    const d = new Date(e.date + 'T12:00:00')
    return d.getFullYear() === year && d.getMonth() === month
  })

  const eventDays = new Set(eventsThisMonth.map(e => new Date(e.date + 'T12:00:00').getDate()))
  const eventsForDay = selectedDay ? eventsThisMonth.filter(e => new Date(e.date + 'T12:00:00').getDate() === selectedDay) : []
  const upcoming = events.filter(e => e.date >= today.toISOString().split('T')[0]).slice(0, 8)

  const handleSave = async () => {
    if (!form.title || !form.date) return
    setSaving(true)
    try {
      await eventsService.create({ ...form, created_by: user!.id })
      toast.success('Evento criado!')
      setShowModal(false); setForm({ type: 'treino' }); load()
    } catch { toast.error('Erro ao criar evento') }
    finally { setSaving(false) }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Calendário</h1>
        {isAdmin && <button className="btn-icon" onClick={() => setShowModal(true)}><Plus size={18} /></button>}
      </div>

      {/* Calendar */}
      <div style={{ background: 'white', padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orange)' }}><ChevronLeft size={22} /></button>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--orange)' }}><ChevronRight size={22} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
          {DAYS.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', paddingBottom: 4 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px 0' }}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
            const hasEvent = eventDays.has(day)
            const isSelected = selectedDay === day
            return (
              <div key={day} onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                style={{
                  height: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, cursor: 'pointer', position: 'relative',
                  background: isSelected ? 'var(--orange)' : isToday ? 'var(--orange-faded)' : 'transparent',
                  fontWeight: isToday || isSelected ? 800 : 400,
                  fontSize: 13,
                  color: isSelected ? 'white' : isToday ? 'var(--orange)' : 'var(--black)',
                }}>
                {day}
                {hasEvent && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'white' : 'var(--orange)', position: 'absolute', bottom: 3 }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Events list */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="section-header" style={{ padding: '14px 0 10px' }}>
          <span className="section-title">
            {selectedDay ? `${selectedDay} de ${MONTHS[month]}` : 'Próximos eventos'}
          </span>
          {selectedDay && <button className="section-action" onClick={() => setSelectedDay(null)}>Ver todos</button>}
        </div>

        {(selectedDay ? eventsForDay : upcoming).length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 14, padding: '20px 0' }}>
            {selectedDay ? 'Nenhum evento neste dia' : 'Nenhum evento próximo'}
          </div>
        ) : (
          (selectedDay ? eventsForDay : upcoming).map(event => {
            const cfg = TYPE_CFG[event.type]
            return (
              <div key={event.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{cfg.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{event.title}</div>
                  {!selectedDay && <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 700, marginTop: 1 }}>
                    {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </div>}
                  {event.time && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>⏰ {event.time}</div>}
                  {event.location && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>📍 {event.location}</div>}
                  {event.description && <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4, lineHeight: 1.4 }}>{event.description}</div>}
                  <span className="badge" style={{ background: cfg.bg, color: cfg.color, marginTop: 8 }}>{cfg.label}</span>
                </div>
                {isAdmin && (
                  <button onClick={() => setDeleteId(event.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', alignSelf: 'flex-start' }}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <Modal title="Novo Evento" onClose={() => setShowModal(false)}
          footer={<button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title || !form.date}>{saving ? <div className="spinner" /> : 'Criar Evento'}</button>}>
          <Input label="Título *" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nome do evento" />
          <Input label="Data * (AAAA-MM-DD)" type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Horário" value={form.time || ''} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="07:00" />
          <Input label="Local" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Parque Ibirapuera" />
          <div className="input-group">
            <label className="input-label">Tipo</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(Object.entries(TYPE_CFG) as [Event['type'], typeof TYPE_CFG.treino][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                  style={{ padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${form.type === key ? cfg.color : 'var(--gray-300)'}`, background: form.type === key ? cfg.bg : 'transparent', color: form.type === key ? cfg.color : 'var(--gray-600)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Descrição" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes do evento..." rows={3} />
        </Modal>
      )}

      {deleteId && <Confirm message="Remover este evento?" onConfirm={async () => { await eventsService.delete(deleteId!); setDeleteId(null); load() }} onCancel={() => setDeleteId(null)} danger />}
    </div>
  )
}
