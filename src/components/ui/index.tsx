// src/components/ui/index.tsx
// ST Pay design-system primitives — dark theme.

import React, { ReactNode, useMemo } from 'react'

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--bg-raised)] border border-[var(--border-soft)] rounded-[var(--radius-md)]',
        padding && 'p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeColor = 'emerald' | 'amber' | 'red' | 'slate' | 'blue'

interface BadgeProps {
  children: ReactNode
  color?: BadgeColor
  dot?: boolean
  className?: string
}

const BADGE_STYLES: Record<BadgeColor, string> = {
  emerald: 'bg-[var(--green-bg)]  text-[var(--green)]  ',
  amber:   'bg-[var(--amber-bg)]  text-[var(--amber)]  ',
  red:     'bg-[var(--red-bg)]    text-[var(--red)]    ',
  blue:    'bg-[var(--blue-bg)]   text-[var(--blue)]   ',
  slate:   'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
}

const DOT_COLORS: Record<BadgeColor, string> = {
  emerald: 'bg-[var(--green)]',
  amber:   'bg-[var(--amber)]',
  red:     'bg-[var(--red)]',
  blue:    'bg-[var(--blue)]',
  slate:   'bg-[var(--text-secondary)]',
}

export function Badge({ children, color = 'slate', dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
        BADGE_STYLES[color],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1 h-1 rounded-full flex-shrink-0', DOT_COLORS[color])} />
      )}
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:   'bg-[var(--gold)] text-[#0E0F14] font-semibold hover:bg-[var(--gold-bright)] border-transparent',
  secondary: 'bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] border-[var(--border-medium)]',
  ghost:     'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] border-[var(--border-medium)]',
  danger:    'bg-[var(--red-bg)] text-[var(--red)] hover:bg-red-900/20 border-red-900/20',
}

export function Button({ variant = 'primary', children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)]',
        'text-[12px] font-medium border transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-[var(--radius-sm)] border border-[var(--border-medium)]',
        'bg-[var(--bg-overlay)] text-[var(--text-primary)] text-sm px-3 py-2',
        'placeholder:text-[var(--text-muted)] outline-none',
        'focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20 transition',
        className,
      )}
    />
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-[var(--radius-sm)] border border-[var(--border-medium)]',
        'bg-[var(--bg-overlay)] text-[var(--text-primary)] text-sm px-3 py-2',
        'outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/20 transition',
        className,
      )}
    >
      {children}
    </select>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div className="w-full max-w-lg bg-[var(--bg-raised)] border border-[var(--border-medium)]
                      rounded-[var(--radius-lg)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold font-display text-[var(--text-primary)]">
            {title}
          </h3>
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

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyText?: string
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyText = 'Aucune donnée',
}: DataTableProps<T>) {
  const colCount = useMemo(() => columns.length, [columns.length])

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--bg-raised)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--bg-overlay)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-t border-[var(--border-soft)] transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[var(--bg-overlay)]',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-2.5 text-[var(--text-primary)]', col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
