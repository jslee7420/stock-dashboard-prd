// Vercel Cron Job: 코스피200/코스닥150 외인·기관 3일 연속 순매수 시그널 배치
// 출력 → Vercel Blob signals-results.json
import { buildAndPersist, recordFailure } from '../_lib/buildAndPersistSignals.js'

export const config = { maxDuration: 300 }

// Auth: cron-triggered runs carry "Authorization: Bearer ${CRON_SECRET}".
// Manual triggers must include the same Bearer header.
function isAuthorized(req) {
  const expected = process.env.CRON_SECRET
  if (!expected) return true // dev/test
  return req.headers.authorization === `Bearer ${expected}`
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const startedAt = new Date().toISOString()
  try {
    const result = await buildAndPersist()
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    await recordFailure(error, startedAt)
    return res.status(500).json({ error: error.message })
  }
}
