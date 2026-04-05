import { useCallback } from 'react'
import useStore from '../store/useStore'

export function useStockData() {
  const {
    currentStock, ohlcv, indicators, evaluation,
    analysisLoading, analysisError, chartPeriod,
    setChartPeriod, analyzeStock,
  } = useStore()

  const analyze = useCallback((code, name, period) => {
    analyzeStock(code, name, period || chartPeriod)
  }, [analyzeStock, chartPeriod])

  return {
    currentStock, ohlcv, indicators, evaluation,
    loading: analysisLoading, error: analysisError,
    chartPeriod, setChartPeriod, analyze,
  }
}
