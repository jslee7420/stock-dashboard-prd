import { useCallback, useEffect, useState } from 'react'

const EMPTY_SIGNALS = {
  'kospi-foreign': [], 'kospi-inst': [], 'kospi-dual': [],
  'kospi-foreign-qty': [], 'kospi-inst-qty': [], 'kospi-dual-qty': [],
  'kosdaq-foreign': [], 'kosdaq-inst': [], 'kosdaq-dual': [],
  'kosdaq-foreign-qty': [], 'kosdaq-inst-qty': [], 'kosdaq-dual-qty': [],
}

export function useSignals() {
  const [data, setData] = useState({ signals: EMPTY_SIGNALS, marketSummary: null, sectorPerf: [], updatedAt: null })
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState(null)

  const fetchOnce = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/signals/results', { cache: 'no-store' })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        throw new Error('API가 배포되지 않았거나 도달할 수 없습니다')
      }
      const json = await res.json()
      // 404 + NO_DATA = 크론 미실행 상태 (정상 — 빈 상태로 표시)
      if (res.status === 404 && json.code === 'NO_DATA') {
        setStatus('empty')
        setError(json.error || '데이터 없음')
        return
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`)
      }
      setData({
        signals: { ...EMPTY_SIGNALS, ...(json.signals || {}) },
        marketSummary: json.marketSummary || null,
        sectorPerf: json.sectorPerf || [],
        updatedAt: json.updatedAt || null,
      })
      setStatus('ready')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => { fetchOnce() }, [fetchOnce])

  return { ...data, status, error, refresh: fetchOnce }
}
