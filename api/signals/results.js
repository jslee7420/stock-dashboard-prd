// Vercel Serverless Function: 캐시된 수급 시그널 조회
// 수동 trigger로 갱신된 직후에도 CDN이 이전 응답을 60초 동안 반환하던 문제로 no-store.
// trigger 5분 쿨다운이 있어 호출량은 자연 제한됨.
import { list } from '@vercel/blob'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { blobs } = await list({ prefix: 'signals-results' })
    if (!blobs || blobs.length === 0) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).json({ success: false, code: 'NO_DATA', error: '아직 시그널 데이터가 생성되지 않았습니다 (크론 미실행)' })
    }
    // Pick the freshest blob in case multiple exist
    const blob = [...blobs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0]
    const response = await fetch(blob.url, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Blob fetch failed: ${response.status}`)
    const data = await response.json()
    return res.status(200).json({ success: true, ...data })
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ success: false, code: 'INTERNAL', error: error.message })
  }
}
