export default function ConditionCard({ condition }) {
  const { id, name, criteria, meaning, color } = condition
  return (
    <div className="border border-border rounded-lg p-3 bg-secondary/30">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${color} bg-secondary`}>
          {id}
        </span>
        <span className="text-sm font-semibold text-card-foreground">{name}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{criteria}</p>
      <p className="text-xs text-primary">{meaning}</p>
    </div>
  )
}
