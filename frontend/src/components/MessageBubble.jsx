import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, RefreshCw, Bot, User } from 'lucide-react'
import { FileChip } from './FileUpload'

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1 px-1">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200">
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

const components = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>{children}</code>
    )
  },
}

export default function MessageBubble({ message, onRegenerate, isLast }) {
  const isUser = message.role === 'user'
  const isEmpty = !message.content && message.streaming

  return (
    <div className={`flex gap-3 message-enter ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
        ${isUser
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
          : 'bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-600'
        }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`group relative max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* File badges */}
        {message.files?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {message.files.map((f, i) => (
              <span key={i} className={`file-chip border
                ${f.type === 'image' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                  f.type === 'pdf' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                  'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                📎 {f.name}
              </span>
            ))}
          </div>
        )}

        <div className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
            : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-sm'
          }`}>

          {isEmpty ? (
            <TypingDots />
          ) : (
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {message.content}
              </ReactMarkdown>
              {message.streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-400 animate-pulse rounded-sm" />}
            </div>
          )}
        </div>

        {/* Action buttons (assistant only, not streaming) */}
        {!isUser && !message.streaming && message.content && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={message.content} />
            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-gray-400 hover:text-gray-200 flex items-center gap-1 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
