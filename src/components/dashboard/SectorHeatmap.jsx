import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { KRW, pct } from './utils'

function squarify(items, x, y, w, h) {
  const total = items.reduce((s, i) => s + i.cap, 0)
  const scale = (w * h) / total
  const data = items.map((i) => ({ ...i, area: i.cap * scale }))
  const result = []
  layout(data, [], x, y, w, h, result)
  return result
}

function layout(remaining, row, x, y, w, h, out) {
  if (!remaining.length) {
    if (row.length) placeRow(row, x, y, w, h, out)
    return
  }
  const shortSide = Math.min(w, h)
  const next = remaining[0]
  const tryRow = [...row, next]
  if (row.length === 0 || worst(tryRow, shortSide) <= worst(row, shortSide)) {
    layout(remaining.slice(1), tryRow, x, y, w, h, out)
  } else {
    const used = placeRow(row, x, y, w, h, out)
    if (w >= h) layout(remaining, [], x + used, y, w - used, h, out)
    else layout(remaining, [], x, y + used, w, h - used, out)
  }
}

function worst(row, side) {
  if (!row.length) return Infinity
  const sum = row.reduce((s, i) => s + i.area, 0)
  const max = Math.max(...row.map((i) => i.area))
  const min = Math.min(...row.map((i) => i.area))
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
}

function placeRow(row, x, y, w, h, out) {
  const sum = row.reduce((s, i) => s + i.area, 0)
  const horiz = w >= h
  const thick = sum / (horiz ? h : w)
  let off = 0
  for (const item of row) {
    const len = item.area / thick
    if (horiz) {
      out.push({ ...item, x, y: y + off, w: thick, h: len })
      off += len
    } else {
      out.push({ ...item, x: x + off, y, w: len, h: thick })
      off += len
    }
  }
  return thick
}

const colorFor = (p) => {
  const v = Math.max(-4, Math.min(4, p)) / 4
  if (v >= 0) return `color-mix(in oklab, var(--up) ${28 + v * 65}%, var(--bg-card))`
  return `color-mix(in oklab, var(--down) ${28 + -v * 65}%, var(--bg-card))`
}

export default function SectorHeatmap({ data = [] }) {
  const [size, setSize] = useState({ w: 800, h: 360 })
  const [tip, setTip] = useState(null) // { item, x, y } in container-local coords
  const [tipSize, setTipSize] = useState({ w: 0, h: 0 })
  const ref = useRef()
  const tipRef = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width)
        setSize((prev) => (prev.w === w ? prev : { w, h: 360 }))
      }
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const items = useMemo(() => {
    if (!data.length || !size.w) return []
    const sorted = [...data].filter((d) => d.cap > 0).sort((a, b) => b.cap - a.cap)
    return squarify(sorted, 0, 0, size.w, size.h)
  }, [data, size.w, size.h])

  const handleMove = (it) => (e) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setTip({ item: it, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  // Measure actual tooltip size after render so the right/bottom flip uses the real width,
  // not a guess. Without this, the flip overshoots and the tip appears far from the cursor.
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return
    const r = tipRef.current.getBoundingClientRect()
    if (r.width !== tipSize.w || r.height !== tipSize.h) {
      setTipSize({ w: r.width, h: r.height })
    }
  })

  // Anchor the corner closest to the cursor and let CSS translate handle the rest.
  // Right-edge cells: tip's right edge sits PAD px left of cursor (no measurement-dependent gap).
  const tipStyle = (() => {
    if (!tip) return null
    const PAD = 12
    const flipX = tipSize.w > 0 && tip.x + tipSize.w + PAD > size.w
    const flipY = tipSize.h > 0 && tip.y + tipSize.h + PAD > 360
    return {
      left: flipX ? tip.x - PAD : tip.x + PAD,
      top: flipY ? tip.y - PAD : tip.y + PAD,
      transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
      visibility: tipSize.w === 0 ? 'hidden' : 'visible',
    }
  })()

  return (
    <div
      ref={ref}
      className="treemap"
      style={{ position: 'relative', width: '100%', height: 360, borderRadius: 16 }}
    >
      {items.map((it) => {
        const big = it.w > 110 && it.h > 60
        const med = it.w > 70 && it.h > 40
        const tipText = `${it.name} · ${pct(it.pct)} · ${KRW(it.cap)}`
        return (
          <div
            key={it.name}
            className="treemap-cell"
            aria-label={tipText}
            onMouseEnter={handleMove(it)}
            onMouseMove={handleMove(it)}
            onMouseLeave={() => setTip(null)}
            style={{
              position: 'absolute',
              left: it.x,
              top: it.y,
              width: it.w - 2,
              height: it.h - 2,
              background: colorFor(it.pct),
              cursor: 'pointer',
              transition: 'filter 200ms',
              overflow: 'hidden',
              padding: big ? '12px 14px' : med ? '8px 10px' : '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--rui-font-body)',
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '0.16px',
                fontSize: big ? 14 : med ? 12 : 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {it.name}
            </div>
            {(big || med) && (
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                <div
                  className="num"
                  style={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: big ? 22 : 15,
                    letterSpacing: '-0.4px',
                  }}
                >
                  {pct(it.pct)}
                </div>
                {big && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500 }}>
                    {KRW(it.cap)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {tip && (
        <div ref={tipRef} className="treemap-tip" role="tooltip" style={tipStyle}>
          <span className="t-name">{tip.item.name}</span>
          <span className={'t-pct num ' + (tip.item.pct >= 0 ? 'up' : 'down')}>{pct(tip.item.pct)}</span>
          <span className="t-cap num">{KRW(tip.item.cap)}</span>
        </div>
      )}
    </div>
  )
}
