// Shared signal-build pipeline. Used by both /api/cron/signals (scheduled, Bearer-auth)
// and /api/signals/trigger (public, rate-limited).
import { put } from '@vercel/blob'
import YahooFinance from 'yahoo-finance2'
import { KOSPI200_UNIQUE } from '../../src/lib/kospi200.js'
import { KOSDAQ150 } from '../../src/lib/kosdaq150.js'
import { sectorOf, iconOf } from '../../src/lib/sectors.js'
import { fetchNaverInvestor } from './naver.js'
import { toYahooTicker, toKstYyyymmdd } from './yahoo.js'

const yahooFinance = new YahooFinance()

async function fetchOHLCV(code, market) {
  const ticker = toYahooTicker(code, market)
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 21)
  try {
    const res = await yahooFinance.historical(ticker, { period1: start, period2: end, interval: '1d' })
    if (!res || res.length === 0) return null
    return res
      .filter((d) => d.close != null && d.close > 0)
      .map((d) => ({ date: toKstYyyymmdd(d.date), close: Math.round(d.close) }))
  } catch {
    return null
  }
}

async function fetchQuotesBulk(tickers, chunkSize = 75) {
  const capByTicker = new Map()
  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize)
    try {
      const result = await yahooFinance.quote(chunk)
      const list = Array.isArray(result) ? result : [result]
      for (const q of list) if (q?.symbol) capByTicker.set(q.symbol, q.marketCap ?? null)
    } catch { /* fall through with nulls */ }
  }
  return capByTicker
}

async function runBatched(items, concurrency, fn) {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    await Promise.allSettled(batch.map(fn))
  }
}

function buildResult(stock, market, ohlcv, marketCap, investor) {
  if (!ohlcv || ohlcv.length < 2 || !investor || investor.length < 3) return null
  try {
    const last = ohlcv[ohlcv.length - 1]
    const prev = ohlcv[ohlcv.length - 2]
    const price = last.close
    const change = price - prev.close
    const changePct = (change / prev.close) * 100
    const closeByDate = Object.fromEntries(ohlcv.map((d) => [d.date, d.close]))
    const sortedDesc = [...investor].sort((a, b) => b.date.localeCompare(a.date))
    const last3 = sortedDesc.slice(0, 3)
    const fillPrice = (date) => closeByDate[date] || price
    const foreignAmt = last3.reduce((s, d) => s + d.foreign * fillPrice(d.date), 0)
    const instAmt = last3.reduce((s, d) => s + d.inst * fillPrice(d.date), 0)
    const foreignQty = last3.reduce((s, d) => s + d.foreign, 0)
    const instQty = last3.reduce((s, d) => s + d.inst, 0)
    const foreignConsec = last3.every((d) => d.foreign > 0)
    const instConsec = last3.every((d) => d.inst > 0)
    const streak = (key) => {
      let n = 0
      for (const d of sortedDesc) { if (d[key] > 0) n += 1; else break }
      return n
    }
    return {
      code: stock.code, name: stock.name,
      sector: sectorOf(stock.code), iconText: iconOf(stock.code, stock.name),
      market, price, change, changePct,
      marketCap: marketCap ?? null,
      foreign: { consec: foreignConsec, amt: foreignAmt, qty: foreignQty, streak: streak('foreign') },
      inst: { consec: instConsec, amt: instAmt, qty: instQty, streak: streak('inst') },
      days: last3,
    }
  } catch {
    return null
  }
}

function filterAndSort(stocks, { filter, amt, qty, consecDays, isDual }) {
  const mapped = stocks.filter(filter).map((s) => {
    const a = amt(s)
    return {
      code: s.code, name: s.name, sector: s.sector, iconText: s.iconText,
      market: s.market, price: s.price, change: s.change, changePct: s.changePct,
      marketCap: s.marketCap,
      consecDays: consecDays(s),
      netBuy3d: a, netBuyQty3d: qty(s),
      netBuyRatio: s.marketCap ? (a / s.marketCap) * 100 : null,
      ...(isDual ? { dual: true } : {}),
    }
  })
  return {
    amt: [...mapped].sort((a, b) => b.netBuy3d - a.netBuy3d).slice(0, 30),
    qty: [...mapped].sort((a, b) => b.netBuyQty3d - a.netBuyQty3d).slice(0, 30),
  }
}

