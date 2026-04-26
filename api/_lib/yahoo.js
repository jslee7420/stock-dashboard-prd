// Shared: Yahoo Finance helpers for KRX tickers

export const toYahooTicker = (code, market) =>
  /^\d{6}$/.test(code) ? `${code}.${market === 'KOSDAQ' ? 'KQ' : 'KS'}` : code

// Yahoo timestamps are UTC; KRX trades in KST. Normalize to KST yyyymmdd so
// downstream date joins (e.g. price-by-day × shares-by-day) align with Naver dates.
export const toKstYyyymmdd = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })
    .format(date)
    .replace(/-/g, '')
