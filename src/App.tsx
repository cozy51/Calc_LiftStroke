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

function InputGuide() {
  return <details className="panel input-guide" open>
    <summary>
      <div><span className="eyebrow">PARAMETER GUIDE</span><h2>入力値の意味</h2></div>
      <ChevronDown />
    </summary>
    <div className="guide-content">
      <figure className="drum-diagram">
        <svg viewBox="0 0 640 350" role="img" aria-labelledby="diagram-title diagram-description">
          <title id="diagram-title">ドラムとベルトの入力寸法</title>
          <desc id="diagram-description">ドラムにベルトが巻かれ、ベルト先端の荷物が昇降する様子と、径、厚さ、ストローク、回転方向を示した模式図</desc>
          <defs>
            <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" fill="#2876a8" /></marker>
            <marker id="arrow-teal" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" fill="#148b8d" /></marker>
          </defs>
          <line x1="44" y1="294" x2="595" y2="294" className="diagram-ground" />
          <circle cx="220" cy="158" r="94" className="belt-roll" />
          <circle cx="220" cy="158" r="67" className="drum-core" />
          <circle cx="220" cy="158" r="9" className="drum-shaft" />
          <path d="M220 158 L287 158" className="radius-line" />
          <path d="M286 158 C305 158 322 176 322 198 L322 271" className="hanging-belt" />
          <rect x="286" y="270" width="72" height="43" rx="4" className="load" />
          <text x="322" y="297" textAnchor="middle" className="load-label">昇降体</text>
          <line x1="220" y1="245" x2="220" y2="71" className="dimension" markerStart="url(#arrow-blue)" markerEnd="url(#arrow-blue)" />
          <text x="207" y="119" textAnchor="end" className="dimension-label">D₀</text>
          <text x="207" y="137" textAnchor="end" className="dimension-note">初期径</text>
          <line x1="273" y1="94" x2="292" y2="78" className="thickness-dimension" markerStart="url(#arrow-teal)" markerEnd="url(#arrow-teal)" />
          <text x="303" y="74" className="teal-label">t：ベルト厚さ</text>
          <path d="M150 72 A105 105 0 0 1 296 74" className="rotation-arrow" markerEnd="url(#arrow-teal)" />
          <text x="220" y="35" textAnchor="middle" className="teal-label">θ：ドラム回転角</text>
          <line x1="405" y1="114" x2="405" y2="270" className="dimension" markerStart="url(#arrow-blue)" markerEnd="url(#arrow-blue)" />
          <line x1="370" y1="114" x2="430" y2="114" className="extension" />
          <line x1="370" y1="270" x2="430" y2="270" className="extension" />
          <text x="421" y="184" className="dimension-label">S(n)</text>
          <text x="421" y="202" className="dimension-note">昇降ストローク</text>
          <g transform="translate(475 120)">
            <circle cx="42" cy="42" r="31" className="motor" /><circle cx="42" cy="42" r="7" className="drum-shaft" />
            <text x="42" y="91" textAnchor="middle" className="diagram-caption">モータ</text>
            <path d="M11 42 H-18" className="shaft-link" /><text x="42" y="4" textAnchor="middle" className="teal-label">θmotor = i × θdrum</text>
          </g>
        </svg>
        <figcaption>模式図（寸法比は実際とは異なります）</figcaption>
      </figure>
      <div className="parameter-notes">
        <dl>
          <div><dt><b>D₀</b> ドラム初期径</dt><dd>ベルトを巻く前の、ドラム芯の直径です。</dd></div>
          <div><dt><b>t</b> ベルト厚さ</dt><dd>ベルト1層の厚さです。1巻ごとに外径が両側で厚くなります。</dd></div>
          <div><dt><b>N</b> 最大巻き数</dt><dd>ドラムへ巻き取る最大の回数です。結果はN巻から1巻まで表示します。</dd></div>
          <div><dt><b>Sₙ</b> 最大巻き時の残りストローク</dt><dd>N巻まで巻いた状態でも残しておく昇降距離です。</dd></div>
          <div><dt><b>i</b> ギア比</dt><dd>ドラム軸角度に対するモータ軸角度の倍率です。</dd></div>
          <div><dt><b>θ₀</b> ドラム初期回転角</dt><dd>最大巻き時を基準としたドラム軸の開始角度です。</dd></div>
          <div><dt><b>Δθ</b> 1巻当たりの回転角</dt><dd>巻き数が1つ変わるごとに加算するドラム軸の角度です。</dd></div>
        </dl>
      </div>
    </div>
  </details>
}

