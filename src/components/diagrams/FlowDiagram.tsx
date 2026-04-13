import React, { useEffect, useRef, useState } from 'react'

interface FlowDiagramProps {
  definition: string
  id: string
}

interface MermaidThemeVariables {
  primaryColor: string
  primaryBorderColor: string
  primaryTextColor: string
  secondaryColor: string
  lineColor: string
  fontSize: string
  fontFamily: string
}

interface MermaidInitializeConfig {
  startOnLoad?: boolean
  theme: 'base' | 'default' | 'dark' | 'forest' | 'neutral'
  securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox'
  themeVariables: MermaidThemeVariables
}

interface MermaidRenderResult {
  svg: string
  bindFunctions?: (element: Element) => void
}

interface MermaidApi {
  initialize: (config: MermaidInitializeConfig) => void
  render: (id: string, definition: string) => Promise<MermaidRenderResult>
}

declare global {
  interface Window {
    mermaid?: MermaidApi
  }
}

const MERMAID_CDN_URL = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'
const MERMAID_SCRIPT_SELECTOR = 'script[data-stpay-mermaid-loader="true"]'

let mermaidLoadPromise: Promise<MermaidApi> | null = null

function getOrCreateMermaidScript(): HTMLScriptElement {
  const existing = document.querySelector(MERMAID_SCRIPT_SELECTOR)
  if (existing instanceof HTMLScriptElement) {
    return existing
  }

  const script = document.createElement('script')
  script.src = MERMAID_CDN_URL
  script.async = true
  script.defer = true
  script.setAttribute('data-stpay-mermaid-loader', 'true')
  document.head.appendChild(script)
  return script
}

function loadMermaid(): Promise<MermaidApi> {
  if (window.mermaid) {
    return Promise.resolve(window.mermaid)
  }

  if (mermaidLoadPromise) {
    return mermaidLoadPromise
  }

  mermaidLoadPromise = new Promise<MermaidApi>((resolve, reject) => {
    const script = getOrCreateMermaidScript()

    const finish = () => {
      if (window.mermaid) {
        resolve(window.mermaid)
      } else {
        reject(new Error('Mermaid script loaded but API is unavailable.'))
      }
    }

    if (script.dataset.loaded === 'true') {
      finish()
      return
    }

    const onLoad = () => {
      script.dataset.loaded = 'true'
      cleanup()
      finish()
    }

    const onError = () => {
      cleanup()
      reject(new Error('Unable to load Mermaid from CDN.'))
    }

    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
  })

  return mermaidLoadPromise
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function setContainerMessage(container: HTMLDivElement, message: string, color: string): void {
  container.innerHTML = `<div style="padding: 14px; font-size: 13px; color: ${color};">${escapeHtml(message)}</div>`
}

export default function FlowDiagram({ definition, id }: FlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const renderDiagram = async () => {
      const container = containerRef.current
      if (!container) return

      setIsLoading(true)
      setError(null)
      setContainerMessage(container, 'Chargement du diagramme...', 'var(--text-muted, #756E62)')

      try {
        const mermaid = await loadMermaid()
        if (cancelled) return

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            primaryColor: '#FFF3E0',
            primaryBorderColor: '#FF6600',
            primaryTextColor: '#1A1510',
            secondaryColor: '#B3E5FC',
            lineColor: '#FF6600',
            fontSize: '13px',
            fontFamily: 'DM Mono, monospace',
          },
        })

        const renderId = `${id}-svg-${Date.now()}`
        const result = await mermaid.render(renderId, definition)
        if (cancelled) return

        container.innerHTML = result.svg
        if (result.bindFunctions) {
          result.bindFunctions(container)
        }
      } catch (renderError: unknown) {
        const message = renderError instanceof Error
          ? renderError.message
          : 'Erreur lors du rendu du diagramme.'

        if (!cancelled) {
          setError(message)
          setContainerMessage(container, `Erreur de rendu: ${message}`, 'var(--red, #C02020)')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void renderDiagram()

    return () => {
      cancelled = true
    }
  }, [definition, id])

  return (
    <div className="w-full">
      <div
        id={id}
        ref={containerRef}
        className="min-h-[120px] w-full overflow-x-auto rounded-[12px] border border-[var(--border-soft)] bg-[var(--bg-raised)]"
        role="img"
        aria-label="Diagramme Mermaid"
        aria-busy={isLoading}
      />
      {error && (
        <p className="mt-2 text-[11px] text-[var(--red)]" style={{ fontFamily: "'DM Mono', monospace" }}>
          {error}
        </p>
      )}
    </div>
  )
}
