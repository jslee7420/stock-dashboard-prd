/**
 * 스코어링 로직
 * 5개 조건에 대해 판정 + 점수 계산
 */

/**
 * 조건 A: RSI (14)
 * RSI <= 20 → 반등 또는 RSI >= Signal → 충족
 * 배점: RSI * 0.1 (max 10)
 */
export function evaluateRSI(rsi, rsiSignal) {
  if (rsi === null || rsi === undefined) return { met: false, score: 0, detail: {} }
  const met = rsi <= 20 || rsi >= (rsiSignal ?? 0)
  const score = Math.min(10, rsi * 0.1)
  return {
    met,
    score: Math.round(score * 100) / 100,
    detail: { rsi: Math.round(rsi * 100) / 100, rsiSignal: rsiSignal ? Math.round(rsiSignal * 100) / 100 : null }
  }
}

/**
 * 조건 B: MA20
 * 종가 > 20일 이동평균 → 충족
 * 배점: 충족 시 5점
 */
export function evaluateMA20(close, ma20) {
  if (ma20 === null || ma20 === undefined) return { met: false, score: 0, detail: {} }
  const met = close > ma20
  return {
    met,
    score: met ? 5 : 0,
    detail: { close, ma20: Math.round(ma20) }
  }
}

/**
 * 조건 C: 거래량
 * 당일 거래량 > 5일 평균 * 1.5 → 충족
 * 배점: 거래량 배율(max 5x) * 8 (max 40)
 */
export function evaluateVolume(volume, avgVolume5) {
  if (!avgVolume5 || avgVolume5 === 0) return { met: false, score: 0, detail: {} }
  const ratio = volume / avgVolume5
  const met = ratio > 1.5
  const score = Math.min(40, Math.min(ratio, 5) * 8)
  return {
    met,
    score: Math.round(score * 100) / 100,
    detail: {
      volume,
      avgVolume5: Math.round(avgVolume5),
      ratio: Math.round(ratio * 100) / 100
    }
  }
}

/**
 * 조건 D: MACD 제로라인 (12,26,9)
 * MACD >= 0 + MACD > Signal → 충족
 * 배점: 충족 시 20점
 */
export function evaluateMACD(macd, signal) {
  if (macd === null || signal === null) return { met: false, score: 0, detail: {} }
  const aboveZero = macd >= 0
  const aboveSignal = macd > signal
  const met = aboveZero && aboveSignal

  // MACD 표시
  let label = ''
  if (aboveSignal && aboveZero) label = '▲(+)'
  else if (aboveSignal && !aboveZero) label = '▲(-)'
  else if (!aboveSignal && aboveZero) label = '▽(+)'
  else label = '▽(-)'

  return {
    met,
    score: met ? 20 : 0,
    detail: {
      macd: Math.round(macd * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      label,
      aboveZero,
      aboveSignal
    }
  }
}

/**
 * 조건 E: Slow Stochastic (10,5,5)
 * %K > %D + %K < 50 → 충족
 * 배점: 충족 시 25점
 */
export function evaluateStochastic(k, d) {
  if (k === null || d === null) return { met: false, score: 0, detail: {} }
  const kAboveD = k > d
  const kBelow50 = k < 50
  const met = kAboveD && kBelow50
  return {
    met,
    score: met ? 25 : 0,
    detail: {
      k: Math.round(k * 100) / 100,
      d: Math.round(d * 100) / 100,
      kAboveD,
      kBelow50
    }
  }
}

/**
 * 전체 스코어링 수행
 */
export function evaluateAll(ohlcv, indicators) {
  const lastIdx = ohlcv.length - 1
  const lastClose = ohlcv[lastIdx].close
  const lastVolume = ohlcv[lastIdx].volume

  const rsi = evaluateRSI(
    indicators.rsi[lastIdx],
    indicators.rsiSignal[lastIdx]
  )
  const ma20 = evaluateMA20(lastClose, indicators.ma20[lastIdx])
  const volume = evaluateVolume(lastVolume, indicators.avgVolume5[lastIdx])
  const macd = evaluateMACD(
    indicators.macd.macd[lastIdx],
    indicators.macd.signal[lastIdx]
  )
  const stochastic = evaluateStochastic(
    indicators.stochastic.k[lastIdx],
    indicators.stochastic.d[lastIdx]
  )

  const totalScore = rsi.score + ma20.score + volume.score + macd.score + stochastic.score

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    conditions: {
      A: { name: 'RSI (14)', ...rsi, maxScore: 10 },
      B: { name: 'MA20', ...ma20, maxScore: 5 },
      C: { name: '거래량', ...volume, maxScore: 40 },
      D: { name: 'MACD', ...macd, maxScore: 20 },
      E: { name: 'Stochastic', ...stochastic, maxScore: 25 },
    }
  }
}
