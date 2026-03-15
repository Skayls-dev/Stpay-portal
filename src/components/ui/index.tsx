import type { ReactNode } from 'react'
import { useMemo } from 'react'

type ClassValue = string | false | null | undefined

const cn = (...values: ClassValue[]) => values.filter(Boolean).join(' ')

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return <div className={cn('rounded-card border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</div>
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  }

  return (
    <button
      {...props}
      className={cn('inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50', variants[variant], className)}
    />
  )
}

interface BadgeProps {
  children: ReactNode
  color?: 'emerald' | 'amber' | 'red' | 'slate' | 'blue'
  className?: string
}

export function Badge({ children, color = 'slate', className }: BadgeProps) {
  const palette = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  }

  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', palette[color], className)}>{children}</span>
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return <input {...props} className={cn('w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand/20 focus:ring', className)} />
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select {...props} className={cn('w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand/20 focus:ring', className)}>
      {children}
    </select>
  )
}

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-card border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
        {children}
      </div>
    </div>
  )
}

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

export function DataTable<T>({ columns, data, rowKey, onRowClick, emptyText = 'Aucune donnee' }: DataTableProps<T>) {
  const colCount = useMemo(() => columns.length, [columns.length])

  return (
    <div className="overflow-x-auto rounded-card border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn('px-4 py-3 font-semibold', column.className)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-6 text-center text-slate-500">{emptyText}</td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn('border-t border-slate-100', onRowClick ? 'cursor-pointer hover:bg-slate-50' : '')}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3 text-slate-700', column.className)}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
