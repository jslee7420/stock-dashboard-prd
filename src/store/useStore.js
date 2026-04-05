import { create } from 'zustand'
import { getStockDaily, searchStock } from '../lib/api'
import { calculateAllIndicators } from '../lib/indicators'
import { evaluateAll } from '../lib/scoring'

const useStore = create((set, get) => ({
  // 테마
  theme: 'dark',
  toggleTheme: () => set(state => {
    const next = state.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.className = next
    return { theme: next }
  }),

  // API 상태
  apiStatus: 'unknown',

  // 종목 검색
  searchResults: [],
  searchLoading: false,
  searchStock: async (keyword) => {
    if (!keyword || keyword.length < 1) {
      set({ searchResults: [] })
      return
    }
    set({ searchLoading: true })
    try {
      const data = await searchStock(keyword)
      set({ searchResults: data.results || [] })
    } catch {
      set({ searchResults: [] })
    } finally {
      set({ searchLoading: false })
    }
  },

  // 현재 분석 대상
  currentStock: null,
  ohlcv: [],
  indicators: null,
  evaluation: null,
  analysisLoading: false,
  analysisError: null,

  analyzeStock: async (code, name, period = 'daily') => {
    set({ analysisLoading: true, analysisError: null })
    try {
      const data = await getStockDaily(code, period)
      const minDataPoints = period === 'monthly' || period === 'yearly' ? 10 : 30
      if (!data.success || !data.ohlcv || data.ohlcv.length < minDataPoints) {
        throw new Error('데이터가 부족합니다. 종목코드를 확인해주세요.')
      }
      const ohlcv = data.ohlcv
      const stockName = name || data.name || code
      const indicators = calculateAllIndicators(ohlcv)
      const evaluation = evaluateAll(ohlcv, indicators)
      set({
        currentStock: { code, name: stockName },
        ohlcv,
        indicators,
        evaluation,
        apiStatus: 'connected',
      })
      get().addHistory({ code, name: stockName, score: evaluation.totalScore })
    } catch (error) {
      set({ analysisError: error.message, apiStatus: 'disconnected' })
    } finally {
      set({ analysisLoading: false })
    }
  },

  // 차트 기간
  chartPeriod: 'daily',
  setChartPeriod: (period) => {
    set({ chartPeriod: period })
    const stock = get().currentStock
    if (stock) get().analyzeStock(stock.code, stock.name, period)
  },

  // 멀티 종목 비교
  compareList: [],
  addToCompare: async (code, name) => {
    const list = get().compareList
    if (list.length >= 10 || list.some(item => item.code === code)) return
    try {
      const data = await getStockDaily(code, '3m')
      if (!data.success || !data.ohlcv || data.ohlcv.length < 30) return
      const indicators = calculateAllIndicators(data.ohlcv)
      const evaluation = evaluateAll(data.ohlcv, indicators)
      set({
        compareList: [...list, {
          code,
          name: name || data.name,
          score: evaluation.totalScore,
          conditions: evaluation.conditions,
        }]
      })
    } catch { /* ignore */ }
  },
  removeFromCompare: (code) => set(state => ({
    compareList: state.compareList.filter(item => item.code !== code)
  })),
  clearCompare: () => set({ compareList: [] }),

  // 분석 히스토리
  history: [],
  addHistory: ({ code, name, score }) => set(state => {
    const filtered = state.history.filter(h => h.code !== code)
    const newHistory = [{ code, name, score, timestamp: Date.now() }, ...filtered].slice(0, 20)
    return { history: newHistory }
  }),

  // 즐겨찾기
  favorites: JSON.parse(localStorage.getItem('stock-favorites') || '[]'),
  toggleFavorite: (code, name) => set(state => {
    const exists = state.favorites.some(f => f.code === code)
    const next = exists
      ? state.favorites.filter(f => f.code !== code)
      : [...state.favorites, { code, name }]
    localStorage.setItem('stock-favorites', JSON.stringify(next))
    return { favorites: next }
  }),
}))

export default useStore
