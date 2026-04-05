import { cn } from '../../lib/cn'

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-card-foreground font-medium">{value}</span>
    </div>
  )
}

export default function IndicatorDetail({ condKey, condition }) {
  const { name, met, score, maxScore, detail } = condition

  const renderDetail = () => {
    switch (condKey) {
      case 'A':
        return (
          <>
            <DetailRow label="RSI (14)" value={detail.rsi ?? '-'} />
            <DetailRow label="RSI Signal" value={detail.rsiSignal ?? '-'} />
            <DetailRow label="판정" value={detail.rsi <= 20 ? '과매도 반등' : 'RSI ≥ Signal'} />
          </>
        )
      case 'B':
        return (
          <>
            <DetailRow label="종가" value={detail.close?.toLocaleString() ?? '-'} />
            <DetailRow label="MA20" value={detail.ma20?.toLocaleString() ?? '-'} />
          </>
        )
      case 'C':
        return (
          <>
            <DetailRow label="당일 거래량" value={detail.volume?.toLocaleString() ?? '-'} />
            <DetailRow label="5일 평균" value={detail.avgVolume5?.toLocaleString() ?? '-'} />
            <DetailRow label="배율" value={`${detail.ratio ?? '-'}x`} />
          </>
        )
      case 'D':
        return (
          <>
            <DetailRow label="MACD" value={detail.macd ?? '-'} />
            <DetailRow label="Signal" value={detail.signal ?? '-'} />
            <DetailRow label="표시" value={detail.label ?? '-'} />
          </>
        )
      case 'E':
        return (
          <>
            <DetailRow label="%K" value={detail.k ?? '-'} />
            <DetailRow label="%D" value={detail.d ?? '-'} />
            <DetailRow label="%K > %D" value={detail.kAboveD ? '✓' : '✗'} />
            <DetailRow label="%K < 50" value={detail.kBelow50 ? '✓' : '✗'} />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className={cn(
      'border rounded-lg p-3',
      met ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded',
            met ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
          )}>
            {condKey}
          </span>
          <span className="text-sm font-semibold text-card-foreground">{name}</span>
        </div>
        <span className={cn(
          'text-sm font-bold',
          met ? 'text-success' : 'text-danger'
        )}>
          {score} / {maxScore}
        </span>
      </div>
      <div className="space-y-1">
        {renderDetail()}
      </div>
    </div>
  )
}
