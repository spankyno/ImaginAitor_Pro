export function Slider({
  label, value, min, max, step = 1, onChange,
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}
