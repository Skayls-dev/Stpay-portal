import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../lib/api/auth'
import { useAuthStore } from '../stores/authStore'
import { useAuth } from '../hooks/useAuth'

type MerchantPsiGateProps = {
  standalone?: boolean
}

type PsiSection = {
  id: string
  title: string
  blocks: React.ReactNode[]
}

function formatInline(line: string) {
  return line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function parseTableRow(line: string) {
  return line
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean)
}

function parsePsiMarkdown(md: string) {
  const lines = md.split('\n')
  const title = (lines.find((l) => l.startsWith('# ')) || '# Politique de Sécurité de l\'Information').replace('# ', '').trim()
  const metadata: Array<{ label: string; value: string }> = []
  const sections: PsiSection[] = []
  let currentSection: PsiSection | null = null
  let listBuffer: { ordered: boolean; items: string[] } | null = null
  let tableBuffer: string[][] = []
  let key = 0

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = {
        id: 'introduction',
        title: 'Préambule',
        blocks: [],
      }
      sections.push(currentSection)
    }
    return currentSection
  }

  const flushList = () => {
    if (!listBuffer || listBuffer.items.length === 0) return
    const section = ensureSection()
    if (listBuffer.ordered) {
      section.blocks.push(
        <ol key={`ol-${key++}`} className="list-decimal space-y-2 pl-6 text-[13px] leading-6 text-[var(--text-2)]">
          {listBuffer.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ol>,
      )
    } else {
      section.blocks.push(
        <ul key={`ul-${key++}`} className="list-disc space-y-2 pl-6 text-[13px] leading-6 text-[var(--text-2)] marker:text-[var(--orange)]">
          {listBuffer.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>,
      )
    }
    listBuffer = null
  }

  const flushTable = () => {
    if (tableBuffer.length === 0) return
    const section = ensureSection()
    const rows = tableBuffer.filter((r) => !r.every((c) => /^[-: ]+$/.test(c)))
    if (rows.length > 0) {
      const [header, ...body] = rows
      section.blocks.push(
        <div key={`table-wrap-${key++}`} className="overflow-x-auto rounded-[10px] border border-[var(--border-med)] bg-[var(--bg-subtle)]">
          <table className="min-w-full border-collapse text-left text-[12px]">
            <thead>
              <tr>
                {header.map((cell, i) => (
                  <th
                    key={i}
                    className="border-b border-[var(--border-med)] bg-white px-3 py-2.5 font-semibold uppercase tracking-[0.03em] text-[var(--text-2)]"
                    dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex} className="align-top odd:bg-white even:bg-[var(--bg-subtle)]">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-t border-[var(--border-soft)] px-3 py-2 text-[var(--text-2)]"
                      dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    }
    tableBuffer = []
  }

  const flushAll = () => {
    flushList()
    flushTable()
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    const metadataMatch = line.match(/^\*\*(.+?):\*\*\s*(.+)$/)
    if (metadataMatch) {
      metadata.push({
        label: metadataMatch[1].trim(),
        value: metadataMatch[2].trim(),
      })
      continue
    }

    if (line.startsWith('## ')) {
      flushAll()
      const titleText = line.slice(3).trim()
      const sectionId = titleText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      currentSection = { id: sectionId || `section-${sections.length + 1}`, title: titleText, blocks: [] }
      sections.push(currentSection)
      continue
    }

    if (line.startsWith('### ')) {
      flushAll()
      const section = ensureSection()
      section.blocks.push(
        <h3 key={`h3-${key++}`} className="mt-4 text-[14px] font-bold text-[var(--text-1)]">
          {line.slice(4)}
        </h3>,
      )
      continue
    }

    if (line.startsWith('|')) {
      tableBuffer.push(parseTableRow(line))
      continue
    }

    if (tableBuffer.length > 0) {
      flushTable()
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      if (!listBuffer || !listBuffer.ordered) {
        flushList()
        listBuffer = { ordered: true, items: [] }
      }
      listBuffer.items.push(orderedMatch[1].trim())
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!listBuffer || listBuffer.ordered) {
        flushList()
        listBuffer = { ordered: false, items: [] }
      }
      listBuffer.items.push(line.slice(2).trim())
      continue
    }

    if (line.trim() === '') {
      flushList()
      continue
    }

    if (line === '---' || line.startsWith('# ')) {
      flushAll()
      continue
    }

    flushList()
    const section = ensureSection()
    section.blocks.push(
      <p
        key={`p-${key++}`}
        className="text-[13px] leading-7 text-[var(--text-2)]"
        dangerouslySetInnerHTML={{ __html: formatInline(line) }}
      />,
    )
  }

  flushAll()

  return { title, metadata, sections }
}

export default function MerchantPsiGate({ standalone = true }: MerchantPsiGateProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { login, setPsiAccepted } = useAuthStore()
  const [psiRaw, setPsiRaw] = useState<string>('')
  const parsed = parsePsiMarkdown(psiRaw)

  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetch('/PSI-STPAY-2025-001.md')
      .then((res) => {
        if (!res.ok) throw new Error('PSI_NOT_FOUND')
        return res.text()
      })
      .then((text) => setPsiRaw(text))
      .catch(() => {
        // Keep an empty fallback; parser will render a minimal structure.
        setPsiRaw('')
      })
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'merchant') return

    authApi
      .getMerchantPsiStatus()
      .then((res) => {
        if (res.psiAccepted) {
          setPsiAccepted(true)
          if (standalone) {
            navigate('/merchant', { replace: true })
          }
        }
      })
      .catch(() => {
        // Non-blocking: the guard remains based on local auth state.
      })
  }, [navigate, setPsiAccepted, standalone, user])

  const onAccept = async () => {
    if (!checked) {
      toast.error('Veuillez cocher la case pour continuer.')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.acceptMerchantPsi()
      login(res.user, res.token, res.apiKey)
      toast.success('Politique de sécurité acceptée.')
      if (standalone) {
        navigate('/merchant', { replace: true })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de valider la PSI')
    } finally {
      setLoading(false)
    }
  }

  const acceptanceCard = (
    <div className="rounded-[var(--r-md)] border border-[var(--orange-border)] bg-white p-4 md:p-5">
      <label className="flex items-start gap-3 text-[13px] text-[var(--text-2)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border-med)] accent-[var(--orange)]"
        />
        <span>
          J'ai lu et j'accepte la Politique de Sécurité de l'Information ST Pay (PSI-STPAY-2025-001).
          {' '}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="font-semibold text-[var(--orange-dark)] underline underline-offset-2"
          >
            Lire la PSI
          </button>
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAccept}
          disabled={!checked || loading}
          className="rounded-[8px] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--orange)' }}
        >
          {loading ? 'Validation...' : 'Accepter et accéder au portail'}
        </button>
        <p className="text-[12px] text-[var(--text-3)]">Cette action met à jour votre profil marchand et débloque l'accès au portail.</p>
      </div>
    </div>
  )

  return (
    <>
      {standalone ? (
        <div className="min-h-screen bg-[var(--bg-page)] px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto w-full max-w-5xl">{acceptanceCard}</div>
        </div>
      ) : (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
            <div className="w-full max-w-5xl">{acceptanceCard}</div>
          </div>
        </>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-3 md:p-6">
            <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[14px] border border-[var(--border-med)] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3 md:px-5">
                <div>
                  <h2 className="text-[15px] font-bold text-[var(--text-1)] md:text-[16px]">{parsed.title}</h2>
                  <p className="text-[12px] text-[var(--text-3)]">Consultation de la politique de sécurité</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-[8px] border border-[var(--border-med)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-2)] hover:bg-[var(--bg-subtle)]"
                >
                  Fermer
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-[1fr_300px] md:p-5">
                <div className="min-h-0 overflow-y-auto pr-1 md:pr-2">
                  <div className="space-y-6">
                    {parsed.sections.map((section) => (
                      <article key={`modal-${section.id}`} id={`modal-${section.id}`} className="rounded-[10px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-4 md:p-5">
                        <h3 className="text-[16px] font-extrabold text-[var(--text-1)] md:text-[17px]">{section.title}</h3>
                        <div className="mt-3 space-y-3">{section.blocks}</div>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="min-h-0 space-y-4 overflow-y-auto border-t border-[var(--border-soft)] pt-4 md:border-t-0 md:pt-0">
                  <div className="rounded-[var(--r-md)] border border-[var(--border-med)] bg-white p-4">
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-3)]">Détails du document</h3>
                    <dl className="mt-3 space-y-2.5">
                      {parsed.metadata.map((item) => (
                        <div key={`meta-${item.label}`} className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-2">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">{item.label}</dt>
                          <dd className="mt-1 text-[12px] font-medium leading-5 text-[var(--text-1)]">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="rounded-[var(--r-md)] border border-[var(--border-med)] bg-white p-4">
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-3)]">Sommaire</h3>
                    <nav className="mt-2.5 space-y-1.5">
                      {parsed.sections.map((section) => (
                        <a
                          key={`modal-toc-${section.id}`}
                          href={`#modal-${section.id}`}
                          className="block rounded-[7px] border border-transparent px-2 py-1.5 text-[12px] text-[var(--text-2)] transition-colors hover:border-[var(--orange-border)] hover:bg-[var(--orange-bg)] hover:text-[var(--orange-dark)]"
                        >
                          {section.title}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              </div>
            </div>
          </div>
      )}
    </>
  )
}
