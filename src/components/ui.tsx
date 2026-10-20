import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CompetenceStatus } from '../../shared/api'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-card p-5 ${className}`}>{children}</section>
}

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  secondary: 'border border-line bg-card hover:bg-card-muted',
  ghost: 'hover:bg-card-muted',
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50'

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} {...props} />
}

export function ButtonLink({ to, variant = 'primary', children }: { to: string; variant?: Variant; children: ReactNode }) {
  return (
    <Link to={to} className={`${BUTTON_BASE} ${VARIANTS[variant]}`}>
      {children}
    </Link>
  )
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-lg border border-ko/30 bg-ko-soft px-4 py-3 text-sm text-ko">{message}</p>
}

export function Loading() {
  return <p className="py-10 text-center text-sm text-ink-muted">Chargement…</p>
}

export const STATUS_META: Record<CompetenceStatus, { icon: string; label: string; className: string }> = {
  valide: { icon: '✅', label: 'validée seul', className: 'text-ok' },
  'a-defendre': { icon: '🟠', label: 'explication à défendre', className: 'text-warn' },
  fragile: { icon: '🟡', label: 'fragile', className: 'text-warn' },
  'en-cours': { icon: '🔄', label: 'en cours', className: 'text-accent' },
  'a-venir': { icon: '⏳', label: 'à venir', className: 'text-ink-muted' },
}

export function StatusTag({ status }: { status: CompetenceStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${meta.className}`} title={meta.label}>
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  )
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      rows={3}
      {...props}
    />
  )
}
