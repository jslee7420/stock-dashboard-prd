import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, TrendingUp, Zap, RefreshCw } from 'lucide-react'
import { getScreeningResults, triggerScreening } from '../../lib/api'
import useStore from '../../store/useStore'
import { cn } from '../../lib/cn'

export default function Screener() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [error, setError] = useState(null)
  const { analyzeStock } = useStore()

  const fetchResults = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getScreeningResults()
      if (data.success && data.results) {
        setResults(data.results)
        setUpdatedAt(data.updatedAt)
      } else {
        setError('스크리닝 데이터가 아직 없습니다. 배치 작업 실행 후 확인해주세요.')
      }
    } catch {
      setError('스크리닝 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const runScreening = async () => {
    setLoading(true)
    setError(null)
    try {
      await triggerScreening()
      await fetchResults()
    } catch {
      setError('스크리닝 배치 실행에 실패했습니다.')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [])

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

  const metCount = (conds) => Object.values(conds).filter(c => c.met).length

  const formatUpdatedAt = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

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
            {updatedAt && (
              <span className="text-[10px] text-muted-foreground">
                (업데이트: {formatUpdatedAt(updatedAt)})
              </span>
            )}
          </div>
          <button
            onClick={runScreening}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded bg-secondary disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="px-4 py-8 flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">스크리닝 데이터 로딩 중...</span>
          </div>
        )}

        {/* 에러 */}
        {!loading && error && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {error}
          </div>
        )}

        {/* TOP 10 테이블 */}
        {!loading && top10.length > 0 && (
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
      </div>

      {/* 기관/외인 3일 연속 순매수 */}
      {!loading && results.length > 0 && (
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
              해당 조건을 만족하는 종목이 없습니다
            </div>
          )}
        </div>
      )}

      {/* 기관+외인 쌍끌이 3일 연속 순매수 */}
      {!loading && results.length > 0 && (
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
              해당 조건을 만족하는 종목이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  )
}
