import { useMemo, useState } from 'react'
import { Calculator, ChevronDown, Download, RotateCcw } from 'lucide-react'
import { calculateRows, DEFAULT_INPUTS, type CalculatorInputs, type CalculationRow } from './calculations'

type InputKey = keyof CalculatorInputs
const fields: { key: InputKey; label: string; symbol: string; unit: string; step: string }[] = [
  { key: 'initialDiameter', label: 'ドラム初期径', symbol: 'D₀', unit: 'mm', step: '0.1' },
  { key: 'beltThickness', label: 'ベルト厚さ', symbol: 't', unit: 'mm', step: '0.1' },
  { key: 'maxTurns', label: '最大巻き数', symbol: 'N', unit: '巻', step: '1' },
  { key: 'remainingStroke', label: '最大巻き時の残りストローク', symbol: 'Sₙ', unit: 'mm', step: '0.1' },
  { key: 'gearRatio', label: 'ギア比', symbol: 'i', unit: '—', step: '0.1' },
  { key: 'initialDrumAngle', label: 'ドラム初期回転角', symbol: 'θ₀', unit: 'deg', step: '0.01' },
  { key: 'anglePerTurn', label: '1巻当たりの回転角', symbol: 'Δθ', unit: 'deg', step: '0.1' },
]
const format = (value: number) => value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function validate(values: Record<InputKey, string>) {
  const errors: Partial<Record<InputKey, string>> = {}
  for (const field of fields) {
    const raw = values[field.key]
    const number = Number(raw)
    if (raw.trim() === '') errors[field.key] = '値を入力してください'
    else if (!Number.isFinite(number)) errors[field.key] = '有効な数値を入力してください'
    else if (number < 0) errors[field.key] = '0以上の値を入力してください'
  }
  const turns = Number(values.maxTurns)
  if (values.maxTurns && (!Number.isInteger(turns) || turns < 1 || turns > 1000)) errors.maxTurns = '1〜1000の整数を入力してください'
  return errors
}

function ResultChart({ rows }: { rows: CalculationRow[] }) {
  const width = 800, height = 340, left = 82, right = 28, top = 25, bottom = 58
  const xValues = rows.map(r => r.stroke), yValues = rows.map(r => r.motorAngle)
  const minX = Math.min(...xValues), maxX = Math.max(...xValues), minY = Math.min(...yValues), maxY = Math.max(...yValues)
  const x = (v: number) => left + (v - minX) / (maxX - minX || 1) * (width - left - right)
  const y = (v: number) => height - bottom - (v - minY) / (maxY - minY || 1) * (height - top - bottom)
  const points = [...rows].reverse().map(r => `${x(r.stroke)},${y(r.motorAngle)}`).join(' ')
  return <div className="chart-scroll"><svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="昇降ストロークとモータ軸回転角のグラフ">
    {[0, .25, .5, .75, 1].map(p => { const yy = top + p * (height - top - bottom); const value = maxY - p * (maxY - minY); return <g key={`y${p}`}><line x1={left} x2={width-right} y1={yy} y2={yy} className="grid"/><text x={left-12} y={yy+4} textAnchor="end">{Math.round(value).toLocaleString()}</text></g> })}
    {[0, .25, .5, .75, 1].map(p => { const xx = left + p * (width-left-right); const value = minX + p * (maxX-minX); return <g key={`x${p}`}><line x1={xx} x2={xx} y1={top} y2={height-bottom} className="grid"/><text x={xx} y={height-bottom+23} textAnchor="middle">{Math.round(value).toLocaleString()}</text></g> })}
    <polyline points={points} className="plot-line"/>
    {rows.map(r => <circle key={r.turn} cx={x(r.stroke)} cy={y(r.motorAngle)} r="5" className="plot-point"><title>{`${r.turn}巻：ストローク ${format(r.stroke)} mm / モータ角 ${format(r.motorAngle)} deg`}</title></circle>)}
    <text x={(left+width-right)/2} y={height-8} textAnchor="middle" className="axis-label">昇降ストローク［mm］</text>
    <text transform={`translate(18 ${(top+height-bottom)/2}) rotate(-90)`} textAnchor="middle" className="axis-label">モータ軸回転角［deg］</text>
  </svg></div>
}

