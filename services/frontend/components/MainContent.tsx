import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, Bold, Italic, Underline, ListOrdered, ListIcon, BookTemplate, RotateCcw, RotateCw, Type } from "lucide-react"
import { FONT_PRESETS, DEFAULT_FONT_ID } from "@/app/compose-letter/fonts"
import { applyCustomList as applyCustomListExternal, wrapSelectionInList as wrapSelectionInListExternal } from "../lib/listFormatting"

export type LetterTemplate = { id: string; name: string; description: string; content: string; category: string; estimated_minutes?: number; tags?: string[] }

interface MainContentProps {
  letterContent: string
  setLetterContent: (content: string) => void
  fontStyle: string
  fontSize: number[]
  setFontStyle?: (s: string) => void
  setFontSize?: (s: number[]) => void
  success?: boolean
  templates?: LetterTemplate[]
  onApplyTemplate?: (templateId: string) => void
  letterHeading?: string
  setLetterHeading?: (h: string) => void
  letterFooterPrefix?: string
  setLetterFooterPrefix?: (p: string) => void
  anonymousHandle?: string
  onNewLetter?: () => void
  sending?: boolean
  previewFontIdExternal?: string | null
  onToggleFontOverlay?: () => void
  overlayFontOpen?: boolean
  templateBackground?: string | null
  onToggleTemplates?: () => void
  toggleLeftSidebar?: () => void
}

