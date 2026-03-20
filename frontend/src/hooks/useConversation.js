import { useState, useEffect, useCallback } from 'react'
import {
  getConversations,
  createConversation,
  deleteConversation,
  renameConversation,
} from '../api'

export function useConversation() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data)
      // Auto-select the most recent conversation if none selected
      if (!activeId && data.length > 0) {
        setActiveId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [activeId])

  useEffect(() => {
    fetchConversations()
  }, [])

  const newConversation = useCallback(async (title = 'New Chat') => {
    const convo = await createConversation(title)
    setConversations(prev => [convo, ...prev])
    setActiveId(convo.id)
    return convo
  }, [])

  const removeConversation = useCallback(async (id) => {
    await deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) {
      setActiveId(conversations.find(c => c.id !== id)?.id || null)
    }
  }, [activeId, conversations])

  const renameConvo = useCallback(async (id, title) => {
    await renameConversation(id, title)
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, title } : c)
    )
  }, [])

  const updateMessageCount = useCallback((id, delta = 2) => {
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, message_count: (c.message_count || 0) + delta } : c)
    )
  }, [])

  return {
    conversations,
    activeId,
    setActiveId,
    loading,
    newConversation,
    removeConversation,
    renameConvo,
    updateMessageCount,
    refresh: fetchConversations,
  }
}
