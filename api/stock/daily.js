// Vercel Serverless Function: Yahoo Finance 일별 시세(OHLCV) 조회
import yahooFinance from 'yahoo-finance2'

function getPeriodDates(period) {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case '1m': start.setMonth(start.getMonth() - 1); break
    case '3m': start.setMonth(start.getMonth() - 3); break
    case '6m': start.setMonth(start.getMonth() - 6); break
    case '1y': start.setFullYear(start.getFullYear() - 1); break
    default: start.setMonth(start.getMonth() - 3)
  }

  return { period1: start, period2: end }
}

function toYahooTicker(code) {
  // 숫자 6자리 종목코드 → Yahoo 티커 변환
  // 코스피: .KS, 코스닥: .KQ
  // 기본적으로 .KS로 시도
  if (/^\d{6}$/.test(code)) {
    return `${code}.KS`
  }
  return code
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, period = '3m' } = req.query
  if (!code) return res.status(400).json({ error: 'code parameter required' })

  const ticker = toYahooTicker(code)
  const { period1, period2 } = getPeriodDates(period)

  try {
    // 일봉 데이터 조회
    const result = await yahooFinance.historical(ticker, {
      period1,
      period2,
      interval: '1d',
    })

    if (!result || result.length === 0) {
      // .KS 실패 시 .KQ로 재시도
      if (ticker.endsWith('.KS')) {
        const kqTicker = code + '.KQ'
        const kqResult = await yahooFinance.historical(kqTicker, {
          period1,
          period2,
          interval: '1d',
        })
        if (kqResult && kqResult.length > 0) {
          return res.status(200).json({
            success: true,
            name: '',
            ohlcv: formatOHLCV(kqResult),
          })
        }
      }
      return res.status(200).json({ success: false, error: 'No data found' })
    }

    // 종목명 조회
    let stockName = ''
    try {
      const quote = await yahooFinance.quote(ticker)
      stockName = quote?.shortName || quote?.longName || ''
    } catch { /* ignore */ }

    return res.status(200).json({
      success: true,
      name: stockName,
      ohlcv: formatOHLCV(result),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

function formatOHLCV(data) {
  return data
    .filter(d => d.close != null && d.close > 0)
    .map(d => ({
      date: d.date.toISOString().slice(0, 10).replace(/-/g, ''),
      open: Math.round(d.open),
      high: Math.round(d.high),
      low: Math.round(d.low),
      close: Math.round(d.close),
      volume: d.volume || 0,
    }))
}
