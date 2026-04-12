import { useEffect } from 'react'
import useStore from './store/useStore'
import Header from './components/Header'
import ConditionGuide from './components/ConditionGuide'
import StockAnalysis from './components/StockAnalysis'
import ChartSection from './components/ChartSection'
import AnalysisHistory from './components/AnalysisHistory'
import Screener from './components/Screener'

export default function App() {
  const { theme } = useStore()

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 조건 안내 (아코디언) */}
        <ConditionGuide />

        {/* 코스피200 스크리닝 */}
        <section>
          <Screener />
        </section>

        {/* 종목 분석 (핵심) */}
        <section>
          <StockAnalysis />
        </section>

        {/* 차트 시각화 */}
        <section>
          <ChartSection />
        </section>

        {/* 분석 히스토리 */}
        <section>
          <AnalysisHistory />
        </section>
      </main>

      {/* 면책 조항 */}
      <footer className="border-t border-border py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            본 결과는 기술적 지표 기반 참고 자료이며, 투자 권유가 아닙니다.
            투자 판단은 본인 책임하에 이루어져야 합니다.
          </p>
        </div>
      </footer>
    </div>
  )
}
