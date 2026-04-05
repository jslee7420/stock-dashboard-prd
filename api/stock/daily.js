// Vercel Serverless Function: 주식 일별 시세(OHLCV) 조회
import { getAccessToken } from './_common.js'

function getDateRange(period) {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case '1m': start.setMonth(start.getMonth() - 1); break
    case '3m': start.setMonth(start.getMonth() - 3); break
    case '6m': start.setMonth(start.getMonth() - 6); break
    case '1y': start.setFullYear(start.getFullYear() - 1); break
    default: start.setMonth(start.getMonth() - 3)
  }

  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
  return { startDate: fmt(start), endDate: fmt(end) }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, period = '3m' } = req.query
  if (!code) return res.status(400).json({ error: 'code parameter required' })

  try {
    const token = await getAccessToken()
    const appKey = process.env.KIS_APP_KEY
    const appSecret = process.env.KIS_APP_SECRET
    const { startDate, endDate } = getDateRange(period)

    const url = new URL('https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice')
    url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J')
    url.searchParams.set('FID_INPUT_ISCD', code)
    url.searchParams.set('FID_INPUT_DATE_1', startDate)
    url.searchParams.set('FID_INPUT_DATE_2', endDate)
    url.searchParams.set('FID_PERIOD_DIV_CODE', 'D')
    url.searchParams.set('FID_ORG_ADJ_PRC', '0')

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: 'FHKST03010100',
      },
    })

    const data = await response.json()

    // OHLCV 형태로 변환
    if (data.output2) {
      const ohlcv = data.output2
        .map(item => ({
          date: item.stck_bsop_date,
          open: Number(item.stck_oprc),
          high: Number(item.stck_hgpr),
          low: Number(item.stck_lwpr),
          close: Number(item.stck_clpr),
          volume: Number(item.acml_vol),
        }))
        .filter(item => item.close > 0)
        .reverse() // 오래된 날짜 → 최신 순서

      return res.status(200).json({
        success: true,
        name: data.output1?.hts_kor_isnm || '',
        ohlcv,
      })
    }

    return res.status(200).json({ success: false, raw: data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
