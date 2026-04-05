// 공통 유틸: 토큰 발급 및 캐싱
let cachedToken = null
let tokenExpiry = 0

export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const appKey = process.env.KIS_APP_KEY
  const appSecret = process.env.KIS_APP_SECRET

  if (!appKey || !appSecret) {
    throw new Error('KIS_APP_KEY and KIS_APP_SECRET must be set')
  }

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
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
  } else {
    throw new Error('Failed to get access token')
  }

  return cachedToken
}
