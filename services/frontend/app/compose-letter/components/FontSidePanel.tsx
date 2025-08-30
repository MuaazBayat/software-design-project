"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { FONT_PRESETS, FontPresetMeta } from '@/app/fonts'
import { Star, StarOff, X } from 'lucide-react'

interface Props {
  open: boolean
  currentId: string
  onSelect: (id: string) => void
  onPreview: (id: string | null) => void
  onClose: () => void
  anchorWithinSidebar?: boolean // when true, use absolute overlay inside sidebar instead of fixed full-height
}

const FAVORITES_KEY = 'letterEditor.fontFavorites'

export function FontSidePanel({ open, currentId, onSelect, onPreview, onClose, anchorWithinSidebar = false }: Props) {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
        if (Array.isArray(stored)) setFavorites(stored)
      } catch {}
    } else {
      setQuery('')
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

  const filtered: FontPresetMeta[] = FONT_PRESETS.filter(fp => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return fp.label.toLowerCase().includes(q) || fp.category.includes(q) || fp.id.includes(q)
  }).sort((a,b) => {
    const af = favorites.includes(a.id) ? 0 : 1
    const bf = favorites.includes(b.id) ? 0 : 1
    if (af !== bf) return af - bf
    return a.label.localeCompare(b.label)
  })

  if (!open) return null

  const baseClasses = anchorWithinSidebar
    ? 'absolute inset-0 w-full h-full bg-white/95 backdrop-blur-sm border-r border-amber-200 shadow-lg flex flex-col z-30'
    : 'fixed left-0 top-0 h-full w-72 bg-white border-r border-amber-200 shadow-lg flex flex-col z-40'

  return (
    <aside ref={containerRef} className={baseClasses}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-100 bg-amber-50">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search fonts..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-amber-400"
        />
        <button onClick={onClose} aria-label="close" className="p-1 rounded hover:bg-amber-100 text-amber-600"><X className="h-4 w-4"/></button>
      </div>
      <div className="overflow-y-auto flex-1">
        <ul className="divide-y divide-amber-50">
          {filtered.map(fp => {
            const fav = favorites.includes(fp.id)
            const active = fp.id === currentId
            return (
              <li key={fp.id}
                  onMouseEnter={() => onPreview(fp.id)}
                  onMouseLeave={() => onPreview(null)}
                  onClick={() => { onSelect(fp.id); onClose() }}
                  className={`px-3 py-3 cursor-pointer text-sm flex items-center justify-between gap-3 ${active ? 'bg-amber-100/80' : 'hover:bg-amber-50'}`}>
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
      </div>
      <div className="px-3 py-2 text-[10px] flex flex-wrap gap-3 text-amber-600 bg-amber-50 border-t border-amber-100">
        <span>Hover = preview</span>
        <span>Click = apply</span>
        <span>Esc = close</span>
      </div>
    </aside>
  )
}
