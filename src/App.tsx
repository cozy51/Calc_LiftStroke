import { useMemo, useState, type ReactNode } from 'react'
import { Calculator, ChevronDown, Download, RotateCcw } from 'lucide-react'
import { calculateRows, DEFAULT_INPUTS, DRUM_ANGLE_PER_TURN, type CalculatorInputs, type CalculationRow } from './calculations'

type InputKey = keyof CalculatorInputs
type Field = { key: InputKey; label: string; symbol: string; unit: string; step: string; help: string }

const fieldGroups: { title: string; description: string; fields: Field[] }[] = [
  {
    title: 'ドラム・ベルト条件', description: '巻き径と1巻当たりの移動量を決めます。', fields: [
      { key: 'initialDiameter', label: 'ドラム初期径', symbol: 'D₀', unit: 'mm', step: '0.1', help: 'ベルトを巻く前のドラム外径です。' },
      { key: 'beltThickness', label: 'ベルト厚さ', symbol: 't', unit: 'mm', step: '0.1', help: 'ベルト1層の厚さです。' },
      { key: 'maxTurns', label: '最大巻き数', symbol: 'N', unit: '巻', step: '1', help: 'ドラムへ巻き取る最大回数です。' },
    ],
  },
  {
    title: '駆動条件', description: 'ドラム回転をモータ回転角へ換算します。', fields: [
      { key: 'gearRatio', label: 'ギア比', symbol: 'i', unit: '—', step: '0.1', help: 'モータ軸角度 ÷ ドラム軸角度です。' },
    ],
  },
  {
    title: 'ストローク条件', description: '巻き上げ後に残す昇降距離を指定します。', fields: [
      { key: 'remainingStroke', label: '最大巻き時の残りストローク', symbol: 'Sₙ', unit: 'mm', step: '0.1', help: '最大まで巻いた状態でも残しておくストロークです。' },
    ],
  },
]
const fields = fieldGroups.flatMap((group) => group.fields)
const format = (value: number) => value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const variableDefinitions: Record<string, string> = {
  'def-initialDiameter': 'D₀：ベルトを巻く前のドラム外径',
  'def-beltThickness': 't：ベルト1層の厚さ',
  'def-maxTurns': 'N：ドラムへ巻き取る最大回数',
  'def-remainingStroke': 'Sₙ：最大巻き時にも残すストローク',
  'def-gearRatio': 'i：モータ軸角度をドラム軸角度で割った比率',
  'def-angle-per-turn': 'Δθ：ドラム1回転に相当する360°',
  'def-n': 'n：結果を求める現在の巻き数',
  'def-k': 'k：ベルト長さを合計するときに使う巻き数',
  'def-pi': 'π：円周率',
  'def-outer-diameter': 'Dout(n)：n巻時のベルト外側の直径',
  'def-center-diameter': 'Dc(n)：n巻目のベルト中心線における直径',
  'def-belt-length': 'L(n)：n巻目のベルト中心径から求めた円周',
  'def-stroke': 'S(n)：n巻時の昇降位置',
  'def-initial-angle': 'θ₀：残りストロークから自動計算する初期回転角',
  'def-drum-angle': 'θdrum(n)：n巻時までのドラム軸累積回転角',
  'def-motor-angle': 'θmotor(n)：ドラム軸回転角にギア比を掛けた値',
  'def-max-stroke': 'Smax：ベルトを最も繰り出したときのストローク',
  'def-min-stroke': 'Smin：最大巻き上げ時に残るストローク',
  'def-stroke-range': 'ΔS：実際に使用できる昇降範囲',
  'def-max-motor': 'θmotor,max：最大ストロークに必要なモータ回転角',
  'formula-angle-per-turn': '【計算式】\nΔθ = 360°\nドラム1巻を1回転の角度へ換算',
  'formula-outer-diameter': '【計算式】\nDout(k) = D₀ + 2kt\n巻き数に応じたベルト外側の直径',
  'formula-center-diameter': '【計算式】\nDc(k) = D₀ + (2k − 1)t\nベルト長さを求める中心線の直径',
  'formula-belt-length': '【計算式】\nL(k) = π × Dc(k)\n中心径の円周から1巻分の長さを算出',
  'formula-stroke': '【計算式】\nS(n) = Sₙ + π(N − n){D₀ + t(N + n − 2)}\nL(k)を合計して残りストロークへ加算',
  'formula-initial-angle': '【計算式】\nθ₀ = Sₙ ÷ {π × Dc(N)} × Δθ\n残りストロークを角度へ換算',
  'formula-drum-angle': '【計算式】\nθdrum(n) = θ₀ + Δθ(N − n)\n巻き数差分の角度を加算',
  'formula-motor-angle': '【計算式】\nθmotor(n) = i × θdrum(n)\nドラム角度へギア比を乗算',
  'formula-max-stroke': '【計算式】\nSmax = S(1)\n1巻時の昇降ストロークを最大値として使用',
  'formula-min-stroke': '【計算式】\nSmin = S(N) = Sₙ\n最大巻き時の残りストロークを最小値として使用',
  'formula-stroke-range': '【計算式】\nΔS = S(1) − S(N)\n1巻時と最大巻き時のストローク差を算出',
  'formula-max-motor': '【計算式】\nθmotor,max = θmotor(1)\n1巻時のモータ軸回転角を最大値として使用',
}

