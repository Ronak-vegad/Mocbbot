import axios from 'axios'

const BASE_URL = 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

// Conversations
export const getConversations = () => api.get('/conversations').then(r => r.data)
export const createConversation = (title = 'New Chat') =>
  api.post('/conversations', { title }).then(r => r.data)
export const deleteConversation = (id) => api.delete(`/conversations/${id}`)
export const renameConversation = (id, title) =>
  api.patch(`/conversations/${id}`, { title }).then(r => r.data)
export const getMessages = (id) => api.get(`/conversations/${id}/messages`).then(r => r.data)
export const clearMemory = (id) => api.delete(`/conversations/${id}/memory`)

// Models
export const getModels = () => api.get('/models').then(r => r.data)

// File upload
export const uploadFile = (file, conversationId) => {
  const form = new FormData()
  form.append('file', file)
  form.append('conversation_id', conversationId)
  return api.post('/upload', form).then(r => r.data)
}

// Streaming chat via fetch (not axios — for SSE)
export const streamChat = async ({ conversationId, message, fileIds, model, onToken, onDone, onError }) => {
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        file_ids: fileIds || [],
        model: model || 'gpt-oss:20b',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      onError?.(err)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.done) {
              onDone?.()
            } else if (data.token) {
              onToken?.(data.token)
            }
          } catch (_) { /* skip malformed JSON */ }
        }
      }
    }
  } catch (err) {
    onError?.(err.message)
  }
}
