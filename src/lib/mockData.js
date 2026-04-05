/**
 * 로컬 개발용 목업 데이터
 * API 서버 없이도 대시보드를 테스트할 수 있도록 함
 */

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

/** 목업 OHLCV 데이터 생성 (약 100일치) */
export function generateMockOHLCV(code) {
  const days = 100
  const ohlcv = []
  const now = new Date()

  // 종목별 기본 가격대
  const bases = {
    '005930': 72000, '000660': 180000, '035420': 210000,
    '035720': 45000, '068270': 190000, '005380': 250000,
    '000270': 120000, '051910': 370000, '006400': 400000,
    '207940': 800000, '055550': 45000, '105560': 65000,
  }
  let price = bases[code] || 50000

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    // 주말 스킵
    if (date.getDay() === 0 || date.getDay() === 6) continue

    const change = price * randomBetween(-0.04, 0.04)
    const open = price
    const close = Math.round(price + change)
    const high = Math.round(Math.max(open, close) * (1 + Math.random() * 0.02))
    const low = Math.round(Math.min(open, close) * (1 - Math.random() * 0.02))
    const volume = Math.round(randomBetween(500000, 5000000))

    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')

    ohlcv.push({ date: dateStr, open, high, low, close, volume })
    price = close
  }

  return ohlcv
}

const MOCK_STOCKS = [
  { code: '005930', name: '삼성전자' },
  { code: '000660', name: 'SK하이닉스' },
  { code: '373220', name: 'LG에너지솔루션' },
  { code: '005380', name: '현대차' },
  { code: '000270', name: '기아' },
  { code: '068270', name: '셀트리온' },
  { code: '005490', name: 'POSCO홀딩스' },
  { code: '035420', name: 'NAVER' },
  { code: '035720', name: '카카오' },
  { code: '051910', name: 'LG화학' },
  { code: '006400', name: '삼성SDI' },
  { code: '003670', name: '포스코퓨처엠' },
  { code: '055550', name: '신한지주' },
  { code: '105560', name: 'KB금융' },
  { code: '086790', name: '하나금융지주' },
  { code: '012330', name: '현대모비스' },
  { code: '066570', name: 'LG전자' },
  { code: '028260', name: '삼성물산' },
  { code: '096770', name: 'SK이노베이션' },
  { code: '034730', name: 'SK' },
  { code: '207940', name: '삼성바이오로직스' },
  { code: '009150', name: '삼성전기' },
  { code: '033780', name: 'KT&G' },
  { code: '030200', name: 'KT' },
  { code: '017670', name: 'SK텔레콤' },
  { code: '352820', name: '하이브' },
  { code: '259960', name: '크래프톤' },
  { code: '042700', name: '한미반도체' },
  { code: '247540', name: '에코프로비엠' },
  { code: '086520', name: '에코프로' },
]

/** 목업 종목 검색 */
export function mockSearchStock(keyword) {
  const q = keyword.trim().toUpperCase()
  return MOCK_STOCKS.filter(
    s => s.code.includes(q) || s.name.toUpperCase().includes(q)
  ).slice(0, 20)
}

/** 목업 일별 시세 */
export function mockGetStockDaily(code) {
  const stock = MOCK_STOCKS.find(s => s.code === code)
  return {
    success: true,
    name: stock?.name || `종목 ${code}`,
    ohlcv: generateMockOHLCV(code),
  }
}
