// Formatters + static category metadata (no data here — real data flows through useSignals).

export const KRW = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + '조'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(0) + '억'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(0) + '만'
  return n.toLocaleString()
}
export const signed = (n, fn) => (n >= 0 ? '+' : '−') + fn(Math.abs(n))
export const pct = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%'

export const SIGNAL_CATEGORIES = [
  { id: 'kospi-foreign',      label: '코스피 · 외국인', market: 'KOSPI',  kind: '외국인', basis: 'amt' },
  { id: 'kospi-inst',         label: '코스피 · 기관',    market: 'KOSPI',  kind: '기관',    basis: 'amt' },
  { id: 'kospi-dual',         label: '코스피 · 동시',    market: 'KOSPI',  kind: '동시',    basis: 'amt', dual: true },
  { id: 'kosdaq-foreign',     label: '코스닥 · 외국인', market: 'KOSDAQ', kind: '외국인', basis: 'amt' },
  { id: 'kosdaq-inst',        label: '코스닥 · 기관',    market: 'KOSDAQ', kind: '기관',    basis: 'amt' },
  { id: 'kosdaq-dual',        label: '코스닥 · 동시',    market: 'KOSDAQ', kind: '동시',    basis: 'amt', dual: true },
  { id: 'kospi-foreign-qty',  label: '코스피 · 외국인', market: 'KOSPI',  kind: '외국인', basis: 'qty' },
  { id: 'kospi-inst-qty',     label: '코스피 · 기관',    market: 'KOSPI',  kind: '기관',    basis: 'qty' },
  { id: 'kospi-dual-qty',     label: '코스피 · 동시',    market: 'KOSPI',  kind: '동시',    basis: 'qty', dual: true },
  { id: 'kosdaq-foreign-qty', label: '코스닥 · 외국인', market: 'KOSDAQ', kind: '외국인', basis: 'qty' },
  { id: 'kosdaq-inst-qty',    label: '코스닥 · 기관',    market: 'KOSDAQ', kind: '기관',    basis: 'qty' },
  { id: 'kosdaq-dual-qty',    label: '코스닥 · 동시',    market: 'KOSDAQ', kind: '동시',    basis: 'qty', dual: true },
]
