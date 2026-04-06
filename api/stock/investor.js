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

  // Naver Finance /item/frgn.naver 실제 HTML 구조:
  // 날짜 셀: <td class="tc"><span class="tah p10 gray03">2026.04.06</span></td>
  // 나머지: <td class="num"><span class="tah p11 ...">값</span></td>
  // 컬럼순: 날짜 | 종가 | 전일비 | 등락률 | 거래량 | 기관순매매 | 외국인순매매 | 보유주수 | 보유율

  const rowRegex = /<tr\s+onMouseOver[^>]*>([\s\S]*?)<\/tr>/g

  let match
  while ((match = rowRegex.exec(html)) !== null && results.length < 5) {
    const rowHtml = match[1]

    // 날짜 추출
    const dateMatch = rowHtml.match(/(\d{4}\.\d{2}\.\d{2})/)
    if (!dateMatch) continue

    // 모든 td 셀 값 추출
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g
    const values = []
    let cellMatch
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const raw = cellMatch[1]
        .replace(/<[^>]+>/g, '')   // HTML 태그 제거
        .replace(/,/g, '')         // 콤마 제거
        .replace(/\s+/g, '')       // 공백 제거
        .replace(/%/g, '')         // 퍼센트 제거
        .replace(/\+/g, '')        // + 기호 제거
      values.push(raw)
    }

    // values[0]=날짜, [1]=종가, [2]=전일비, [3]=등락률, [4]=거래량, [5]=기관순매매, [6]=외국인순매매, [7]=보유주수, [8]=보유율
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
