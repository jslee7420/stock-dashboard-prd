export default function Sparkline({ values, color, width = 140, height = 36 }) {
  if (!values?.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = width / (values.length - 1)
  const norm = (v) => height - ((v - min) / (max - min || 1)) * (height - 4) - 2
  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${norm(v)}`)
    .join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
