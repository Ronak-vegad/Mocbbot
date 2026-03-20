import { useEffect, useState, useCallback } from 'react'
import { getModels } from '../api'

export default function ModelSelector({ model, onModelChange }) {
  const [models, setModels] = useState([])
  const [open, setOpen] = useState(false)

  const fetchModels = useCallback(async () => {
    try {
      const data = await getModels()
      const names = (data.models || []).map(m => m.name).filter(Boolean)
      setModels(names.length ? names : ['gpt-oss:20b'])
    } catch {
      setModels(['gpt-oss:20b'])
    }
  }, [])

  useEffect(() => { fetchModels() }, [fetchModels])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          bg-indigo-500/10 text-indigo-300 border border-indigo-500/30
          hover:bg-indigo-500/20 transition-all duration-200"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        {model}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)]
          bg-[var(--bg-secondary)] shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="p-1.5 max-h-60 overflow-y-auto">
            {models.map(name => (
              <button
                key={name}
                onClick={() => { onModelChange(name); setOpen(false) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                  ${model === name
                    ? 'bg-indigo-500/20 text-indigo-300 font-medium'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
              >
                {name}
                {model === name && <span className="float-right text-indigo-400">✓</span>}
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--border)] px-3 py-2">
            <button
              onClick={fetchModels}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ↻ Refresh models
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
