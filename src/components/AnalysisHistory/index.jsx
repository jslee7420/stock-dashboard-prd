import { Clock } from 'lucide-react'
import useStore from '../../store/useStore'
import { cn } from '../../lib/cn'

export default function AnalysisHistory() {
  const { history, analyzeStock } = useStore()

  if (history.length === 0) return null

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Clock size={14} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold text-card-foreground">최근 분석</h3>
        <span className="text-xs text-muted-foreground">({history.length})</span>
      </div>

      <div className="divide-y divide-border/50">
        {history.map(item => (
          <button
            key={item.code + item.timestamp}
            onClick={() => analyzeStock(item.code, item.name)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
          >
            <div>
              <span className="text-sm text-card-foreground font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{item.code}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                'text-sm font-bold',
                item.score >= 70 ? 'text-success' : item.score >= 40 ? 'text-warning' : 'text-danger'
              )}>
                {item.score}점
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