function buildSignals(stocks) {
  const out = {}
  for (const [pool, key] of [
    [stocks.filter((s) => s.market === 'KOSPI'), 'kospi'],
    [stocks.filter((s) => s.market === 'KOSDAQ'), 'kosdaq'],
  ]) {
    const fr = filterAndSort(pool, { filter: (s) => s.foreign.consec, amt: (s) => s.foreign.amt, qty: (s) => s.foreign.qty, consecDays: (s) => s.foreign.streak })
    const ir = filterAndSort(pool, { filter: (s) => s.inst.consec, amt: (s) => s.inst.amt, qty: (s) => s.inst.qty, consecDays: (s) => s.inst.streak })
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

async function fetchMarketSummary() {
  const tickers = ['^KS11', '^KQ11', 'KRW=X']
  const out = { kospi: null, kosdaq: null, fx_usd: null }
  try {
    const quotes = await yahooFinance.quote(tickers)
    const list = Array.isArray(quotes) ? quotes : [quotes]
    for (const q of list) {
      const entry = { value: q.regularMarketPrice, change: q.regularMarketChange, pct: q.regularMarketChangePercent }
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
    if (!s.marketCap) continue
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
      access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
    })
  } catch { /* best-effort */ }
}

export async function buildAndPersist() {
  const startedAt = new Date().toISOString()
  const universe = [
    ...KOSPI200_UNIQUE.map((s) => ({ stock: s, market: 'KOSPI' })),
    ...KOSDAQ150.map((s) => ({ stock: s, market: 'KOSDAQ' })),
  ]
  const ohlcvByCode = new Map()
  const investorByCode = new Map()
  const tickers = universe.map(({ stock, market }) => toYahooTicker(stock.code, market))

  const [capByTicker, , , marketSummary] = await Promise.all([
    fetchQuotesBulk(tickers, 75),
    runBatched(universe, 20, async ({ stock, market }) => {
      const data = await fetchOHLCV(stock.code, market)
      if (data) ohlcvByCode.set(stock.code, data)
    }),
    runBatched(universe, 8, async ({ stock }) => {
      const data = await fetchNaverInvestor(stock.code)
      if (data) investorByCode.set(stock.code, data)
    }),
    fetchMarketSummary(),
  ])

  const all = []
  const failures = []
  for (const { stock, market } of universe) {
    const ticker = toYahooTicker(stock.code, market)
    const ohlcv = ohlcvByCode.get(stock.code)
    const investor = investorByCode.get(stock.code)
    const cap = capByTicker.get(ticker) ?? null
    const r = buildResult(stock, market, ohlcv, cap, investor)
    if (r) all.push(r)
    else failures.push({ code: stock.code, missing: { ohlcv: !ohlcv, investor: !investor } })
  }

  const signals = buildSignals(all)
  const sectorPerf = buildSectorPerf(all)
  const finishedAt = new Date().toISOString()
  const payload = {
    updatedAt: finishedAt,
    universeCount: universe.length,
    processedCount: all.length,
    marketSummary, sectorPerf, signals,
  }

  await put('signals-results.json', JSON.stringify(payload), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
  })
  await writeStatus({
    lastSuccessAt: finishedAt, lastAttemptAt: finishedAt, startedAt,
    processedCount: all.length, universeCount: universe.length,
    failureCount: failures.length, sampleFailures: failures.slice(0, 10),
    lastError: null,
  })

  return {
    processedCount: all.length,
    universeCount: universe.length,
    failureCount: failures.length,
    updatedAt: finishedAt,
  }
}

export async function recordFailure(error, startedAt) {
  await writeStatus({ lastAttemptAt: startedAt, lastError: error.message })
}
