export interface CalculatorInputs {
  initialDiameter: number
  beltThickness: number
  maxTurns: number
  remainingStroke: number
  gearRatio: number
  initialDrumAngle: number
  anglePerTurn: number
}

export interface CalculationRow {
  turn: number
  outerDiameter: number
  centerDiameter: number
  beltLength: number
  stroke: number
  drumAngle: number
  motorAngle: number
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  initialDiameter: 58,
  beltThickness: 1.2,
  maxTurns: 15,
  remainingStroke: 145,
  gearRatio: 10,
  initialDrumAngle: 179.05,
  anglePerTurn: 180,
}

/** 入力値から、最大巻き数から1巻目までの計算結果を生成する純粋関数。 */
export function calculateRows(input: CalculatorInputs): CalculationRow[] {
  const rows: CalculationRow[] = []
  for (let turn = input.maxTurns; turn >= 1; turn -= 1) {
    // 巻き外径とベルト中心径
    const outerDiameter = input.initialDiameter + 2 * turn * input.beltThickness
    const centerDiameter = input.initialDiameter + (2 * turn - 1) * input.beltThickness
    // ベルト中心径を用いた1巻当たりの長さ
    const beltLength = Math.PI * centerDiameter
    // 等差数列の和による昇降ストローク
    const stroke = input.remainingStroke + Math.PI * (input.maxTurns - turn) *
      (input.initialDiameter + input.beltThickness * (input.maxTurns + turn - 1))
    // 任意の1巻当たり回転角を反映したドラム・モータ軸角度
    const drumAngle = input.initialDrumAngle + input.anglePerTurn * (input.maxTurns - turn)
    rows.push({ turn, outerDiameter, centerDiameter, beltLength, stroke, drumAngle, motorAngle: input.gearRatio * drumAngle })
  }
  return rows
}