function VariableLink({ target, children }: { target: string; children: ReactNode }) {
  const showDefinition = () => {
    const definition = document.getElementById(target)
    const details = definition?.closest('details')
    if (details) details.open = true
  }
  const definition = variableDefinitions[target]
  return <a className="variable-link" href={`#${target}`} onClick={showDefinition} data-definition={definition} aria-label={`${String(children)}。${definition}`}>{children}</a>
}

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
  if (Number(values.initialDiameter) === 0 && Number(values.beltThickness) === 0) {
    errors.initialDiameter = '初期径またはベルト厚さを0より大きくしてください'
    errors.beltThickness = '初期径またはベルト厚さを0より大きくしてください'
  }
  return errors
}

function MechanismOverview() {
  return <section className="overview panel" aria-labelledby="overview-title">
    <div className="overview-copy">
      <span className="section-kicker">この計算で分かること</span>
      <h2 id="overview-title">巻き径の変化を、ストロークとモータ回転角へ変換</h2>
      <p>ベルトを巻くほどドラム径が大きくなり、1巻当たりの移動量も増えます。入力条件から、各巻き数の昇降位置と必要なモータ軸回転角を算出します。</p>
      <div className="flow-chips"><span>巻き数 <VariableLink target="def-n">n</VariableLink></span><i>→</i><span>巻き径</span><i>→</i><span>ストローク <VariableLink target="formula-stroke">S(n)</VariableLink></span><i>→</i><span>モータ角 <VariableLink target="formula-motor-angle">θmotor(n)</VariableLink></span></div>
    </div>
    <svg className="mechanism" viewBox="0 0 520 230" role="img" aria-label="ドラム、ベルト、ギア、モータの関係を示す模式図">
      <defs>
        <marker id="dimension-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0 0L8 4 0 8Z" fill="#327eaf"/></marker>
      </defs>
      <circle cx="112" cy="112" r="72" className="wound-belt"/><circle cx="112" cy="112" r="48" className="drum"/><circle cx="112" cy="112" r="7" className="shaft"/>
      <path d="M184 112c20 0 28 17 28 35v54" className="belt"/><rect x="186" y="190" width="52" height="30" rx="4" className="load"/>
      <text x="110" y="22" textAnchor="middle">巻き数 n</text>
      <line x1="112" y1="64" x2="112" y2="160" className="measure"/><text x="98" y="106" textAnchor="end">D₀</text><text x="162" y="61">厚さ t</text>
      <line x1="212" y1="112" x2="282" y2="112" className="extension-line"/>
      <line x1="238" y1="205" x2="282" y2="205" className="extension-line"/>
      <line x1="272" y1="112" x2="272" y2="205" className="stroke-dimension" markerStart="url(#dimension-arrow)" markerEnd="url(#dimension-arrow)"/>
      <path d="M272 158h42" className="leader-line"/><text x="320" y="162">昇降ストローク S(n)</text>
      <line x1="119" y1="112" x2="361" y2="112" className="drive-line"/><circle cx="384" cy="112" r="25" className="gear"/><circle cx="463" cy="112" r="32" className="motor"/>
      <line x1="409" y1="112" x2="431" y2="112" className="drive-line"/><text x="384" y="76" textAnchor="middle">ギア比 i</text><text x="463" y="164" textAnchor="middle">モータ角</text><text x="463" y="181" textAnchor="middle">θmotor(n)</text>
    </svg>
  </section>
}

