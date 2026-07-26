import request from '@/utils/request'

/**
 * 批量更新图书排序
 * @param {string[]} bookNames - 按目标顺序排列的 book_name 数组（完整列表）
 * @returns {Promise<{success: boolean, message: string}>}
 */
export function reorderBooks(bookNames) {
  return request({
    url: '/domain/book/reorder',
    method: 'post',
    data: { books: bookNames }
  })
}
