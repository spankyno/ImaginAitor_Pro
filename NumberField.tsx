import { useState } from 'react'

interface NumberFieldProps {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  /** Multiplier between stored value and displayed value (e.g. 100 to show 0..1 as %, or image width to show px). */
  scale?: number
  /** Decimals kept in the displayed value. */
  decimals?: number
  unit?: string
  label: string
  className?: string
}

const fmt = (n: number, decimals: number) => String(Number(n.toFixed(decimals)))

/**
 * Numeric text box that stays in sync with whatever drives `value`
 * (slider, canvas handles, presets...). While the user types it keeps a
 * local draft; valid in-range numbers are applied live, anything else is
 * clamped on Enter/blur. Escape reverts.
 */
export function NumberField({
  value, onChange, min, max, step = 1, scale = 1, decimals = 0, unit, label, className = '',
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const dMin = min * scale
  const dMax = Math.max(min, max) * scale
  const clamp = (n: number) => Math.min(dMax, Math.max(dMin, n))
  const parse = (txt: string): number | null => {
    const n = Number(txt.replace(',', '.'))
    return txt.trim() === '' || !Number.isFinite(n) ? null : n
  }
  const emit = (displayed: number) => onChange(Number(displayed.toFixed(decimals)) / scale)

  const commit = () => {
    if (draft !== null) {
      const n = parse(draft)
      if (n !== null) emit(clamp(n))
    }
    setDraft(null)
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        min={dMin}
        max={dMax}
        step={step * scale}
        value={draft ?? fmt(value * scale, decimals)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = parse(e.target.value)
          if (n !== null && n >= dMin && n <= dMax) emit(n) // live preview only for valid values
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur() }
          if (e.key === 'Escape') { e.stopPropagation(); setDraft(null); e.currentTarget.blur() }
        }}
        onWheel={(e) => e.currentTarget.blur()}
        className="num-input w-[4.5rem] rounded-md border border-border-subtle bg-bg-panel-2 px-1.5 py-0.5 text-right text-xs tabular-nums text-text-primary outline-none focus:border-accent"
      />
      {unit && <span className="w-4 text-[10px] text-text-muted">{unit}</span>}
    </span>
  )
}