export default function MainContent({
  letterContent,
  setLetterContent,
  fontStyle,
  fontSize,
  success = false,
  letterHeading = 'To a kindred spirit,',
  setLetterHeading,
  letterFooterPrefix = 'Yours,',
  setLetterFooterPrefix,
  setFontStyle,
  setFontSize,
  anonymousHandle = '',
  onNewLetter,
  sending = false,
  previewFontIdExternal = null,
  onToggleFontOverlay,
  overlayFontOpen = false,
  templateBackground = null,
  onToggleTemplates,
  toggleLeftSidebar
}: MainContentProps) {
  const [selectedFormatting, setSelectedFormatting] = useState<string[]>([]);
  const previewFontId = previewFontIdExternal
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  if (!fontStyle) setFontStyle?.(DEFAULT_FONT_ID)
  const lastContentRef = useRef<string>(letterContent)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const currentContentRef = useRef<string>(letterContent)
  const preservedRangeRef = useRef<Range | null>(null)

  const captureSelection = () => {
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        preservedRangeRef.current = sel.getRangeAt(0).cloneRange()
      }
    } catch {}
  }

  const pushUndo = useCallback((html?: string) => {
    const editor = editorRef.current
    if (!editor) return
    const snapshot = html !== undefined ? html : editor.innerHTML
    setUndoStack(prev => {
      if (prev[prev.length - 1] === snapshot) return prev
      return [...prev.slice(-49), snapshot]
    })
    setRedoStack([])
  }, [])

  const handleUndo = () => {
    const editor = editorRef.current
    if (!editor || !undoStack.length) return
    const previous = undoStack[undoStack.length - 1]
    const current = editor.innerHTML
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack(r => [...r, current])
    editor.innerHTML = previous
    lastContentRef.current = previous
    setLetterContent(previous)
  }

  const handleRedo = () => {
    const editor = editorRef.current
    if (!editor || !redoStack.length) return
    const next = redoStack[redoStack.length - 1]
    const current = editor.innerHTML
    setRedoStack(redoStack.slice(0, -1))
    setUndoStack(u => [...u.slice(-49), current])
    editor.innerHTML = next
    lastContentRef.current = next
    setLetterContent(next)
  }

  const toggleFormatting = (format: string) => {
    const cmdMap: { [k: string]: string } = {
      'bold': 'bold',
      'italic': 'italic',
      'underline': 'underline',
      'olist': 'insertOrderedList',
      'ulist': 'insertUnorderedList'
    }
    const cmd = cmdMap[format]
    if (!cmd) return

    if (format === 'olist' || format === 'ulist') {
      pushUndo()
      applyCustomList(format === 'olist')
      refreshFormattingState()
      return
    }

    {
      const isList = format === 'olist' || format === 'ulist'
      const editor = editorRef.current
      try {
        if (isList && editor) {
          const sel = window.getSelection()
          if (sel && sel.anchorNode && !editor.contains(sel.anchorNode)) {
            editor.focus()
          }
          const before = editor.innerHTML
          document.execCommand(cmd)
          const after = editor.innerHTML
          if (after === before) {
            const ordered = format === 'olist'
            pushUndo(); wrapSelectionInList(ordered)
          }
        } else {
          pushUndo(); document.execCommand(cmd)
        }
      } catch {
        if (isList) { pushUndo(); wrapSelectionInList(format === 'olist') }
      }
    }

    try {
      const editor = editorRef.current
      if (editor) {
        const selBefore = preservedRangeRef.current?.cloneRange()
        setLetterContent(editor.innerHTML)
        setTimeout(() => {
          if (selBefore) {
            const sel = window.getSelection()
            try {
              sel?.removeAllRanges()
              sel?.addRange(selBefore)
            } catch {}
          }
        }, 0)
      }
    } catch {}
    refreshFormattingState()
  };

  const wrapSelectionInList = (ordered: boolean) => {
    wrapSelectionInListExternal(ordered, { editor: editorRef.current, preservedRangeRef, setLetterContent })
  }

  const applyCustomList = (ordered: boolean) => {
    applyCustomListExternal(ordered, { editor: editorRef.current as HTMLDivElement | null, preservedRangeRef, setLetterContent })
    normalizeOrderedLists()
  }

  const refreshFormattingState = () => {
    try {
      const newFormats: string[] = []
      if (document.queryCommandState('bold')) newFormats.push('bold')
      if (document.queryCommandState('italic')) newFormats.push('italic')
      if (document.queryCommandState('underline')) newFormats.push('underline')
      const sel = window.getSelection()
      if (sel && sel.anchorNode) {
        let node: Node | null = sel.anchorNode
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode
        let el = node as HTMLElement | null
        while (el) {
          if (el.tagName === 'UL') { newFormats.push('ulist'); break }
          if (el.tagName === 'OL') { newFormats.push('olist'); break }
          el = el.parentElement
        }
      }
      setSelectedFormatting(newFormats)
    } catch {}
  }

  const normalizeOrderedLists = () => {
    const editor = editorRef.current
    if (!editor) return
    let changed = false
    let cumulative = 0
    const children = Array.from(editor.childNodes)
    children.forEach(node => {
      if (node instanceof HTMLElement && node.tagName === 'OL') {
        const items = Array.from(node.children).filter(c => (c as HTMLElement).tagName === 'LI')
        const desiredStart = cumulative + 1
        const currentStartAttr = node.getAttribute('start')
        if (desiredStart === 1) {
          if (currentStartAttr) { node.removeAttribute('start'); changed = true }
        } else {
          if (currentStartAttr !== String(desiredStart)) { node.setAttribute('start', String(desiredStart)); changed = true }
        }
        cumulative += items.length
      }
    })
    if (changed) {
      const html = editor.innerHTML
      lastContentRef.current = html
      currentContentRef.current = html
      setLetterContent(html)
    }
  }

  useEffect(() => {
    if (undoStack.length === 0 && letterContent) {
      setUndoStack([letterContent])
      lastContentRef.current = letterContent
      currentContentRef.current = letterContent
    }
    const onSelectionChange = () => {
      try {
        const newFormats: string[] = []
        if (document.queryCommandState('bold')) newFormats.push('bold')
        if (document.queryCommandState('italic')) newFormats.push('italic')
        if (document.queryCommandState('underline')) newFormats.push('underline')
        try {
          if (document.queryCommandState('insertOrderedList')) newFormats.push('olist')
          if (document.queryCommandState('insertUnorderedList')) newFormats.push('ulist')
        } catch {}
        setSelectedFormatting(newFormats)
      } catch {}
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [letterContent, undoStack.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo(); else handleUndo()
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault(); handleRedo()
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault(); toggleFormatting('bold')
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault(); toggleFormatting('italic')
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault(); toggleFormatting('underline')
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault(); onToggleFontOverlay?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleUndo, handleRedo, toggleFormatting, onToggleFontOverlay])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (document.activeElement !== el) {
      el.innerHTML = letterContent
      currentContentRef.current = letterContent
    }
  }, [letterContent])

  const effectiveFontId = previewFontId || fontStyle
  const preset = FONT_PRESETS.find(p => p.id === effectiveFontId) || FONT_PRESETS[0]
  const fontClass = preset.className
  const fontInlineStyle: { [k: string]: string } = {}
  if (preset.letterSpacing) fontInlineStyle.letterSpacing = preset.letterSpacing
  if (preset.lineHeight) fontInlineStyle.lineHeight = preset.lineHeight

  const headerFooterSize = (fontSize && fontSize[0])
    ? Math.max(12, Math.min(fontSize[0], Math.round(fontSize[0] * 0.9)))
    : 18

  const lineTileHeight = fontSize && fontSize[0] ? Math.round(fontSize[0] * 2.25) : 36
  const rusticAssetUrl = '/textures/rustic.svg'

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      {/* FULL WIDTH FROM md: remove max constraint at md and up */}
      <div className="w-full max-w-2xl md:max-w-none md:w-full mx-auto">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
            <p>Your letter has been sent successfully! It will be delivered to your pen pal soon.</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4">
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-2">
            <div className="flex items-center gap-2 sm:gap-3 bg-white/80 border border-amber-100 rounded px-2 sm:px-3 py-2 overflow-x-auto">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={overlayFontOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {onToggleFontOverlay?.(); toggleLeftSidebar?.();}}
                  className={`gap-1 ${overlayFontOpen ? 'text-amber-900 bg-amber-100' : 'text-amber-700 hover:bg-amber-100'}`}
                >
                  <Type className="h-4 w-4" />
                  <span className="text-xs whitespace-nowrap">Fonts (Ctrl+K)</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4">
                <span className="text-xs text-gray-500">Tt</span>
                <div className="w-28 sm:w-40 md:w-56 lg:w-64">
                  <Slider value={fontSize} onValueChange={setFontSize} min={8} max={48} step={1} />
                </div>
                <span className="text-lg text-gray-500">Tt</span>
              </div>
            </div>

            <div className="w-full ">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNewLetter?.()}
                disabled={sending}
                className="w-full  bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
              >
                Clear Letter
              </Button>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2 bg-white/80 border border-amber-200 rounded-md p-1 overflow-x-auto">
              <Button
                variant={selectedFormatting.includes('bold') ? 'default' : 'ghost'}
                size="sm"
                onMouseDown={(e) => { captureSelection(); e.preventDefault(); toggleFormatting('bold') }}
                className={selectedFormatting.includes('bold') ? 'bg-amber-100 text-amber-900' : ''}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedFormatting.includes('italic') ? 'default' : 'ghost'}
                size="sm"
                onMouseDown={(e) => { captureSelection(); e.preventDefault(); toggleFormatting('italic') }}
                className={selectedFormatting.includes('italic') ? 'bg-amber-100 text-amber-900' : ''}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedFormatting.includes('underline') ? 'default' : 'ghost'}
                size="sm"
                onMouseDown={(e) => { captureSelection(); e.preventDefault(); toggleFormatting('underline') }}
                className={selectedFormatting.includes('underline') ? 'bg-amber-100 text-amber-900' : ''}
              >
                <Underline className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-amber-200 mx-1" />
              <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); handleUndo() }} disabled={!undoStack.length} aria-label="undo">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); handleRedo() }} disabled={!redoStack.length} aria-label="redo">
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedFormatting.includes('olist') ? 'default' : 'ghost'}
                size="sm"
                onMouseDown={(e) => { captureSelection(); e.preventDefault(); toggleFormatting('olist') }}
                aria-label="ordered-list"
                className={selectedFormatting.includes('olist') ? 'bg-amber-100 text-amber-900' : ''}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button
                variant={selectedFormatting.includes('ulist') ? 'default' : 'ghost'}
                size="sm"
                onMouseDown={(e) => { captureSelection(); e.preventDefault(); toggleFormatting('ulist') }}
                aria-label="unordered-list"
                className={selectedFormatting.includes('ulist') ? 'bg-amber-100 text-amber-900' : ''}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>

