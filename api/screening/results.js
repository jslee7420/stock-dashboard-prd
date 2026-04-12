// Vercel Serverless Function: 캐시된 스크리닝 결과 조회
import { list } from '@vercel/blob'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { blobs } = await list({ prefix: 'screening-results' })

    if (!blobs || blobs.length === 0) {
      return res.status(200).json({ success: false, error: 'No screening data available' })
    }

    const blob = blobs[0]
    const response = await fetch(blob.url, { cache: 'no-store' })
    const data = await response.json()

    return res.status(200).json({ success: true, ...data })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
