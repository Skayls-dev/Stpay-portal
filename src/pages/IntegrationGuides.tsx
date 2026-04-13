// src/pages/IntegrationGuides.tsx
import React, { useRef, useState } from 'react'

export default function IntegrationGuides() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
        <div>
          <h1 className="text-[15px] font-bold text-[var(--text-1)] leading-none">
            Guides d'intégration
          </h1>
          <p className="text-[12px] text-[var(--text-3)] mt-1">
            Toutes les recettes d'intégration ST Pay — REST, webhooks, SDKs, cas d'usage avancés.
          </p>
        </div>
        <a
          href="/ALL_INTEGRATION_GUIDES.html"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-semibold
                     text-[var(--text-2)] border border-[var(--border)]
                     rounded-[6px] px-3 py-1.5 hover:bg-[var(--bg-subtle)]
                     transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M5 2H2.5A1.5 1.5 0 001 3.5v6A1.5 1.5 0 002.5 11h6A1.5 1.5 0 0010 9.5V7M7 1h4m0 0v4m0-4L5.5 6.5"
                  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ouvrir dans un onglet
        </a>
      </div>

      {/* ── iframe ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center
                          bg-[var(--bg)] text-[12px] text-[var(--text-3)]">
            Chargement des guides…
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/ALL_INTEGRATION_GUIDES.html"
          title="Guides d'intégration ST Pay"
          onLoad={() => setLoaded(true)}
          className="w-full h-full border-0"
          style={{ display: loaded ? 'block' : 'none' }}
        />
      </div>
    </div>
  )
}
