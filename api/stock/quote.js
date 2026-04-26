// Yahoo Finance 단일 종목 실시간 시세 + 시총.
// 검색에서 시그널에 포함되지 않은 종목을 선택했을 때 DetailPanel이 호출.
import YahooFinance from 'yahoo-finance2'
import { toYahooTicker } from '../_lib/yahoo.js'

const yf = new YahooFinance()

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })

  const code = String(req.query.code || '')
  const market = String(req.query.market || 'KOSPI').toUpperCase()
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: 'invalid code (6 digits required)' })
  }
  if (market !== 'KOSPI' && market !== 'KOSDAQ') {
    return res.status(400).json({ success: false, error: 'invalid market' })
  }

  const ticker = toYahooTicker(code, market)
  try {
    const q = await yf.quote(ticker)
    if (!q || q.regularMarketPrice == null) {
      return res.status(404).json({ success: false, error: 'no quote data' })
    }
    return res.status(200).json({
      success: true,
      code,
      market,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? null,
      changePct: q.regularMarketChangePercent ?? null,
      marketCap: q.marketCap ?? null,
    })
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message })
  }
}
