// src/components/ui/index.tsx
import React, { ReactNode, useMemo } from 'react'

function cn(...c: (string | undefined | false | null)[]) {
  return c.filter(Boolean).join(' ')
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className, padding = true }:
  { children: ReactNode; className?: string; padding?: boolean }) {
  return (
    <div className={cn(
      'bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--r-md)]',
      padding && 'p-4', className,
    )}>
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeColor = 'emerald' | 'amber' | 'red' | 'slate' | 'blue' | 'violet'

const BADGE: Record<BadgeColor, string> = {
  emerald: 'bg-[var(--green-bg)]  text-[var(--green)]',
  amber:   'bg-[var(--amber-bg)]  text-[var(--amber)]',
  red:     'bg-[var(--red-bg)]    text-[var(--red)]',
  blue:    'bg-[var(--blue-bg)]   text-[var(--blue)]',
  slate:   'bg-[var(--bg-hover)]  text-[var(--text-2)]',
  violet:  'bg-violet-100         text-violet-700',
}

const DOT: Record<BadgeColor, string> = {
  emerald: 'bg-[var(--green)]',
  amber:   'bg-[var(--amber)]',
  red:     'bg-[var(--red)]',
  blue:    'bg-[var(--blue)]',
  slate:   'bg-[var(--text-3)]',
  violet:  'bg-violet-500',
}

export function Badge({ children, color = 'slate', dot = false, className }:
  { children: ReactNode; color?: BadgeColor; dot?: boolean; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-[7px] py-[2px] rounded-full text-[10px] font-semibold',
      BADGE[color], className,
    )}>
      {dot && <span className={cn('w-1 h-1 rounded-full flex-shrink-0', DOT[color])} />}
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BTN: Record<BtnVariant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
}

export function Button({ variant = 'primary', children, className, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; children: ReactNode }) {
  return (
    <button {...props}
      className={cn(BTN[variant],
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}>
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={cn(
        'w-full rounded-[var(--r-sm)] border border-[var(--border-med)] px-3 py-2',
        'bg-[var(--bg-card)] text-[13px] text-[var(--text-1)]',
        'placeholder:text-[var(--text-4)] outline-none transition-all duration-100',
        'focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]',
        className,
      )}
    />
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ className, children, ...props }:
  React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props}
      className={cn(
        'w-full rounded-[var(--r-sm)] border border-[var(--border-med)] px-3 py-2',
        'bg-[var(--bg-card)] text-[13px] text-[var(--text-1)]',
        'outline-none transition-all duration-100',
        'focus:border-[var(--orange)] focus:shadow-[0_0_0_3px_rgba(255,102,0,0.10)]',
        className,
      )}>
      {children}
    </select>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, title, children, onClose }:
  { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-med)]
                      rounded-[var(--r-lg)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[var(--text-1)]">{title}</h3>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────
export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({ columns, data, rowKey, onRowClick, emptyText = 'Aucune donnée' }:
  { columns: DataTableColumn<T>[]; data: T[]; rowKey: (row: T) => string;
    onRowClick?: (row: T) => void; emptyText?: string }) {
  const colCount = useMemo(() => columns.length, [columns.length])
  return (
    <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--border)]
                    bg-[var(--bg-card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--bg-subtle)]">
          <tr>
            {columns.map((col) => (
              <th key={col.key}
                  className={cn('px-4 py-2.5 text-[10px] font-semibold uppercase',
                    'tracking-wider text-[var(--text-4)]', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colCount}
                  className="px-4 py-10 text-center text-[13px] text-[var(--text-3)]">
                {emptyText}
              </td>
            </tr>
          ) : data.map((row) => (
            <tr key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-t border-[var(--border-soft)] transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[var(--bg-subtle)]',
                )}>
              {columns.map((col) => (
                <td key={col.key}
                    className={cn('px-4 py-2.5 text-[var(--text-1)]', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
