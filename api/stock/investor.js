// Vercel Serverless Function: Naver Finance 기관/외인 투자자 매매동향 조회
import { fetchNaverInvestor } from '../_lib/naver.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'code parameter required' })
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'invalid code format' })
  }

  const rows = await fetchNaverInvestor(code)
  if (!rows) return res.status(200).json({ success: false, error: 'Naver fetch failed' })
  // 기존 컨트랙트 호환: institutional 키 사용
  const data = rows.map((r) => ({
    date: r.date,
    institutional: r.inst,
    foreign: r.foreign,
  }))
  return res.status(200).json({ success: true, data })
}
