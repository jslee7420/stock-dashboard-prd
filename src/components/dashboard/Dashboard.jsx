import { useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from './Topbar'
import HeroSummary from './HeroSummary'
import FilterBar from './FilterBar'
import SignalTable from './SignalTable'
import SectorHeatmap from './SectorHeatmap'
import DetailPanel from './DetailPanel'
import { useSignals } from './useSignals'

const formatStamp = (isoOrDate) => {
  if (!isoOrDate) return '—'
  const d = new Date(isoOrDate)
  if (isNaN(d.getTime())) return '—'
  const yy = String(d.getFullYear()).slice(2)
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${yy}/${mo}/${da} ${hh}:${mm}`
}

const sortKeyForBasis = (basis) => (basis === 'qty' ? 'netBuyQty3d' : 'netBuy3d')
const isBasisSortKey = (key) => key === 'netBuy3d' || key === 'netBuyQty3d'

export default function Dashboard() {
  const { signals, marketSummary, sectorPerf, updatedAt, status, error, refresh, trigger } = useSignals()

  const [theme, setTheme] = useState('dark')
  const [basis, setBasis] = useState('amt')
  const [market, setMarket] = useState('kospi')
  const [investor, setInvestor] = useState('dual')
  const category = market + '-' + investor + (basis === 'qty' ? '-qty' : '')
  const [selectedCode, setSelectedCode] = useState(null)
  const [sort, setSort] = useState({ key: 'netBuy3d', dir: 'desc' })
  const [topN, setTopN] = useState(10)

  // Reset basis-specific sort key only — preserve user's sort on shared keys (price, changePct)
  const [prevBasis, setPrevBasis] = useState(basis)
  if (prevBasis !== basis) {
    setPrevBasis(basis)
    if (isBasisSortKey(sort.key)) {
      setSort({ key: sortKeyForBasis(basis), dir: 'desc' })
    }
  }

  // Theme toggles at runtime; density/emphasis are static one-shots
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  useEffect(() => {
    document.documentElement.setAttribute('data-density', 'comfortable')
    document.documentElement.setAttribute('data-emphasis', 'strong')
  }, [])

  const data = useMemo(() => (signals[category] || []).slice(0, topN), [signals, category, topN])

  // Cross-category lookup map for search-driven detail panel.
  // 같은 종목이 dual 카테고리에 들어 있으면 dual 항목을 우선 (외인+기관 합산 정보 포함).
  const stockByCode = useMemo(() => {
    const map = new Map()
    for (const s of Object.values(signals).flat()) {
      const cur = map.get(s.code)
      if (!cur || (s.dual && !cur.dual)) map.set(s.code, s)
    }
    return map
  }, [signals])

  const selected = useMemo(
    () => (selectedCode ? stockByCode.get(selectedCode) ?? null : null),
    [stockByCode, selectedCode],
  )

  // Esc closes detail panel
  useEffect(() => {
    if (!selectedCode) return
    const onKey = (e) => { if (e.key === 'Escape') setSelectedCode(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedCode])

  const lastUpdatedDisplay = formatStamp(updatedAt)
  const refreshing = status === 'loading' || status === 'triggering'
  // 새로고침 = 항상 크론 트리거(~40초). 5분 쿨다운이면 trigger() 내부에서 캐시 재조회로 폴백.
  const handleRefresh = useCallback(() => {
    if (refreshing) return
    trigger()
  }, [refreshing, trigger])

  return (
    <div className={'app' + (selected ? ' has-detail' : '')}>
      <Topbar
        theme={theme}
        setTheme={setTheme}
        marketSummary={marketSummary}
        lastUpdated={lastUpdatedDisplay}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        candidates={stockByCode}
        onSelectStock={setSelectedCode}
      />
      <div className="main">
        <div className="section-head" style={{ marginTop: 0, justifyContent: 'space-between' }}>
          <div className="meta" aria-live="polite">
            {status === 'loading' && '데이터 불러오는 중…'}
            {status === 'triggering' && '데이터 생성 중… (약 40초 소요)'}
            {status === 'error' && `오류: ${error}`}
            {status === 'empty' && '데이터 없음 — 새로고침 버튼을 눌러 생성'}
            {status === 'ready' && `최근 업데이트 ${lastUpdatedDisplay} KST`}
            {status === 'idle' && '대기 중'}
          </div>
          <div className="meta">
            3일 연속 순매수 · {basis === 'qty' ? '수량 기준' : '금액 기준'} 상위 {topN}종목
          </div>
        </div>

        <HeroSummary activeCategory={category} signalData={data} />
        <FilterBar
          basis={basis}
          setBasis={setBasis}
          market={market}
          setMarket={setMarket}
          investor={investor}
          setInvestor={setInvestor}
          topN={topN}
          setTopN={setTopN}
          count={data.length}
        />
        {data.length === 0 && status === 'ready' ? (
          <div className="empty">선택한 카테고리에 해당하는 종목이 없습니다.</div>
        ) : (
          <SignalTable
            data={data}
            selectedCode={selectedCode}
            onSelect={(s) => setSelectedCode(s.code)}
            sort={sort}
            setSort={setSort}
            basis={basis}
          />
        )}

        <div className="section-head">
          <h2>업종별 등락률</h2>
          <div className="meta">시총 가중 평균 · KRX</div>
        </div>
        <SectorHeatmap data={sectorPerf} />

        <div style={{ height: 24 }} />
      </div>
      {selected && <DetailPanel stock={selected} chartStyle="candle" onClose={() => setSelectedCode(null)} />}
    </div>
  )
}
