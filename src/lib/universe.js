// 검색 가능한 전체 종목 universe (KOSPI200 + KOSDAQ150).
// 시그널에 포함되지 않은 종목도 검색되며, 선택 시 실시간 quote API로 데이터를 가져옴.
import { KOSPI200_UNIQUE } from './kospi200.js'
import { KOSDAQ150 } from './kosdaq150.js'
import { sectorOf, iconOf } from './sectors.js'

const enrich = (s, market) => ({
  code: s.code,
  name: s.name,
  market,
  sector: sectorOf(s.code),
  iconText: iconOf(s.code, s.name),
})

export const STOCK_UNIVERSE = [
  ...KOSPI200_UNIQUE.map((s) => enrich(s, 'KOSPI')),
  ...KOSDAQ150.map((s) => enrich(s, 'KOSDAQ')),
]

const BY_CODE = new Map(STOCK_UNIVERSE.map((s) => [s.code, s]))
export const universeByCode = (code) => BY_CODE.get(code) || null
