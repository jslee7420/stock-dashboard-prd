import { Loader2, AlertCircle } from 'lucide-react'
import { useStockData } from '../../hooks/useStockData'
import SearchBar from './SearchBar'
import ScoreGauge from './ScoreGauge'
import ConditionHeatmap from './ConditionHeatmap'
import IndicatorDetail from './IndicatorDetail'

export default function StockAnalysis() {
  const { currentStock, evaluation, loading, error, analyze } = useStockData()

  return (
    <div className="space-y-4">
      <SearchBar onAnalyze={analyze} />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">분석 중...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger/10 border border-danger/30 rounded-lg">
          <AlertCircle size={18} className="text-danger" />
          <span className="text-sm text-danger">{error}</span>
        </div>
      )}

      {!loading && evaluation && currentStock && (
        <div className="space-y-4">
          {/* 종목명 */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              {currentStock.name}
              <span className="text-sm text-muted-foreground ml-2">({currentStock.code})</span>
            </h2>
          </div>

          {/* 스코어 + 히트맵 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg bg-card p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-2">종합 스코어</h3>
              <ScoreGauge score={evaluation.totalScore} />
            </div>
            <div className="border border-border rounded-lg bg-card p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-2">조건 히트맵</h3>
              <ConditionHeatmap conditions={evaluation.conditions} />
            </div>
          </div>

          {/* 지표 상세 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">지표 상세</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(evaluation.conditions).map(([key, cond]) => (
                <IndicatorDetail key={key} condKey={key} condition={cond} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
