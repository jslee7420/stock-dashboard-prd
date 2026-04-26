function Seg({ label, value, options, onChange }) {
  return (
    <div className="filter-group">
      <div className="filter-label">{label}</div>
      <div className="segmented">
        {options.map(([k, l]) => (
          <button key={k} className={'seg ' + (value === k ? 'active' : '')} onClick={() => onChange(k)}>
            <span>{l}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FilterBar({ basis, setBasis, market, setMarket, investor, setInvestor, topN, setTopN, count }) {
  return (
    <div className="filter-bar">
      <Seg label="기준" value={basis} onChange={setBasis} options={[['amt', '금액'], ['qty', '수량']]} />
      <Seg label="시장" value={market} onChange={setMarket} options={[['kospi', '코스피 200'], ['kosdaq', '코스닥 150']]} />
      <Seg label="투자자" value={investor} onChange={setInvestor} options={[['foreign', '외국인'], ['inst', '기관'], ['dual', '동시']]} />
      <Seg label="표시" value={topN} onChange={setTopN} options={[[5, '5'], [10, '10'], [20, '20'], [30, '30']]} />
      <div className="filter-count">
        <span className="num">{count}</span>
        <span className="filter-count-l">종목</span>
      </div>
    </div>
  )
}
