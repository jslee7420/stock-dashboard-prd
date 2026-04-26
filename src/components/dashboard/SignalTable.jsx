import { useMemo } from 'react'
import Icon from './Icon'
import StockLogo from './StockLogo'
import { KRW, signed, pct } from './utils'

const onKeyActivate = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handler()
  }
}

function Th({ label, k, align = 'right', extra = '', sort, setSort }) {
  const flip = () => setSort({ key: k, dir: sort.key === k && sort.dir === 'desc' ? 'asc' : 'desc' })
  return (
    <div
      className={'th ' + (sort.key === k ? 'sorted ' : '') + extra}
      style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
      onClick={flip}
      onKeyDown={onKeyActivate(flip)}
      role="button"
      tabIndex={0}
      aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      aria-label={`${label} 정렬`}
    >
      <span>{label}</span>
      <span className="arrow" aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span>
    </div>
  )
}

export default function SignalTable({ data, selectedCode, onSelect, sort, setSort, basis }) {
  const sorted = useMemo(() => {
    const arr = [...data]
    arr.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      return (a[sort.key] - b[sort.key]) * dir
    })
    return arr
  }, [data, sort])

  const isQty = basis === 'qty'
  const primaryKey = isQty ? 'netBuyQty3d' : 'netBuy3d'
  const primaryLabel = isQty ? '3일 순매수량' : '3일 순매수'
  const formatPrimary = (s) =>
    isQty ? s.netBuyQty3d.toLocaleString('ko-KR') + '주' : signed(s.netBuy3d, KRW)

  return (
    <div className="signal-table" role="table" aria-label="수급 시그널 종목 리스트">
      <div className="row head" role="row">
        <div>#</div>
        <div className="th" style={{ cursor: 'default' }}>종목</div>
        <Th label="현재가" k="price" sort={sort} setSort={setSort} />
        <Th label="등락률" k="changePct" extra="change-th" sort={sort} setSort={setSort} />
        <Th label={primaryLabel} k={primaryKey} sort={sort} setSort={setSort} />
        <Th label={isQty ? '거래대금' : '시총 대비'} k={isQty ? 'netBuy3d' : 'netBuyRatio'} extra="ratio-th" sort={sort} setSort={setSort} />
        <div />
      </div>
      {sorted.map((s, i) => {
        const dir = s.changePct >= 0 ? 'up' : 'down'
        const select = () => onSelect(s)
        return (
          <div
            key={s.code}
            data-code={s.code}
            className={
              'row ' +
              (s.dual ? 'dual ' : '') +
              (selectedCode === s.code ? 'selected ' : '') +
              (i < 3 ? 'top-3' : '')
            }
            onClick={select}
            onKeyDown={onKeyActivate(select)}
            role="button"
            tabIndex={0}
            aria-label={`${s.name} ${s.code}`}
            aria-pressed={selectedCode === s.code}
          >
            <div className="rank">{i + 1}</div>
            <div className="name-cell">
              <StockLogo code={s.code} fallback={s.iconText} />
              <div className="name-stack">
                <div className="name">
                  {s.name}
                  {s.dual && <span className="dual-ribbon">동시</span>}
                </div>
                <div className="code">{s.code} · {s.sector}</div>
              </div>
            </div>
            <div className="price num">{s.price.toLocaleString('ko-KR')}</div>
            <div className={'change num ' + dir}>{pct(s.changePct)}</div>
            <div className="net-buy num up">{formatPrimary(s)}</div>
            <div className="ratio num">
              {isQty
                ? signed(s.netBuy3d, KRW)
                : (s.netBuyRatio == null ? '—' : s.netBuyRatio.toFixed(2) + '%')}
              <span className="consec-dots" aria-hidden="true">
                {Array.from({ length: Math.min(5, s.consecDays) }).map((_, k) => (
                  <span key={k} className="dot" />
                ))}
              </span>
            </div>
            <div className="chev" aria-hidden="true"><Icon name="chev" size={14} /></div>
          </div>
        )
      })}
    </div>
  )
}
