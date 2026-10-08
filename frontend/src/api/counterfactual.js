/**
 * 反事实实验 API（P1）
 *
 * 收敛反事实相关的后端入口，供因果推断页与反事实实验页共用：
 * - postCounterfactualReasoning：单点反事实推理（因果推断页用）；
 * - runWorld：提交一个「世界」的运行。事实 / 反事实走同一后端入口，
 *   靠 payload 里的 world_kind 与 seed 区分，保证两个世界同基座、只差干预。
 *
 * 背景见 src/utils/counterfactualWorld.js 顶部说明。
 */

import request from '@/utils/request'
import { runExperiment } from '@/api/scenarioModeling'

/**
 * 反事实推理
 * @param {string} experimentId - 实验ID
 * @param {Object} intervention - 干预参数
 * @returns {Promise}
 */
export function postCounterfactualReasoning(experimentId, intervention) {
  return request({
    url: `/SCnet/supplyChain/experiments/${experimentId}/counterfactual-reasoning`,
    method: 'post',
    data: intervention
  })
}

/**
 * 提交一个世界（事实 / 反事实）的运行。
 * @param {Object} payload - 含 world_kind 与 seed 的完整实验载荷
 * @returns {Promise}
 */
export function runWorld(payload) {
  return runExperiment(payload)
}
