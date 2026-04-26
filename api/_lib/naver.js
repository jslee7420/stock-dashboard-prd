// Shared: Naver Finance frgn.naver scrape (외국인/기관 일별 순매매)
// Returns rows newest-first: [{date: 'YYYYMMDD', inst, foreign}]

export async function fetchNaverInvestor(code) {
  if (!/^\d{6}$/.test(code)) return null
  try {
    const url = `https://finance.naver.com/item/frgn.naver?code=${code}&page=1`
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!resp.ok) return null
    const buffer = await resp.arrayBuffer()
    const html = new TextDecoder('euc-kr').decode(buffer)
    return parseInvestorRows(html)
  } catch {
    return null
  }
}

function parseInvestorRows(html) {
  const rows = []
  const rowRegex = /<tr\s+onMouseOver[^>]*>([\s\S]*?)<\/tr>/g
  let m
  while ((m = rowRegex.exec(html)) !== null && rows.length < 5) {
    const rowHtml = m[1]
    const dateMatch = rowHtml.match(/(\d{4}\.\d{2}\.\d{2})/)
    if (!dateMatch) continue
    const cells = []
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g
    let c
    while ((c = cellRegex.exec(rowHtml)) !== null) {
      cells.push(c[1].replace(/<[^>]+>/g, '').replace(/[,\s%+]/g, ''))
    }
    // 컬럼: 날짜 | 종가 | 전일비 | 등락률 | 거래량 | 기관순매매 | 외국인순매매 | 보유주수 | 보유율
    if (cells.length >= 7) {
      rows.push({
        date: dateMatch[1].replace(/\./g, ''),
        inst: parseInt(cells[5], 10) || 0,
        foreign: parseInt(cells[6], 10) || 0,
      })
    }
  }
  return rows
}
