import React, { ReactNode, useState } from 'react'

type CodeSnippetProps = {
  code: string
  title?: ReactNode
  copyText?: string
  className?: string
  preClassName?: string
  showCopy?: boolean
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export default function CodeSnippet({
  code,
  title = 'Exemple',
  copyText,
  className,
  preClassName,
  showCopy = true,
}: CodeSnippetProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText ?? code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={cn('rounded-[10px] border border-[#1e293b] overflow-hidden bg-[#0f172a]', className)}>
      {(title || showCopy) && (
        <div className="flex items-center justify-between gap-3 border-b border-[#1e293b] bg-[#111827] px-3 py-2">
          <span className="text-[10px] font-mono text-slate-400">{title}</span>
          {showCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-[5px] bg-[#1e293b] px-2 py-0.5 text-[10px] font-semibold transition-colors"
              style={{ color: copied ? '#4ade80' : '#94a3b8' }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          )}
        </div>
      )}
      <pre className={cn('m-0 overflow-x-auto p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-[#e2e8f0]', preClassName)}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
