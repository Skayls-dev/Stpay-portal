import React, { useId, useMemo, useRef, useState, type SVGProps } from 'react'

export interface SequenceActor {
  id: string
  label: string
  color?: string
  bgColor?: string
  type?: 'participant' | 'actor' | 'database'
}

export interface SequenceMessage {
  from: string
  to: string
  label: string
  type?: 'sync' | 'return' | 'async' | 'note'
  noteText?: string
  color?: string
}

export interface SequenceGroup {
  label: string
  type: 'section' | 'loop' | 'alt' | 'group'
  messages: SequenceMessage[]
  altBranches?: { label: string; messages: SequenceMessage[] }[]
}

export type SequenceStep = SequenceMessage | SequenceGroup

export interface SequenceDiagramProps {
  actors: SequenceActor[]
  steps: SequenceStep[]
  title?: string
  height?: number
}

type ActivationSegment = {
  actorId: string
  startY: number
  endY: number
}

type RenderContext = {
  actorX: Record<string, number>
  markerIds: {
    filledEnd: string
    filledStart: string
    openEnd: string
  }
  diagramWidth: number
}

const FALLBACK_COLORS = {
  orange: '#FF6600',
  bgRaised: '#FFFDF9',
  borderSoft: '#E9E3D6',
  textPrimary: '#1E1E1E',
  textMuted: '#756E62',
  green: '#1A7A40',
  blue: '#1769E0',
  red: '#C02020',
}

const LAYOUT = {
  minWidth: 600,
  sidePadding: 52,
  actorGap: 180,
  actorBoxWidth: 136,
  actorBoxHeight: 44,
  topPadding: 24,
  titleHeight: 24,
  lifelineTopGap: 16,
  bottomPadding: 30,
  messageStep: 42,
  noteStep: 62,
  groupHeaderHeight: 24,
  branchLabelHeight: 18,
  groupInnerPadding: 12,
}

function isGroup(step: SequenceStep): step is SequenceGroup {
  return typeof (step as SequenceGroup).type === 'string' && Array.isArray((step as SequenceGroup).messages)
}

function cssVar(name: string, fallback: string) {
  return `var(${name}, ${fallback})`
}

