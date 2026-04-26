import { useEffect, useState } from 'react'

// Toss 보안 CDN: 모든 KOSPI/KOSDAQ 종목에 대해 PNG 로고 제공.
// 실패 시 텍스트 약자(2-letter)로 fallback.
const logoUrl = (code) => `https://static.toss.im/png-icons/securities/icn-sec-fill-${code}.png`

export default function StockLogo({ code, fallback, className = 'ticker-icon' }) {
  const [failed, setFailed] = useState(false)
  // Reset failure state when code changes so a previously-failed code doesn't poison new mounts
  useEffect(() => { setFailed(false) }, [code])

  if (failed || !code) {
    return <div className={className} aria-hidden="true">{fallback}</div>
  }
  return (
    <div className={className + ' has-logo'} aria-hidden="true">
      <img
        src={logoUrl(code)}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
