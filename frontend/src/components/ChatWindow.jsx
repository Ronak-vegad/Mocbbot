import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Trash2 } from 'lucide-react'
import MessageBubble from './MessageBubble'
import FileUpload from './FileUpload'
import { clearMemory } from '../api'

const SUGGESTED_PROMPTS = [
  '📄 Upload a PDF and ask questions about it',
  '🧮 Calculate compound interest on $10,000 at 7% for 10 years',
  '💡 Explain how large language models work',
  '📊 Upload a CSV and summarize the data',
]

export default function ChatWindow({ conversationId, messages, isStreaming, uploadedFiles, onUpload, onRemoveFile, onSendMessage, onRegenerate, model }) {
  const [input, setInput] = useState('')
  const [clearing, setClearing] = useState(false)
  const bottomRef = useRef()
  const inputRef = useRef()
  const containerRef = useRef()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return
    onSendMessage(input.trim())
    setInput('')
    inputRef.current?.focus()
  }, [input, isStreaming, onSendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearMemory = async () => {
    if (!conversationId) return
    setClearing(true)
    try {
      await clearMemory(conversationId)
    } finally {
      setClearing(false)
    }
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/30">
          🤖
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to AI Chatbot</h2>
        <p className="text-[var(--text-secondary)] max-w-sm">Create a new conversation from the sidebar to start chatting with <span className="text-indigo-300 font-medium">gpt-oss:20b</span>.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Messages area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl mb-4 mx-auto shadow-xl shadow-indigo-500/25">
                💬
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">How can I help you?</h3>
              <p className="text-sm text-[var(--text-secondary)]">Try one of these prompts or type anything below</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(prompt.slice(2)); inputRef.current?.focus() }}
                  className="p-3 text-left text-sm rounded-xl border border-[var(--border)]
                    bg-[var(--bg-secondary)] text-[var(--text-secondary)]
                    hover:border-indigo-500/40 hover:text-[var(--text-primary)] hover:bg-indigo-500/5
                    transition-all duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={idx === messages.length - 1}
              onRegenerate={onRegenerate}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <div className="max-w-3xl mx-auto">
          {/* File chips */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {uploadedFiles.map(f => (
                <span key={f.file_id} className={`file-chip border
                  ${f.file_type === 'image' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                    f.file_type === 'pdf' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                    'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                  📎 {f.filename}
                  <button onClick={() => onRemoveFile(f.file_id)} className="ml-1 hover:opacity-70 text-xs">✕</button>
                </span>
              ))}
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border)]
            focus-within:border-indigo-500/50 transition-colors">

            <div className="flex-shrink-0 pl-2 pb-2">
              <FileUpload
                onUpload={onUpload}
                uploadedFiles={[]}
                onRemove={onRemoveFile}
                disabled={isStreaming}
              />
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Shift+Enter for new line)"
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent resize-none outline-none text-sm
                text-[var(--text-primary)] placeholder-[var(--text-secondary)]
                py-3.5 pr-2 max-h-40 overflow-y-auto disabled:opacity-60"
              style={{ minHeight: '44px' }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 mb-2 mr-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500
                disabled:opacity-40 disabled:cursor-not-allowed text-white
                transition-all duration-200 shadow-lg shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-between items-center mt-2 px-1">
            <p className="text-xs text-[var(--text-secondary)]">
              {isStreaming ? (
                <span className="text-indigo-400 animate-pulse">● Generating response…</span>
              ) : (
                'Enter to send • Shift+Enter for new line'
              )}
            </p>
            <button
              onClick={handleClearMemory}
              disabled={clearing}
              className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              {clearing ? 'Clearing…' : 'Clear memory'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
