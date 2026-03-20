import { useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import ModelSelector from './components/ModelSelector'
import { useConversation } from './hooks/useConversation'
import { useChat } from './hooks/useChat'

function Toast({ toast }) {
  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl
      text-sm font-medium animate-fade-in border
      ${isError
        ? 'bg-red-500/15 border-red-500/30 text-red-300'
        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
      }`}>
      <span>{isError ? '⚠️' : '✓'}</span>
      {toast.msg}
    </div>
  )
}

export default function App() {
  const [dark, setDark] = useState(true)
  const [model, setModel] = useState('gpt-oss:20b')

  const {
    conversations, activeId, setActiveId,
    newConversation, removeConversation, renameConvo,
  } = useConversation()

  const {
    messages, isStreaming, uploadedFiles, toast,
    handleUpload, removeUploadedFile, sendMessage, regenerate,
  } = useChat(activeId, model)

  const handleModelChange = (newModel) => {
    setModel(newModel)
  }

  const handleNewConversation = async () => {
    await newConversation('New Chat')
  }

  return (
    <div className={`${dark ? 'dark' : 'light'} flex h-screen overflow-hidden`}
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNewConversation}
        onDelete={removeConversation}
        onRename={renameConvo}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">
              {conversations.find(c => c.id === activeId)?.title || 'AI Chatbot'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ModelSelector model={model} onModelChange={handleModelChange} />

            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]
                hover:text-[var(--text-primary)] transition-colors"
              title="Toggle dark/light mode"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Chat window */}
        <ChatWindow
          conversationId={activeId}
          messages={messages}
          isStreaming={isStreaming}
          uploadedFiles={uploadedFiles}
          onUpload={handleUpload}
          onRemoveFile={removeUploadedFile}
          onSendMessage={sendMessage}
          onRegenerate={regenerate}
          model={model}
        />
      </div>

      {/* Toast */}
      <Toast toast={toast} />
    </div>
  )
}
