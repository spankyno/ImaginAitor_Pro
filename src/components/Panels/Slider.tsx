import { NumberField } from './NumberField'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  /** Show value × scale in the text box (100 → percent, image width → px). */
  scale?: number
  decimals?: number
  unit?: string
}

export function Slider({
  label, value, min, max, step = 1, onChange, scale = 1, decimals = 0, unit,
}: SliderProps) {
  const shown = (value * scale).toFixed(decimals)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="text-text-muted">{label}</span>
        <NumberField
          label={`${label} (valor numérico)`}
          value={value}
          min={min}
          max={max}
          step={step}
          scale={scale}
          decimals={decimals}
          unit={unit}
          onChange={onChange}
        />
      </div>
      <input
        type="range"
        min={min}
        max={Math.max(min, max)}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={`${shown}${unit ?? ''}`}
        className="w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      />
    </div>
  )
}