{/* Templates will be done in next sprint*/}
            {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1 border-amber-200" onClick={() => onToggleTemplates?.()}>
                <BookTemplate className="h-4 w-4" />
                Templates
              </Button>
            </div> */}
          </div>
        </div>

        <div className="relative">
          {templateBackground && (
            <div aria-hidden className="absolute inset-0 rounded-lg pointer-events-none z-0 overflow-hidden">
              {templateBackground === 'rustic' && (
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg,#fbf6ec 0%,#f4efe6 100%)`, backgroundSize: 'cover' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${rusticAssetUrl}')`, backgroundRepeat: 'repeat', opacity: 0.25 }} />
                </div>
              )}
              {templateBackground === 'plain' && (
                <div style={{ position: 'absolute', inset: 0, background: '#fbf6ed' }} />
              )}
              {templateBackground === 'lined' && (
                <div style={{
                  position: 'absolute',
                  top: 0, bottom: 0, left: 0, right: 0,
                  backgroundColor: '#fffef8',
                  backgroundImage: `repeating-linear-gradient(180deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent ${lineTileHeight}px), url('/../templates/linedpage.svg')`,
                  backgroundRepeat: `repeat, no-repeat`,
                  backgroundSize: `100% ${lineTileHeight}px, auto 100%`,
                  backgroundPosition: `center top, center center`
                }} />
              )}
            </div>
          )}

          <div className="mb-0 relative z-10">
            <p className={`text-gray-500 mb-1 ${fontClass}`} style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Full width heading on small screens */}
            <input
              value={letterHeading}
              onChange={(e) => setLetterHeading?.(e.target.value)}
              className={`w-full md:w-auto text-gray-700 mb-1 bg-transparent border-b border-amber-100 focus:outline-none ${fontClass}`}
              style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}
            />
          </div>

          <Card className="p-2 sm:p-3 bg-transparent border-amber-200 shadow-sm relative z-10">
            <div aria-hidden className="absolute inset-0 rounded-lg bg-white/2 backdrop-blur-none pointer-events-none z-0" />
            <div className="relative z-10">
              <div
                ref={editorRef}
                contentEditable={!success}
                suppressContentEditableWarning
                onInput={(e) => {
                  const html = (e.target as HTMLDivElement).innerHTML;
                  if (html !== lastContentRef.current) {
                    pushUndo(lastContentRef.current);
                    lastContentRef.current = html;
                    currentContentRef.current = html;
                  }
                }}
                onBlur={() => { setLetterContent(currentContentRef.current); }}
                className={`min-h-24 border-none focus:ring-0 text-gray-700 leading-tight ${fontClass}`}
                tabIndex={0}
                style={{
                  fontSize: `${fontSize[0]}px`,
                  ...(fontInlineStyle || {}),
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  direction: 'ltr'
                }}
              />
            </div>
          </Card>

          <div className="mt-2 text-right relative z-10">
            {/* Footer prefix full width on small, right-aligned */}
            <input
              value={letterFooterPrefix}
              onChange={(e) => setLetterFooterPrefix?.(e.target.value)}
              className={`w-full md:w-48 text-right text-gray-600 bg-transparent border-b border-amber-100 focus:outline-none ml-auto ${fontClass}`}
              style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}
            />
            <div className={`mt-1 text-gray-600 ${fontClass}`} style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}>
              {anonymousHandle}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
