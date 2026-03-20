import { useState, useRef } from 'react'
import {
  MessageSquarePlus, Trash2, Edit3, Check, X, ChevronLeft, ChevronRight, Bot
} from 'lucide-react'

function ConvoItem({ convo, isActive, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(convo.title)
  const inputRef = useRef()

  const startEdit = (e) => {
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const saveEdit = (e) => {
    e?.stopPropagation()
    if (title.trim()) onRename(convo.id, title.trim())
    setEditing(false)
  }

  return (
    <div
      onClick={() => !editing && onSelect(convo.id)}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-150 relative
        ${isActive
          ? 'bg-indigo-500/15 border border-indigo-500/25 text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-transparent'
        }`}
    >
      <MessageSquarePlus className="w-4 h-4 flex-shrink-0 opacity-60" />

      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-transparent border-b border-indigo-500 text-sm outline-none text-[var(--text-primary)]"
        />
      ) : (
        <span className="flex-1 text-sm truncate">{convo.title}</span>
      )}

      {/* Action buttons */}
      <div className={`flex items-center gap-1 ${editing ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {editing ? (
          <>
            <button onClick={saveEdit} className="p-1 rounded hover:bg-white/10 text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={e => { e.stopPropagation(); setEditing(false) }} className="p-1 rounded hover:bg-white/10 text-red-400"><X className="w-3.5 h-3.5" /></button>
          </>
        ) : (
          <>
            <button onClick={startEdit} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(convo.id) }} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onRename }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`flex flex-col h-full transition-all duration-300
      ${collapsed ? 'w-14' : 'w-64'} bg-[var(--bg-secondary)] border-r border-[var(--border)]`}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[var(--border)]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/chatbot.png" alt="AI Chatbot Logo" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-semibold text-sm text-[var(--text-primary)]">AI Chatbot</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* New Chat button */}
      <div className="p-2">
        <button
          onClick={onNew}
          className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl
            bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium
            transition-all duration-200 shadow-lg shadow-indigo-500/20
            ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Conversation list */}
      {!collapsed && (
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] text-center py-6 px-3">
              No conversations yet.<br />Create one above!
            </p>
          ) : (
            conversations.map(convo => (
              <ConvoItem
                key={convo.id}
                convo={convo}
                isActive={convo.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))
          )}
        </nav>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] text-center">
            Powered by <span className="text-indigo-400 font-medium">gpt-oss:20b</span>
          </p>
        </div>
      )}
    </aside>
  )
}
