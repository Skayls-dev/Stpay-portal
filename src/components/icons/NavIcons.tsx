// src/components/icons/NavIcons.tsx
import React from 'react'

type P = { className?: string }

export function IconGrid({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9"/>
      <rect x="8" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".5"/>
      <rect x="1" y="8" width="5" height="5" rx="1.2" fill="currentColor" opacity=".5"/>
      <rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" opacity=".5"/>
    </svg>
  )
}

export function IconList({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 4.5h11M1.5 7h7M1.5 9.5h4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCard({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3.5" width="12" height="8" rx="1.8" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 6.5h2M4 9h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="10" cy="7.5" r="1.3" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

export function IconChart({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 11L4.5 7.5l2.5 1.5 2.5-4 2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconWebhook({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export function IconUser({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="4.5" r="2.2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 12c0-2.2 2.5-4 5.5-4s5.5 1.8 5.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconHealth({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 7h1.5l1-2 2 4 1-2H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconProfile({ className }: P) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 11c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconLogout({ className }: P) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M8.5 2h3a1 1 0 011 1v7a1 1 0 01-1 1h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M5.5 9L8 6.5 5.5 4M8 6.5H1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconSearch({ className }: P) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

export function IconPlus({ className }: P) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconArrowUp({ className }: P) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M4.5 8V2M2 4.5l2.5-2.5 2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconArrowDown({ className }: P) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M4.5 2v6M2 4.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconClose({ className }: P) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCopy({ className }: P) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 8V1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}
