import { useEffect, useRef, useState } from 'react'
import CandleChart from './CandleChart'
import StockLogo from './StockLogo'
import { KRW, signed, pct } from './utils'

const PERIOD_FOR_RANGE = {
  day: 'daily',
  week: 'weekly',
  month: 'monthly',
  '3m': 'daily',
  '1y': 'monthly',
}

const formatNaverDate = (yyyymmdd) => {
  if (!yyyymmdd || yyyymmdd.length < 8) return yyyymmdd
  return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`
}

const MIN_WIDTH = 320
const MAX_WIDTH = 900

export default function DetailPanel({ stock, chartStyle = 'candle', onClose, width = 420, setWidth }) {
  const [range, setRange] = useState('day')
  const [candles, setCandles] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [flow, setFlow] = useState([])
  const [flowLoading, setFlowLoading] = useState(false)
  // Live quote: signal stocks already carry price/marketCap, search-selected stocks fetch on demand.
  const [live, setLive] = useState({
    price: stock.price, change: stock.change, changePct: stock.changePct, marketCap: stock.marketCap, loading: false,
  })
  const closeRef = useRef(null)
  useEffect(() => { closeRef.current?.focus() }, [stock.code])

  // Sync live state when stock changes; fetch quote for non-signal stocks.
  useEffect(() => {
    setLive({
      price: stock.price, change: stock.change, changePct: stock.changePct, marketCap: stock.marketCap,
      loading: stock.price == null,
    })
    if (stock.price != null) return
    let cancelled = false
    fetch(`/api/stock/quote?code=${stock.code}&market=${stock.market}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j.success) {
          setLive({ price: j.price, change: j.change, changePct: j.changePct, marketCap: j.marketCap, loading: false })
        } else {
          setLive((s) => ({ ...s, loading: false }))
        }
      })
      .catch(() => { if (!cancelled) setLive((s) => ({ ...s, loading: false })) })
    return () => { cancelled = true }
  }, [stock.code, stock.market, stock.price, stock.change, stock.changePct, stock.marketCap])

  const dir = (live.changePct ?? 0) >= 0 ? 'up' : 'down'

  // Fetch OHLCV when stock or range changes (data-fetching effect — setState-in-effect is the standard pattern)
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartLoading(true)
    fetch(`/api/stock/daily?code=${stock.code}&period=${PERIOD_FOR_RANGE[range]}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j.success && Array.isArray(j.ohlcv)) {
          let rows = j.ohlcv
          if (range === '3m') rows = rows.slice(-66)
          else if (range === '1y') rows = rows.slice(-12)
          setCandles(rows.map((d) => ({ date: d.date, open: d.open, high: d.high, low: d.low, close: d.close })))
        } else {
          setCandles([])
        }
      })
      .catch(() => { if (!cancelled) setCandles([]) })
      .finally(() => { if (!cancelled) setChartLoading(false) })
    return () => { cancelled = true }
  }, [stock.code, range])

  // Fetch 5-day investor flow — depends on live.price (set after quote fetch for non-signal stocks)
  useEffect(() => {
    if (live.price == null) { setFlow([]); return }
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlowLoading(true)
    fetch(`/api/stock/investor?code=${stock.code}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j.success && Array.isArray(j.data)) {
          setFlow(j.data.map((d) => ({
            date: formatNaverDate(d.date),
            foreign: d.foreign * live.price,
            inst: d.institutional * live.price,
            indiv: -(d.foreign + d.institutional) * live.price, // crude proxy: 실제 개인 = -(외인+기관+기타)
          })))
        } else {
          setFlow([])
        }
      })
      .catch(() => { if (!cancelled) setFlow([]) })
      .finally(() => { if (!cancelled) setFlowLoading(false) })
  }, [stock.code, live.price])

  const onResizeStart = (e) => {
    if (!setWidth) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const onMove = (ev) => {
      const dx = startX - ev.clientX // dragging left widens the panel
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + dx))
      setWidth(next)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div
      className="detail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
    >
      <div
        className="detail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="패널 너비 조정"
        onMouseDown={onResizeStart}
      />
      <button ref={closeRef} className="detail-close" onClick={onClose} aria-label="상세 패널 닫기">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="detail-head">
        <StockLogo code={stock.code} fallback={stock.iconText} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="stock-name" id="detail-title">
            {stock.name}
            {stock.dual && <span className="dual-ribbon">동시</span>}
          </div>
          <div className="stock-meta">{stock.code} · {stock.market} · {stock.sector}</div>
        </div>
      </div>

      <div className="price-block">
        <div className={'price-now num ' + dir}>
          {live.price != null
            ? live.price.toLocaleString('ko-KR')
            : (live.loading ? '…' : '—')}
        </div>
        {live.change != null && live.changePct != null ? (
          <div className={'price-delta ' + dir}>
            {live.change >= 0 ? '▲' : '▼'} {Math.abs(live.change).toLocaleString('ko-KR', { maximumFractionDigits: 0 })} ({pct(live.changePct)})
          </div>
        ) : (
          <div className="price-delta" style={{ color: 'var(--fg-muted)' }}>—</div>
        )}
      </div>

      <div className="range-tabs" role="tablist" aria-label="차트 기간">
        {[['day', '일'], ['week', '주'], ['month', '월'], ['3m', '3M'], ['1y', '1Y']].map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={range === k}
            className={range === k ? 'active' : ''}
            onClick={() => setRange(k)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        {chartLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)' }}>차트 로드 중…</div>
        ) : candles.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-muted)' }}>차트 데이터 없음</div>
        ) : (
          <CandleChart candles={candles} theme={chartStyle} height={220} />
        )}
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="k">시가총액</div><div className="v num">{live.marketCap == null ? '—' : KRW(live.marketCap)}</div></div>
        <div className="metric"><div className="k">3일 누적 순매수</div><div className={'v num ' + (stock.netBuy3d == null ? '' : 'up')}>{stock.netBuy3d == null ? '—' : signed(stock.netBuy3d, KRW)}</div></div>
        <div className="metric"><div className="k">시총 대비</div><div className="v num">{stock.netBuyRatio == null ? '—' : (<>{stock.netBuyRatio.toFixed(2)}<span style={{ fontSize: 13, color: 'var(--fg-muted)', marginLeft: 4 }}>%</span></>)}</div></div>
        <div className="metric"><div className="k">연속일</div><div className="v num">{stock.consecDays == null ? '—' : (<>{stock.consecDays}<span style={{ fontSize: 13, color: 'var(--fg-muted)', marginLeft: 4 }}>일</span></>)}</div></div>
      </div>

      <div className="invest-flow">
        <h4>최근 5일 수급 (개인은 외인+기관 합산 추정)</h4>
        <div className="flow-row head">
          <div>일자</div><div>외국인</div><div>기관</div><div>개인</div>
        </div>
        {flowLoading ? (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--fg-muted)' }}>수급 데이터 로드 중…</div>
        ) : flow.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--fg-muted)' }}>수급 데이터 없음</div>
        ) : (
          flow.map((f, i) => (
            <div key={i} className="flow-row">
              <div className="date">{f.date}</div>
              <div className={'v ' + (f.foreign >= 0 ? 'up' : 'down')}>{signed(f.foreign, KRW)}</div>
              <div className={'v ' + (f.inst >= 0 ? 'up' : 'down')}>{signed(f.inst, KRW)}</div>
              <div className={'v ' + (f.indiv >= 0 ? 'up' : 'down')}>{signed(f.indiv, KRW)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
