import { useMemo } from 'react'
import Sparkline from './Sparkline'
import { SIGNAL_CATEGORIES, KRW, signed } from './utils'

const seedFromString = (s) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

const buildSpark = (seed) => {
  let s = seed
  const rng = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const r = []
  let v = 100
  for (let i = 0; i < 20; i++) {
    v += (rng() - 0.4) * 6
    r.push(v)
  }
  return r
}

export default function HeroSummary({ activeCategory, signalData }) {
  const cat = SIGNAL_CATEGORIES.find((c) => c.id === activeCategory)
  const isQty = cat?.basis === 'qty'

  const aggregates = useMemo(() => {
    const len = signalData.length
    let totalNetBuy = 0, totalNetQty = 0, upCount = 0, sumConsec = 0, sumRatio = 0, ratioCount = 0
    for (const x of signalData) {
      totalNetBuy += x.netBuy3d
      totalNetQty += x.netBuyQty3d
      if (x.changePct >= 0) upCount += 1
      sumConsec += x.consecDays
      if (x.netBuyRatio != null) { sumRatio += x.netBuyRatio; ratioCount += 1 }
    }
    return {
      totalNetBuy, totalNetQty, upCount,
      avgConsec: len === 0 ? 0 : sumConsec / len,
      avgRatio:  ratioCount === 0 ? null : sumRatio / ratioCount,
    }
  }, [signalData])
  const { totalNetBuy, totalNetQty, upCount, avgConsec, avgRatio } = aggregates

  const spark = useMemo(() => buildSpark(seedFromString(activeCategory)), [activeCategory])

  if (!cat) return null

  return (
    <div className="hero-summary">
      <div className="hero-card">
        <div>
          <div className="label">{cat.market} · {cat.kind} 3일 연속 순매수</div>
          <div className="value num">
            {signalData.length}
            <span style={{ fontSize: 24, color: 'var(--fg-muted)', marginLeft: 8 }}>종목</span>
          </div>
        </div>
        <div className="delta-row">
          <span className="up">▲ {upCount}</span>
          <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>·</span>
          <span className="down">▼ {signalData.length - upCount}</span>
          {cat.dual && <span style={{ marginLeft: 'auto' }} className="dual-ribbon">동시매수</span>}
        </div>
      </div>

      <div className="hero-card">
        <div className="label">{isQty ? '3일 누적 순매수량' : '3일 누적 순매수액'}</div>
        {isQty ? (
          <div className="value num up" style={{ fontSize: 36 }}>
            {KRW(totalNetQty)}
            <span style={{ fontSize: 18, color: 'var(--fg-muted)', marginLeft: 6 }}>주</span>
          </div>
        ) : (
          <div className="value num up" style={{ fontSize: 36 }}>
            {signed(totalNetBuy, KRW)}
            <span style={{ fontSize: 18, color: 'var(--fg-muted)', marginLeft: 6 }}>원</span>
          </div>
        )}
        <div className="sparkline">
          <Sparkline values={spark} color="var(--up)" width={220} height={40} />
        </div>
      </div>

      <div className="hero-card investor signal-strength">
        <div>
          <div className="label">시그널 강도</div>
        </div>
        <div className="investor-row">
          <span className="investor-name">평균 연속일</span>
          <span className="investor-amt num">
            {avgConsec.toFixed(1)}
            <span style={{ color: 'var(--fg-muted)', fontSize: 14, marginLeft: 4 }}>일</span>
          </span>
        </div>
        <div className="investor-row">
          <span className="investor-name">시총 대비 평균</span>
          <span className="investor-amt num up">
            {avgRatio == null ? '—' : `+${avgRatio.toFixed(2)}`}
            {avgRatio != null && <span style={{ color: 'var(--fg-muted)', fontSize: 14, marginLeft: 4 }}>%</span>}
          </span>
        </div>
      </div>
    </div>
  )
}
