import test from 'node:test'
import assert from 'node:assert/strict'
import { buildShockDemand, propagateDemand, recoveryPeriods, varianceRatio } from '../src/utils/uraniumBullwhip.js'

test('放大倍数由曲线方差计算，振幅扩大两倍时方差比为四', () => {
  assert.equal(varianceRatio([90, 100, 110], [80, 100, 120]), 4)
  assert.equal(varianceRatio([100, 100], [100, 120]), null)
  assert.equal(varianceRatio([null, 100, 120], [200, null, 100]), null)
  assert.equal(varianceRatio([100, 110, null, 120], [100, 120, 900, 140]), 4)
})

test('零需求冲击不产生额外订单，波动幅度随需求增量变化', () => {
  const layer = { factor: 2.5, response: 0.8 }
  const zero = buildShockDemand(0, 4, 9)
  assert.deepEqual(propagateDemand(zero, 4, layer), zero)
  const small = propagateDemand(buildShockDemand(15, 4, 9), 4, layer)
  const large = propagateDemand(buildShockDemand(30, 4, 9), 4, layer)
  assert.equal(large[4] - 100, 2 * (small[4] - 100))
  assert.equal(large[0], 100)
  assert.equal(large.at(-1), 100)
})

test('恢复期从冲击发生计算，未恢复时不报告已恢复', () => {
  assert.equal(recoveryPeriods([100, 120, 108, 104, 100], 1), 2)
  assert.equal(recoveryPeriods([100, 120, 108], 1), null)
  assert.equal(recoveryPeriods([100, 100, 100], 1), 0)
})
