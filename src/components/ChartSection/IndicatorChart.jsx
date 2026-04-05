import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineSeries, HistogramSeries } from 'lightweight-charts'
import useStore from '../../store/useStore'

function formatDate(dateStr) {
  const d = dateStr.replace(/-/g, '')
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

export default function IndicatorChart({ type }) {
  const containerRef = useRef(null)
  const { ohlcv, indicators, theme } = useStore()

  useEffect(() => {
    if (!containerRef.current || !ohlcv || !indicators || ohlcv.length === 0) return

    const isDark = theme === 'dark'

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 150,
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

    const makeLine = (values, color, lineWidth = 1.5) => {
      const series = chart.addSeries(LineSeries, { color, lineWidth, priceLineVisible: false })
      const data = values
        .map((val, i) => (val !== null && i < ohlcv.length && ohlcv[i]) ? { time: formatDate(ohlcv[i].date), value: val } : null)
        .filter(Boolean)
      series.setData(data)
      return series
    }

    if (type === 'rsi') {
      makeLine(indicators.rsi, '#a855f7', 2)
      makeLine(indicators.rsiSignal, '#f59e0b', 1)
      const refLine30 = chart.addSeries(LineSeries, { color: '#374151', lineWidth: 0.5, lineStyle: 2, priceLineVisible: false })
      const refLine70 = chart.addSeries(LineSeries, { color: '#374151', lineWidth: 0.5, lineStyle: 2, priceLineVisible: false })
      const refLine20 = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 0.5, lineStyle: 2, priceLineVisible: false })
      const dates = ohlcv.map(d => ({ time: formatDate(d.date) }))
      refLine30.setData(dates.map(d => ({ ...d, value: 30 })))
      refLine70.setData(dates.map(d => ({ ...d, value: 70 })))
      refLine20.setData(dates.map(d => ({ ...d, value: 20 })))
    }

    if (type === 'macd') {
      makeLine(indicators.macd.macd, '#3b82f6', 2)
      makeLine(indicators.macd.signal, '#ef4444', 1.5)
      const histSeries = chart.addSeries(HistogramSeries, { priceLineVisible: false })
      const histData = indicators.macd.histogram
        .map((val, i) => val !== null ? {
          time: formatDate(ohlcv[i].date),
          value: val,
          color: val >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
        } : null)
        .filter(Boolean)
      histSeries.setData(histData)
      const zeroLine = chart.addSeries(LineSeries, { color: '#6b7280', lineWidth: 0.5, lineStyle: 2, priceLineVisible: false })
      zeroLine.setData(ohlcv.map(d => ({ time: formatDate(d.date), value: 0 })))
    }

    if (type === 'stochastic') {
      makeLine(indicators.stochastic.k, '#3b82f6', 2)
      makeLine(indicators.stochastic.d, '#ef4444', 1.5)
      const refLine50 = chart.addSeries(LineSeries, { color: '#6b7280', lineWidth: 0.5, lineStyle: 2, priceLineVisible: false })
      const refLine20 = chart.addSeries(LineSeries, { color: '#374151', lineWidth: 0.5, lineStyle: 2, priceLineVisible: false })
      const refLine80 = chart.addSeries(LineSeries, { color: '#374151', lineWidth: 0.5, lineStyle: 2, priceLineVisible: false })
      const dates = ohlcv.map(d => ({ time: formatDate(d.date) }))
      refLine50.setData(dates.map(d => ({ ...d, value: 50 })))
      refLine20.setData(dates.map(d => ({ ...d, value: 20 })))
      refLine80.setData(dates.map(d => ({ ...d, value: 80 })))
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); chart.remove() }
  }, [ohlcv, indicators, theme, type])

  return <div ref={containerRef} className="w-full" />
}
