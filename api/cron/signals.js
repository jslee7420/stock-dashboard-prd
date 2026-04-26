// Vercel Cron Job: 코스피200/코스닥150 외인·기관 3일 연속 순매수 시그널 배치
// 출력 → Vercel Blob의 signals-results.json
// 프론트는 /api/signals/results 로 읽어감
import { put } from '@vercel/blob'
import YahooFinance from 'yahoo-finance2'
import { KOSPI200_UNIQUE } from '../../src/lib/kospi200.js'
import { KOSDAQ150 } from '../../src/lib/kosdaq150.js'
import { sectorOf, iconOf } from '../../src/lib/sectors.js'
import { fetchNaverInvestor } from '../_lib/naver.js'
import { toYahooTicker, toKstYyyymmdd } from '../_lib/yahoo.js'

const yahooFinance = new YahooFinance()

export const config = { maxDuration: 300 }

async function fetchOHLCV(code, market) {
  const ticker = toYahooTicker(code, market)
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 21) // ≥7 trading days incl. holidays (Chuseok/Seollal margin)
  try {
    const res = await yahooFinance.historical(ticker, { period1: start, period2: end, interval: '1d' })
    if (!res || res.length === 0) return null
    return res
      .filter((d) => d.close != null && d.close > 0)
      .map((d) => ({
        date: toKstYyyymmdd(d.date),
        close: Math.round(d.close),
      }))
  } catch {
    return null
  }
}

async function fetchQuote(code, market) {
  const ticker = toYahooTicker(code, market)
  try {
    const q = await yahooFinance.quote(ticker)
    return { marketCap: q?.marketCap || null }
  } catch {
    return { marketCap: null }
  }
}

async function processStock(stock, market) {
  try {
    const [ohlcv, quote, investor] = await Promise.all([
      fetchOHLCV(stock.code, market),
      fetchQuote(stock.code, market),
      fetchNaverInvestor(stock.code),
    ])
    if (!ohlcv || ohlcv.length < 2 || !investor || investor.length < 3) return null

    const last = ohlcv[ohlcv.length - 1]
    const prev = ohlcv[ohlcv.length - 2]
    const price = last.close
    const change = price - prev.close
    const changePct = (change / prev.close) * 100

    // Date → close lookup so 3일 금액을 그날 종가 × 주식수로 산출 (Yahoo/Naver 모두 KST yyyymmdd로 통일됨)
    const closeByDate = Object.fromEntries(ohlcv.map((d) => [d.date, d.close]))
    // Naver lists newest-first; sort descending defensively in case the page layout changes
    const last3 = [...investor].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
    const fillPrice = (date) => closeByDate[date] || price

    const foreignAmt = last3.reduce((s, d) => s + d.foreign * fillPrice(d.date), 0)
    const instAmt = last3.reduce((s, d) => s + d.inst * fillPrice(d.date), 0)
    const foreignQty = last3.reduce((s, d) => s + d.foreign, 0)
    const instQty = last3.reduce((s, d) => s + d.inst, 0)

    const foreignConsec = last3.every((d) => d.foreign > 0)
    const instConsec = last3.every((d) => d.inst > 0)

    // 실제 연속일수: Naver 5일 페이지 기준 외인/기관 각각의 연속 매수일
    const streak = (key) => {
      let n = 0
      for (const d of [...investor].sort((a, b) => b.date.localeCompare(a.date))) {
        if (d[key] > 0) n += 1
        else break
      }
      return n
    }

    // marketCap은 Yahoo 미반환 시 null 유지 — 가짜 분모로 시총대비% 오염 금지
    return {
      code: stock.code,
      name: stock.name,
      sector: sectorOf(stock.code),
      iconText: iconOf(stock.code, stock.name),
      market,
      price,
      change,
      changePct,
      marketCap: quote.marketCap ?? null,
      foreign: { consec: foreignConsec, amt: foreignAmt, qty: foreignQty, streak: streak('foreign') },
      inst: { consec: instConsec, amt: instAmt, qty: instQty, streak: streak('inst') },
      days: last3,
    }
  } catch {
    return null
  }
}

function buildSignals(stocks) {
  const out = {}
  for (const [pool, key] of [
    [stocks.filter((s) => s.market === 'KOSPI'), 'kospi'],
    [stocks.filter((s) => s.market === 'KOSDAQ'), 'kosdaq'],
  ]) {
    const fr = filterAndSort(pool, {
      filter: (s) => s.foreign.consec,
      amt: (s) => s.foreign.amt,
      qty: (s) => s.foreign.qty,
      consecDays: (s) => s.foreign.streak,
    })
    const ir = filterAndSort(pool, {
      filter: (s) => s.inst.consec,
      amt: (s) => s.inst.amt,
      qty: (s) => s.inst.qty,
      consecDays: (s) => s.inst.streak,
    })
    const dr = filterAndSort(pool, {
      filter: (s) => s.foreign.consec && s.inst.consec,
      amt: (s) => s.foreign.amt + s.inst.amt,
      qty: (s) => s.foreign.qty + s.inst.qty,
      consecDays: (s) => Math.min(s.foreign.streak, s.inst.streak),
      isDual: true,
    })
    out[`${key}-foreign`] = fr.amt
    out[`${key}-foreign-qty`] = fr.qty
    out[`${key}-inst`] = ir.amt
    out[`${key}-inst-qty`] = ir.qty
    out[`${key}-dual`] = dr.amt
    out[`${key}-dual-qty`] = dr.qty
  }
  return out
}

