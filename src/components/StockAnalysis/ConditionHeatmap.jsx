import { cn } from '../../lib/cn'

export default function ConditionHeatmap({ conditions }) {
  if (!conditions) return null

  const entries = Object.entries(conditions)

  return (
    <div className="flex gap-2">
      {entries.map(([key, cond]) => (
        <div
          key={key}
          className={cn(
            'flex-1 rounded-lg p-2 text-center border transition-colors',
            cond.met
              ? 'bg-success/20 border-success/50 text-success'
              : 'bg-danger/20 border-danger/50 text-danger'
          )}
        >
          <div className="text-xs font-bold">{key}</div>
          <div className="text-[10px] mt-0.5">{cond.name}</div>
          <div className="text-lg font-bold mt-1">{cond.met ? '✓' : '✗'}</div>
        </div>
      ))}
    </div>
  )
}
