// Vercel Serverless Function: 한국투자증권 OAuth 토큰 발급
let cachedToken = null
let tokenExpiry = 0

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET

  if (!appKey || !appSecret) {
    return res.status(500).json({ error: 'API keys not configured' })
  }

  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && Date.now() < tokenExpiry) {
    return res.status(200).json({ access_token: cachedToken, cached: true })
  }

  try {
    const response = await fetch('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
    })

    const data = await response.json()

    if (data.access_token) {
      cachedToken = data.access_token
      // 토큰 유효기간: 약 24시간, 안전하게 23시간으로 설정
      tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
    }

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
