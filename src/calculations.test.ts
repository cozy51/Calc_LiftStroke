import { describe, expect, it } from 'vitest'
import { calculateRows, DEFAULT_INPUTS } from './calculations'

describe('calculateRows', () => {
  it('初期値の検算条件を満たす', () => {
    const rows = calculateRows(DEFAULT_INPUTS)
    expect(rows).toHaveLength(15)
    expect(rows.find((row) => row.turn === 1)?.centerDiameter).toBeCloseTo(59.2)
    expect(rows.find((row) => row.turn === 15)?.centerDiameter).toBeCloseTo(92.8)
    const fourth = rows.find((row) => row.turn === 4)
    expect(fourth?.stroke).toBeCloseTo(2895.78, 1)
    expect(fourth?.drumAngle).toBeCloseTo(2159.05)
    expect(fourth?.motorAngle).toBeCloseTo(21590.5)
  })

  it('境界値の最大巻き数1を計算できる', () => {
    const [row] = calculateRows({ ...DEFAULT_INPUTS, maxTurns: 1, remainingStroke: 0, gearRatio: 0 })
    expect(row.stroke).toBe(0)
    expect(row.motorAngle).toBe(0)
    expect(Object.values(row).every(Number.isFinite)).toBe(true)
  })
})