function filterAndSort(stocks, { filter, amt, qty, consecDays, isDual }) {
  const mapped = stocks.filter(filter).map((s) => {
    const a = amt(s)
    return {
      code: s.code, name: s.name, sector: s.sector, iconText: s.iconText,
      market: s.market, price: s.price, change: s.change, changePct: s.changePct,
      marketCap: s.marketCap,
      consecDays: consecDays(s),
      netBuy3d: a,
      netBuyQty3d: qty(s),
      // marketCap가 null/0이면 null로 두고 UI에서 "—" 처리. 가짜 분모 금지.
      netBuyRatio: s.marketCap ? (a / s.marketCap) * 100 : null,
      ...(isDual ? { dual: true } : {}),
    }
  })
  return {
    amt: [...mapped].sort((a, b) => b.netBuy3d - a.netBuy3d).slice(0, 30),
    qty: [...mapped].sort((a, b) => b.netBuyQty3d - a.netBuyQty3d).slice(0, 30),
  }
}

async function fetchMarketSummary() {
  const tickers = ['^KS11', '^KQ11', 'KRW=X']
  const out = { kospi: null, kosdaq: null, fx_usd: null }
  try {
    const quotes = await yahooFinance.quote(tickers)
    const list = Array.isArray(quotes) ? quotes : [quotes]
    for (const q of list) {
      const entry = {
        value: q.regularMarketPrice,
        change: q.regularMarketChange,
        pct: q.regularMarketChangePercent,
      }
      if (q.symbol === '^KS11') out.kospi = entry
      else if (q.symbol === '^KQ11') out.kosdaq = entry
      else if (q.symbol === 'KRW=X') out.fx_usd = entry
    }
  } catch { /* leave nulls */ }
  return out
}

function buildSectorPerf(stocks) {
  const bySector = new Map()
  for (const s of stocks) {
    if (!s.marketCap) continue // 시총 없는 종목은 가중평균에서 제외
    const k = s.sector || '기타'
    const cur = bySector.get(k) || { name: k, capSum: 0, weightedPctSum: 0 }
    cur.capSum += s.marketCap
    cur.weightedPctSum += s.changePct * s.marketCap
    bySector.set(k, cur)
  }
  return [...bySector.values()]
    .map((b) => ({ name: b.name, cap: b.capSum, pct: b.capSum > 0 ? b.weightedPctSum / b.capSum : 0 }))
    .sort((a, b) => b.cap - a.cap)
}

async function writeStatus(status) {
  try {
    await put('signals-status.json', JSON.stringify(status), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
  } catch { /* status sidecar best-effort */ }
}

// Auth: cron-triggered runs carry "Authorization: Bearer ${CRON_SECRET}".
// Manual triggers must include the same Bearer header (no public ?manual=true bypass).
function isAuthorized(req) {
  const expected = process.env.CRON_SECRET
  if (!expected) return true // dev/test without secret configured
  return req.headers.authorization === `Bearer ${expected}`
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const startedAt = new Date().toISOString()
  try {
    const all = []
    const failures = []
    const universe = [
      ...KOSPI200_UNIQUE.map((s) => ({ stock: s, market: 'KOSPI' })),
      ...KOSDAQ150.map((s) => ({ stock: s, market: 'KOSDAQ' })),
    ]
    const batchSize = 10
    for (let i = 0; i < universe.length; i += batchSize) {
      const batch = universe.slice(i, i + batchSize)
      const settled = await Promise.allSettled(batch.map(({ stock, market }) => processStock(stock, market)))
      settled.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value) all.push(res.value)
        else if (res.status === 'rejected') failures.push({ code: batch[idx].stock.code, error: String(res.reason).slice(0, 200) })
      })
    }

    const marketSummary = await fetchMarketSummary()
    const signals = buildSignals(all)
    const sectorPerf = buildSectorPerf(all)

    const finishedAt = new Date().toISOString()
    const payload = {
      updatedAt: finishedAt,
      universeCount: universe.length,
      processedCount: all.length,
      marketSummary,
      sectorPerf,
      signals,
    }

    await put('signals-results.json', JSON.stringify(payload), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    await writeStatus({
      lastSuccessAt: finishedAt,
      lastAttemptAt: finishedAt,
      processedCount: all.length,
      universeCount: universe.length,
      failureCount: failures.length,
      sampleFailures: failures.slice(0, 10),
      lastError: null,
    })

    return res.status(200).json({
      success: true,
      processedCount: all.length,
      universeCount: universe.length,
      failureCount: failures.length,
      updatedAt: finishedAt,
    })
  } catch (error) {
    await writeStatus({
      lastAttemptAt: startedAt,
      lastError: error.message,
    })
    return res.status(500).json({ error: error.message })
  }
}
