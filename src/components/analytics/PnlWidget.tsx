import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../../lib/api/client'

interface MerchantPnl {
  currency: string
  periodFrom: string
  periodTo: string
  grossRevenue: number
  operatorFees: number
  stPayFees: number
  refunds: number
  escrowReserved: number
  netAvailable: number
  alreadySettled: number
  transactionCount: number
  refundCount: number
  successRate: number
}

const PERIODS = [7, 30, 90] as const

function formatXaf(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF'
}

function SkeletonRow({ strong = false }: { strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="h-4 rounded bg-[var(--bg-raised)]/70 animate-pulse w-40" />
      <div className={`h-4 rounded bg-[var(--bg-raised)]/70 animate-pulse ${strong ? 'w-36 h-6' : 'w-32'}`} />
    </div>
  )
}

function MoneyLine({
  label,
  amount,
  tone,
  sign,
  bold = false,
  large = false,
}: {
  label: string
  amount: number
  tone: 'positive' | 'negative' | 'warning' | 'info'
  sign: '+' | '-'
  bold?: boolean
  large?: boolean
}) {
  const valueTone = {
    positive: 'text-green-500',
    negative: 'text-red-400',
    warning: 'text-orange-400',
    info: 'text-blue-400',
  }[tone]

  const mutedTone = {
    positive: 'text-green-500/85',
    negative: 'text-red-400/75',
    warning: 'text-orange-400/75',
    info: 'text-blue-400/75',
  }[tone]

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={`font-display ${bold ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
        {label}
      </span>
      <span
        className={`font-display tabular-nums ${large ? 'text-2xl font-extrabold' : bold ? 'text-base font-bold' : 'text-sm font-semibold'} ${
          bold ? valueTone : mutedTone
        }`}
      >
        {sign}
        {formatXaf(Math.max(amount, 0))}
      </span>
    </div>
  )
}

function KpiPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[var(--border-soft)] bg-[var(--bg-raised)] px-4 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="font-display text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

export default function PnlWidget() {
  const [days, setDays] = useState<number>(30)

  const { data, isLoading } = useQuery({
    queryKey: ['merchant-pnl', days],
    queryFn: () => client.get(`/api/analytics/pnl?days=${days}`).then((r) => r.data as MerchantPnl),
    staleTime: 30_000,
  })

  const periodLabel = data
    ? `${new Date(data.periodFrom).toLocaleDateString('fr-FR')} - ${new Date(data.periodTo).toLocaleDateString('fr-FR')}`
    : 'Periode en cours'

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-raised)] p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">Compte de resultat</h3>
          <p className="text-xs text-[var(--text-muted)]">{periodLabel}</p>
        </div>

        <div className="inline-flex w-fit rounded-full border border-[var(--border-soft)] bg-[var(--bg-raised)] p-1">
          {PERIODS.map((value) => {
            const active = value === days
            return (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--orange)] text-black'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {value}j
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-soft)] bg-black/10 p-4 md:p-5">
        {isLoading || !data ? (
          <div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <div className="my-2 border-t border-[var(--border-soft)]" />
            <SkeletonRow strong />
            <SkeletonRow />
          </div>
        ) : (
          <div>
            <MoneyLine label="Encaissements bruts" amount={data.grossRevenue} tone="positive" sign="+" />
            <MoneyLine label="- Frais operateurs" amount={data.operatorFees} tone="negative" sign="-" />
            <MoneyLine label="- Frais ST Pay" amount={data.stPayFees} tone="negative" sign="-" />
            <MoneyLine label="- Remboursements" amount={data.refunds} tone="negative" sign="-" />
            <MoneyLine label="- Escrow en suspens" amount={data.escrowReserved} tone="warning" sign="-" />
            <div className="my-2 border-t-2 border-[var(--border-soft)]" />
            <MoneyLine label="Net disponible" amount={data.netAvailable} tone="positive" sign="+" bold large />
            <MoneyLine label="Deja reverse" amount={data.alreadySettled} tone="info" sign="-" />
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <KpiPill
          label="Taux de succes"
          value={isLoading || !data ? '...' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(data.successRate)} %`}
        />
        <KpiPill
          label="Transactions"
          value={isLoading || !data ? '...' : new Intl.NumberFormat('fr-FR').format(data.transactionCount)}
        />
        <KpiPill
          label="Remboursements"
          value={isLoading || !data ? '...' : new Intl.NumberFormat('fr-FR').format(data.refundCount)}
        />
      </div>
    </section>
  )
}
