import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, Bold, Italic, Underline, ListOrdered, ListIcon, BookTemplate, RotateCcw, RotateCw, Type } from "lucide-react"
import { FONT_PRESETS, DEFAULT_FONT_ID } from "@/app/fonts"
import { applyCustomList as applyCustomListExternal, wrapSelectionInList as wrapSelectionInListExternal } from "../lib/listFormatting"
// Lightweight local LetterTemplate type (inlined so this component doesn't depend on an external service file)
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
}

export default function MainContent({ 
  letterContent, 
  setLetterContent, 
  fontStyle, 
  fontSize,
  success = false,
  templates = [],
  onApplyTemplate,
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
  overlayFontOpen = false
}: MainContentProps) {
  const [selectedFormatting, setSelectedFormatting] = useState<string[]>([]);
  // Removed internal floating panel; using sidebar overlay instead
  const previewFontId = previewFontIdExternal
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  // Ensure fontStyle has a default compatible with new presets
  if (!fontStyle) setFontStyle?.(DEFAULT_FONT_ID)
  // Track last committed content for undo snapshotting on typing
  const lastContentRef = useRef<string>(letterContent)
  const editorRef = useRef<HTMLDivElement | null>(null)
  // preserve a cloned Range on mousedown so toolbar clicks that blur/clear the
  // live selection can still operate on the intended range
  const preservedRangeRef = useRef<Range | null>(null)

  const captureSelection = () => {
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
  preservedRangeRef.current = sel.getRangeAt(0).cloneRange()
      }
    } catch (e) {
      // ignore
    }
  }
  const pushUndo = useCallback((html?: string) => {
    const editor = editorRef.current
    if (!editor) return
    const snapshot = html !== undefined ? html : editor.innerHTML
    setUndoStack(prev => {
      if (prev[prev.length - 1] === snapshot) return prev // avoid duplicates
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
    // apply formatting to the current selection using document.execCommand
    // map our format names to execCommand commands
    const cmdMap: { [k: string]: string } = {
      'bold': 'bold',
      'italic': 'italic',
      'underline': 'underline',
      'olist': 'insertOrderedList',
      'ulist': 'insertUnorderedList'
    }
    const cmd = cmdMap[format]
    if (!cmd) return

    // Custom handling for list buttons: build list items from the selected text
    // splitting either on newlines (if present) or on sentence boundaries ending
    // in a period / question / exclamation mark. This bypasses inconsistent
    // browser execCommand list behavior and produces predictable output.
    if (format === 'olist' || format === 'ulist') {
      pushUndo()
      applyCustomList(format === 'olist')
      refreshFormattingState()
      return
    }

  {
      // If this is a list command, ensure the editor has focus and the selection
      // is inside the editor so execCommand behaves as expected. Try execCommand
      // first (native behavior). If it produces no DOM change, fall back to a
      // safe DOM-manipulation that wraps the selection in an <ol>/<ul> with
      // <li> children.
      const isList = format === 'olist' || format === 'ulist'
      const editor = editorRef.current
  try {
        if (isList && editor) {
          const sel = window.getSelection()
          if (sel && sel.anchorNode && !editor.contains(sel.anchorNode)) {
            editor.focus()
          }
          // snapshot before
          const before = editor.innerHTML
          // try native command
          document.execCommand(cmd)
          const after = editor.innerHTML
          // if execCommand didn't change the editor, use fallback
          if (after === before) {
            const ordered = format === 'olist'
            pushUndo(); wrapSelectionInList(ordered)
          }
        } else {
          // non-list commands
          pushUndo(); document.execCommand(cmd)
        }
      } catch (e) {
        // if execCommand fails for lists, try fallback
        if (isList) { pushUndo(); wrapSelectionInList(format === 'olist') }
      }
    }
  // Keep React state in sync after applying formatting
    try {
      const editor = editorRef.current
      if (editor) {
        const selBefore = preservedRangeRef.current?.cloneRange()
        setLetterContent(editor.innerHTML)
        // restore selection asynchronously to avoid React repaint clearing it
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
    } catch (e) {}
    refreshFormattingState()
  };

  // DOM-based fallback to convert the current selection into a list. This is
  // used when document.execCommand('insertOrderedList'/'insertUnorderedList')
  // doesn't apply (some browsers/environments are inconsistent). The
  // implementation is intentionally small and conservative: it extracts the
  // selected fragment, wraps top-level nodes into <li> elements and inserts an
  // <ol> or <ul> replacing the selection. Inline formatting inside nodes is
  // preserved because we clone the selected nodes.
  const wrapSelectionInList = (ordered: boolean) => {
    wrapSelectionInListExternal(ordered, { editor: editorRef.current, preservedRangeRef, setLetterContent })
  }

  // Build a list from selection text (splitting by newline or sentence end) and replace selection.
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
      // Detect list presence by walking selection ancestors
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
    } catch (e) { /* ignore */ }
  }

  // Recompute sequential numbering across all ordered lists so that when
  // users insert new items earlier, later split lists update their start.
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
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // paragraphs or other blocks do not reset numbering; continue cumulative
      }
    })
    if (changed) {
      const html = editor.innerHTML
      lastContentRef.current = html
      setLetterContent(html)
    }
  }
  
  const handleTemplateSelect = (templateId: string) => {
    onApplyTemplate?.(templateId);
  };

  useEffect(() => {
    // initialize undo stack with initial content once
    if (undoStack.length === 0 && letterContent) {
      setUndoStack([letterContent])
      lastContentRef.current = letterContent
    }
    // update toolbar button states when selection changes
    const onSelectionChange = () => {
      try {
        const newFormats: string[] = []
        if (document.queryCommandState('bold')) newFormats.push('bold')
        if (document.queryCommandState('italic')) newFormats.push('italic')
        if (document.queryCommandState('underline')) newFormats.push('underline')
        try {
          if (document.queryCommandState('insertOrderedList')) newFormats.push('olist')
          if (document.queryCommandState('insertUnorderedList')) newFormats.push('ulist')
        } catch (e) {}
        const sel = window.getSelection()
        setSelectedFormatting(newFormats)
      } catch (e) {
        // ignore in environments where execCommand isn't available
      }
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  // Keyboard shortcuts for undo/redo & formatting
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
  }, [handleUndo, handleRedo, toggleFormatting])

  // Keep editor DOM in sync only when the external letterContent prop changes.
  // This avoids React re-rendering/dangerouslySetInnerHTML that would replace the
  // DOM while the user is selecting text or interacting with the editor.
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (el.innerHTML !== letterContent) {
      el.innerHTML = letterContent
    }
  }, [letterContent])

  // Map selected fontStyle to utility classes and optional inline styles.
  const effectiveFontId = previewFontId || fontStyle
  const preset = FONT_PRESETS.find(p => p.id === effectiveFontId) || FONT_PRESETS[0]
  const fontClass = preset.className
  const fontInlineStyle: { [k: string]: string } = {}
  if (preset.letterSpacing) fontInlineStyle.letterSpacing = preset.letterSpacing
  if (preset.lineHeight) fontInlineStyle.lineHeight = preset.lineHeight
  // Header/footer should not be bigger than the main text.
  // Make header/footer slightly smaller (90%) but never exceed main font size and have a sensible minimum.
  const headerFooterSize = (fontSize && fontSize[0])
    ? Math.max(12, Math.min(fontSize[0], Math.round(fontSize[0] * 0.9)))
    : 18

  return (
  <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
            <p>Your letter has been sent successfully! It will be delivered to your pen pal soon.</p>
          </div>
        )}

        {/* Toolbar: two rows */}
        <div className="mb-4">
          {/* Top row: font selector + slider + new letter */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 bg-white/80 border border-amber-100 rounded px-3 py-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={overlayFontOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onToggleFontOverlay?.()}
                  className={`gap-1 ${overlayFontOpen ? 'text-amber-900 bg-amber-100' : 'text-amber-700 hover:bg-amber-100'}`}
                >
                  <Type className="h-4 w-4" />
                  <span className="text-xs">Fonts (Ctrl+K)</span>
                </Button>
              </div>

              <div className="flex items-center gap-3 pl-4">
                <span className="text-xs text-gray-500">Tt</span>
                <div className="w-48">
                  <Slider value={fontSize} onValueChange={setFontSize} min={8} max={48} step={1} />
                </div>
                <span className="text-lg text-gray-500">Tt</span>
              </div>
            </div>

            <div>
              <Button variant="secondary" size="sm" onClick={() => onNewLetter?.()} disabled={sending} className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100">
                New Letter
              </Button>
            </div>
          </div>

          {/* Bottom row: formatting actions + templates + preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white/80 border border-amber-200 rounded-md p-1">
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
              {/* Quote button removed as requested */}
              <Button variant={selectedFormatting.includes('olist') ? 'default' : 'ghost'} size="sm" onMouseDown={(e) => { captureSelection(); e.preventDefault(); toggleFormatting('olist') }} aria-label="ordered-list" className={selectedFormatting.includes('olist') ? 'bg-amber-100 text-amber-900' : ''}>
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button variant={selectedFormatting.includes('ulist') ? 'default' : 'ghost'} size="sm" onMouseDown={(e) => { captureSelection(); e.preventDefault(); toggleFormatting('ulist') }} aria-label="unordered-list" className={selectedFormatting.includes('ulist') ? 'bg-amber-100 text-amber-900' : ''}>
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 border-amber-200">
                    <BookTemplate className="h-4 w-4" />
                    Templates
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Choose a Letter Template</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 mt-4">
                    {templates.map(template => (
                      <Card 
                        key={template.id}
                        className="p-3 cursor-pointer hover:bg-amber-50 transition-colors"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <h4 className="font-medium text-gray-800">{template.name}</h4>
                        <p className="text-gray-500 text-sm">{template.description}</p>
                        <Badge className="mt-2" variant="outline">{template.category}</Badge>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              {/* preview removed as requested */}
            </div>
          </div>
        </div>

  <div className="mb-8">
          <p className={`text-gray-500 mb-4 ${fontClass}`} style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <input
            value={letterHeading}
            onChange={(e) => setLetterHeading?.(e.target.value)}
            className={`text-gray-700 mb-6 bg-transparent border-b border-amber-100 focus:outline-none ${fontClass}`}
            style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}
          />
        </div>

        <Card className="p-8 bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg">
      <div
            ref={editorRef}
            contentEditable={!success}
            suppressContentEditableWarning
            onInput={(e) => {
              const html = (e.target as HTMLDivElement).innerHTML
              if (html !== lastContentRef.current) {
                pushUndo(lastContentRef.current)
                lastContentRef.current = html
                setLetterContent(html)
        // Normalize lists after user typing edits.
        requestAnimationFrame(() => normalizeOrderedLists())
              }
            }}
            // NOTE: we intentionally avoid using dangerouslySetInnerHTML here to prevent
            // React from overwriting the editor DOM on every render (which breaks selection).
            // Instead we sync the editor's innerHTML imperatively in an effect below when
            // the incoming `letterContent` prop actually changes.
            className={`min-h-64 border-none resize-none focus:ring-0 text-gray-700 leading-relaxed ${fontClass}`}
            tabIndex={0}
            onMouseDown={() => editorRef.current?.focus()}
            style={{
              fontSize: `${fontSize[0]}px`,
              ...(fontInlineStyle || {}),
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text'
            }}
          />
        </Card>

        <div className="mt-6 text-right">
          <input
            value={letterFooterPrefix}
            onChange={(e) => setLetterFooterPrefix?.(e.target.value)}
            className={`text-gray-600 bg-transparent border-b border-amber-100 focus:outline-none ml-auto w-48 text-right ${fontClass}`}
            style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}
          />
          <div className={`mt-1 text-gray-600 ${fontClass}`} style={{ fontSize: `${headerFooterSize}px`, ...(fontInlineStyle || {}) }}>{anonymousHandle}</div>
          {/* Scheduled delivery is automatic (12 hours from send) */}
        </div>
      </div>
    </div>
  )
}
