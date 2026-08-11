export interface CalculatorInputs {
  initialDiameter: number
  beltThickness: number
  maxTurns: number
  remainingStroke: number
  mechanismLength: number
  gearRatio: number
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
  mechanismLength: 317.68,
  gearRatio: 10,
}

/** ドラム1回転（1巻）に相当する角度。 */
export const DRUM_ANGLE_PER_TURN = 360

/** 入力値から、最大巻き数から1巻目までの計算結果を生成する純粋関数。 */
export function calculateRows(input: CalculatorInputs): CalculationRow[] {
  const rows: CalculationRow[] = []
  // 最大巻き時の残りストロークを、最大巻き時のベルト中心円周に対する回転角へ換算
  const maxTurnCenterDiameter = input.initialDiameter + (2 * input.maxTurns - 1) * input.beltThickness
  const initialDrumAngle = maxTurnCenterDiameter > 0
    ? input.remainingStroke / (Math.PI * maxTurnCenterDiameter) * DRUM_ANGLE_PER_TURN
    : 0
  for (let turn = input.maxTurns; turn >= 1; turn -= 1) {
    // 巻き外径とベルト中心径
    const outerDiameter = input.initialDiameter + 2 * turn * input.beltThickness
    const centerDiameter = input.initialDiameter + (2 * turn - 1) * input.beltThickness
    // ベルト中心径を用いた1巻当たりの長さ
    const beltLength = Math.PI * centerDiameter
    // L(k)をk=turnからN-1まで合計した、等差数列の和による昇降ストローク
    const stroke = input.remainingStroke + Math.PI * (input.maxTurns - turn) *
      (input.initialDiameter + input.beltThickness * (input.maxTurns + turn - 2))
    // 任意の1巻当たり回転角を反映したドラム・モータ軸角度
    const drumAngle = initialDrumAngle + DRUM_ANGLE_PER_TURN * (input.maxTurns - turn)
    rows.push({ turn, outerDiameter, centerDiameter, beltLength, stroke, drumAngle, motorAngle: input.gearRatio * drumAngle })
  }
  return rows
}

/** 最大ストロークに機構内部を通る長さを加え、必要なベルト全長を求める。 */
export function calculateTotalBeltLength(input: CalculatorInputs): number {
  const rows = calculateRows(input)
  const maximumStroke = rows.length > 0 ? Math.max(...rows.map((row) => row.stroke)) : 0
  return maximumStroke + input.mechanismLength
}
