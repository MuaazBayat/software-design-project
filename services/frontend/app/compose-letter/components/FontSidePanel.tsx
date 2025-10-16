"use client"
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { FONT_PRESETS, FontPresetMeta } from '../fonts'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Star, StarOff, X, Search } from 'lucide-react'
import { motion } from 'motion/react'

interface Props {
  open: boolean
  currentId: string
  onSelect: (id: string) => void
  onPreview: (id: string | null) => void
  onClose: () => void
  anchorWithinSidebar?: boolean // when true, use absolute overlay inside sidebar instead of fixed full-height
  fontColor?: string
  fontOpacity?: number
  backgroundColor?: string
  backgroundOpacity?: number
}

const FAVORITES_KEY = 'letterEditor.fontFavorites'

function FontSidePanelComponent({ open, currentId, onSelect, onPreview, onClose, anchorWithinSidebar = false, fontColor = "#000000", fontOpacity = 1, backgroundColor = "#ffffff", backgroundOpacity = 1 }: Props) {
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY)
      if (stored) {
        setFavorites(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Failed to load font favorites from localStorage:', error)
    }
  }, [])
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [isHovering, setIsHovering] = useState(false)

  const resetAutoCloseTimer = useCallback(() => {
    setLastActivity(Date.now())
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
    resetAutoCloseTimer()
  }, [resetAutoCloseTimer])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
  }, [])

  const handleScroll = useCallback(() => {
    resetAutoCloseTimer()
  }, [resetAutoCloseTimer])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const filtered: FontPresetMeta[] = useMemo(() => {
    return FONT_PRESETS.filter((fp: FontPresetMeta) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return fp.label.toLowerCase().includes(q) || fp.category.includes(q) || fp.id.includes(q)
    }).sort((a: FontPresetMeta, b: FontPresetMeta) => {
      // Current font always first
      if (a.id === currentId) return -1
      if (b.id === currentId) return 1
      
      // Then favorites
      const af = favorites.includes(a.id) ? 0 : 1
      const bf = favorites.includes(b.id) ? 0 : 1
      if (af !== bf) return af - bf
      
      // Then alphabetical
      return a.label.localeCompare(b.label)
    })
  }, [query, favorites, currentId])

  useEffect(() => {
    if (open && filtered.length > 0) {
      const currentIndex = filtered.findIndex(fp => fp.id === currentId)
      setSelectedIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [open, currentId, filtered])

  // Auto-close timer
  useEffect(() => {
    if (open) {
      resetAutoCloseTimer()
    }
  }, [open, resetAutoCloseTimer])

  // Clear preview when panel closes
  useEffect(() => {
    if (!open) {
      onPreview(null)
    }
  }, [open, onPreview])

  useEffect(() => {
    if (isHovering) return // Don't start timer while hovering

    const timer = setTimeout(() => {
      onClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [lastActivity, onClose, isHovering])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || filtered.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => {
            const next = (prev + 1) % filtered.length
            onPreview(filtered[next].id)
            return next
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => {
            const next = prev <= 0 ? filtered.length - 1 : prev - 1
            onPreview(filtered[next].id)
            return next
          })
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < filtered.length) {
            onSelect(filtered[selectedIndex].id)
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, selectedIndex, onPreview, onSelect, onClose])

  if (!open) return null

  const baseClasses = anchorWithinSidebar
    ? 'absolute inset-0 w-full h-full bg-white backdrop-blur-sm border-r border-gray-200 shadow-lg flex flex-col z-50'
    : 'w-full h-full bg-white border-0 shadow-none flex flex-col min-h-0'

  return (
    <motion.aside 
      ref={containerRef} 
      initial={{ x: -300 }} 
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseLeave={() => {
        onPreview(null)
        handleMouseLeave()
      }}
      onMouseEnter={handleMouseEnter}
      className={baseClasses}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-25">
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search fonts..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 focus:placeholder:text-gray-300 transition-colors duration-200"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="clear search"
            className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {anchorWithinSidebar && (
          <button onClick={onClose} aria-label="close" className="p-1 rounded-full hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors duration-200"><X className="h-4 w-4"/></button>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0" onScrollCapture={handleScroll}>
        <ul className="divide-y divide-gray-50 space-y-3 p-2">
          {filtered.map((fp, index) => {
            const fav = favorites.includes(fp.id)
            const active = fp.id === currentId
            const selected = index === selectedIndex
            const bgColor = backgroundColor || '#ffffff'
            const bgOpacity = backgroundOpacity || 1
            const r = parseInt(bgColor.slice(1, 3), 16)
            const g = parseInt(bgColor.slice(3, 5), 16)
            const b = parseInt(bgColor.slice(5, 7), 16)
            const cardBg = `rgba(${r}, ${g}, ${b}, 0.3)`
            const group = Math.floor(index / 3)
            const isEvenGroup = group % 2 === 0
            const positionInGroup = index % 3
            const fromLeft = (isEvenGroup && positionInGroup < 2) || (!isEvenGroup && positionInGroup === 2)
            
            // Create a lighter version of the background color for the gradient
            const lightenColor = (hex: string) => {
              const num = parseInt(hex.replace("#", ""), 16)
              const r = (num >> 16) & 0xFF
              const g = (num >> 8) & 0xFF
              const b = num & 0xFF
              
              // Calculate brightness (0-255)
              const brightness = (r * 299 + g * 587 + b * 114) / 1000
              
              // Only significantly lighten VERY dark colors
              // Very dark: brightness < 80 (like dark red, dark blue, dark green)
              // Medium/dark: 80-150 (moderate lightening)
              // Light: > 150 (no lightening)
              let lightenPercent = 15 // default moderate lightening
              if (brightness < 80) lightenPercent = 60 // very dark colors only
              else if (brightness > 150) lightenPercent = 0 // light colors - no lightening
              
              const amt = Math.round(2.55 * lightenPercent)
              const R = (num >> 16) + amt
              const G = (num >> 8 & 0x00FF) + amt
              const B = (num & 0x0000FF) + amt
              return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
            }
            
            const lightBgColor = lightenColor(bgColor)
            return (
              <motion.li 
                key={fp.id}
                initial={{ 
                  opacity: 0, 
                  y: 40, 
                  x: fromLeft ? -60 : 60,
                  scale: 0.8,
                  rotateX: 25,
                  filter: "blur(4px) brightness(0.8)"
                }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  x: 0,
                  scale: 1,
                  rotateX: 0,
                  filter: "blur(0px) brightness(1)"
                }}
                transition={{ 
                  delay: index * 0.06, 
                  duration: 0.9,
                  ease: [0.23, 1, 0.32, 1], // Professional easing curve
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  mass: 0.8,
                  bounce: 0.3
                }}
                whileHover={{ 
                  scale: 1.05,
                  y: -3,
                  rotateX: -2,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] }
                }}
                whileTap={{
                  scale: 0.98,
                  transition: { duration: 0.1 }
                }}
                onMouseEnter={() => onPreview(fp.id)}
                onClick={() => {
                  onSelect(fp.id)
                  onClose()
                }}
                className={`pl-4 pr-1 py-4 cursor-pointer text-sm flex items-center justify-between gap-3 rounded-md border transition-all duration-200 ease-out hover:shadow-lg ${selected ? 'ring-2 ring-gray-300 ring-opacity-50' : ''} ${active ? 'ring-2 ring-black border-black border-2 shadow-lg' : 'shadow-md'}`}
                style={{ 
                  background: `linear-gradient(135deg, ${lightBgColor} 0%, ${lightBgColor}90 25%, ${lightBgColor}60 50%, ${lightBgColor}30 75%, ${lightBgColor}10 100%), radial-gradient(circle at 20% 80%, ${lightBgColor}40 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${lightBgColor}20 0%, transparent 50%)`,
                  borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
                  boxShadow: `0 4px 15px ${bgColor}30, inset 0 1px 0 ${bgColor}60`
                }}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`${fp.className} font-medium leading-snug`} style={{ color: fontColor ? `rgba(${parseInt(fontColor.slice(1, 3), 16)}, ${parseInt(fontColor.slice(3, 5), 16)}, ${parseInt(fontColor.slice(5, 7), 16)}, ${fontOpacity})` : undefined }}>{fp.label}</span>
                  <span className="text-xs text-gray-500 mt-1 leading-tight">{fp.description}</span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">{fav ? '★ Favorite' : fp.category}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(fp.id) }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-700"
                  aria-label={fav ? 'remove-favorite' : 'add-favorite'}
                >
                  {fav ? <Star className="h-4 w-4 fill-black" /> : <StarOff className="h-4 w-4" />}
                </button>
              </motion.li>
            )
          })}
          {!filtered.length && (
            <li className="px-4 py-6 text-center text-xs text-gray-500">
              No matches
            </li>
          )}
        </ul>
      </ScrollArea>
      <div className="px-3 py-2 text-[10px] flex flex-wrap gap-3 text-gray-600 bg-gray-50 border-t border-gray-100 select-none">
        <span>Hover = preview</span>
        <span>Click = apply</span>
        <span>Enter = select</span>
        <span>Esc = close</span>
      </div>
    </motion.aside>
  )
}

export const FontSidePanel = memo(FontSidePanelComponent)
