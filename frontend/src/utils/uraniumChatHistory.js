const KEY = 'scnet_uranium_expert_conversations'

export function readUraniumConversations() {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(rows) ? rows.filter(row => row?.id && Array.isArray(row.messages)) : []
  } catch { return [] }
}

export function saveUraniumConversation(conversation) {
  const rows = readUraniumConversations().filter(row => row.id !== conversation.id)
  try { localStorage.setItem(KEY, JSON.stringify([conversation, ...rows].slice(0, 30))) } catch { /* 存储不足不影响当前回答 */ }
}

export function removeUraniumConversation(id) {
  try { localStorage.setItem(KEY, JSON.stringify(readUraniumConversations().filter(row => row.id !== id))) } catch { /* 保留内存列表 */ }
}
