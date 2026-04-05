import { Sun, Moon, Wifi, WifiOff, HelpCircle } from 'lucide-react'
import useStore from '../store/useStore'
import { cn } from '../lib/cn'

export default function Header() {
  const { theme, toggleTheme, apiStatus } = useStore()

  return (
    <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground tracking-tight">
          종목 기술적 분석 대시보드
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* API 상태 */}
        <div className={cn(
          'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
          apiStatus === 'connected' && 'bg-success/20 text-success',
          apiStatus === 'disconnected' && 'bg-danger/20 text-danger',
          apiStatus === 'unknown' && 'bg-muted text-muted-foreground',
        )}>
          {apiStatus === 'connected' ? <Wifi size={14} /> :
           apiStatus === 'disconnected' ? <WifiOff size={14} /> :
           <HelpCircle size={14} />}
          <span>
            {apiStatus === 'connected' ? 'Yahoo Finance 연결됨' :
             apiStatus === 'disconnected' ? '연결 실패' : '대기중'}
          </span>
        </div>

        {/* 테마 토글 */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-secondary hover:bg-accent transition-colors"
          aria-label="테마 전환"
        >
          {theme === 'dark' ? <Sun size={18} className="text-warning" /> : <Moon size={18} className="text-primary" />}
        </button>
      </div>
    </header>
  )
}
