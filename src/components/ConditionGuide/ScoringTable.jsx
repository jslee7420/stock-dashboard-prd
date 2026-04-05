const SCORES = [
  { id: 'A', name: 'RSI', max: 10, formula: 'RSI × 0.1' },
  { id: 'B', name: 'MA20', max: 5, formula: '종가 > MA20 → 5' },
  { id: 'C', name: '거래량', max: 40, formula: '거래량 배율(max 5x) × 8' },
  { id: 'D', name: 'MACD', max: 20, formula: 'MACD ≥ 0 + MACD > Signal' },
  { id: 'E', name: 'Stochastic', max: 25, formula: '%K > %D + %K < 50' },
]

export default function ScoringTable() {
  return (
    <div className="border border-border rounded-lg p-3">
      <h3 className="text-sm font-semibold mb-2 text-card-foreground">스코어링 배점 (Max 100점)</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="py-1 text-left">항목</th>
            <th className="py-1 text-center">배점</th>
            <th className="py-1 text-left">산출 방식</th>
          </tr>
        </thead>
        <tbody>
          {SCORES.map(s => (
            <tr key={s.id} className="border-b border-border/50">
              <td className="py-1.5 text-card-foreground">{s.id}) {s.name}</td>
              <td className="py-1.5 text-center text-primary font-semibold">{s.max}점</td>
              <td className="py-1.5 text-muted-foreground">{s.formula}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-1.5 text-card-foreground">합계</td>
            <td className="py-1.5 text-center text-warning">100점</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
