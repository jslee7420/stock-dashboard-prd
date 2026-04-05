import { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import useStore from '../../store/useStore'
import { cn } from '../../lib/cn'

export default function MultiCompare() {
  const { compareList, addToCompare, removeFromCompare, clearCompare, analyzeStock } = useStore()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (code.trim()) {
      addToCompare(code.trim(), name.trim() || code.trim())
      setCode('')
      setName('')
    }
  }

  const sorted = [...compareList].sort((a, b) => b.score - a.score)

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">
          멀티 종목 비교 ({compareList.length}/10)
        </h3>
        {compareList.length > 0 && (
          <button onClick={clearCompare} className="text-xs text-muted-foreground hover:text-danger flex items-center gap-1">
            <Trash2 size={12} /> 초기화
          </button>
        )}
      </div>

      {/* 종목 추가 */}
      <form onSubmit={handleAdd} className="flex gap-2 px-4 py-3">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="종목코드 (예: 005930)"
          className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="종목명 (선택)"
          className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={compareList.length >= 10}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </form>

      {/* 랭킹 테이블 */}
      {sorted.length > 0 && (
        <div className="px-4 pb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="py-2 text-left">#</th>
                <th className="py-2 text-left">종목</th>
                <th className="py-2 text-center">총점</th>
                <th className="py-2 text-center">A</th>
                <th className="py-2 text-center">B</th>
                <th className="py-2 text-center">C</th>
                <th className="py-2 text-center">D</th>
                <th className="py-2 text-center">E</th>
                <th className="py-2 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => (
                <tr
                  key={item.code}
                  className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer"
                  onClick={() => analyzeStock(item.code, item.name)}
                >
                  <td className="py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2">
                    <div className="text-card-foreground font-medium">{item.name}</div>
                    <div className="text-muted-foreground">{item.code}</div>
                  </td>
                  <td className={cn(
                    'py-2 text-center font-bold',
                    item.score >= 70 ? 'text-success' : item.score >= 40 ? 'text-warning' : 'text-danger'
                  )}>
                    {item.score}
                  </td>
                  {item.conditions && Object.entries(item.conditions).map(([key, cond]) => (
                    <td key={key} className="py-2 text-center">
                      <span className={cn(
                        'inline-block w-5 h-5 rounded text-[10px] leading-5',
                        cond.met ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                      )}>
                        {cond.met ? '✓' : '✗'}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromCompare(item.code) }}
                      className="p-1 hover:bg-danger/20 rounded"
                    >
                      <X size={12} className="text-muted-foreground hover:text-danger" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {compareList.length === 0 && (
        <div className="px-4 pb-4 text-center text-xs text-muted-foreground py-6">
          종목을 추가하여 비교 분석하세요
        </div>
      )}
    </div>
  )
}
