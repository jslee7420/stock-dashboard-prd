import { useState, useCallback } from 'react'
import { Search, Loader2, Filter, ArrowUpDown, RotateCcw } from 'lucide-react'
import { KOSPI200_UNIQUE } from '../../lib/kospi200'
import { mockGetStockDaily } from '../../lib/mockData'
import { getStockDaily } from '../../lib/api'
import { calculateAllIndicators } from '../../lib/indicators'
import { evaluateAll } from '../../lib/scoring'
import useStore from '../../store/useStore'
import { cn } from '../../lib/cn'

export default function Screener() {
  const [results, setResults] = useState([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [sortKey, setSortKey] = useState('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [minScore, setMinScore] = useState(0)
  const [filterMet, setFilterMet] = useState({ A: false, B: false, C: false, D: false, E: false })
  const { analyzeStock } = useStore()

  const runScreening = useCallback(async () => {
    setScanning(true)
    setResults([])
    const total = KOSPI200_UNIQUE.length
    setProgress({ current: 0, total })

    const screenResults = []

    for (let i = 0; i < total; i++) {
      const stock = KOSPI200_UNIQUE[i]
      setProgress({ current: i + 1, total })

      try {
        let data
        try {
          data = await getStockDaily(stock.code, '3m')
          if (!data.success || !data.ohlcv || data.ohlcv.length < 30) throw new Error()
        } catch {
          data = mockGetStockDaily(stock.code)
        }

        if (!data.success || !data.ohlcv || data.ohlcv.length < 30) continue

        const indicators = calculateAllIndicators(data.ohlcv)
        const evaluation = evaluateAll(data.ohlcv, indicators)

        screenResults.push({
          code: stock.code,
          name: stock.name,
          score: evaluation.totalScore,
          conditions: evaluation.conditions,
          close: data.ohlcv[data.ohlcv.length - 1].close,
        })
      } catch {
        // skip
      }

      // 배치 업데이트 (10개마다)
      if ((i + 1) % 10 === 0 || i === total - 1) {
        setResults([...screenResults])
      }
    }

    setResults([...screenResults])
    setScanning(false)
  }, [])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  // 필터링
  const activeFilters = Object.entries(filterMet).filter(([, v]) => v).map(([k]) => k)
  const filtered = results.filter(item => {
    if (item.score < minScore) return false
    for (const key of activeFilters) {
      if (!item.conditions[key]?.met) return false
    }
    return true
  })

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    let va, vb
    if (sortKey === 'score') { va = a.score; vb = b.score }
    else if (sortKey === 'name') { va = a.name; vb = b.name }
    else if (sortKey === 'close') { va = a.close; vb = b.close }
    else { va = a.score; vb = b.score }

    if (typeof va === 'string') {
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return sortAsc ? va - vb : vb - va
  })

  const metCount = (conds) => Object.values(conds).filter(c => c.met).length

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">
            코스피200 스크리닝
          </h3>
          <span className="text-xs text-muted-foreground">
            ({KOSPI200_UNIQUE.length}종목)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <button
              onClick={() => { setResults([]); setProgress({ current: 0, total: 0 }) }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded bg-secondary"
            >
              <RotateCcw size={12} /> 초기화
            </button>
          )}
          <button
            onClick={runScreening}
            disabled={scanning}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {scanning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                스캔 중 ({progress.current}/{progress.total})
              </>
            ) : (
              <>
                <Filter size={14} />
                전체 스크리닝 시작
              </>
            )}
          </button>
        </div>
      </div>

      {/* 필터 옵션 */}
      {results.length > 0 && (
        <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">최소 점수:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-foreground font-medium w-8">{minScore}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground mr-1">조건 필터:</span>
            {['A', 'B', 'C', 'D', 'E'].map(key => (
              <button
                key={key}
                onClick={() => setFilterMet(prev => ({ ...prev, [key]: !prev[key] }))}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                  filterMet[key]
                    ? 'bg-success/20 border-success/50 text-success'
                    : 'bg-secondary border-border text-muted-foreground'
                )}
              >
                {key}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length}개 종목 표시
          </span>
        </div>
      )}

      {/* 결과 테이블 */}
      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="py-2 px-3 text-left">#</th>
                <th
                  className="py-2 px-3 text-left cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">종목 <ArrowUpDown size={10} /></div>
                </th>
                <th className="py-2 px-3 text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('close')}>
                  <div className="flex items-center justify-end gap-1">현재가 <ArrowUpDown size={10} /></div>
                </th>
                <th className="py-2 px-3 text-center cursor-pointer hover:text-foreground" onClick={() => handleSort('score')}>
                  <div className="flex items-center justify-center gap-1">총점 <ArrowUpDown size={10} /></div>
                </th>
                <th className="py-2 px-3 text-center">A</th>
                <th className="py-2 px-3 text-center">B</th>
                <th className="py-2 px-3 text-center">C</th>
                <th className="py-2 px-3 text-center">D</th>
                <th className="py-2 px-3 text-center">E</th>
                <th className="py-2 px-3 text-center">충족</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => (
                <tr
                  key={item.code}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => analyzeStock(item.code, item.name)}
                >
                  <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="text-card-foreground font-medium">{item.name}</div>
                    <div className="text-muted-foreground text-[10px]">{item.code}</div>
                  </td>
                  <td className="py-2 px-3 text-right text-card-foreground font-medium">
                    {item.close?.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={cn(
                      'font-bold text-sm',
                      item.score >= 70 ? 'text-success' :
                      item.score >= 40 ? 'text-warning' : 'text-danger'
                    )}>
                      {item.score}
                    </span>
                  </td>
                  {['A', 'B', 'C', 'D', 'E'].map(key => (
                    <td key={key} className="py-2 px-3 text-center">
                      <span className={cn(
                        'inline-block w-5 h-5 rounded text-[10px] leading-5',
                        item.conditions[key]?.met
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                      )}>
                        {item.conditions[key]?.met ? '✓' : '✗'}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center">
                    <span className={cn(
                      'text-xs font-bold',
                      metCount(item.conditions) >= 4 ? 'text-success' :
                      metCount(item.conditions) >= 2 ? 'text-warning' : 'text-muted-foreground'
                    )}>
                      {metCount(item.conditions)}/5
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 빈 상태 */}
      {!scanning && results.length === 0 && (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          "전체 스크리닝 시작" 버튼을 눌러 코스피200 종목을 분석하세요
        </div>
      )}

      {/* 스캔 진행 중인데 아직 결과 없을 때 */}
      {scanning && results.length === 0 && (
        <div className="px-4 py-8 flex flex-col items-center gap-2">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            종목 분석 중... ({progress.current}/{progress.total})
          </span>
          <div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
