"use client"
import { useState, useEffect, useCallback, useRef } from 'react'
import { FONT_PRESETS, FontPresetMeta } from '@/app/fonts'
import { Star, StarOff, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (id: string) => void
  onPreview: (id: string | null) => void
  currentId: string
}

const FAVORITES_KEY = 'letterEditor.fontFavorites'

export function FontCommandPalette({ open, onClose, onSelect, onPreview, currentId }: Props) {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
        if (Array.isArray(stored)) setFavorites(stored)
      } catch {}
      setTimeout(() => inputRef.current?.focus(), 20)
    } else {
      setQuery('')
      setHighlightIndex(0)
      onPreview(null)
    }
  }, [open, onPreview])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const filtered: FontPresetMeta[] = FONT_PRESETS.filter(p => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
  }).sort((a,b) => {
    const af = favorites.includes(a.id) ? 0 : 1
    const bf = favorites.includes(b.id) ? 0 : 1
    if (af !== bf) return af - bf
    return a.label.localeCompare(b.label)
  })

  useEffect(() => {
    if (highlightIndex >= filtered.length) setHighlightIndex(0)
  }, [filtered.length, highlightIndex])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => (i + 1) % Math.max(filtered.length,1)); const item = filtered[(highlightIndex + 1) % Math.max(filtered.length,1)]; if (item) onPreview(item.id); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => (i - 1 + filtered.length) % Math.max(filtered.length,1)); const item = filtered[(highlightIndex - 1 + filtered.length) % Math.max(filtered.length,1)]; if (item) onPreview(item.id); }
    else if (e.key === 'Enter') { e.preventDefault(); const item = filtered[highlightIndex]; if (item) { onSelect(item.id); onClose(); } }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-lg shadow-xl bg-white border border-amber-200 overflow-hidden animate-in fade-in zoom-in" role="dialog" aria-modal="true">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-100 bg-amber-50">
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlightIndex(0) }}
            onKeyDown={onKey}
            placeholder="Search fonts or type category (serif, handwritten, mono)..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-amber-400"
          />
          <button aria-label="close" onClick={() => onClose()} className="p-1 rounded hover:bg-amber-100 text-amber-600"><X className="h-4 w-4" /></button>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y divide-amber-50">
          {filtered.map((fp, idx) => {
            const active = idx === highlightIndex
            const fav = favorites.includes(fp.id)
            return (
              <li
                key={fp.id}
                onMouseEnter={() => { setHighlightIndex(idx); onPreview(fp.id) }}
                onClick={() => { onSelect(fp.id); onClose() }}
                className={`px-4 py-3 cursor-pointer text-sm flex items-center justify-between gap-4 ${active ? 'bg-amber-100/70' : 'hover:bg-amber-50'} ${fp.id===currentId ? 'ring-1 ring-amber-300' : ''}`}
              >
                <div className="flex flex-col min-w-0">
                  <span className={`${fp.className} font-medium leading-snug`}>{fp.label}</span>
                  <span className={`${fp.className} text-xs opacity-70 truncate`}>Dear friend, the quiet sun warms the page.</span>
                  <span className="text-[10px] uppercase tracking-wide text-amber-500 mt-1">{fav ? '★ Favorite' : fp.category}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(fp.id) }}
                  className="p-1 rounded hover:bg-amber-200 text-amber-700"
                  aria-label={fav ? 'remove-favorite' : 'add-favorite'}
                >
                  {fav ? <Star className="h-4 w-4 fill-amber-500" /> : <StarOff className="h-4 w-4" />}
                </button>
              </li>
            )
          })}
          {!filtered.length && (
            <li className="px-4 py-6 text-center text-xs text-amber-500">No matches</li>
          )}
        </ul>
        <div className="px-4 py-2 text-[10px] flex flex-wrap gap-4 justify-between text-amber-600 bg-amber-50 border-t border-amber-100">
          <span><kbd className="px-1 py-0.5 bg-white border rounded">↑</kbd>/<kbd className="px-1 py-0.5 bg-white border rounded">↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-white border rounded">Enter</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 bg-white border rounded">Esc</kbd> Close</span>
          <span><kbd className="px-1 py-0.5 bg-white border rounded">★</kbd> Favorite</span>
        </div>
      </div>
    </div>
  )
}
