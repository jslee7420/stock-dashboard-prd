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
  const [searchQuery, setSearchQuery] = useState('')

  // Clear search on category change so stale filters don't blank out a different universe
  const [prevCategory, setPrevCategory] = useState(category)
  if (prevCategory !== category) {
    setPrevCategory(category)
    setSearchQuery('')
  }

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

  const data = useMemo(() => {
    const list = signals[category] || []
    const q = searchQuery.trim().toLowerCase()
    if (q) return list.filter((s) => s.name.toLowerCase().includes(q) || s.code.includes(q))
    return list.slice(0, topN)
  }, [signals, category, topN, searchQuery])

  // Keep panel open across category swaps by promoting first row when current pick falls out
  const [prevCatTopN, setPrevCatTopN] = useState(category + ':' + topN)
  const catTopN = category + ':' + topN
  if (prevCatTopN !== catTopN) {
    setPrevCatTopN(catTopN)
    if (selectedCode && !data.find((s) => s.code === selectedCode)) {
      setSelectedCode(data[0]?.code ?? null)
    }
  }

  const selected = useMemo(
    () => (selectedCode ? data.find((s) => s.code === selectedCode) ?? null : null),
    [data, selectedCode],
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
  // 새로고침 동작:
  //  - 데이터 없음 (empty) → 크론 수동 트리거 (~40초)
  //  - 데이터 있음 (ready) → 캐시 재조회 (즉시)
  const handleRefresh = useCallback(() => {
    if (refreshing) return
    if (status === 'empty' || status === 'error') trigger()
    else refresh()
  }, [refreshing, status, refresh, trigger])

  return (
    <div className={'app' + (selected ? ' has-detail' : '')}>
      <Topbar
        theme={theme}
        setTheme={setTheme}
        marketSummary={marketSummary}
        lastUpdated={lastUpdatedDisplay}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
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
            {searchQuery.trim()
              ? `검색: "${searchQuery.trim()}" · ${data.length}건`
              : `3일 연속 순매수 · ${basis === 'qty' ? '수량 기준' : '금액 기준'} 상위 ${topN}종목`}
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
          <div className="empty">
            {searchQuery.trim()
              ? `"${searchQuery.trim()}" 검색 결과가 없습니다.`
              : '선택한 카테고리에 해당하는 종목이 없습니다.'}
          </div>
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
