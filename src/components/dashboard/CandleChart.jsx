import { memo, useEffect, useRef, useState } from 'react'

function fmtDate(yyyymmdd, useYear) {
  if (!yyyymmdd || yyyymmdd.length < 8) return ''
  const yy = yyyymmdd.slice(2, 4)
  const mm = yyyymmdd.slice(4, 6)
  const dd = yyyymmdd.slice(6, 8)
  return useYear ? `${yy}/${mm}` : `${mm}/${dd}`
}

function CandleChart({ candles, theme = 'candle', height = 220 }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width)
        setWidth((prev) => (prev === w ? prev : w))
      }
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  if (!candles?.length) return <div ref={wrapRef} style={{ width: '100%', height }} />
  if (width === 0) return <div ref={wrapRef} style={{ width: '100%', height }} />

  const pad = { l: 8, r: 48, t: 8, b: 24 }
  const W = Math.max(40, width - pad.l - pad.r)
  const H = height - pad.t - pad.b
  const min = Math.min(...candles.map((c) => c.low))
  const max = Math.max(...candles.map((c) => c.high))
  const range = max - min || 1
  const cw = W / candles.length
  const y = (v) => pad.t + H - ((v - min) / range) * H

  const upColor = 'var(--up)'
  const downColor = 'var(--down)'

  const ticks = [0, 0.33, 0.66, 1].map((t) => min + t * range)

  // X-axis labels: ~6 evenly spaced (incl. first/last); switch to YY/MM if span > 1 year
  const firstYear = candles[0]?.date?.slice(0, 4)
  const lastYear = candles[candles.length - 1]?.date?.slice(0, 4)
  const useYear = firstYear && lastYear && firstYear !== lastYear
  const targetCount = Math.min(6, candles.length)
  const step = Math.max(1, Math.round((candles.length - 1) / (targetCount - 1 || 1)))
  const xLabels = []
  for (let i = 0; i < candles.length; i += step) xLabels.push(i)
  if (xLabels[xLabels.length - 1] !== candles.length - 1) xLabels.push(candles.length - 1)

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
    <div ref={wrapRef} style={{ width: '100%' }}>
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
          <rect x={pad.l + W + 2} y={y(lastClose) - 9} width={44} height={16} rx="3" fill={lineColor} />
          <text
            x={pad.l + W + 24}
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

        {/* X-axis date labels */}
        <g>
          {xLabels.map((idx) => {
            const cx = pad.l + idx * cw + cw / 2
            // anchor first/last to keep labels inside chart area
            const anchor = idx === 0 ? 'start' : idx === candles.length - 1 ? 'end' : 'middle'
            const label = fmtDate(candles[idx].date, useYear)
            return (
              <text
                key={idx}
                x={cx}
                y={height - 6}
                fontSize="10"
                fill="var(--fg-subtle)"
                fontFamily="var(--rui-font-display)"
                textAnchor={anchor}
              >
                {label}
              </text>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

export default memo(CandleChart)
