import { useState, useRef } from 'react'
import { X, Paperclip, FileText, Image, Table, File } from 'lucide-react'

const TYPE_ICONS = {
  pdf: <FileText className="w-3.5 h-3.5" />,
  docx: <FileText className="w-3.5 h-3.5" />,
  image: <Image className="w-3.5 h-3.5" />,
  csv: <Table className="w-3.5 h-3.5" />,
  excel: <Table className="w-3.5 h-3.5" />,
  text: <File className="w-3.5 h-3.5" />,
}

const TYPE_COLORS = {
  pdf: 'bg-red-500/15 text-red-400 border-red-500/30',
  docx: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  image: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  csv: 'bg-green-500/15 text-green-400 border-green-500/30',
  excel: 'bg-green-500/15 text-green-400 border-green-500/30',
  text: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

export function FileChip({ file, onRemove }) {
  const color = TYPE_COLORS[file.file_type] || TYPE_COLORS.text
  return (
    <span className={`file-chip border ${color}`}>
      {TYPE_ICONS[file.file_type] || TYPE_ICONS.text}
      <span className="max-w-[120px] truncate">{file.filename}</span>
      {onRemove && (
        <button onClick={() => onRemove(file.file_id)} className="ml-1 hover:opacity-70">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

export default function FileUpload({ onUpload, uploadedFiles, onRemove, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onUpload(files)
  }

  const handleChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length) { onUpload(files); e.target.value = '' }
  }

  return (
    <div>
      {/* Upload chips row */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {uploadedFiles.map(f => (
            <FileChip key={f.file_id} file={f} onRemove={onRemove} />
          ))}
        </div>
      )}

      {/* Drag overlay (full input area) */}
      {dragging && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl
            border-2 border-dashed border-indigo-500 bg-indigo-500/10 backdrop-blur-sm"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
        >
          <p className="text-indigo-300 font-medium text-sm">Drop files here</p>
        </div>
      )}

      {/* Attach button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]
          hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40"
        title="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.docx,.csv,.xlsx,.xls,.txt,.md,.jpg,.jpeg,.png,.webp"
        onChange={handleChange}
      />
    </div>
  )
}