function wrapTextByWord(text: string, maxChars = 32): string[] {
  if (!text.trim()) return ['']
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }

    if (current) lines.push(current)
    if (word.length > maxChars) {
      lines.push(word.slice(0, maxChars - 1) + '…')
      current = ''
    } else {
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

function pickGroupTone(type: SequenceGroup['type']) {
  if (type === 'loop') {
    return {
      stroke: cssVar('--green', FALLBACK_COLORS.green),
      fill: 'rgba(26, 122, 64, 0.05)',
      label: cssVar('--green', FALLBACK_COLORS.green),
    }
  }
  if (type === 'alt') {
    return {
      stroke: cssVar('--blue', FALLBACK_COLORS.blue),
      fill: 'rgba(23, 105, 224, 0.05)',
      label: cssVar('--blue', FALLBACK_COLORS.blue),
    }
  }
  if (type === 'section') {
    return {
      stroke: cssVar('--orange', FALLBACK_COLORS.orange),
      fill: 'rgba(255, 102, 0, 0.05)',
      label: cssVar('--orange', FALLBACK_COLORS.orange),
    }
  }

  return {
    stroke: cssVar('--text-muted', FALLBACK_COLORS.textMuted),
    fill: 'rgba(117, 110, 98, 0.06)',
    label: cssVar('--text-primary', FALLBACK_COLORS.textPrimary),
  }
}

function arrowPropsFor(
  messageType: SequenceMessage['type'] | undefined,
  markerIds: RenderContext['markerIds'],
): SVGProps<SVGLineElement> {
  if (messageType === 'return') {
    return {
      strokeDasharray: '6 4',
      markerEnd: `url(#${markerIds.openEnd})`,
    }
  }

  if (messageType === 'async') {
    return {
      markerStart: `url(#${markerIds.filledStart})`,
      markerEnd: `url(#${markerIds.filledEnd})`,
    }
  }

  return {
    markerEnd: `url(#${markerIds.filledEnd})`,
  }
}

function mergeActivationSegments(segments: ActivationSegment[]): ActivationSegment[] {
  const byActor = new Map<string, ActivationSegment[]>()
  for (const seg of segments) {
    const arr = byActor.get(seg.actorId) ?? []
    arr.push(seg)
    byActor.set(seg.actorId, arr)
  }

  const merged: ActivationSegment[] = []
  for (const [actorId, arr] of byActor.entries()) {
    const sorted = [...arr].sort((a, b) => a.startY - b.startY)
    let current: ActivationSegment | null = null

    for (const seg of sorted) {
      if (!current) {
        current = { ...seg }
        continue
      }

      if (seg.startY <= current.endY + 6) {
        current.endY = Math.max(current.endY, seg.endY)
      } else {
        merged.push(current)
        current = { ...seg }
      }
    }

    if (current) {
      merged.push(current)
    }

    for (const m of merged) {
      if (m.actorId !== actorId) continue
    }
  }

  return merged
}

function renderMessage(
  message: SequenceMessage,
  y: number,
  context: RenderContext,
): { elements: React.ReactNode[]; activations: ActivationSegment[]; nextY: number } {
  const { actorX, markerIds, diagramWidth } = context
  const type = message.type ?? 'sync'
  const color = message.color ?? cssVar('--orange', FALLBACK_COLORS.orange)
  const elements: React.ReactNode[] = []
  const activations: ActivationSegment[] = []

  if (type === 'note') {
    const anchorId = message.to || message.from
    const anchorX = actorX[anchorId]
    if (anchorX == null) return { elements, activations, nextY: y + LAYOUT.noteStep }

    const noteWidth = 220
    const noteHeight = 50
    const noteX = Math.min(anchorX + 16, diagramWidth - noteWidth - 16)
    const noteY = y - 22
    const fold = 14
    const textLines = wrapTextByWord(message.noteText || message.label, 34)

    elements.push(
      <g key={`note-${anchorId}-${y}`}>
        <path
          d={`M ${noteX} ${noteY} H ${noteX + noteWidth - fold} L ${noteX + noteWidth} ${noteY + fold} V ${noteY + noteHeight} H ${noteX} Z`}
          fill="#FFF7CC"
          stroke={cssVar('--border-soft', FALLBACK_COLORS.borderSoft)}
          strokeWidth={1.2}
        />
        <path
          d={`M ${noteX + noteWidth - fold} ${noteY} V ${noteY + fold} H ${noteX + noteWidth}`}
          fill="none"
          stroke={cssVar('--border-soft', FALLBACK_COLORS.borderSoft)}
          strokeWidth={1.2}
        />
        <text
          x={noteX + 10}
          y={noteY + 18}
          fill={cssVar('--text-primary', FALLBACK_COLORS.textPrimary)}
          fontFamily="'DM Mono', monospace"
          fontSize={11}
        >
          {textLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={noteX + 10} dy={index === 0 ? 0 : 13}>
              {line}
            </tspan>
          ))}
        </text>
      </g>,
    )

    activations.push({ actorId: anchorId, startY: y - 12, endY: y + 14 })
    return { elements, activations, nextY: y + LAYOUT.noteStep }
  }

  const fromX = actorX[message.from]
  const toX = actorX[message.to]
  if (fromX == null || toX == null) {
    return { elements, activations, nextY: y + LAYOUT.messageStep }
  }

  if (fromX === toX) {
    const loopWidth = 34
    const loopHeight = 18
    const yTop = y - 10
    const yBottom = yTop + loopHeight

    elements.push(
      <path
        key={`self-line-${message.from}-${y}`}
        d={`M ${fromX} ${yTop} H ${fromX + loopWidth} V ${yBottom} H ${fromX}`}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeDasharray={type === 'return' ? '6 4' : undefined}
        markerEnd={type === 'return' ? `url(#${markerIds.openEnd})` : `url(#${markerIds.filledEnd})`}
      />,
    )

    elements.push(
      <text
        key={`self-label-${message.from}-${y}`}
        x={fromX + loopWidth * 0.5}
        y={yTop - 4}
        textAnchor="middle"
        fill={cssVar('--text-primary', FALLBACK_COLORS.textPrimary)}
        fontFamily="'DM Mono', monospace"
        fontSize={11}
      >
        {message.label}
      </text>,
    )

    activations.push({ actorId: message.from, startY: y - 14, endY: y + 20 })
    return { elements, activations, nextY: y + LAYOUT.messageStep }
  }

  const baseLineProps = arrowPropsFor(type, markerIds)

  elements.push(
    <line
      key={`line-${message.from}-${message.to}-${y}`}
      x1={fromX}
      y1={y}
      x2={toX}
      y2={y}
      stroke={color}
      strokeWidth={1.7}
      {...baseLineProps}
    />,
  )

  const labelX = fromX + (toX - fromX) / 2
  elements.push(
    <text
      key={`label-${message.from}-${message.to}-${y}`}
      x={labelX}
      y={y - 8}
      textAnchor="middle"
      fill={cssVar('--text-primary', FALLBACK_COLORS.textPrimary)}
      fontFamily="'DM Mono', monospace"
      fontSize={11}
    >
      {message.label}
    </text>,
  )

  activations.push({ actorId: message.from, startY: y - 14, endY: y + 14 })
  activations.push({ actorId: message.to, startY: y - 14, endY: y + 14 })

  return { elements, activations, nextY: y + LAYOUT.messageStep }
}

