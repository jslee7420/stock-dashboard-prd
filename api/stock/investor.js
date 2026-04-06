// Vercel Serverless Function: Naver Finance 기관/외인 투자자 매매동향 조회
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'code parameter required' })

  try {
    const url = `https://finance.naver.com/item/frgn.naver?code=${code}&page=1`
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!resp.ok) {
      return res.status(200).json({ success: false, error: 'Naver fetch failed' })
    }

    const buffer = await resp.arrayBuffer()
    const html = new TextDecoder('euc-kr').decode(buffer)
    const data = parseInvestorData(html)

    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(200).json({ success: false, error: error.message })
  }
}

function parseInvestorData(html) {
  const results = []

  // Naver Finance /item/frgn.naver 테이블 구조:
  // 날짜 | 종가 | 전일비 | 등락률 | 거래량 | 기관순매매량 | 외국인순매매량 | 외국인보유주수 | 외국인보유율
  // 날짜(YYYY.MM.DD) 패턴이 있는 행을 찾아 파싱

  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*class="num"[^>]*>\s*(\d{4}\.\d{2}\.\d{2})\s*<\/td>([\s\S]*?)<\/tr>/g

  let match
  while ((match = rowRegex.exec(html)) !== null && results.length < 5) {
    const date = match[1]
    const restCells = match[2]

    // 나머지 td 셀 값 추출
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g
    const values = []
    let cellMatch
    while ((cellMatch = cellRegex.exec(restCells)) !== null) {
      const raw = cellMatch[1]
        .replace(/<[^>]+>/g, '')   // HTML 태그 제거
        .replace(/,/g, '')         // 콤마 제거
        .replace(/\s+/g, '')       // 공백 제거
        .replace(/%/g, '')         // 퍼센트 제거
      values.push(raw)
    }

    // values[0]=종가, [1]=전일비, [2]=등락률, [3]=거래량, [4]=기관순매매, [5]=외국인순매매, [6]=외보유주수, [7]=외보유율
    if (values.length >= 6) {
      results.push({
        date: date.replace(/\./g, ''),
        institutional: parseInt(values[4]) || 0,
        foreign: parseInt(values[5]) || 0,
      })
    }
  }

  return results
}
