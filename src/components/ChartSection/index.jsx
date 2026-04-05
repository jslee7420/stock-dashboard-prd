import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import useStore from '../../store/useStore'
import CandlestickChart from './CandlestickChart'
import VolumeChart from './VolumeChart'
import IndicatorChart from './IndicatorChart'
import { cn } from '../../lib/cn'

const PERIODS = [
  { value: 'daily', label: '일' },
  { value: 'weekly', label: '주' },
  { value: 'monthly', label: '월' },
  { value: 'yearly', label: '년' },
]

export default function ChartSection() {
  const { ohlcv, chartPeriod, setChartPeriod } = useStore()
  const [panels, setPanels] = useState({ rsi: true, macd: true, stochastic: true })

  if (!ohlcv || ohlcv.length === 0) return null

  const togglePanel = (key) => setPanels(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* 기간 선택 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">차트</h3>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setChartPeriod(p.value)}
              className={cn(
                'px-3 py-1 text-xs rounded-md transition-colors',
                chartPeriod === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 캔들스틱 + MA20 */}
      <div className="px-2 pt-2">
        <CandlestickChart />
      </div>

      {/* 거래량 */}
      <div className="px-2">
        <div className="text-xs text-muted-foreground px-2 py-1">거래량</div>
        <VolumeChart />
      </div>

      {/* RSI */}
      <PanelToggle label="RSI (14)" open={panels.rsi} onToggle={() => togglePanel('rsi')}>
        <IndicatorChart type="rsi" />
      </PanelToggle>

      {/* MACD */}
      <PanelToggle label="MACD (12,26,9)" open={panels.macd} onToggle={() => togglePanel('macd')}>
        <IndicatorChart type="macd" />
      </PanelToggle>

      {/* Stochastic */}
      <PanelToggle label="Slow Stochastic (10,5,5)" open={panels.stochastic} onToggle={() => togglePanel('stochastic')}>
        <IndicatorChart type="stochastic" />
      </PanelToggle>
    </div>
  )
}

function PanelToggle({ label, open, onToggle, children }) {
  return (
    <div className="border-t border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50"
      >
        <span>{label}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="px-2 pb-1">{children}</div>}
    </div>
  )
}