function renderMessages(
  messages: SequenceMessage[],
  startY: number,
  context: RenderContext,
): { elements: React.ReactNode[]; activations: ActivationSegment[]; nextY: number } {
  const elements: React.ReactNode[] = []
  const activations: ActivationSegment[] = []

  let cursorY = startY
  for (let i = 0; i < messages.length; i += 1) {
    const result = renderMessage(messages[i], cursorY, context)
    elements.push(...result.elements)
    activations.push(...result.activations)
    cursorY = result.nextY
  }

  return { elements, activations, nextY: cursorY }
}

function renderGroup(
  group: SequenceGroup,
  startY: number,
  context: RenderContext,
): { elements: React.ReactNode[]; activations: ActivationSegment[]; nextY: number } {
  const elements: React.ReactNode[] = []
  const activations: ActivationSegment[] = []

  const boxX = 22
  const boxWidth = context.diagramWidth - boxX * 2
  const tone = pickGroupTone(group.type)
  let cursorY = startY + LAYOUT.groupHeaderHeight + LAYOUT.groupInnerPadding

  if (group.type === 'alt') {
    const branches = [{ label: group.label || 'alt', messages: group.messages }, ...(group.altBranches ?? [])]

    for (let i = 0; i < branches.length; i += 1) {
      const branch = branches[i]
      const branchLabel = i === 0 ? `alt ${branch.label}` : branch.label || 'else'

      elements.push(
        <text
          key={`alt-branch-label-${startY}-${i}`}
          x={boxX + 10}
          y={cursorY + 11}
          fill={cssVar('--text-muted', FALLBACK_COLORS.textMuted)}
          fontFamily="'DM Mono', monospace"
          fontSize={10}
        >
          {branchLabel}
        </text>,
      )

      cursorY += LAYOUT.branchLabelHeight
      const branchResult = renderMessages(branch.messages, cursorY, context)
      elements.push(...branchResult.elements)
      activations.push(...branchResult.activations)
      cursorY = branchResult.nextY + 2

      if (i < branches.length - 1) {
        elements.push(
          <line
            key={`alt-sep-${startY}-${i}`}
            x1={boxX + 6}
            y1={cursorY}
            x2={boxX + boxWidth - 6}
            y2={cursorY}
            stroke={tone.stroke}
            strokeDasharray="4 4"
            strokeWidth={1}
          />,
        )
        cursorY += 12
      }
    }
  } else {
    const result = renderMessages(group.messages, cursorY, context)
    elements.push(...result.elements)
    activations.push(...result.activations)
    cursorY = result.nextY
  }

  const boxHeight = Math.max(58, cursorY - startY + LAYOUT.groupInnerPadding)

  elements.unshift(
    <rect
      key={`group-bg-${startY}`}
      x={boxX}
      y={startY}
      width={boxWidth}
      height={boxHeight}
      rx={9}
      fill={tone.fill}
      stroke={tone.stroke}
      strokeWidth={1.2}
      strokeDasharray="6 4"
    />,
  )

  elements.unshift(
    <text
      key={`group-label-${startY}`}
      x={boxX + 10}
      y={startY + 16}
      fill={tone.label}
      fontFamily="'DM Mono', monospace"
      fontSize={11}
      fontWeight={700}
    >
      {group.label}
    </text>,
  )

  return { elements, activations, nextY: startY + boxHeight + 12 }
}

