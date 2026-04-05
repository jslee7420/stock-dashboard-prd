import { cn } from '../../lib/cn'

export default function ScoreGauge({ score }) {
  const getColor = (s) => {
    if (s >= 70) return { text: 'text-success', stroke: '#22c55e', label: '매수 적합' }
    if (s >= 40) return { text: 'text-warning', stroke: '#eab308', label: '중립' }
    return { text: 'text-danger', stroke: '#ef4444', label: '위험' }
  }

  const { text, stroke, label } = getColor(score)

  // 반원 게이지 (SVG)
  const radius = 70
  const circumference = Math.PI * radius
  const progress = (score / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* 배경 호 */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke="hsl(217.2 32.6% 17.5%)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* 진행 호 */}
        <path
          d="M 10 90 A 70 70 0 0 1 170 90"
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center -mt-14">
        <span className={cn('text-3xl font-bold', text)}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
        <span className={cn('text-sm font-semibold mt-1', text)}>{label}</span>
      </div>
    </div>
  )
}
