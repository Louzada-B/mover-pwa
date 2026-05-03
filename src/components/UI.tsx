import { ReactNode, useState, useEffect } from 'react'
import { X } from 'lucide-react'

// ─── AVATAR ──────────────────────────────────────────────────
const COLORS = ['#FF6B2B','#7C3AED','#059669','#1565C0','#E55A1B','#0288D1','#C62828']
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const color = COLORS[name.charCodeAt(0) % COLORS.length]
  return (
    <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

// ─── MODAL SHEET ─────────────────────────────────────────────
export function Modal({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode
}) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ─── INPUT ────────────────────────────────────────────────────
export function Input({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <input className={`input${error ? ' error' : ''}`} {...props} />
      {error && <div className="input-error">{error}</div>}
    </div>
  )
}

export function Textarea({ label, error, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <textarea className={`input${error ? ' error' : ''}`} rows={4} {...props} />
      {error && <div className="input-error">{error}</div>}
    </div>
  )
}

// ─── TOAST ────────────────────────────────────────────────────
type ToastMsg = { id: number; text: string; type: 'default' | 'success' | 'error' }
let addToastFn: ((text: string, type?: ToastMsg['type']) => void) | null = null
export const toast = {
  show: (text: string, type: ToastMsg['type'] = 'default') => addToastFn?.(text, type),
  success: (text: string) => addToastFn?.(text, 'success'),
  error: (text: string) => addToastFn?.(text, 'error'),
}
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  useEffect(() => {
    addToastFn = (text, type = 'default') => {
      const id = Date.now()
      setToasts(t => [...t, { id, text, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
    }
  }, [])
  return (
    <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>)}
    </div>
  )
}

// ─── SPINNER ─────────────────────────────────────────────────
export function Spinner({ dark }: { dark?: boolean }) {
  return <div className={`spinner${dark ? ' spinner-dark' : ''}`} />
}

// ─── EMPTY STATE ─────────────────────────────────────────────
export function EmptyState({ icon, title, sub, action }: {
  icon: string; title: string; sub?: string; action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action && <button className="btn btn-primary" style={{ marginTop: 16, width: 'auto' }} onClick={action.onClick}>{action.label}</button>}
    </div>
  )
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────
export function Confirm({ message, onConfirm, onCancel, danger }: {
  message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" style={{ borderRadius: 24 }}>
        <div className="modal-body" style={{ padding: '24px 20px' }}>
          <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, textAlign: 'center' }}>{message}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
            <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