function resolveCssVariableValue(varName: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value || fallback
}

function normalizeExportSvg(svgSource: string) {
  const replacements: Array<{ key: string; value: string }> = [
    { key: 'var(--orange, #FF6600)', value: resolveCssVariableValue('--orange', FALLBACK_COLORS.orange) },
    { key: 'var(--bg-raised, #FFFDF9)', value: resolveCssVariableValue('--bg-raised', FALLBACK_COLORS.bgRaised) },
    { key: 'var(--border-soft, #E9E3D6)', value: resolveCssVariableValue('--border-soft', FALLBACK_COLORS.borderSoft) },
    { key: 'var(--text-primary, #1E1E1E)', value: resolveCssVariableValue('--text-primary', FALLBACK_COLORS.textPrimary) },
    { key: 'var(--text-muted, #756E62)', value: resolveCssVariableValue('--text-muted', FALLBACK_COLORS.textMuted) },
    { key: 'var(--green, #1A7A40)', value: resolveCssVariableValue('--green', FALLBACK_COLORS.green) },
    { key: 'var(--blue, #1769E0)', value: resolveCssVariableValue('--blue', FALLBACK_COLORS.blue) },
    { key: 'var(--red, #C02020)', value: resolveCssVariableValue('--red', FALLBACK_COLORS.red) },
  ]

  let output = svgSource
  for (const item of replacements) {
    output = output.replaceAll(item.key, item.value)
  }

  return output
}

