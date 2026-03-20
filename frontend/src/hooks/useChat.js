import { useState, useRef, useCallback, useEffect } from 'react'
import { getMessages, uploadFile, streamChat } from '../api'
import { v4 as uuidv4 } from 'uuid'

export function useChat(conversationId, model) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploadError, setUploadError] = useState(null)
  const [toast, setToast] = useState(null)
  const streamingIdRef = useRef(null)

  // Load messages from backend when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    getMessages(conversationId)
      .then(msgs =>
        setMessages(
          msgs.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }))
        )
      )
      .catch(console.error)
    setUploadedFiles([])
  }, [conversationId])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Handle file upload
  const handleUpload = useCallback(async (files) => {
    if (!conversationId) return
    for (const file of files) {
      try {
        const result = await uploadFile(file, conversationId)
        setUploadedFiles(prev => [...prev, { ...result, localName: file.name }])
        showToast(`"${file.name}" uploaded successfully`)
      } catch (err) {
        showToast(`Failed to upload "${file.name}"`, 'error')
        setUploadError(err.message)
      }
    }
  }, [conversationId, showToast])

  const removeUploadedFile = useCallback((fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId))
  }, [])

  // Send message
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || !conversationId || isStreaming) return

    const userMsg = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      files: uploadedFiles.map(f => ({ name: f.filename, type: f.file_type })),
    }
    setMessages(prev => [...prev, userMsg])

    // Add a streaming placeholder for assistant
    const assistantId = uuidv4()
    streamingIdRef.current = assistantId
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: new Date().toISOString(),
    }])

    const fileIds = uploadedFiles.map(f => f.file_id)
    setUploadedFiles([]) // Clear attached files
    setIsStreaming(true)

    let finalContent = ''

    await streamChat({
      conversationId,
      message: text,
      fileIds,
      model,
      onToken: (token) => {
        finalContent += token
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: finalContent }
              : m
          )
        )
      },
      onDone: () => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        )
        setIsStreaming(false)
      },
      onError: (err) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: `⚠️ Error: ${err}`, streaming: false, error: true }
              : m
          )
        )
        setIsStreaming(false)
        showToast('Response error. Retrying may help.', 'error')
      },
    })
  }, [conversationId, model, uploadedFiles, isStreaming, showToast])

  // Regenerate last AI response
  const regenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg && !isStreaming) {
      // Remove the last assistant message
      setMessages(prev => {
        const idx = [...prev].reverse().findIndex(m => m.role === 'assistant')
        if (idx === -1) return prev
        const realIdx = prev.length - 1 - idx
        return prev.filter((_, i) => i !== realIdx)
      })
      sendMessage(lastUserMsg.content)
    }
  }, [messages, isStreaming, sendMessage])

  return {
    messages,
    isStreaming,
    uploadedFiles,
    uploadError,
    toast,
    handleUpload,
    removeUploadedFile,
    sendMessage,
    regenerate,
    showToast,
  }
}
