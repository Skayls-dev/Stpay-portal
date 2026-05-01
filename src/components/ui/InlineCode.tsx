// src/components/ui/InlineCode.tsx
// Inline code pill — consistent styling for short code spans within text.

import React from 'react'

type InlineCodeProps = { children: React.ReactNode; className?: string }

export default function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code className={`rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[0.875em]${className ? ` ${className}` : ''}`}>
      {children}
    </code>
  )
}
