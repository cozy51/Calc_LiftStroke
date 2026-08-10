import { describe, expect, it } from 'vitest'
import { calculateRows, DEFAULT_INPUTS, DRUM_ANGLE_PER_TURN } from './calculations'

describe('calculateRows', () => {
  it('初期値の検算条件を満たす', () => {
    const rows = calculateRows(DEFAULT_INPUTS)
    expect(rows).toHaveLength(15)
    expect(rows.find((row) => row.turn === 1)?.centerDiameter).toBeCloseTo(59.2)
    expect(rows.find((row) => row.turn === 15)?.centerDiameter).toBeCloseTo(92.8)
    expect(rows.find((row) => row.turn === 15)?.drumAngle).toBeCloseTo(179.05, 1)
    const fourth = rows.find((row) => row.turn === 4)
    expect(fourth?.stroke).toBeCloseTo(2854.31, 1)
    expect(fourth?.drumAngle).toBeCloseTo(4139.05, 1)
    expect(fourth?.motorAngle).toBeCloseTo(41390.5, 0)
  })

  it('境界値の最大巻き数1を計算できる', () => {
    const [row] = calculateRows({ ...DEFAULT_INPUTS, maxTurns: 1, remainingStroke: 0, gearRatio: 0 })
    expect(row.stroke).toBe(0)
    expect(row.motorAngle).toBe(0)
    expect(Object.values(row).every(Number.isFinite)).toBe(true)
  })

  it('閉形式のストロークが各巻き長さの合計と一致する', () => {
    const rows = calculateRows(DEFAULT_INPUTS)
    const fourth = rows.find((row) => row.turn === 4)!
    const beltLengthSum = rows
      .filter((row) => row.turn >= 4 && row.turn < DEFAULT_INPUTS.maxTurns)
      .reduce((sum, row) => sum + row.beltLength, 0)

    expect(fourth.stroke).toBeCloseTo(DEFAULT_INPUTS.remainingStroke + beltLengthSum, 10)
  })

  it('ドラム初期回転角を残りストロークと最大巻き時の中心径から算出する', () => {
    const [maxTurnRow] = calculateRows(DEFAULT_INPUTS)
    const expectedAngle = DEFAULT_INPUTS.remainingStroke / maxTurnRow.beltLength * DRUM_ANGLE_PER_TURN

    expect(maxTurnRow.drumAngle).toBeCloseTo(expectedAngle, 10)
  })

  it('中心径が0でもNaNやInfinityを返さない', () => {
    const rows = calculateRows({ ...DEFAULT_INPUTS, initialDiameter: 0, beltThickness: 0 })

    expect(rows.flatMap((row) => Object.values(row)).every(Number.isFinite)).toBe(true)
  })
})
