// E2E smoke test — drives system Chrome to verify dashboard interactions.
// Uses page.setRequestInterception to mock /api/* responses so we don't depend on the real backend.
// Usage: node scripts/e2e.mjs [url]
import puppeteer from 'puppeteer-core'
import { mkdir } from 'node:fs/promises'

const URL = process.argv[2] || 'http://localhost:5175/'
const SHOTS = 'C:/Users/jeong/screenshots'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const results = []
const ok = (name, msg) => { results.push({ ok: true, name, msg }); console.log(`✅ ${name}${msg ? ' — ' + msg : ''}`) }
const fail = (name, msg) => { results.push({ ok: false, name, msg }); console.log(`❌ ${name} — ${msg}`) }

await mkdir(SHOTS, { recursive: true })

// Build a fake signals payload (12 categories × 30 stocks each)
const buildFakeSignals = () => {
  const mk = (n, market, dual) => Array.from({ length: 30 }, (_, i) => ({
    code: String(100000 + n * 100 + i).padStart(6, '0'),
    name: `${market}-${n}-${i + 1}`,
    sector: ['반도체', '자동차', '바이오', '금융', '화학'][i % 5],
    iconText: 'XX',
    market,
    price: 50000 + i * 1000,
    change: (i % 2 ? 1 : -1) * (i + 100),
    changePct: (i % 2 ? 1 : -1) * (0.5 + i * 0.1),
    marketCap: 1e12 + i * 1e10,
    consecDays: 3 + (i % 3),
    netBuy3d: (30 - i) * 100e8,
    netBuyQty3d: (30 - i) * 10000,
    netBuyRatio: (30 - i) * 0.05,
    ...(dual ? { dual: true } : {}),
  }))
  return {
    'kospi-foreign': mk(1, 'KOSPI', false),
    'kospi-inst': mk(2, 'KOSPI', false),
    'kospi-dual': mk(3, 'KOSPI', true),
    'kospi-foreign-qty': mk(4, 'KOSPI', false),
    'kospi-inst-qty': mk(5, 'KOSPI', false),
    'kospi-dual-qty': mk(6, 'KOSPI', true),
    'kosdaq-foreign': mk(7, 'KOSDAQ', false),
    'kosdaq-inst': mk(8, 'KOSDAQ', false),
    'kosdaq-dual': mk(9, 'KOSDAQ', true),
    'kosdaq-foreign-qty': mk(10, 'KOSDAQ', false),
    'kosdaq-inst-qty': mk(11, 'KOSDAQ', false),
    'kosdaq-dual-qty': mk(12, 'KOSDAQ', true),
  }
}

const FAKE_PAYLOAD = {
  success: true,
  updatedAt: '2026-04-26T05:30:00.000Z',
  marketSummary: {
    kospi: { value: 2748.32, change: 18.42, pct: 0.67 },
    kosdaq: { value: 847.91, change: -3.18, pct: -0.37 },
    fx_usd: { value: 1382.40, change: 2.10, pct: 0.15 },
  },
  sectorPerf: [
    { name: '반도체', cap: 580e12, pct: 2.84 },
    { name: '2차전지', cap: 240e12, pct: 3.42 },
    { name: '자동차', cap: 180e12, pct: 1.18 },
    { name: '바이오', cap: 175e12, pct: -1.24 },
    { name: '금융', cap: 160e12, pct: 0.62 },
  ],
  signals: buildFakeSignals(),
}

const FAKE_OHLCV = {
  success: true,
  ohlcv: Array.from({ length: 60 }, (_, i) => {
    const base = 50000 + Math.sin(i / 5) * 3000
    return {
      date: '2026010' + (i % 9 + 1),
      open: Math.round(base),
      high: Math.round(base + 500),
      low: Math.round(base - 500),
      close: Math.round(base + 100),
      volume: 100000,
    }
  }),
}

const FAKE_INVESTOR = {
  success: true,
  data: [
    { date: '20260426', foreign: 12000, institutional: 8000 },
    { date: '20260425', foreign: 9000, institutional: 5000 },
    { date: '20260424', foreign: 7000, institutional: 3000 },
    { date: '20260423', foreign: 4000, institutional: -1000 },
    { date: '20260422', foreign: 2000, institutional: -2000 },
  ],
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: { width: 1440, height: 900 },
  args: ['--no-sandbox', '--disable-gpu'],
})

const page = await browser.newPage()
// Patch window.fetch before the app loads so /api/* calls return mock data
await page.evaluateOnNewDocument(
  (signals, ohlcv, investor) => {
    const realFetch = window.fetch.bind(window)
    const json = (body) => Promise.resolve({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(body),
    })
    json.headers = { get: () => 'application/json' }
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/signals/results')) return json(signals)
      if (url.includes('/api/stock/daily')) return json(ohlcv)
      if (url.includes('/api/stock/investor')) return json(investor)
      return realFetch(input, init)
    }
    // Build proper Response-like object so .ok/.status/.headers work
    const wrap = (data) => ({
      ok: true,
      status: 200,
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: () => Promise.resolve(data),
    })
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/api/signals/results')) return Promise.resolve(wrap(signals))
      if (url.includes('/api/stock/daily')) return Promise.resolve(wrap(ohlcv))
      if (url.includes('/api/stock/investor')) return Promise.resolve(wrap(investor))
      return realFetch(input, init)
    }
  },
  FAKE_PAYLOAD,
  FAKE_OHLCV,
  FAKE_INVESTOR,
)

