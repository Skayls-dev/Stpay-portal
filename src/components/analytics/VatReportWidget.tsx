import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { vatReportApi } from '../../lib/api/modules'

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const PAGE_SIZE = 20

function fmtXaf(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XAF'
}

function Skeleton() {
  return (
    <div className="panel animate-pulse space-y-3 p-6">
      <div className="h-5 w-48 rounded bg-[var(--bg-subtle)]" />
      <div className="h-24 rounded bg-[var(--bg-subtle)]" />
      <div className="h-64 rounded bg-[var(--bg-subtle)]" />
    </div>
  )
}

export default function VatReportWidget() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth() // 1-based prev month

  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(defaultMonth)
  const [page, setPage] = useState(1)

  const years = Array.from({ length: 3 }, (_, i) => currentYear - 2 + i)

  const { data, isLoading } = useQuery({
    queryKey: ['vat-report', year, month],
    queryFn: () => vatReportApi.get(year, month),
    staleTime: 120_000,
    enabled: year > 0 && month > 0,
  })

  // Reset page when period changes
  const handleYearChange = (v: number) => { setYear(v); setPage(1) }
  const handleMonthChange = (v: number) => { setMonth(v); setPage(1) }

  const lines = data?.lines ?? []
  const totalPages = Math.max(1, Math.ceil(lines.length / PAGE_SIZE))
  const pagedLines = lines.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-header flex flex-wrap items-center gap-3 justify-between">
        <div>
          <span className="panel-title">Déclaration TVA</span>
          <span className="ml-2 text-[11px] text-[var(--text-muted)]">Taux 19,25% (Cameroun)</span>
        </div>

        {/* Period selectors */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => handleMonthChange(Number(e.target.value))}
            className="rounded border border-[var(--border-soft)] bg-[var(--bg-raised)] px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none"
          >
            {MONTHS.map((label, idx) => (
              <option key={idx + 1} value={idx + 1}>{label}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={e => handleYearChange(Number(e.target.value))}
            className="rounded border border-[var(--border-soft)] bg-[var(--bg-raised)] px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading && <Skeleton />}

        {!isLoading && data && (
          <>
            {/* Summary card */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] overflow-hidden">
              {/* Title row */}
              <div className="bg-[var(--bg-subtle)] px-4 py-2.5 flex flex-wrap items-center gap-2 justify-between">
                <span className="font-semibold text-[var(--text-primary)] text-sm">
                  Rapport TVA — {data.summary.periodLabel}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {data.summary.periodFrom} → {data.summary.periodTo}
                </span>
              </div>

              {/* Merchant info */}
              <div className="px-4 py-2 border-b border-[var(--border-soft)] text-xs text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-primary)]">{data.summary.merchantName}</span>
                {data.summary.merchantNiu && (
                  <span className="ml-2">• NIU : {data.summary.merchantNiu}</span>
                )}
                {data.summary.merchantAddress && (
                  <span className="ml-2">• {data.summary.merchantAddress}</span>
                )}
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-3 divide-x divide-[var(--border-soft)]">
                <div className="px-4 py-3">
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">CA TTC</div>
                  <div className="font-bold text-[var(--text-primary)] text-sm">{fmtXaf(data.summary.totalTtc)}</div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">CA HT</div>
                  <div className="font-bold text-[var(--text-primary)] text-sm">{fmtXaf(data.summary.totalHt)}</div>
                </div>
                <div className="px-4 py-3 bg-amber-50">
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">TVA collectée</div>
                  <div className="font-bold text-sm" style={{ color: '#d4380d' }}>{fmtXaf(data.summary.totalVat)}</div>
                  <div className="text-[10px] text-amber-700 mt-0.5">(à reverser)</div>
                </div>
              </div>

              {/* Footer row */}
              <div className="bg-[var(--bg-subtle)] px-4 py-1.5 text-xs text-[var(--text-muted)] flex flex-wrap gap-3">
                <span>{data.summary.transactionCount} transaction{data.summary.transactionCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>Taux {data.summary.vatRate}</span>
                <span>•</span>
                <span>Généré le {data.summary.generatedAt}</span>
              </div>
            </div>

            {/* No transactions */}
            {lines.length === 0 && (
              <p className="text-center text-sm text-[var(--text-muted)] py-6">
                Aucune transaction sur cette période.
              </p>
            )}

            {/* Lines table */}
            {lines.length > 0 && (
              <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-soft)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Réf ST Pay</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-muted)]">Opérateur</th>
                      <th className="px-3 py-2 text-right font-medium text-[var(--text-muted)]">TTC</th>
                      <th className="px-3 py-2 text-right font-medium text-[var(--text-muted)]">HT</th>
                      <th className="px-3 py-2 text-right font-medium text-[var(--text-muted)]">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLines.map((line, i) => (
                      <tr
                        key={line.transactionRef || i}
                        className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--bg-subtle)] transition-colors"
                      >
                        <td className="px-3 py-2 text-[var(--text-muted)]">{line.date}</td>
                        <td className="px-3 py-2 font-mono text-[var(--text-primary)]">{line.transactionRef}</td>
                        <td className="px-3 py-2 text-[var(--text-primary)]">{line.provider}</td>
                        <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                          {new Intl.NumberFormat('fr-FR').format(line.amountTtc)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--text-muted)]">
                          {new Intl.NumberFormat('fr-FR').format(line.amountHt)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium" style={{ color: '#d4380d' }}>
                          {new Intl.NumberFormat('fr-FR').format(line.vatAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded px-3 py-1 text-xs border border-[var(--border-soft)] disabled:opacity-40 hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      ← Précédent
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded px-3 py-1 text-xs border border-[var(--border-soft)] disabled:opacity-40 hover:bg-[var(--bg-overlay)] transition-colors"
                    >
                      Suivant →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Export button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => vatReportApi.downloadHtml(year, month)}
                title="Ouvrir dans le navigateur et imprimer (Ctrl+P) pour obtenir un PDF"
                className="rounded px-4 py-2 text-sm font-medium text-white border border-[var(--orange)] bg-[var(--orange)] hover:opacity-90 transition-opacity"
              >
                ⬇ Télécharger (HTML → imprimer en PDF)
              </button>
            </div>

            {/* Disclaimer */}
            <div className="rounded-[var(--radius-md)] bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              Ce relevé est indicatif. Vérifiez les montants avec votre comptable avant toute déclaration DGI.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