function TurnChart({ rows }: { rows: CalculationRow[] }) {
  const [activeRow, setActiveRow] = useState<CalculationRow | null>(null)
  const ordered = [...rows].sort((a, b) => a.turn - b.turn)
  const width = 800, height = 340, left = 80, right = 28, top = 25, bottom = 58
  const maxTurn = Math.max(...ordered.map((row) => row.turn))
  const minStroke = Math.min(...ordered.map((row) => row.stroke)), maxStroke = Math.max(...ordered.map((row) => row.stroke))
  const x = (turn: number) => left + (turn - 1) / (maxTurn - 1 || 1) * (width - left - right)
  const y = (stroke: number) => height - bottom - (stroke - minStroke) / (maxStroke - minStroke || 1) * (height - top - bottom)
  const points = ordered.map((row) => `${x(row.turn)},${y(row.stroke)}`).join(' ')
  const tooltipX = activeRow ? (x(activeRow.turn) > width - 235 ? x(activeRow.turn) - 207 : x(activeRow.turn) + 12) : 0
  const tooltipY = activeRow ? (y(activeRow.stroke) < 92 ? y(activeRow.stroke) + 14 : y(activeRow.stroke) - 74) : 0
  return <div className="chart-scroll"><svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="巻き数と昇降ストロークのグラフ">
    {[0, .25, .5, .75, 1].map((p) => { const yy = top + p * (height-top-bottom); const value = maxStroke-p*(maxStroke-minStroke); return <g key={`y${p}`}><line x1={left} x2={width-right} y1={yy} y2={yy} className="grid"/><text x={left-12} y={yy+5} textAnchor="end">{Math.round(value).toLocaleString()}</text></g> })}
    {ordered.map((row) => <line key={`x${row.turn}`} x1={x(row.turn)} x2={x(row.turn)} y1={top} y2={height-bottom} className={row.turn % Math.ceil(maxTurn/8) === 0 || row.turn === 1 ? 'grid' : 'minor-grid'}/>)}
    <polyline points={points} className="plot-line"/>
    {ordered.map((row) => <circle key={row.turn} cx={x(row.turn)} cy={y(row.stroke)} r="5" className="plot-point" tabIndex={0} aria-label={`${row.turn}巻、ストローク ${format(row.stroke)} mm、1巻長さ ${format(row.beltLength)} mm`} onMouseEnter={()=>setActiveRow(row)} onMouseLeave={()=>setActiveRow(null)} onFocus={()=>setActiveRow(row)} onBlur={()=>setActiveRow(null)}/>)}
    {activeRow && <g className="chart-tooltip" transform={`translate(${tooltipX} ${tooltipY})`} aria-hidden="true"><rect width="195" height="62" rx="6"/><text x="12" y="19"><tspan className="tooltip-title">巻き数 n = {activeRow.turn} 巻</tspan><tspan x="12" dy="18">ストローク：{format(activeRow.stroke)} mm</tspan><tspan x="12" dy="17">1巻長さ：{format(activeRow.beltLength)} mm</tspan></text></g>}
    {ordered.map((row) => (row.turn === 1 || row.turn === maxTurn || row.turn % Math.ceil(maxTurn/8) === 0) && <text key={`label${row.turn}`} x={x(row.turn)} y={height-bottom+24} textAnchor="middle">{row.turn}</text>)}
    <text x={(left+width-right)/2} y={height-8} textAnchor="middle" className="axis-label">巻き数 n［巻］</text>
    <text transform={`translate(18 ${(top+height-bottom)/2}) rotate(-90)`} textAnchor="middle" className="axis-label">昇降ストローク S(n)［mm］</text>
  </svg></div>
}

