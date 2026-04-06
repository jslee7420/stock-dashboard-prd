import { useState, useCallback, useMemo } from 'react'
import { Search, Loader2, Filter, RotateCcw, TrendingUp, Zap } from 'lucide-react'
import { KOSPI200_UNIQUE } from '../../lib/kospi200'
import { getStockDaily, getStockInvestor } from '../../lib/api'
import { calculateAllIndicators } from '../../lib/indicators'
import { evaluateAll } from '../../lib/scoring'
import useStore from '../../store/useStore'
import { cn } from '../../lib/cn'

export default function Screener() {
  const [results, setResults] = useState([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const { analyzeStock } = useStore()

  // 기술적 분석 TOP 10
  const top10 = useMemo(() => {
    return [...results].sort((a, b) => b.score - a.score).slice(0, 10)
  }, [results])

  // 기관 또는 외인 3일 연속 순매수
  const eitherNetBuy = useMemo(() => {
    return results
      .filter(r => r.investor?.institutionalConsecutive || r.investor?.foreignConsecutive)
      .sort((a, b) => {
        const aTotal = (a.investor?.totalInstitutional || 0) + (a.investor?.totalForeign || 0)
        const bTotal = (b.investor?.totalInstitutional || 0) + (b.investor?.totalForeign || 0)
        return bTotal - aTotal
      })
  }, [results])

  // 기관+외인 쌍끌이 3일 연속 순매수
  const bothNetBuy = useMemo(() => {
    return results
      .filter(r => r.investor?.institutionalConsecutive && r.investor?.foreignConsecutive)
      .sort((a, b) => {
        const aTotal = (a.investor?.totalInstitutional || 0) + (a.investor?.totalForeign || 0)
        const bTotal = (b.investor?.totalInstitutional || 0) + (b.investor?.totalForeign || 0)
        return bTotal - aTotal
      })
  }, [results])

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
        // OHLCV + 투자자 데이터 병렬 조회
        const [ohlcvData, investorResp] = await Promise.all([
          getStockDaily(stock.code, '3m'),
          getStockInvestor(stock.code).catch(() => ({ success: false, data: [] })),
        ])

        if (!ohlcvData.success || !ohlcvData.ohlcv || ohlcvData.ohlcv.length < 30) continue

        const indicators = calculateAllIndicators(ohlcvData.ohlcv)
        const evaluation = evaluateAll(ohlcvData.ohlcv, indicators)

        // 투자자 3일 연속 순매수 체크
        let investor = null
        if (investorResp.success && investorResp.data?.length >= 3) {
          const last3 = investorResp.data.slice(0, 3)
          const instConsec = last3.every(d => d.institutional > 0)
          const foreignConsec = last3.every(d => d.foreign > 0)
          investor = {
            institutionalConsecutive: instConsec,
            foreignConsecutive: foreignConsec,
            totalInstitutional: last3.reduce((s, d) => s + d.institutional, 0),
            totalForeign: last3.reduce((s, d) => s + d.foreign, 0),
            days: last3,
          }
        }

        screenResults.push({
          code: stock.code,
          name: stock.name,
          score: evaluation.totalScore,
          conditions: evaluation.conditions,
          close: ohlcvData.ohlcv[ohlcvData.ohlcv.length - 1].close,
          investor,
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

  const metCount = (conds) => Object.values(conds).filter(c => c.met).length

  return (
    <div className="space-y-4">
      {/* 메인 카드 — 기술적 분석 TOP 10 */}
      <div className="border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">
              코스피200 기술적 분석
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

        {/* TOP 10 테이블 */}
        {top10.length > 0 && (
          <>
            <div className="px-4 py-2 border-b border-border bg-secondary/30">
              <h4 className="text-xs font-semibold text-card-foreground">
                기술적 분석 TOP 10
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="py-2 px-3 text-left">순위</th>
                    <th className="py-2 px-3 text-left">종목</th>
                    <th className="py-2 px-3 text-right">현재가</th>
                    <th className="py-2 px-3 text-center">총점</th>
                    <th className="py-2 px-3 text-center">A</th>
                    <th className="py-2 px-3 text-center">B</th>
                    <th className="py-2 px-3 text-center">C</th>
                    <th className="py-2 px-3 text-center">D</th>
                    <th className="py-2 px-3 text-center">E</th>
                    <th className="py-2 px-3 text-center">충족</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((item, idx) => (
                    <tr
                      key={item.code}
                      className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => analyzeStock(item.code, item.name)}
                    >
                      <td className="py-2 px-3 text-muted-foreground font-bold">{idx + 1}</td>
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
          </>
        )}

        {/* 빈 상태 */}
        {!scanning && results.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            "전체 스크리닝 시작" 버튼을 눌러 코스피200 종목을 분석하세요
          </div>
        )}

        {/* 스캔 진행 중 (결과 없을 때) */}
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

      {/* 스캔 진행 중 표시 (결과 있을 때) */}
      {scanning && results.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            스캔 진행 중... ({progress.current}/{progress.total})
          </span>
          <div className="w-32 h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 기관/외인 3일 연속 순매수 */}
      {results.length > 0 && (
        <div className="border border-border rounded-lg bg-card">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              <h4 className="text-sm font-semibold text-card-foreground">
                기관/외인 3일 연속 순매수
              </h4>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              기관 또는 외국인이 최근 3거래일 연속 순매수한 종목
            </p>
          </div>
          {eitherNetBuy.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="py-2 px-3 text-left">#</th>
                    <th className="py-2 px-3 text-left">종목</th>
                    <th className="py-2 px-3 text-right">현재가</th>
                    <th className="py-2 px-3 text-right">기관 3일 합계</th>
                    <th className="py-2 px-3 text-right">외인 3일 합계</th>
                    <th className="py-2 px-3 text-center">구분</th>
                  </tr>
                </thead>
                <tbody>
                  {eitherNetBuy.map((item, idx) => (
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
                      <td className={cn(
                        'py-2 px-3 text-right font-medium',
                        item.investor.totalInstitutional > 0 ? 'text-danger' : 'text-blue-500'
                      )}>
                        {item.investor.totalInstitutional > 0 ? '+' : ''}
                        {item.investor.totalInstitutional?.toLocaleString()}
                      </td>
                      <td className={cn(
                        'py-2 px-3 text-right font-medium',
                        item.investor.totalForeign > 0 ? 'text-danger' : 'text-blue-500'
                      )}>
                        {item.investor.totalForeign > 0 ? '+' : ''}
                        {item.investor.totalForeign?.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {item.investor.institutionalConsecutive && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 text-[10px] font-bold">
                              기관
                            </span>
                          )}
                          {item.investor.foreignConsecutive && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 text-[10px] font-bold">
                              외인
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              {scanning ? '분석 중...' : '해당 조건을 만족하는 종목이 없습니다'}
            </div>
          )}
        </div>
      )}

      {/* 기관+외인 쌍끌이 3일 연속 순매수 */}
      {results.length > 0 && (
        <div className="border border-border rounded-lg bg-card">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <h4 className="text-sm font-semibold text-card-foreground">
                기관+외인 쌍끌이 3일 연속 순매수
              </h4>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              기관과 외국인 모두 최근 3거래일 연속 순매수한 종목
            </p>
          </div>
          {bothNetBuy.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="py-2 px-3 text-left">#</th>
                    <th className="py-2 px-3 text-left">종목</th>
                    <th className="py-2 px-3 text-right">현재가</th>
                    <th className="py-2 px-3 text-right">기관 3일 합계</th>
                    <th className="py-2 px-3 text-right">외인 3일 합계</th>
                    <th className="py-2 px-3 text-right">합산</th>
                  </tr>
                </thead>
                <tbody>
                  {bothNetBuy.map((item, idx) => (
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
                      <td className="py-2 px-3 text-right font-medium text-orange-500">
                        +{item.investor.totalInstitutional?.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-blue-500">
                        +{item.investor.totalForeign?.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-danger">
                        +{(item.investor.totalInstitutional + item.investor.totalForeign)?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              {scanning ? '분석 중...' : '해당 조건을 만족하는 종목이 없습니다'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