export default function SequenceDiagram({ actors, steps, title, height }: SequenceDiagramProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const markerScope = useId().replace(/:/g, '')
  const markerIds = useMemo(
    () => ({
      filledEnd: `seq-filled-end-${markerScope}`,
      filledStart: `seq-filled-start-${markerScope}`,
      openEnd: `seq-open-end-${markerScope}`,
    }),
    [markerScope],
  )

  const actorX = useMemo(() => {
    const centers: Record<string, number> = {}
    actors.forEach((actor, idx) => {
      centers[actor.id] = LAYOUT.sidePadding + idx * LAYOUT.actorGap
    })
    return centers
  }, [actors])

  const diagramWidth = useMemo(() => {
    const lastCenter = LAYOUT.sidePadding + Math.max(actors.length - 1, 0) * LAYOUT.actorGap
    const desired = lastCenter + LAYOUT.sidePadding
    return Math.max(LAYOUT.minWidth, desired)
  }, [actors.length])

  const titleOffset = title ? LAYOUT.titleHeight : 0
  const actorTopY = LAYOUT.topPadding + titleOffset
  const lifelineStartY = actorTopY + LAYOUT.actorBoxHeight + LAYOUT.lifelineTopGap

  const rendered = useMemo(() => {
    const context: RenderContext = {
      actorX,
      markerIds,
      diagramWidth,
    }

    const stepElements: React.ReactNode[] = []
    const activationRaw: ActivationSegment[] = []

    let cursorY = lifelineStartY + 18

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i]
      if (isGroup(step)) {
        const result = renderGroup(step, cursorY, context)
        stepElements.push(...result.elements)
        activationRaw.push(...result.activations)
        cursorY = result.nextY
      } else {
        const result = renderMessage(step, cursorY, context)
        stepElements.push(...result.elements)
        activationRaw.push(...result.activations)
        cursorY = result.nextY
      }
    }

    const baseHeight = cursorY + LAYOUT.bottomPadding
    const finalHeight = Math.max(height ?? 0, baseHeight)

    return {
      elements: stepElements,
      activationSegments: mergeActivationSegments(activationRaw),
      svgHeight: finalHeight,
    }
  }, [actorX, diagramWidth, height, lifelineStartY, markerIds, steps])

  const handleExportPng = async () => {
    if (!svgRef.current || isExporting) return

    setIsExporting(true)
    try {
      const serialized = new XMLSerializer().serializeToString(svgRef.current)
      const normalized = normalizeExportSvg(serialized)
      const blob = new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)

      const img = new Image()
      img.decoding = 'async'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Unable to load SVG for export'))
        img.src = blobUrl
      })

      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(rendered.svgHeight > 0 ? diagramWidth * scale : diagramWidth)
      canvas.height = Math.ceil(rendered.svgHeight * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')

      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.fillStyle = '#FFFDF9'
      ctx.fillRect(0, 0, diagramWidth, rendered.svgHeight)
      ctx.drawImage(img, 0, 0, diagramWidth, rendered.svgHeight)

      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `sequence-diagram-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Sequence diagram PNG export failed', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (actors.length === 0) {
    return (
      <div className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-raised)] p-4 text-[13px] text-[var(--text-muted)]">
        Sequence diagram requires at least one actor.
      </div>
    )
  }

  return (
    <div className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-raised)] p-3 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="min-h-[20px] text-[13px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {title || 'Sequence Diagram'}
        </div>
        <button
          type="button"
          onClick={handleExportPng}
          disabled={isExporting}
          className="inline-flex h-8 items-center rounded-[9px] border border-[var(--border-soft)] bg-white px-3 text-[11px] font-semibold text-[var(--text-primary)] transition hover:border-[var(--orange)] hover:text-[var(--orange)] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {isExporting ? 'Export...' : 'Exporter PNG'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-[var(--border-soft)] bg-[#FFFDF9]">
        <svg
          ref={svgRef}
          width={diagramWidth}
          height={rendered.svgHeight}
          viewBox={`0 0 ${diagramWidth} ${rendered.svgHeight}`}
          role="img"
          aria-label={title || 'Sequence diagram'}
        >
          <defs>
            <marker
              id={markerIds.filledEnd}
              viewBox="0 0 10 10"
              markerWidth="7"
              markerHeight="7"
              refX="9"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={cssVar('--orange', FALLBACK_COLORS.orange)} />
            </marker>

            <marker
              id={markerIds.filledStart}
              viewBox="0 0 10 10"
              markerWidth="7"
              markerHeight="7"
              refX="1"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 10 0 L 0 5 L 10 10 z" fill={cssVar('--orange', FALLBACK_COLORS.orange)} />
            </marker>

            <marker
              id={markerIds.openEnd}
              viewBox="0 0 10 10"
              markerWidth="8"
              markerHeight="8"
              refX="9"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={cssVar('--orange', FALLBACK_COLORS.orange)} strokeWidth="1.2" />
            </marker>
          </defs>

          {title && (
            <text
              x={LAYOUT.sidePadding}
              y={LAYOUT.topPadding + 14}
              fill={cssVar('--text-primary', FALLBACK_COLORS.textPrimary)}
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontSize={13}
              fontWeight={700}
            >
              {title}
            </text>
          )}

          {actors.map((actor) => {
            const centerX = actorX[actor.id]
            const actorBoxX = centerX - LAYOUT.actorBoxWidth / 2
            const actorType = actor.type ?? 'participant'
            const actorBorder = actor.color ?? cssVar('--orange', FALLBACK_COLORS.orange)
            const actorBg = actor.bgColor ?? cssVar('--bg-raised', FALLBACK_COLORS.bgRaised)

            return (
              <g key={`actor-${actor.id}`}>
                <rect
                  x={actorBoxX}
                  y={actorTopY}
                  width={LAYOUT.actorBoxWidth}
                  height={LAYOUT.actorBoxHeight}
                  rx={10}
                  fill={actorBg}
                  stroke={actorBorder}
                  strokeWidth={1.3}
                />

                {actorType === 'database' && (
                  <g>
                    <ellipse cx={centerX} cy={actorTopY + 12} rx={18} ry={6.5} fill="none" stroke={actorBorder} strokeWidth={1.1} />
                    <line x1={centerX - 18} y1={actorTopY + 12} x2={centerX - 18} y2={actorTopY + 22} stroke={actorBorder} strokeWidth={1.1} />
                    <line x1={centerX + 18} y1={actorTopY + 12} x2={centerX + 18} y2={actorTopY + 22} stroke={actorBorder} strokeWidth={1.1} />
                    <ellipse cx={centerX} cy={actorTopY + 22} rx={18} ry={6.5} fill="none" stroke={actorBorder} strokeWidth={1.1} />
                  </g>
                )}

                {actorType === 'actor' && (
                  <g>
                    <circle cx={centerX} cy={actorTopY + 12} r={5.5} fill="none" stroke={actorBorder} strokeWidth={1.1} />
                    <line x1={centerX} y1={actorTopY + 17.5} x2={centerX} y2={actorTopY + 27} stroke={actorBorder} strokeWidth={1.1} />
                    <line x1={centerX - 6} y1={actorTopY + 21.5} x2={centerX + 6} y2={actorTopY + 21.5} stroke={actorBorder} strokeWidth={1.1} />
                  </g>
                )}

                <text
                  x={centerX}
                  y={actorTopY + 35}
                  textAnchor="middle"
                  fill={cssVar('--text-primary', FALLBACK_COLORS.textPrimary)}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontSize={12}
                  fontWeight={700}
                >
                  {actor.label}
                </text>
              </g>
            )
          })}

          {actors.map((actor) => {
            const x = actorX[actor.id]
            return (
              <line
                key={`lifeline-${actor.id}`}
                x1={x}
                y1={lifelineStartY}
                x2={x}
                y2={rendered.svgHeight - LAYOUT.bottomPadding + 8}
                stroke={cssVar('--text-muted', FALLBACK_COLORS.textMuted)}
                strokeWidth={1}
                strokeDasharray="3 5"
                opacity={0.7}
              />
            )
          })}

          {rendered.activationSegments.map((activation, index) => {
            const x = actorX[activation.actorId]
            if (x == null) return null

            return (
              <rect
                key={`activation-${activation.actorId}-${activation.startY}-${index}`}
                x={x - 4}
                y={activation.startY}
                width={8}
                height={Math.max(10, activation.endY - activation.startY)}
                rx={4}
                fill="rgba(255, 102, 0, 0.15)"
                stroke={cssVar('--orange', FALLBACK_COLORS.orange)}
                strokeWidth={1}
              />
            )
          })}

          {rendered.elements}
        </svg>
      </div>
    </div>
  )
}