const consoleErrors = []
page.on('pageerror', (e) => consoleErrors.push(String(e)))
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

try {
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.signal-table .row[data-code]', { timeout: 5000 })
  await page.screenshot({ path: `${SHOTS}/e2e-01-initial.png` })

  const initial = await page.evaluate(() => ({
    rowCount: document.querySelectorAll('.signal-table .row[data-code]').length,
    activeBasis: document.querySelector('.filter-group:nth-child(1) .seg.active')?.innerText.trim(),
    activeMarket: document.querySelector('.filter-group:nth-child(2) .seg.active')?.innerText.trim(),
    activeInvestor: document.querySelector('.filter-group:nth-child(3) .seg.active')?.innerText.trim(),
    activeTopN: document.querySelector('.filter-group:nth-child(4) .seg.active')?.innerText.trim(),
    detailOpen: !!document.querySelector('.detail'),
    treemapCells: document.querySelectorAll('.treemap-cell').length,
    theme: document.documentElement.getAttribute('data-theme'),
    kospiPill: document.querySelector('.market-pill .value')?.innerText,
  }))

  if (initial.rowCount === 10) ok('초기 행 10개 렌더', `${initial.rowCount}행`)
  else fail('초기 행 10개 렌더', `expected 10, got ${initial.rowCount}`)

  if (initial.activeBasis === '금액' && initial.activeMarket === '코스피 200' && initial.activeInvestor === '동시' && initial.activeTopN === '10')
    ok('초기 필터 상태', '금액 / 코스피 200 / 동시 / 10')
  else fail('초기 필터 상태', JSON.stringify(initial))

  if (initial.detailOpen === false) ok('초기 상세패널 닫힘', '진입 시 비표시')
  else fail('초기 상세패널 닫힘', '열려있음')

  if (initial.treemapCells > 0) ok('업종 트리맵 렌더', `${initial.treemapCells}개 셀`)
  else fail('업종 트리맵 렌더', '셀 없음')

  if (initial.theme === 'dark') ok('초기 테마 다크', initial.theme)
  else fail('초기 테마 다크', initial.theme)

  if (initial.kospiPill && initial.kospiPill.includes('2,748')) ok('실시장 KOSPI pill 데이터 표시', initial.kospiPill)
  else fail('실시장 KOSPI pill 데이터 표시', initial.kospiPill)

  // 2. Click first stock
  await page.evaluate(() => document.querySelector('.signal-table .row[data-code]').click())
  await new Promise((r) => setTimeout(r, 400))
  const afterClick = await page.evaluate(() => ({
    detailOpen: !!document.querySelector('.detail'),
    stockName: document.querySelector('.detail .stock-name')?.innerText.trim().split('\n')[0],
    appHasDetail: document.querySelector('.app')?.classList.contains('has-detail'),
  }))
  await page.screenshot({ path: `${SHOTS}/e2e-02-detail-open.png` })
  if (afterClick.detailOpen && afterClick.appHasDetail) ok('종목 클릭 → 상세 패널 열림', afterClick.stockName)
  else fail('종목 클릭 → 상세 패널 열림', JSON.stringify(afterClick))

  // 3. Wait for chart fetch then verify range tab
  await new Promise((r) => setTimeout(r, 400))
  const chartRendered = await page.evaluate(() => document.querySelectorAll('.chart-wrap svg').length > 0)
  if (chartRendered) ok('OHLCV API → 차트 렌더', 'svg 존재')
  else fail('OHLCV API → 차트 렌더', 'svg 없음')

  // 4. Esc to close
  await page.keyboard.press('Escape')
  await new Promise((r) => setTimeout(r, 400))
  const escClosed = await page.evaluate(() => !document.querySelector('.detail'))
  if (escClosed) ok('Esc 키로 상세 패널 닫기', 'OK')
  else fail('Esc 키로 상세 패널 닫기', 'FAIL')

  // 5. Switch market
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.filter-group:nth-child(2) .seg')].find((b) => b.innerText.trim() === '코스닥 150')
    btn?.click()
  })
  await new Promise((r) => setTimeout(r, 200))
  const afterMarket = await page.evaluate(() => ({
    market: document.querySelector('.filter-group:nth-child(2) .seg.active')?.innerText.trim(),
    firstName: document.querySelector('.signal-table .row[data-code] .name')?.innerText.split('\n')[0].trim(),
  }))
  if (afterMarket.market === '코스닥 150' && afterMarket.firstName?.startsWith('KOSDAQ')) ok('시장 전환 (코스닥 150)', `1위: ${afterMarket.firstName}`)
  else fail('시장 전환', JSON.stringify(afterMarket))

  // 6. Switch investor
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.filter-group:nth-child(3) .seg')].find((b) => b.innerText.trim() === '외국인')
    btn?.click()
  })
  await new Promise((r) => setTimeout(r, 200))
  const afterInvestor = await page.evaluate(() => ({
    investor: document.querySelector('.filter-group:nth-child(3) .seg.active')?.innerText.trim(),
    dualBadgeCount: document.querySelectorAll('.signal-table .row[data-code] .dual-ribbon').length,
  }))
  if (afterInvestor.investor === '외국인' && afterInvestor.dualBadgeCount === 0) ok('투자자 전환 (외국인)', '동시 라벨 사라짐')
  else fail('투자자 전환', JSON.stringify(afterInvestor))

  // 7. Switch basis
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.filter-group:nth-child(1) .seg')].find((b) => b.innerText.trim() === '수량')
    btn?.click()
  })
  await new Promise((r) => setTimeout(r, 200))
  const afterBasis = await page.evaluate(() => ({
    basis: document.querySelector('.filter-group:nth-child(1) .seg.active')?.innerText.trim(),
    headers: [...document.querySelectorAll('.signal-table .row.head .th')].map((h) => h.innerText.replace(/[▲▼]/g, '').trim()),
  }))
  if (afterBasis.basis === '수량' && afterBasis.headers.includes('3일 순매수량') && afterBasis.headers.includes('거래대금'))
    ok('기준 전환 (수량)', `헤더 변경 OK`)
  else fail('기준 전환', JSON.stringify(afterBasis))

  // 8. Change topN
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.filter-group:nth-child(4) .seg')].find((b) => b.innerText.trim() === '20')
    btn?.click()
  })
  await new Promise((r) => setTimeout(r, 200))
  const afterTopN = await page.evaluate(() => document.querySelectorAll('.signal-table .row[data-code]').length)
  if (afterTopN === 20) ok('표시 종목 수 (20)', `${afterTopN}행`)
  else fail('표시 종목 수 (20)', `${afterTopN}`)

  // 9. Sort
  await page.evaluate(() => {
    const th = [...document.querySelectorAll('.signal-table .row.head .th')].find((t) => t.innerText.includes('현재가'))
    th?.click()
  })
  await new Promise((r) => setTimeout(r, 100))
  await page.evaluate(() => {
    const th = [...document.querySelectorAll('.signal-table .row.head .th')].find((t) => t.innerText.includes('현재가'))
    th?.click()
  })
  await new Promise((r) => setTimeout(r, 200))
  const sortCheck = await page.evaluate(() => {
    const prices = [...document.querySelectorAll('.signal-table .row[data-code] .price')].map((p) => parseInt(p.innerText.replace(/[^\d]/g, ''), 10))
    const asc = prices.slice().sort((a, b) => a - b)
    return { isAsc: JSON.stringify(prices) === JSON.stringify(asc), first: prices[0], last: prices[prices.length - 1] }
  })
  if (sortCheck.isAsc) ok('현재가 오름차순 정렬', `${sortCheck.first} ~ ${sortCheck.last}`)
  else fail('정렬', JSON.stringify(sortCheck))

  // 10. Theme toggle
  await page.click('.icon-btn:last-of-type')
  await new Promise((r) => setTimeout(r, 200))
  const themeAfterToggle = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await page.screenshot({ path: `${SHOTS}/e2e-03-light.png` })
  if (themeAfterToggle === 'light') ok('라이트 테마 전환', themeAfterToggle)
  else fail('테마', themeAfterToggle)

  // 11. Refresh button (mock returns instantly so no spin window — just check it doesn't break)
  await page.click('.refresh-btn')
  await new Promise((r) => setTimeout(r, 400))
  const afterRefresh = await page.evaluate(() => ({
    spinning: document.querySelector('.refresh-btn')?.classList.contains('spinning'),
    time: document.querySelector('.refresh-time')?.innerText,
  }))
  if (!afterRefresh.spinning && afterRefresh.time && afterRefresh.time !== '—') ok('새로고침 버튼', afterRefresh.time)
  else fail('새로고침', JSON.stringify(afterRefresh))

  // 12. Updated stamp shows date (YY/MM/DD HH:MM)
  if (/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(afterRefresh.time)) ok('업데이트 시각 날짜+시간 포맷', afterRefresh.time)
  else fail('업데이트 시각 포맷', afterRefresh.time)

  // 13. Console errors
  if (consoleErrors.length === 0) ok('콘솔 에러 없음', '0건')
  else fail('콘솔 에러', consoleErrors.slice(0, 3).join(' | ').slice(0, 200))
} catch (err) {
  console.log('FATAL:', err.message)
  fail('치명적 예외', err.message)
} finally {
  await browser.close()
}

const passed = results.filter((r) => r.ok).length
const total = results.length
console.log(`\n=== ${passed}/${total} 통과 ===`)
if (passed !== total) process.exitCode = 1
