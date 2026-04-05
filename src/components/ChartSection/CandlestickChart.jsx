import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries } from 'lightweight-charts'
import useStore from '../../store/useStore'

function formatDate(dateStr) {
  const d = dateStr.replace(/-/g, '')
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

export default function CandlestickChart() {
  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const { ohlcv, indicators, theme } = useStore()

  useEffect(() => {
    if (!containerRef.current || !ohlcv || ohlcv.length === 0) return

    const isDark = theme === 'dark'

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0a0e27' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#1e2235' : '#f3f4f6' },
        horzLines: { color: isDark ? '#1e2235' : '#f3f4f6' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? '#2e3347' : '#e5e7eb' },
      timeScale: { borderColor: isDark ? '#2e3347' : '#e5e7eb' },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    })

    const candleData = ohlcv.map(d => ({
      time: formatDate(d.date),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
    candleSeries.setData(candleData)

    if (indicators?.ma20) {
      const ma20Series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1.5,
        priceLineVisible: false,
      })
      const ma20Data = indicators.ma20
        .map((val, i) => (val !== null && i < ohlcv.length && ohlcv[i]) ? { time: formatDate(ohlcv[i].date), value: val } : null)
        .filter(Boolean)
      ma20Series.setData(ma20Data)
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [ohlcv, indicators, theme])

  return <div ref={containerRef} className="w-full" />
}