function FormulaGuide() {
  return <details className="panel formula" open>
    <summary>
      <div><span className="eyebrow">CALCULATION PROCESS</span><h2>計算式</h2></div>
      <ChevronDown />
    </summary>
    <div className="formula-intro">
      <span className="step-number">01</span>
      <p>入力値から各巻き数の径とベルト長さを求め、その累積値を昇降ストロークと軸回転角へ変換します。</p>
    </div>
    <div className="formula-grid">
      <div><span className="formula-step">1</span><b>巻き外径</b><code>Dout(k) = D₀ + 2kt</code><small>巻き数に応じたベルト外側の直径</small></div>
      <div><span className="formula-step">2</span><b>ベルト中心径</b><code>Dc(k) = D₀ + (2k − 1)t</code><small>ベルト長さを求めるための中心線の直径</small></div>
      <div><span className="formula-step">3</span><b>1巻当たりの長さ</b><code>L(k) = π × Dc(k)</code><small>中心径の円周から1巻分の長さを算出</small></div>
      <div><span className="formula-step">4</span><b>昇降ストローク</b><code>S(n) = Sₙ + π(N − n)&#123;D₀ + t(N + n − 1)&#125;</code><small>残りストロークへ巻き取り長さを加算</small></div>
      <div><span className="formula-step">5</span><b>ドラム軸回転角</b><code>θdrum(n) = θ₀ + Δθ(N − n)</code><small>初期角度へ巻き数差分の角度を加算</small></div>
      <div><span className="formula-step">6</span><b>モータ軸回転角</b><code>θmotor(n) = i × θdrum(n)</code><small>ドラム軸角度へギア比を乗算</small></div>
    </div>
    <div className="result-flow"><span>入力条件</span><i>→</i><span>径・長さ</span><i>→</i><span>ストローク</span><i>→</i><strong>計算結果</strong></div>
  </details>
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
    <InputGuide />
    <FormulaGuide />
    {summary ? <><section><span className="eyebrow">CALCULATION SUMMARY</span><h2>計算サマリー</h2><div className="summary-grid">
      {[['最大昇降ストローク',summary.maxStroke,'mm'],['最小昇降ストローク',summary.minStroke,'mm'],['ストローク差',summary.maxStroke-summary.minStroke,'mm'],['最大モータ軸回転角',summary.maxMotor,'deg']].map(([label,value,unit],i) => <article className={`summary-card c${i}`} key={String(label)}><span>{label}</span><strong>{format(Number(value))}</strong><small>{unit}</small></article>)}</div></section>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">RESULTS</span><h2>計算結果</h2></div><button className="primary" onClick={downloadCsv}><Download size={16}/>CSVダウンロード</button></div><div className="table-scroll"><table><thead><tr>{['巻き数','巻き外径［mm］','ベルト中心径［mm］','1巻当たりのベルト長さ［mm］','昇降ストローク［mm］','ドラム軸回転角［deg］','モータ軸回転角［deg］'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.turn}><td><b>{r.turn}</b><small> 巻</small></td>{[r.outerDiameter,r.centerDiameter,r.beltLength,r.stroke,r.drumAngle,r.motorAngle].map((v,i)=><td key={i}>{format(v)}</td>)}</tr>)}</tbody></table></div></section>
      <section className="panel"><span className="eyebrow">RELATIONSHIP CHART</span><h2>ストロークとモータ軸回転角</h2><p className="hint">各点にカーソルを合わせると詳細を確認できます。</p><ResultChart rows={rows}/></section></> : <div className="error-banner">入力内容を修正すると、計算結果がここに表示されます。</div>}
    </main><footer>昇降ストローク計算ツール <span>•</span> すべての計算はブラウザ内で実行されます</footer></>
}
