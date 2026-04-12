// Vercel Cron Job: 코스피200 전 종목 스크리닝 배치
import { put } from '@vercel/blob'
import YahooFinance from 'yahoo-finance2'
import { KOSPI200_UNIQUE } from '../../src/lib/kospi200.js'
import { calculateAllIndicators } from '../../src/lib/indicators.js'
import { evaluateAll } from '../../src/lib/scoring.js'

const yahooFinance = new YahooFinance()

export const config = {
  maxDuration: 300,
}

function toYahooTicker(code) {
  return /^\d{6}$/.test(code) ? `${code}.KS` : code
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

async function fetchOHLCV(code) {
  const ticker = toYahooTicker(code)
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 3)

  try {
    let result = await yahooFinance.historical(ticker, {
      period1: start, period2: end, interval: '1d',
    })
    if ((!result || result.length === 0) && ticker.endsWith('.KS')) {
      result = await yahooFinance.historical(code + '.KQ', {
        period1: start, period2: end, interval: '1d',
      })
    }
    if (!result || result.length === 0) return null
    return formatOHLCV(result)
  } catch {
    return null
  }
}

async function fetchInvestor(code) {
  try {
    const url = `https://finance.naver.com/item/frgn.naver?code=${code}&page=1`
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!resp.ok) return null
    const buffer = await resp.arrayBuffer()
    const html = new TextDecoder('euc-kr').decode(buffer)
    return parseInvestorData(html)
  } catch {
    return null
  }
}

function parseInvestorData(html) {
  const results = []
  const rowRegex = /<tr\s+onMouseOver[^>]*>([\s\S]*?)<\/tr>/g

  let match
  while ((match = rowRegex.exec(html)) !== null && results.length < 5) {
    const rowHtml = match[1]
    const dateMatch = rowHtml.match(/(\d{4}\.\d{2}\.\d{2})/)
    if (!dateMatch) continue

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g
    const values = []
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const raw = cellMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/,/g, '')
        .replace(/\s+/g, '')
        .replace(/%/g, '')
        .replace(/\+/g, '')
      values.push(raw)
    }

    if (values.length >= 7) {
      results.push({
        date: dateMatch[1].replace(/\./g, ''),
        institutional: parseInt(values[5]) || 0,
        foreign: parseInt(values[6]) || 0,
      })
    }
  }
  return results
}

async function processStock(stock) {
  try {
    const [ohlcv, investorData] = await Promise.all([
      fetchOHLCV(stock.code),
      fetchInvestor(stock.code),
    ])

    if (!ohlcv || ohlcv.length < 30) return null

    const indicators = calculateAllIndicators(ohlcv)
    const evaluation = evaluateAll(ohlcv, indicators)

    let investor = null
    if (investorData && investorData.length >= 3) {
      const last3 = investorData.slice(0, 3)
      investor = {
        institutionalConsecutive: last3.every(d => d.institutional > 0),
        foreignConsecutive: last3.every(d => d.foreign > 0),
        totalInstitutional: last3.reduce((s, d) => s + d.institutional, 0),
        totalForeign: last3.reduce((s, d) => s + d.foreign, 0),
        days: last3,
      }
    }

    return {
      code: stock.code,
      name: stock.name,
      score: evaluation.totalScore,
      conditions: evaluation.conditions,
      close: ohlcv[ohlcv.length - 1].close,
      investor,
    }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  // Vercel Cron 인증 확인 (수동 트리거 허용)
  const authHeader = req.headers.authorization
  const isManual = req.query.manual === 'true'
  if (process.env.CRON_SECRET && !isManual && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const results = []
    const stocks = KOSPI200_UNIQUE
    const batchSize = 10

    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(processStock))
      for (const result of batchResults) {
        if (result) results.push(result)
      }
    }

    const payload = {
      updatedAt: new Date().toISOString(),
      count: results.length,
      results,
    }

    await put('screening-results.json', JSON.stringify(payload), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })

    return res.status(200).json({
      success: true,
      count: results.length,
      updatedAt: payload.updatedAt,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
