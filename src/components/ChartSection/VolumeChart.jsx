import { useEffect, useRef } from 'react'
import { createChart, ColorType, HistogramSeries } from 'lightweight-charts'
import useStore from '../../store/useStore'

function formatDate(dateStr) {
  const d = dateStr.replace(/-/g, '')
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

export default function VolumeChart() {
  const containerRef = useRef(null)
  const { ohlcv, theme } = useStore()

  useEffect(() => {
    if (!containerRef.current || !ohlcv || ohlcv.length === 0) return

    const isDark = theme === 'dark'

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 120,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0a0e27' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#1e2235' : '#f3f4f6' },
        horzLines: { color: isDark ? '#1e2235' : '#f3f4f6' },
      },
      rightPriceScale: { borderColor: isDark ? '#2e3347' : '#e5e7eb' },
      timeScale: { borderColor: isDark ? '#2e3347' : '#e5e7eb', visible: false },
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
    })

    const volData = ohlcv.map(d => ({
      time: formatDate(d.date),
      value: d.volume,
      color: d.close >= d.open ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)',
    }))
    volumeSeries.setData(volData)

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); chart.remove() }
  }, [ohlcv, theme])

  return <div ref={containerRef} className="w-full" />
}
