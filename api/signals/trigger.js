// Public manual-trigger endpoint with rate limiting.
// 5분 쿨다운: 최근 lastSuccessAt이 5분 내면 429를 반환해 DoS/과금 공격 방어.
import { list } from '@vercel/blob'
import { buildAndPersist, recordFailure } from '../_lib/buildAndPersistSignals.js'

export const config = { maxDuration: 300 }
const COOLDOWN_MS = 5 * 60 * 1000

async function readStatus() {
  try {
    const { blobs } = await list({ prefix: 'signals-status' })
    if (!blobs?.length) return null
    const blob = [...blobs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0]
    const r = await fetch(blob.url, { cache: 'no-store' })
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const status = await readStatus()
  if (status?.lastSuccessAt) {
    const elapsed = Date.now() - new Date(status.lastSuccessAt).getTime()
    if (elapsed < COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      res.setHeader('Retry-After', String(retryAfterSec))
      return res.status(429).json({
        success: false,
        code: 'COOLDOWN',
        error: `최근 ${Math.ceil(elapsed / 1000)}초 전에 갱신됨. ${retryAfterSec}초 후 재시도 가능합니다.`,
        lastSuccessAt: status.lastSuccessAt,
        retryAfterSec,
      })
    }
  }

  const startedAt = new Date().toISOString()
  try {
    const result = await buildAndPersist()
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    await recordFailure(error, startedAt)
    return res.status(500).json({ success: false, error: error.message })
  }
}
