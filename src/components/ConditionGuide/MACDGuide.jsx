const MACD_LABELS = [
  { label: '▲(+)', desc: 'MACD > Signal ✓ & MACD ≥ 0 ✓', meaning: '조건 D 충족', color: 'text-success' },
  { label: '▲(-)', desc: 'MACD > Signal ✓ & MACD < 0', meaning: '전환 초기', color: 'text-warning' },
  { label: '▽(+)', desc: 'MACD < Signal & MACD > 0 ✓', meaning: '하락 전환 초기', color: 'text-warning' },
  { label: '▽(-)', desc: 'MACD < Signal & MACD < 0', meaning: '하락 추세', color: 'text-danger' },
]

export default function MACDGuide() {
  return (
    <div className="border border-border rounded-lg p-3">
      <h3 className="text-sm font-semibold mb-2 text-card-foreground">MACD 표시 읽는 법</h3>
      <div className="space-y-2">
        {MACD_LABELS.map(m => (
          <div key={m.label} className="flex items-center gap-3 text-xs">
            <span className={`font-bold text-base w-10 ${m.color}`}>{m.label}</span>
            <span className="text-muted-foreground flex-1">{m.desc}</span>
            <span className={`${m.color} font-medium`}>{m.meaning}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