function FormulaGuide() {
  const formulas: [string, string, ReactNode, string][] = [
    ['formula-angle-per-turn', 'ドラム1巻当たりの回転角', <><VariableLink target="formula-angle-per-turn">Δθ</VariableLink> = 360°</>, 'ドラム1巻を1回転の角度へ換算'],
    ['formula-outer-diameter', '巻き外径', <><VariableLink target="formula-outer-diameter">Dout(k)</VariableLink> = <VariableLink target="def-initialDiameter">D₀</VariableLink> + 2<VariableLink target="def-k">k</VariableLink><VariableLink target="def-beltThickness">t</VariableLink></>, '巻き数に応じたベルト外側の直径'],
    ['formula-center-diameter', 'ベルト中心径', <><VariableLink target="formula-center-diameter">Dc(k)</VariableLink> = <VariableLink target="def-initialDiameter">D₀</VariableLink> + (2<VariableLink target="def-k">k</VariableLink> − 1)<VariableLink target="def-beltThickness">t</VariableLink></>, 'ベルト長さを求める中心線の直径'],
    ['formula-belt-length', '1巻当たりの長さ', <><VariableLink target="formula-belt-length">L(k)</VariableLink> = <VariableLink target="def-pi">π</VariableLink> × <VariableLink target="formula-center-diameter">Dc(k)</VariableLink></>, '中心径の円周から1巻分の長さを算出'],
    ['formula-stroke', '昇降ストローク', <><VariableLink target="formula-stroke">S(n)</VariableLink> = <VariableLink target="def-remainingStroke">Sₙ</VariableLink> + <VariableLink target="def-pi">π</VariableLink>(<VariableLink target="def-maxTurns">N</VariableLink> − <VariableLink target="def-n">n</VariableLink>)&#123;<VariableLink target="def-initialDiameter">D₀</VariableLink> + <VariableLink target="def-beltThickness">t</VariableLink>(<VariableLink target="def-maxTurns">N</VariableLink> + <VariableLink target="def-n">n</VariableLink> − 2)&#125;</>, 'L(k)を合計して残りストロークへ加算'],
    ['formula-initial-angle', 'ドラム初期回転角', <><VariableLink target="formula-initial-angle">θ₀</VariableLink> = <VariableLink target="def-remainingStroke">Sₙ</VariableLink> ÷ &#123;<VariableLink target="def-pi">π</VariableLink> × <VariableLink target="formula-center-diameter">Dc(N)</VariableLink>&#125; × <VariableLink target="formula-angle-per-turn">Δθ</VariableLink></>, '残りストロークを角度へ換算'],
    ['formula-drum-angle', 'ドラム軸回転角', <><VariableLink target="formula-drum-angle">θdrum(n)</VariableLink> = <VariableLink target="formula-initial-angle">θ₀</VariableLink> + <VariableLink target="formula-angle-per-turn">Δθ</VariableLink>(<VariableLink target="def-maxTurns">N</VariableLink> − <VariableLink target="def-n">n</VariableLink>)</>, '巻き数差分の角度を加算'],
    ['formula-motor-angle', 'モータ軸回転角', <><VariableLink target="formula-motor-angle">θmotor(n)</VariableLink> = <VariableLink target="def-gearRatio">i</VariableLink> × <VariableLink target="formula-drum-angle">θdrum(n)</VariableLink></>, 'ドラム角度へギア比を乗算'],
    ['formula-max-stroke', '最大ストローク', <><VariableLink target="formula-max-stroke">Smax</VariableLink> = <VariableLink target="formula-stroke">S(1)</VariableLink></>, '1巻時の昇降ストロークを最大値として使用'],
    ['formula-min-stroke', '最小ストローク', <><VariableLink target="formula-min-stroke">Smin</VariableLink> = <VariableLink target="formula-stroke">S(N)</VariableLink> = <VariableLink target="def-remainingStroke">Sₙ</VariableLink></>, '最大巻き時の残りストロークを最小値として使用'],
    ['formula-stroke-range', '使用可能な昇降範囲', <><VariableLink target="formula-stroke-range">ΔS</VariableLink> = <VariableLink target="formula-stroke">S(1)</VariableLink> − <VariableLink target="formula-stroke">S(N)</VariableLink></>, '1巻時と最大巻き時のストローク差を算出'],
    ['formula-max-motor', '最大モータ軸回転角', <><VariableLink target="formula-max-motor">θmotor,max</VariableLink> = <VariableLink target="formula-motor-angle">θmotor(1)</VariableLink></>, '1巻時のモータ軸回転角を最大値として使用'],
  ]
  return <details className="panel formula"><summary><div><span className="section-kicker">必要な場合に確認</span><h2>計算式・計算方法</h2></div><ChevronDown/></summary><div className="formula-list">{formulas.map(([id, name, formula, note], index) => <div id={id} key={id}><span>{index+1}</span><div><b>{name}</b><code>{formula}</code><small>{note}</small></div></div>)}</div></details>
}

function DefinitionGuide() {
  const constants = [
    ['def-angle-per-turn', 'Δθ', 'ドラム1巻当たりの回転角', '入力値ではなく、1回転を表す360°の定数です。', 'formula-angle-per-turn'],
    ['def-pi', 'π', '円周率', '中心径から円周を求めるために使用する定数です。', ''],
    ['def-n', 'n', '現在の巻き数', '各行で結果を求める巻き数を表す添字です。', ''],
    ['def-k', 'k', '総和用の巻き数', 'ベルト長さを巻き数の範囲で合計するときに使う添字です。', ''],
  ]
  const calculated = [
    ['def-outer-diameter', 'Dout(n)', '巻き外径', 'n巻時のベルト外側の直径です。', 'formula-outer-diameter'],
    ['def-center-diameter', 'Dc(n)', 'ベルト中心径', 'n巻目のベルト中心線における直径です。', 'formula-center-diameter'],
    ['def-belt-length', 'L(n)', '1巻当たりのベルト長さ', 'n巻目のベルト中心径から求めた円周です。', 'formula-belt-length'],
    ['def-stroke', 'S(n)', '昇降ストローク', 'n巻時の昇降位置です。', 'formula-stroke'],
    ['def-initial-angle', 'θ₀', 'ドラム初期回転角', '残りストロークと最大巻き時の中心径から自動計算します。', 'formula-initial-angle'],
    ['def-drum-angle', 'θdrum(n)', 'ドラム軸回転角', 'n巻時までに必要なドラム軸の累積回転角です。', 'formula-drum-angle'],
    ['def-motor-angle', 'θmotor(n)', 'モータ軸回転角', 'ドラム軸回転角へギア比を掛けた値です。', 'formula-motor-angle'],
    ['def-max-stroke', 'Smax', '最大ストローク', 'ベルトを最も繰り出したときのストロークです。', 'formula-max-stroke'],
    ['def-min-stroke', 'Smin', '最小ストローク', '最大巻き上げ時に残るストロークです。', 'formula-min-stroke'],
    ['def-stroke-range', 'ΔS', '使用可能な昇降範囲', 'SmaxからSminを引いた値です。', 'formula-stroke-range'],
    ['def-max-motor', 'θmotor,max', '最大モータ軸回転角', '最大ストロークに必要なモータ回転角です。', 'formula-max-motor'],
  ]
  const card = ([id, symbol, label, description, formulaTarget]: string[], kind: string) => <div id={id} className={`definition-card ${kind}`} key={id}><dt><b>{formulaTarget ? <VariableLink target={formulaTarget}>{symbol}</VariableLink> : symbol}</b>{label}</dt><dd>{description}</dd></div>

  return <details className="panel input-guide"><summary><div><span className="section-kicker">暖色＝入力・紫＝定数・寒色＝計算値</span><h2>変数定義・詳しい説明</h2></div><ChevronDown/></summary><div className="definition-legend"><span className="input-key">入力値</span><span className="constant-key">定数・添字</span><span className="calculated-key">計算値</span></div><div className="parameter-notes"><dl>{fields.map((field) => card([`def-${field.key}`, field.symbol, field.label, field.help, ''], 'input-definition'))}{constants.map((item) => card(item, 'constant-definition'))}{calculated.map((item) => card(item, 'calculated-definition'))}</dl></div></details>
}

export default function App() {
  const defaults = Object.fromEntries(Object.entries(DEFAULT_INPUTS).map(([key, value]) => [key, String(value)])) as Record<InputKey, string>
  const [values, setValues] = useState(defaults)
  const [showDetails, setShowDetails] = useState(false)
  const [ascending, setAscending] = useState(false)
  const errors = useMemo(() => validate(values), [values])
  const valid = Object.keys(errors).length === 0
  const rows = useMemo(() => valid ? calculateRows(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])) as unknown as CalculatorInputs) : [], [valid, values])
  const displayedRows = ascending ? [...rows].reverse() : rows
  const summary = rows.length ? { maxStroke: Math.max(...rows.map(r => r.stroke)), minStroke: Math.min(...rows.map(r => r.stroke)), maxMotor: Math.max(...rows.map(r => r.motorAngle)) } : null
  const downloadCsv = () => { const header = ['巻き数 n','巻き外径 Dout(n) [mm]','ベルト中心径 Dc(n) [mm]','1巻当たりの長さ L(n) [mm]','昇降ストローク S(n) [mm]','ドラム軸回転角 θdrum(n) [deg]','モータ軸回転角 θmotor(n) [deg]']; const csv = '\uFEFF'+[header,...displayedRows.map(r=>[r.turn,r.outerDiameter,r.centerDiameter,r.beltLength,r.stroke,r.drumAngle,r.motorAngle])].map(line=>line.join(',')).join('\n'); const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); const a=document.createElement('a'); a.href=url;a.download='lift-stroke-results.csv';a.click();URL.revokeObjectURL(url) }

  return <><header><div className="header-inner"><div className="logo"><Calculator size={28}/></div><div><h1>昇降ストローク計算</h1><p>ドラム巻径とモータ軸回転角の関係</p></div></div></header><main>
    <MechanismOverview/>
    <section className="panel input-panel"><div className="section-heading"><div><span className="section-kicker">条件を入力</span><h2>入力条件</h2></div><button className="secondary" onClick={()=>setValues(defaults)}><RotateCcw size={18}/>初期値に戻す</button></div>
      <div className="condition-groups">{fieldGroups.map(group=><fieldset key={group.title}><legend>{group.title}</legend><p>{group.description}</p><div className="group-fields">{group.fields.map(field=><label key={field.key} className={errors[field.key]?'invalid':''}><span>{field.label} <small>（<VariableLink target={`def-${field.key}`}>{field.symbol}</VariableLink>）</small></span><div className="input-wrap"><input type="number" step={field.step} value={values[field.key]} onChange={e=>setValues(v=>({...v,[field.key]:e.target.value}))}/><b>{field.unit}</b></div><small className="field-help">{field.help}</small>{errors[field.key]&&<em>{errors[field.key]}</em>}</label>)}</div></fieldset>)}</div>
    </section>
    {summary ? <>
      <section className="results-summary"><span className="section-kicker">主要な計算結果</span><h2>この条件での昇降範囲</h2><div className="summary-layout"><article className="primary-result"><span>実際に使用できる昇降範囲 <small>（<VariableLink target="formula-stroke-range">ΔS</VariableLink>）</small></span><strong>{format(summary.maxStroke-summary.minStroke)}</strong><b>mm</b><p>最大ストロークと巻き上げ時の残りストロークの差です。</p></article><div className="summary-grid">{[['ベルトをすべて繰り出したときの最大ストローク','Smax','formula-max-stroke',summary.maxStroke,'mm'],['最大巻き上げ時の残りストローク','Smin','formula-min-stroke',summary.minStroke,'mm'],['最大ストロークに必要なモータ回転角','θmotor,max','formula-max-motor',summary.maxMotor,'deg'],['ドラム1巻当たりの回転角','Δθ','formula-angle-per-turn',DRUM_ANGLE_PER_TURN,'deg']].map(([label,symbol,target,value,unit])=><article className="summary-card" key={String(symbol)}><span>{label}<small>（<VariableLink target={String(target)}>{symbol}</VariableLink>）</small></span><strong>{format(Number(value))}</strong><b>{unit}</b></article>)}</div></div></section>
      <section className="panel"><span className="section-kicker">巻き数による変化</span><h2>巻き数と昇降ストローク</h2><p className="section-description">ベルトを巻き取るにつれて、ストロークがどのように変化するかを示します。点にカーソルを合わせると詳細を確認できます。</p><TurnChart rows={rows}/></section>
      <section className="panel"><div className="section-heading table-heading"><div><span className="section-kicker">巻き数ごとの数値</span><h2>計算表</h2></div><div className="table-actions"><button className="secondary" onClick={()=>setAscending(v=>!v)}>{ascending?'15巻 → 1巻':'1巻 → 15巻'}</button><button className="secondary" onClick={()=>setShowDetails(v=>!v)}>{showDetails?'基本表示':'詳細表示'}</button><button className="primary" onClick={downloadCsv}><Download size={18}/>CSV</button></div></div>
        <div className="table-scroll"><table className={showDetails?'detail-table':'basic-table'}><thead><tr><th>巻き数<small><VariableLink target="def-n">n</VariableLink></small></th>{showDetails&&<th>巻き外径<small><VariableLink target="formula-outer-diameter">Dout(n)</VariableLink>［mm］</small></th>}<th>ベルト中心径<small><VariableLink target="formula-center-diameter">Dc(n)</VariableLink>［mm］</small></th>{showDetails&&<th>1巻当たりの長さ<small><VariableLink target="formula-belt-length">L(n)</VariableLink>［mm］</small></th>}<th>昇降ストローク<small><VariableLink target="formula-stroke">S(n)</VariableLink>［mm］</small></th>{showDetails&&<th>ドラム軸回転角<small><VariableLink target="formula-drum-angle">θdrum(n)</VariableLink>［deg］</small></th>}<th>モータ軸回転角<small><VariableLink target="formula-motor-angle">θmotor(n)</VariableLink>［deg］</small></th></tr></thead><tbody>{displayedRows.map(r=><tr key={r.turn}><td><b>{r.turn}</b><small> 巻</small></td>{showDetails&&<td>{format(r.outerDiameter)}</td>}<td>{format(r.centerDiameter)}</td>{showDetails&&<td>{format(r.beltLength)}</td>}<td>{format(r.stroke)}</td>{showDetails&&<td>{format(r.drumAngle)}</td>}<td>{format(r.motorAngle)}</td></tr>)}</tbody></table></div>
      </section>
      <FormulaGuide/>
      <DefinitionGuide/>
    </>:<div className="error-banner">入力内容を修正すると、計算結果が表示されます。</div>}
  </main><footer>昇降ストローク計算ツール <span>•</span> 計算はすべてブラウザ内で実行されます</footer></>
}
