/**
 * 기술적 지표 계산 모듈
 * OHLCV 데이터를 받아 RSI, MA20, MACD, Slow Stochastic 등 계산
 */

/** SMA (단순이동평균) */
function sma(data, period) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += data[i - j]
      }
      result.push(sum / period)
    }
  }
  return result
}

/** EMA (지수이동평균) */
function ema(data, period) {
  const result = []
  const k = 2 / (period + 1)
  let prevEma = null

  for (let i = 0; i < data.length; i++) {
    if (data[i] === null || data[i] === undefined) {
      result.push(null)
      continue
    }
    if (prevEma === null) {
      // 첫 번째 유효값은 그대로 사용
      prevEma = data[i]
      result.push(prevEma)
    } else {
      prevEma = data[i] * k + prevEma * (1 - k)
      result.push(prevEma)
    }
  }
  return result
}

/**
 * RSI (Relative Strength Index)
 * @param {number[]} closes - 종가 배열
 * @param {number} period - 기간 (기본 14)
 */
export function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return []

  const changes = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1])
  }

  const gains = changes.map(c => (c > 0 ? c : 0))
  const losses = changes.map(c => (c < 0 ? -c : 0))

  const result = [null] // 첫 번째 값은 변화없음
  let avgGain = 0
  let avgLoss = 0

  // 첫 period 구간 평균
  for (let i = 0; i < period; i++) {
    avgGain += gains[i]
    avgLoss += losses[i]
    result.push(null)
  }
  avgGain /= period
  avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push(100 - 100 / (1 + rs))

  // 이후 smoothing
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  return result
}

/**
 * RSI Signal (RSI의 EMA)
 */
export function calcRSISignal(rsiValues, period = 9) {
  const validRsi = rsiValues.map(v => (v === null ? null : v))
  return ema(validRsi, period)
}

/**
 * MA20 (20일 이동평균)
 */
export function calcMA20(closes) {
  return sma(closes, 20)
}

/**
 * 5일 평균 거래량
 */
export function calcAvgVolume5(volumes) {
  return sma(volumes, 5)
}

/**
 * MACD (12, 26, 9)
 * @returns {{ macd: number[], signal: number[], histogram: number[] }}
 */
export function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)

  const macdLine = emaFast.map((f, i) => {
    if (f === null || emaSlow[i] === null) return null
    return f - emaSlow[i]
  })

  const signalLine = ema(macdLine, signal)

  const histogram = macdLine.map((m, i) => {
    if (m === null || signalLine[i] === null) return null
    return m - signalLine[i]
  })

  return { macd: macdLine, signal: signalLine, histogram }
}

/**
 * Slow Stochastic (10, 5, 5)
 * %K = SMA(Fast %K, 5), %D = SMA(%K, 5)
 * Fast %K = (Close - Lowest Low(10)) / (Highest High(10) - Lowest Low(10)) * 100
 */
export function calcStochastic(highs, lows, closes, kPeriod = 10, kSmooth = 5, dSmooth = 5) {
  const fastK = []

  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      fastK.push(null)
      continue
    }
    let lowestLow = Infinity
    let highestHigh = -Infinity
    for (let j = 0; j < kPeriod; j++) {
      lowestLow = Math.min(lowestLow, lows[i - j])
      highestHigh = Math.max(highestHigh, highs[i - j])
    }
    const range = highestHigh - lowestLow
    fastK.push(range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100)
  }

  // %K = SMA(fastK, kSmooth)
  const kLine = sma(
    fastK.map(v => (v === null ? 0 : v)),
    kSmooth
  )
  // null 복원
  for (let i = 0; i < kPeriod - 1 + kSmooth - 1; i++) {
    if (i < kLine.length) kLine[i] = null
  }

  // %D = SMA(%K, dSmooth)
  const dLine = sma(
    kLine.map(v => (v === null ? 0 : v)),
    dSmooth
  )
  for (let i = 0; i < kPeriod - 1 + kSmooth - 1 + dSmooth - 1; i++) {
    if (i < dLine.length) dLine[i] = null
  }

  return { k: kLine, d: dLine }
}

/**
 * 모든 지표를 한번에 계산
 */
export function calculateAllIndicators(ohlcv) {
  const closes = ohlcv.map(d => d.close)
  const highs = ohlcv.map(d => d.high)
  const lows = ohlcv.map(d => d.low)
  const volumes = ohlcv.map(d => d.volume)

  const rsi = calcRSI(closes, 14)
  const rsiSignal = calcRSISignal(rsi, 9)
  const ma20 = calcMA20(closes)
  const avgVolume5 = calcAvgVolume5(volumes)
  const macd = calcMACD(closes, 12, 26, 9)
  const stochastic = calcStochastic(highs, lows, closes, 10, 5, 5)

  return { rsi, rsiSignal, ma20, avgVolume5, macd, stochastic }
}
