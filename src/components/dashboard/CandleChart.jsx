import { memo } from 'react'

function CandleChart({ candles, theme = 'candle', width = 380, height = 220 }) {
  if (!candles?.length) return null
  const pad = { l: 8, r: 44, t: 8, b: 22 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b
  const min = Math.min(...candles.map((c) => c.low))
  const max = Math.max(...candles.map((c) => c.high))
  const range = max - min || 1
  const cw = W / candles.length
  const y = (v) => pad.t + H - ((v - min) / range) * H

  const upColor = 'var(--up)'
  const downColor = 'var(--down)'

  const ticks = [0, 0.33, 0.66, 1].map((t) => min + t * range)

  const closePath = candles
    .map((c, i) => {
      const cx = pad.l + i * cw + cw / 2
      return `${i === 0 ? 'M' : 'L'} ${cx} ${y(c.close)}`
    })
    .join(' ')
  const areaPath =
    closePath +
    ` L ${pad.l + (candles.length - 1) * cw + cw / 2} ${pad.t + H} L ${pad.l + cw / 2} ${pad.t + H} Z`
  const lastClose = candles[candles.length - 1].close
  const firstClose = candles[0].close
  const trendUp = lastClose >= firstClose
  const lineColor = trendUp ? upColor : downColor

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(t)} x2={pad.l + W} y2={y(t)} stroke="var(--border-soft)" strokeWidth="1" />
          <text x={pad.l + W + 6} y={y(t) + 3} fontSize="10" fill="var(--fg-subtle)" fontFamily="var(--rui-font-display)">
            {Math.round(t).toLocaleString()}
          </text>
        </g>
      ))}

      {theme === 'candle' &&
        candles.map((c, i) => {
          const cx = pad.l + i * cw + cw / 2
          const up = c.close >= c.open
          const color = up ? upColor : downColor
          const bw = Math.max(2, cw * 0.6)
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1" />
              <rect
                x={cx - bw / 2}
                y={y(Math.max(c.open, c.close))}
                width={bw}
                height={Math.max(1, Math.abs(y(c.open) - y(c.close)))}
                fill={color}
              />
            </g>
          )
        })}

      {theme === 'line' && (
        <path d={closePath} stroke={lineColor} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      )}

      {theme === 'area' && (
        <g>
          <defs>
            <linearGradient id="area-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#area-grad)" />
          <path d={closePath} stroke={lineColor} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      )}

      <g>
        <line
          x1={pad.l}
          x2={pad.l + W}
          y1={y(lastClose)}
          y2={y(lastClose)}
          stroke={lineColor}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.5"
        />
        <rect x={pad.l + W + 2} y={y(lastClose) - 9} width={40} height={16} rx="3" fill={lineColor} />
        <text
          x={pad.l + W + 22}
          y={y(lastClose) + 3}
          fontSize="10"
          fontWeight="600"
          fill="#fff"
          textAnchor="middle"
          fontFamily="var(--rui-font-display)"
        >
          {Math.round(lastClose).toLocaleString()}
        </text>
      </g>
    </svg>
  )
}

export default memo(CandleChart)
