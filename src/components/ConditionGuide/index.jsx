import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ConditionCard from './ConditionCard'
import ScoringTable from './ScoringTable'
import MACDGuide from './MACDGuide'

const CONDITIONS = [
  {
    id: 'A', name: 'RSI (14)', indicator: 'RSI',
    criteria: 'RSI ≤ 20 → 반등 또는 RSI ≥ Signal',
    meaning: '과매도 반등 / 모멘텀',
    color: 'text-primary',
  },
  {
    id: 'B', name: 'MA20', indicator: '이동평균',
    criteria: '종가 > 20일 이동평균',
    meaning: '상승 추세 확인',
    color: 'text-success',
  },
  {
    id: 'C', name: '거래량', indicator: '거래량',
    criteria: '당일 거래량 > 5일 평균 × 1.5',
    meaning: '매수 압력 유입',
    color: 'text-warning',
  },
  {
    id: 'D', name: 'MACD (12,26,9)', indicator: 'MACD',
    criteria: 'MACD ≥ 0 + MACD > Signal',
    meaning: '상승 추세 지속 확인',
    color: 'text-up',
  },
  {
    id: 'E', name: 'Slow Stoch (10,5,5)', indicator: 'Stochastic',
    criteria: '%K > %D + %K < 50',
    meaning: '매수 시그널 (과매수 아님)',
    color: 'text-accent-foreground',
  },
]

export default function ConditionGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <span className="font-semibold text-sm text-card-foreground">
          판정 조건 및 스코어링 안내
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* 조건 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {CONDITIONS.map(c => (
              <ConditionCard key={c.id} condition={c} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScoringTable />
            <MACDGuide />
          </div>
        </div>
      )}
    </div>
  )
}
