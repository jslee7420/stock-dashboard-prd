// Vercel Serverless Function: 종목 검색
// Yahoo Finance search API + 로컬 종목 리스트 매핑
import yahooFinance from 'yahoo-finance2'

const STOCK_LIST = [
  { code: '005930', name: '삼성전자' },
  { code: '000660', name: 'SK하이닉스' },
  { code: '373220', name: 'LG에너지솔루션' },
  { code: '207940', name: '삼성바이오로직스' },
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
  { code: '003550', name: 'LG' },
  { code: '032830', name: '삼성생명' },
  { code: '018260', name: '삼성에스디에스' },
  { code: '011200', name: 'HMM' },
  { code: '009150', name: '삼성전기' },
  { code: '010130', name: '고려아연' },
  { code: '033780', name: 'KT&G' },
  { code: '030200', name: 'KT' },
  { code: '017670', name: 'SK텔레콤' },
  { code: '316140', name: '우리금융지주' },
  { code: '034020', name: '두산에너빌리티' },
  { code: '000810', name: '삼성화재' },
  { code: '010950', name: 'S-Oil' },
  { code: '011170', name: '롯데케미칼' },
  { code: '024110', name: '기업은행' },
  { code: '015760', name: '한국전력' },
  { code: '036570', name: '엔씨소프트' },
  { code: '251270', name: '넷마블' },
  { code: '263750', name: '펄어비스' },
  { code: '352820', name: '하이브' },
  { code: '259960', name: '크래프톤' },
  { code: '003490', name: '대한항공' },
  { code: '180640', name: '한진칼' },
  { code: '004020', name: '현대제철' },
  { code: '009540', name: '한국조선해양' },
  { code: '010140', name: '삼성중공업' },
  { code: '042700', name: '한미반도체' },
  { code: '247540', name: '에코프로비엠' },
  { code: '086520', name: '에코프로' },
  { code: '006800', name: '미래에셋증권' },
  { code: '377300', name: '카카오페이' },
  { code: '323410', name: '카카오뱅크' },
  { code: '361610', name: 'SK아이이테크놀로지' },
  { code: '302440', name: 'SK바이오사이언스' },
  { code: '326030', name: 'SK바이오팜' },
  { code: '128940', name: '한미약품' },
  { code: '000100', name: '유한양행' },
  { code: '047810', name: '한국항공우주' },
  { code: '012450', name: '한화에어로스페이스' },
  { code: '009270', name: '한화오션' },
  { code: '267250', name: '현대중공업' },
  { code: '064350', name: '현대로템' },
  { code: '079550', name: 'LIG넥스원' },
  { code: '272210', name: '한화시스템' },
  { code: '003230', name: '삼양식품' },
  { code: '004370', name: '농심' },
  { code: '271560', name: '오리온' },
  { code: '000880', name: '한화' },
  { code: '011070', name: 'LG이노텍' },
  { code: '034220', name: 'LG디스플레이' },
  { code: '000720', name: '현대건설' },
  { code: '047050', name: '포스코인터내셔널' },
  { code: '035250', name: '강원랜드' },
  { code: '267260', name: '현대일렉트릭' },
  { code: '004490', name: '세방전지' },
  { code: '112610', name: '씨에스윈드' },
  { code: '044380', name: '주성엔지니어링' },
  { code: '000150', name: '두산' },
  { code: '090430', name: '아모레퍼시픽' },
  { code: '051900', name: 'LG생활건강' },
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { keyword } = req.query
  if (!keyword) return res.status(400).json({ error: 'keyword parameter required' })

  const query = keyword.trim().toUpperCase()

  // 로컬 리스트에서 먼저 검색
  const localResults = STOCK_LIST.filter(
    s => s.code.includes(query) || s.name.toUpperCase().includes(query)
  ).slice(0, 20)

  if (localResults.length > 0) {
    return res.status(200).json({ results: localResults })
  }

  // 로컬에 없으면 Yahoo Finance search 시도
  try {
    const searchResults = await yahooFinance.search(keyword, { newsCount: 0 })
    const results = (searchResults.quotes || [])
      .filter(q => q.exchange === 'KSC' || q.exchange === 'KOE')
      .map(q => ({
        code: q.symbol.replace('.KS', '').replace('.KQ', ''),
        name: q.shortname || q.longname || q.symbol,
      }))
      .slice(0, 20)

    return res.status(200).json({ results })
  } catch {
    return res.status(200).json({ results: [] })
  }
}
