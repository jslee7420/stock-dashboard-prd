import Icon from './Icon'

function Pill({ label, value, pct, asPrice }) {
  if (value == null) {
    return (
      <div className="market-pill">
        <span className="label">{label}</span>
        <span className="value num" style={{ color: 'var(--fg-muted)' }}>—</span>
      </div>
    )
  }
  const dir = pct == null ? null : pct >= 0 ? 'up' : 'down'
  return (
    <div className="market-pill">
      <span className="label">{label}</span>
      <span className="value num">
        {asPrice
          ? value.toLocaleString('ko-KR')
          : value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      {pct != null && (
        <span className={'delta num ' + dir}>
          {dir === 'up' ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
        </span>
      )}
    </div>
  )
}

export default function Topbar({ theme, setTheme, marketSummary, lastUpdated, refreshing, onRefresh, searchQuery, setSearchQuery }) {
  const m = marketSummary || {}
  return (
    <div className="topbar">
      <Pill label="KOSPI" value={m.kospi?.value} pct={m.kospi?.pct} />
      <Pill label="KOSDAQ" value={m.kosdaq?.value} pct={m.kosdaq?.pct} />
      <Pill label="USD/KRW" value={m.fx_usd?.value} pct={m.fx_usd?.pct} asPrice />

      <div className="topbar-spacer" />

      <button
        className={'refresh-btn' + (refreshing ? ' spinning' : '')}
        onClick={onRefresh}
        disabled={refreshing}
        title="데이터 새로고침"
      >
        <span className="refresh-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
        </span>
        <span className="refresh-meta">
          <span className="refresh-label">{refreshing ? '생성 중…' : '업데이트'}</span>
          <span className="refresh-time">{lastUpdated}</span>
        </span>
      </button>

      <div className="search-box">
        <span className="icon" aria-hidden="true"><Icon name="search" size={14} /></span>
        <input
          aria-label="종목 검색"
          placeholder="종목명 또는 코드 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <button
        className="icon-btn"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환'}
        title="테마"
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
    </div>
  )
}
// Note: 외국인/기관 당일 순매수 토픽바 핀은 데이터 소스가 없어 제거 (Naver는 종목별만, 시장 전체 합계 별도 API 필요)
