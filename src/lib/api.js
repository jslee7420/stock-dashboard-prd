import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

/** 한투 토큰 발급 */
export async function getToken() {
  const { data } = await api.post('/auth/token')
  return data
}

/** 현재가 시세 조회 */
export async function getStockPrice(code) {
  const { data } = await api.get('/stock/price', { params: { code } })
  return data
}

/** 일별 시세(OHLCV) 조회 */
export async function getStockDaily(code, period = '3m') {
  const { data } = await api.get('/stock/daily', { params: { code, period } })
  return data
}

/** 종목 검색 */
export async function searchStock(keyword) {
  const { data } = await api.get('/stock/search', { params: { keyword } })
  return data
}
