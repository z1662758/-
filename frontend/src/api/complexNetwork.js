import request from '@/utils/request'

/** Run established graph algorithms against exactly the snapshot shown on the page. */
export function analyzeComplexNetwork(snapshot) {
  return request({
    url: '/SCnet/complexNetwork/analyze',
    method: 'post',
    data: snapshot,
  })
}