export default function App() {
  const defaults = Object.fromEntries(Object.entries(DEFAULT_INPUTS).map(([key, value]) => [key, String(value)])) as Record<InputKey, string>
  const [values, setValues] = useState(defaults)
  const errors = useMemo(() => validate(values), [values])
  const valid = Object.keys(errors).length === 0
  const rows = useMemo(() => valid ? calculateRows(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)])) as unknown as CalculatorInputs) : [], [valid, values])
  const summary = rows.length ? { maxStroke: Math.max(...rows.map(r => r.stroke)), minStroke: Math.min(...rows.map(r => r.stroke)), maxMotor: Math.max(...rows.map(r => r.motorAngle)) } : null
  const downloadCsv = () => {
    const header = ['巻き数','巻き外径[mm]','ベルト中心径[mm]','1巻当たりのベルト長さ[mm]','昇降ストローク[mm]','ドラム軸回転角[deg]','モータ軸回転角[deg]']
    const csv = '\uFEFF' + [header, ...rows.map(r => [r.turn,r.outerDiameter,r.centerDiameter,r.beltLength,r.stroke,r.drumAngle,r.motorAngle])].map(line => line.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href=url; a.download='lift-stroke-results.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return <><header><div className="header-inner"><div className="logo"><Calculator size={26}/></div><div><h1>昇降ストローク計算</h1><p>ドラム巻径とモータ軸回転角の関係</p></div></div></header>
    <main><section className="panel"><div className="section-heading"><div><span className="eyebrow">INPUT PARAMETERS</span><h2>計算条件</h2></div><button className="secondary" onClick={() => setValues(defaults)}><RotateCcw size={16}/>初期値に戻す</button></div>
      <div className="input-grid">{fields.map(field => <label key={field.key} className={errors[field.key] ? 'invalid' : ''}><span>{field.label} <small>{field.symbol}</small></span><div className="input-wrap"><input type="number" step={field.step} value={values[field.key]} onChange={e => setValues(v => ({...v, [field.key]: e.target.value}))} aria-describedby={`${field.key}-error`}/><b>{field.unit}</b></div>{errors[field.key] && <em id={`${field.key}-error`}>{errors[field.key]}</em>}</label>)}</div>
    </section>
    {summary ? <><section><span className="eyebrow">CALCULATION SUMMARY</span><h2>計算サマリー</h2><div className="summary-grid">
      {[['最大昇降ストローク',summary.maxStroke,'mm'],['最小昇降ストローク',summary.minStroke,'mm'],['ストローク差',summary.maxStroke-summary.minStroke,'mm'],['最大モータ軸回転角',summary.maxMotor,'deg']].map(([label,value,unit],i) => <article className={`summary-card c${i}`} key={String(label)}><span>{label}</span><strong>{format(Number(value))}</strong><small>{unit}</small></article>)}</div></section>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">RESULTS</span><h2>計算結果</h2></div><button className="primary" onClick={downloadCsv}><Download size={16}/>CSVダウンロード</button></div><div className="table-scroll"><table><thead><tr>{['巻き数','巻き外径［mm］','ベルト中心径［mm］','1巻当たりのベルト長さ［mm］','昇降ストローク［mm］','ドラム軸回転角［deg］','モータ軸回転角［deg］'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.turn}><td><b>{r.turn}</b><small> 巻</small></td>{[r.outerDiameter,r.centerDiameter,r.beltLength,r.stroke,r.drumAngle,r.motorAngle].map((v,i)=><td key={i}>{format(v)}</td>)}</tr>)}</tbody></table></div></section>
      <section className="panel"><span className="eyebrow">RELATIONSHIP CHART</span><h2>ストロークとモータ軸回転角</h2><p className="hint">各点にカーソルを合わせると詳細を確認できます。</p><ResultChart rows={rows}/></section>
      <details className="panel formula"><summary><div><span className="eyebrow">FORMULAS</span><h2>計算式について</h2></div><ChevronDown/></summary><div className="formula-grid"><div><b>巻き外径</b><code>Dout(k) = D₀ + 2kt</code></div><div><b>ベルト中心径</b><code>Dc(k) = D₀ + (2k − 1)t</code></div><div><b>1巻当たりの長さ</b><code>L(k) = π × Dc(k)</code></div><div><b>昇降ストローク</b><code>S(n) = Sₙ + π(N − n)&#123;D₀ + t(N + n − 1)&#125;</code></div><div><b>ドラム軸回転角</b><code>θdrum(n) = θ₀ + Δθ(N − n)</code></div><div><b>モータ軸回転角</b><code>θmotor(n) = i × θdrum(n)</code></div></div></details></> : <div className="error-banner">入力内容を修正すると、計算結果がここに表示されます。</div>}
    </main><footer>昇降ストローク計算ツール <span>•</span> すべての計算はブラウザ内で実行されます</footer></>
}
