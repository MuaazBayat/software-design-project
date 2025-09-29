import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, Bold, Italic, Underline, ListOrdered, ListIcon, BookTemplate, RotateCcw, RotateCw, Type, Trash2, MoreHorizontal, CheckSquare } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
// Temporary alias for backward compatibility
type LineConfigType = any;
import { FONT_PRESETS, DEFAULT_FONT_ID } from "../fonts"
import { applyCustomList as applyCustomListExternal, wrapSelectionInList as wrapSelectionInListExternal } from "@/lib/listFormatting"

// Import new universal pattern generators
import {
  generateStraightLines,
  generateWavePattern,
  generateZigzagPattern,
  generateArcPattern,
  generateSpiralPattern,
  generateDotsPattern,
  generateSwirlGrid,
  generateFloralPattern,
  generateFlowerPattern,
} from '../utils/patternGenerators';
// LanguageTool API types
interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  rule: {
    id: string;
    description: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface LanguageToolResult {
  matches: LanguageToolMatch[];
}

const getLinePattern = (lines: LineConfigType): string => {
  const { type, spacing, thickness, color, rotation, secondaryColor, density } = lines;
  
  switch (type) {
    case 'straight':
      return `repeating-linear-gradient(${rotation}deg, transparent 0px, transparent ${Math.max(0, spacing - thickness - 1)}px, ${color} ${Math.max(0, spacing - thickness)}px, ${color} ${spacing}px)`;
    
    case 'dashed':
      const dashLength = spacing * 0.6;
      const gapLength = spacing * 0.4;
      return `repeating-linear-gradient(${rotation}deg, ${color} 0px, ${color} ${dashLength}px, transparent ${dashLength}px, transparent ${spacing}px)`;
    
    case 'double':
      return `repeating-linear-gradient(${rotation}deg, 
        transparent 0px, 
        transparent ${spacing * 0.4}px, 
        ${color} ${spacing * 0.4}px, 
          {/* Bottom row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
        ${secondaryColor} ${spacing * 0.55}px, 
        ${secondaryColor} ${spacing * 0.6}px, 
        transparent ${spacing * 0.6}px, 
        transparent ${spacing}px)`;
    
    case 'dotted':
      return `radial-gradient(circle, ${color} ${thickness}px, transparent ${thickness}px)`;
    
    case 'grid':
      return `repeating-linear-gradient(0deg, transparent 0px, transparent ${spacing - thickness}px, ${color} ${spacing - thickness}px, ${color} ${spacing}px),
              repeating-linear-gradient(90deg, transparent 0px, transparent ${spacing - thickness}px, ${color} ${spacing - thickness}px, ${color} ${spacing}px)`;
    
    case 'crosses':
      const crossSize = spacing * density * 0.6;
      return `repeating-linear-gradient(45deg, transparent 0px, transparent ${crossSize * 0.4}px, ${color} ${crossSize * 0.4}px, ${color} ${crossSize * 0.6}px, transparent ${crossSize * 0.6}px, transparent ${crossSize}px),
              repeating-linear-gradient(-45deg, transparent 0px, transparent ${crossSize * 0.4}px, ${color} ${crossSize * 0.4}px, ${color} ${crossSize * 0.6}px, transparent ${crossSize * 0.6}px, transparent ${crossSize}px)`;
    
    case 'stars':
      const starSpacing = spacing * density;
      return `radial-gradient(circle at 50% 20%, ${color} ${thickness}px, transparent ${thickness + 1}px),
              radial-gradient(circle at 20% 50%, ${color} ${thickness}px, transparent ${thickness + 1}px),
              radial-gradient(circle at 80% 50%, ${color} ${thickness}px, transparent ${thickness + 1}px),
              radial-gradient(circle at 35% 35%, ${color} ${thickness}px, transparent ${thickness + 1}px),
              radial-gradient(circle at 65% 65%, ${color} ${thickness}px, transparent ${thickness + 1}px),
              repeating-conic-gradient(from ${rotation}deg, ${color} 0deg, transparent 36deg, transparent 324deg, ${color} 360deg)`;
    
    case 'hearts':
      const heartSpacing = spacing * density;
      return `radial-gradient(ellipse 60% 40% at 40% 40%, ${color} 30%, transparent 35%),
              radial-gradient(ellipse 60% 40% at 60% 40%, ${color} 30%, transparent 35%),
              radial-gradient(ellipse 40% 60% at 50% 60%, ${color} 40%, transparent 45%)`;
    
    case 'musical':
      const noteSpacing = spacing * density;
      return `radial-gradient(circle at 25% 50%, ${color} ${thickness * 2}px, transparent ${thickness * 2 + 1}px),
              linear-gradient(90deg, transparent 23%, ${color} 24%, ${color} 26%, transparent 27%),
              repeating-linear-gradient(0deg, transparent 0px, transparent ${noteSpacing * 0.8}px, ${color} ${noteSpacing * 0.8}px, ${color} ${noteSpacing * 0.85}px, transparent ${noteSpacing * 0.85}px, transparent ${noteSpacing}px)`;
    
    case 'geometric':
      const geoSpacing = spacing * density;
      return `repeating-conic-gradient(from ${rotation}deg, 
        ${color} 0deg, 
        ${color} 60deg, 
        transparent 60deg, 
        transparent 120deg, 
        ${secondaryColor} 120deg, 
        ${secondaryColor} 180deg, 
        transparent 180deg, 
        transparent 240deg,
        ${color} 240deg,
        ${color} 300deg,
        transparent 300deg,
        transparent 360deg)`;
    
    case 'mesh':
      return `repeating-linear-gradient(${rotation}deg, 
        transparent 0px, 
        transparent ${spacing * 0.3}px, 
        ${color} ${spacing * 0.3}px, 
        ${color} ${spacing * 0.35}px, 
        transparent ${spacing * 0.35}px, 
        transparent ${spacing * 0.65}px,
        ${secondaryColor} ${spacing * 0.65}px, 
        ${secondaryColor} ${spacing * 0.7}px, 
        transparent ${spacing * 0.7}px, 
        transparent ${spacing}px),
      repeating-linear-gradient(${rotation + 90}deg, 
        transparent 0px, 
        transparent ${spacing * 0.3}px, 
        ${color} ${spacing * 0.3}px, 
        ${color} ${spacing * 0.35}px, 

            {/* Mobile: collapse formatting into a menu */}
            <div className="flex md:hidden items-center gap-2">
              {/* Bold and Italic buttons only */}
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

              <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); handleUndo() }} disabled={!undoStack.length} aria-label="undo">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); handleRedo() }} disabled={!redoStack.length} aria-label="redo">
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleTemplates?.()}
                className="gap-1 border-amber-200 hover:bg-amber-50 hover:scale-105 transition-transform duration-200"
              >
                <BookTemplate className="h-4 w-4" />
                Templates
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={sending}
                aria-label="clear-letter"
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
        transparent ${spacing * 0.35}px, 
        transparent ${spacing * 0.65}px,
        ${secondaryColor} ${spacing * 0.65}px, 
        ${secondaryColor} ${spacing * 0.7}px, 
        transparent ${spacing * 0.7}px, 
        transparent ${spacing}px)`;
    
    case 'gradient':
      return `repeating-linear-gradient(${rotation}deg, 
        ${color} 0px, 
        ${secondaryColor} ${spacing * 0.5}px, 
        ${color} ${spacing}px)`;
    
    case 'wavy':
      return `repeating-linear-gradient(${rotation}deg,
        transparent 0px,
        transparent ${Math.max(0, spacing * 0.1)}px,
        ${color} ${Math.max(0, spacing * 0.1)}px,
        ${color} ${Math.max(0, spacing * 0.15)}px,
        transparent ${Math.max(0, spacing * 0.15)}px,
        transparent ${Math.max(0, spacing * 0.25)}px,
        ${color} ${Math.max(0, spacing * 0.25)}px,
        ${color} ${Math.max(0, spacing * 0.35)}px,
        transparent ${Math.max(0, spacing * 0.35)}px,
        transparent ${spacing}px)`;
    
    case 'zigzag':
      return `repeating-linear-gradient(${rotation}deg,
        transparent 0px,
        transparent ${Math.max(0, spacing * 0.2)}px,
        ${color} ${Math.max(0, spacing * 0.2)}px,
        ${color} ${Math.max(0, spacing * 0.3)}px,
        transparent ${Math.max(0, spacing * 0.3)}px,
        transparent ${spacing}px),
      repeating-linear-gradient(${rotation + 60}deg,
        transparent 0px,
        transparent ${Math.max(0, spacing * 0.1)}px,
        ${color} ${Math.max(0, spacing * 0.1)}px,
        ${color} ${Math.max(0, spacing * 0.4)}px,
        transparent ${Math.max(0, spacing * 0.4)}px,
        transparent ${spacing}px)`;
    
    case 'swirls':
      return `radial-gradient(circle at 25% 25%, ${color} ${thickness * 0.5}px, transparent ${thickness * 0.5 + 1}px),
              radial-gradient(circle at 75% 25%, ${color} ${thickness * 0.5}px, transparent ${thickness * 0.5 + 1}px),
              radial-gradient(circle at 25% 75%, ${color} ${thickness * 0.5}px, transparent ${thickness * 0.5 + 1}px),
              radial-gradient(circle at 75% 75%, ${color} ${thickness * 0.5}px, transparent ${thickness * 0.5 + 1}px),
              repeating-conic-gradient(from ${rotation}deg at 50% 50%, ${color} 0deg, transparent 15deg, transparent 345deg, ${color} 360deg)`;
    
    default:
      return 'none';
  }
};

const getBackgroundSize = (lines: LineConfigType): string => {
  const { type, spacing, density } = lines;
  
  switch (type) {
// Legacy function to be removed
// const getBackgroundSize = (lines: LineConfigType): string => {
//   const { type, spacing, density } = lines;
    case 'straight':
    case 'dashed':
    case 'double':
    case 'gradient':
      return '4000px 4000px';
    case 'dotted':
      return `${spacing * density}px ${spacing * density}px`;
    case 'grid':
      return `${spacing}px ${spacing}px`;
    case 'crosses':
      return `${spacing * density}px ${spacing * density}px`;
    case 'stars':
      return `${spacing * density * 2}px ${spacing * density * 2}px, ${spacing * density * 2}px ${spacing * density * 2}px, ${spacing * density * 2}px ${spacing * density * 2}px, ${spacing * density * 2}px ${spacing * density * 2}px, ${spacing * density * 2}px ${spacing * density * 2}px, ${spacing * density * 3}px ${spacing * density * 3}px`;
    case 'hearts':
      return `${spacing * density * 1.5}px ${spacing * density * 1.5}px`;
    case 'musical':
      return `${spacing * density}px ${spacing * density}px, ${spacing * density}px ${spacing * density}px, ${spacing * density}px ${spacing * density}px`;
    case 'geometric':
      return `${spacing * density * 2}px ${spacing * density * 2}px`;
    case 'mesh':
      return `${spacing * 2}px ${spacing * 2}px, ${spacing * 2}px ${spacing * 2}px`;
    case 'wavy':
      return '4000px 4000px';
    case 'zigzag':
      return '4000px 4000px, 4000px 4000px';
    case 'swirls':
      return `${spacing * 2}px ${spacing * 2}px, ${spacing * 2}px ${spacing * 2}px, ${spacing * 2}px ${spacing * 2}px, ${spacing * 2}px ${spacing * 2}px, ${spacing * 3}px ${spacing * 3}px`;
    default:
      return `${spacing}px ${spacing}px`;
  }
};

const shouldRotateContainer = (type: LineConfigType['type']): boolean => {
  return ['dotted', 'hearts', 'stars', 'musical', 'floral'].includes(type);
};

const getAnimation = (lines: LineConfigType): string => {
  const { type, animationSpeed } = lines;
  
  if (animationSpeed === 0) return 'none';
  
  const duration = Math.max(1, 5 / animationSpeed);
  
  switch (type) {
    case 'wavy':
      return `wave-flow ${duration}s infinite linear`;
    case 'swirls':
      return `swirl-rotate ${duration * 5}s infinite linear`; // Slower animation for better performance
    case 'mesh':
      return `mesh-pulse ${duration * 3}s infinite ease-in-out`;
    default:
      return 'none';
  }
};

export type LetterTemplate = { id: string; name: string; description: string; content: string; category: string; estimated_minutes?: number; tags?: string[] }

interface MainContentProps {
  letterContent: string
  setLetterContent: (content: string) => void
  fontStyle: string
  fontSize: number[]
  fontColor?: string
  fontOpacity?: number
  setFontStyle?: (s: string) => void
  setFontSize?: (s: number[]) => void
  success?: boolean
  templates?: LetterTemplate[]
  onApplyTemplate?: (templateId: string) => void
  letterHeading?: string
  setLetterHeading?: (h: string) => void
  letterFooterPrefix?: string
  setLetterFooterPrefix?: (p: string) => void
  backgroundColor?: string
  backgroundOpacity?: number
  anonymousHandle?: string
  onNewLetter?: () => void
  sending?: boolean
  isProcessing?: boolean
  previewFontIdExternal?: string | null
  onToggleFontOverlay?: () => void
  overlayFontOpen?: boolean
  templateBackground?: string | null
  // Props controlling template panel toggles
  onToggleTemplates?: () => void
  toggleLeftSidebar?: () => void
  templateData?: {
    imageUrl?: string
    textArea?: { top: number; left: number; width: number; height: number; padding?: number }
    lines?: LineConfigType
  }
}

export default function MainContent({
  letterContent,
  setLetterContent,
  fontStyle,
  fontSize,
  fontColor = "#000000",
  fontOpacity = 1,
  backgroundColor = "#ffffff",
  backgroundOpacity = 1,
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
  toggleLeftSidebar,
  templateData,
}: MainContentProps) {
  // Reference to measure letter area dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const updateSize = () => {
    if (containerRef.current) {
      const el = containerRef.current;
  setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    }
  };
  useLayoutEffect(() => { updateSize(); }, [templateData]);
  // Also measure once on mount to ensure initial size on mobile
  useLayoutEffect(() => { updateSize(); }, []);
  useEffect(() => {
    window.addEventListener('resize', updateSize);
    return () => { window.removeEventListener('resize', updateSize); };
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  const previewFontId = previewFontIdExternal
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [selectedFormatting, setSelectedFormatting] = useState<string[]>([])
  const [formattingInProgress, setFormattingInProgress] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [grammarDialogOpen, setGrammarDialogOpen] = useState(false)
  const [grammarSuggestions, setGrammarSuggestions] = useState<any[]>([])
  const [checkingGrammar, setCheckingGrammar] = useState(false)
  const [lastTapTime, setLastTapTime] = useState<number>(0)
  const [tapCount, setTapCount] = useState<number>(0)
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

  const handleUndo = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !undoStack.length) return
    const previous = undoStack[undoStack.length - 1]
    const current = editor.innerHTML
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack(r => [...r, current])
    editor.innerHTML = previous
    lastContentRef.current = previous
    setLetterContent(previous)
  }, [undoStack, setLetterContent])

  const handleRedo = useCallback(() => {
    const editor = editorRef.current
    if (!editor || !redoStack.length) return
    const next = redoStack[redoStack.length - 1]
    const current = editor.innerHTML
    setRedoStack(redoStack.slice(0, -1))
    setUndoStack(u => [...u.slice(-49), current])
    editor.innerHTML = next
    lastContentRef.current = next
    setLetterContent(next)
  }, [redoStack, setLetterContent])

  const wrapSelectionInList = useCallback((ordered: boolean) => {
    wrapSelectionInListExternal(ordered, { editor: editorRef.current, preservedRangeRef, setLetterContent })
  }, [setLetterContent])

  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    // Enable text selection on double tap for mobile devices
    const editor = e.currentTarget as HTMLDivElement;
    const selection = window.getSelection();

    // Try to create range at touch point
    let range: Range | null = null;
    try {
      // Modern browsers
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      }
      // Fallback for older browsers
      else if (document.caretPositionFromPoint) {
        const caret = document.caretPositionFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        if (caret) {
          range = document.createRange();
          range.setStart(caret.offsetNode, caret.offset);
          range.setEnd(caret.offsetNode, caret.offset);
        }
      }
    } catch (error) {
      console.warn('Could not create range from touch point:', error);
    }

    if (selection && range) {
      selection.removeAllRanges();
      selection.addRange(range);
      // Expand selection to word boundaries
      try {
        selection.modify('extend', 'backward', 'word');
        selection.modify('extend', 'forward', 'word');
      } catch (error) {
        // Fallback: just select the character at the tap point
        console.warn('Could not expand selection to word boundaries:', error);
      }
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTapTime;
    
    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap detected
      setTapCount(prev => prev + 1);
      if (tapCount >= 1) {
        handleDoubleTap(e);
        setTapCount(0);
      }
    } else {
      setTapCount(1);
    }
    
    setLastTapTime(currentTime);
  }, [lastTapTime, tapCount, handleDoubleTap])

  const normalizeOrderedLists = useCallback(() => {
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
  }, [setLetterContent])

  const removeListFormatting = useCallback((ordered: boolean) => {
    const editor = editorRef.current
    if (!editor) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const listTag = ordered ? 'OL' : 'UL'

    // Find if we're inside a list
    let listElement: HTMLElement | null = null
    let startNode: Node = range.startContainer
    if (startNode.nodeType === Node.TEXT_NODE) {
      startNode = startNode.parentNode!
    }

    let current: Node | null = startNode
    while (current && current !== editor) {
      if (current.nodeType === Node.ELEMENT_NODE && (current as HTMLElement).tagName === listTag) {
        listElement = current as HTMLElement
        break
      }
      current = current.parentNode
    }

    if (!listElement) return

    // Get all list items in the selection
    const listItems = Array.from(listElement.querySelectorAll('li'))
    const selectedItems: HTMLElement[] = []

    // Find which list items are in the selection
    listItems.forEach(item => {
      if (selection.containsNode(item, true)) {
        selectedItems.push(item)
      }
    })

    if (selectedItems.length === 0) return

    // Extract text content from selected items
    const extractedContent: string[] = []
    selectedItems.forEach(item => {
      extractedContent.push(item.textContent || '')
    })

    // Remove the selected list items
    selectedItems.forEach(item => {
      item.remove()
    })

    // Clean up empty lists
    if (listElement.children.length === 0) {
      listElement.remove()
    }

    // Insert the extracted text at the cursor position
    const textContent = extractedContent.join('\n')
    const textNode = document.createTextNode(textContent)

    range.deleteContents()
    range.insertNode(textNode)

    // Update selection to the inserted text
    range.setStart(textNode, 0)
    range.setEnd(textNode, textContent.length)
    selection.removeAllRanges()
    selection.addRange(range)

    // Update content
    setLetterContent(editor.innerHTML)
  }, [setLetterContent])

  const applyCustomList = useCallback((ordered: boolean) => {
    applyCustomListExternal(ordered, { editor: editorRef.current as HTMLDivElement | null, preservedRangeRef, setLetterContent })
    normalizeOrderedLists()
  }, [setLetterContent, normalizeOrderedLists])

  const refreshFormattingState = useCallback(() => {
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
  }, [])

  const toggleFormatting = useCallback((format: string) => {
    setFormattingInProgress(true)
    const cmdMap: { [k: string]: string } = {
      'bold': 'bold',
      'italic': 'italic',
      'underline': 'underline',
      'olist': 'insertOrderedList',
      'ulist': 'insertUnorderedList'
    }
    const cmd = cmdMap[format]
    if (!cmd) {
      setFormattingInProgress(false)
      return
    }

    // Capture current selection before any operations
    const selection = window.getSelection()
    let savedRange: Range | null = null
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange()
    }

    if (format === 'olist' || format === 'ulist') {
      const isInTargetList = selectedFormatting.includes(format)
      const isInOtherList = selectedFormatting.includes(format === 'olist' ? 'ulist' : 'olist')

      pushUndo()

      if (isInTargetList) {
        // Remove current list formatting
        removeListFormatting(format === 'olist')
      } else {
        // Either convert from other list type or create new list
        if (isInOtherList) {
          // Convert from other list type - first remove, then apply new type
          removeListFormatting(format === 'ulist') // Remove the opposite type
          applyCustomList(format === 'olist') // Apply the target type
        } else {
          // Create new list
          applyCustomList(format === 'olist')
        }
      }

      refreshFormattingState()

      // For list operations, don't restore selection - the list functions handle it
      // The selection restoration was causing the first bullet to be deselected
      setFormattingInProgress(false)
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
          // For non-list formats, just execute the command.
          pushUndo(); 
          document.execCommand(cmd)
        }
      } catch {
        if (isList) { pushUndo(); wrapSelectionInList(format === 'olist') }
      }
    }

    // After applying formatting, clear the selection.
    const currentSelection = window.getSelection()
    if (currentSelection) {
      currentSelection.removeAllRanges()
    }

    // Defer state updates to run after the selection has been cleared.
    setTimeout(() => {
      const editor = editorRef.current
      if (editor) {
        setLetterContent(editor.innerHTML)
      }
      refreshFormattingState()
      setFormattingInProgress(false)
    }, 0)
    
  }, [pushUndo, applyCustomList, removeListFormatting, refreshFormattingState, setLetterContent, wrapSelectionInList, selectedFormatting])

  // Drawing event handlers - REMOVED: Simplifying interface

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



  // Clear selection when user starts typing
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const html = (e.target as HTMLDivElement).innerHTML;
    if (html.length > 10000) { // Character limit for the editor
      (e.target as HTMLDivElement).innerHTML = html.substring(0, 10000);
      // Move cursor to the end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents((e.target as HTMLDivElement));
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    if (html !== lastContentRef.current) {
      pushUndo(lastContentRef.current);
      lastContentRef.current = html;
      currentContentRef.current = html;
      setLetterContent(html); // Update parent state on input
    }
  }, [pushUndo, setLetterContent])

  const handlePaste = useCallback((e: React.ClipboardEvent, charLimit: number = 5000) => {
    e.preventDefault();
    let pasteData = e.clipboardData.getData('text/html');
    let isHtml = true;

    if (!pasteData) {
      pasteData = e.clipboardData.getData('text/plain');
      isHtml = false;
    }
    
    // This is a simple truncation. For HTML, it might break tags if the content is too long.
    // Given the context, we assume pasted content is not excessively large.
    const truncatedData = pasteData.substring(0, charLimit);

    if (isHtml) {
        document.execCommand('insertHTML', false, truncatedData);
    } else {
        document.execCommand('insertText', false, truncatedData);
    }
  }, []);

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setValue: ((value: string) => void) | undefined,
    charLimit: number
  ) => {
    if (setValue) {
      setValue(e.target.value.substring(0, charLimit));
    }
  };

  const checkGrammar = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return

    setCheckingGrammar(true)
    try {
      const text = editor.textContent || ''
      console.log('Extracted text for grammar check:', text)

      if (!text.trim()) {
        console.log('No text found, showing empty result')
        setGrammarSuggestions([])
        setGrammarDialogOpen(true)
        return
      }

      // Use LanguageTool API directly
      try {
        console.log('Making LanguageTool API call with text:', text)
        const response = await fetch('https://api.languagetool.org/v2/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            text: text,
            language: 'en-US'
          }).toString()
        })

        console.log('API response status:', response.status)
        console.log('API response headers:', response.headers)

        if (!response.ok) {
          throw new Error(`LanguageTool API failed: ${response.status}`)
        }

        const result: LanguageToolResult = await response.json()
        console.log('LanguageTool response:', result)
        console.log('Number of matches found:', result.matches.length)

        const suggestions = result.matches
          .filter(match => match.replacements && match.replacements.length > 0)
          .map((match: LanguageToolMatch) => ({
            message: match.message,
            context: {
              text: text.substring(Math.max(0, match.offset - 20), Math.min(text.length, match.offset + match.length + 20))
            },
            offset: match.offset,
            length: match.length,
            replacements: match.replacements
          }))

        setGrammarSuggestions(suggestions)
        setGrammarDialogOpen(true)

      } catch (apiError) {
        console.warn('LanguageTool API failed, falling back to basic checks:', apiError)

        const suggestions = []

        // Check for double spaces
        const doubleSpaceRegex = /\s{2,}/g
        let match
        while ((match = doubleSpaceRegex.exec(text)) !== null) {
          suggestions.push({
            message: 'Multiple consecutive spaces found',
            context: { text: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20) },
            offset: match.index,
            length: match[0].length,
            replacements: [{ value: ' ' }]
          })
        }

        // Check for capitalization issues
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
        sentences.forEach((sentence, sentenceIndex) => {
          const trimmed = sentence.trim()
          if (trimmed.length > 0 && trimmed[0] === trimmed[0].toLowerCase() && trimmed[0] !== trimmed[0].toUpperCase()) {
            const sentenceStart = text.indexOf(trimmed)
            suggestions.push({
              message: 'Sentence should start with a capital letter',
              context: { text: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : '') },
              offset: sentenceStart,
              length: 1,
              replacements: [{ value: trimmed[0].toUpperCase() }]
            })
          }
        })

        // Check for common issues
        const commonPatterns = [
          { regex: /\bi\s/g, message: '"I" should be capitalized', replacement: 'I' },
          { regex: /\s+([.!?])/g, message: 'Extra space before punctuation', replacement: '$1' },
          { regex: /([.!?])\s*([a-z])/g, message: 'Missing space after punctuation', replacement: '$1 $2' },
        ]

        commonPatterns.forEach(({ regex, message, replacement }) => {
          let match
          while ((match = regex.exec(text)) !== null) {
            suggestions.push({
              message,
              context: { text: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20) },
              offset: match.index,
              length: match[0].length,
              replacements: [{ value: replacement }]
            })
          }
        })

        // No need to add a fake success message - let the UI handle empty suggestions

        setGrammarSuggestions(suggestions)
        setGrammarDialogOpen(true)
      }

    } catch (error) {
      console.error('Grammar check error:', error)
      setGrammarSuggestions([{
        message: 'Grammar check failed. Please try again later.',
        context: { text: '' },
        offset: 0,
        length: 0,
        replacements: []
      }])
      setGrammarDialogOpen(true)
    } finally {
      setCheckingGrammar(false)
    }
  }, [])

  const applyGrammarSuggestion = useCallback((match: any, replacementIndex: number = 0) => {
    const editor = editorRef.current
    if (!editor) return

    const replacement = match.replacements?.[replacementIndex]?.value
    if (!replacement) return

    // Get current plain text content
    const currentText = editor.textContent || ''

    // Apply the replacement to the plain text
    const beforeMatch = currentText.substring(0, match.offset)
    const afterMatch = currentText.substring(match.offset + match.length)
    const fixedText = beforeMatch + replacement + afterMatch

    // Replace the entire content
    editor.innerHTML = fixedText

    // Update the letter content state
    setLetterContent(fixedText)

    // Calculate offset adjustment for remaining suggestions
    const offsetAdjustment = replacement.length - match.length

    // Update offsets for all remaining suggestions that come after this match
    setGrammarSuggestions(prev => prev
      .filter(suggestion => suggestion !== match)
      .map(suggestion => {
        if (suggestion.offset >= match.offset + match.length) {
          return {
            ...suggestion,
            offset: suggestion.offset + offsetAdjustment
          }
        }
        return suggestion
      })
    )

    // Trigger input event to update formatting
    const inputEvent = new Event('input', { bubbles: true })
    editor.dispatchEvent(inputEvent)
  }, [setLetterContent, setGrammarSuggestions])

  const applyAllGrammarSuggestions = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    // Get current plain text content
    let currentText = editor.textContent || ''

    // Sort matches by offset in reverse order to avoid position shifts
    const sortedMatches = [...grammarSuggestions].sort((a, b) => b.offset - a.offset)

    // Apply all replacements to the plain text
    for (const match of sortedMatches) {
      const replacement = match.replacements?.[0]?.value
      if (!replacement) continue

      const beforeMatch = currentText.substring(0, match.offset)
      const afterMatch = currentText.substring(match.offset + match.length)
      currentText = beforeMatch + replacement + afterMatch
    }

    // Replace the entire content
    editor.innerHTML = currentText

    // Update the letter content state
    setLetterContent(currentText)

    // Trigger input event to update formatting
    const inputEvent = new Event('input', { bubbles: true })
    editor.dispatchEvent(inputEvent)

    // Close the dialog
    setGrammarDialogOpen(false)
  }, [grammarSuggestions, setLetterContent])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (document.activeElement !== el) {
      el.innerHTML = letterContent
      currentContentRef.current = letterContent
      lastContentRef.current = letterContent
    }
  }, [letterContent])

  const effectiveFontId = previewFontId || fontStyle
  const preset = FONT_PRESETS.find(p => p.id === effectiveFontId) || FONT_PRESETS[0]
  const fontClass = preset.className
  const fontInlineStyle: { [k: string]: string } = {}
  if (preset.letterSpacing) fontInlineStyle.letterSpacing = preset.letterSpacing
  if (preset.lineHeight) fontInlineStyle.lineHeight = preset.lineHeight

  // Use the slider's exact font size for header/footer so small values
  // behave consistently with the footer prefix and body text.
  const headerFooterSize = (fontSize && fontSize[0]) ? fontSize[0] : 18;

  const lineTileHeight = fontSize && fontSize[0] ? Math.round(fontSize[0] * 2.25) : 36
  const rusticAssetUrl = '/textures/rustic.svg'

  return (
    <div className="flex-1 h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide">
      {/* CSS Animations for line patterns */}
      <style jsx>{`
        @keyframes wave-flow {
          0% { background-position: 0 0; }
          100% { background-position: 100px 0; }
        }
        
        @keyframes swirl-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes mesh-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }

  /* Custom scrollbar styling - always invisible */
  .scroll-area {
    --scrollbar-size: 1px;
  }

  .scroll-area::-webkit-scrollbar {
    width: var(--scrollbar-size);
    height: var(--scrollbar-size);
    opacity: 0;
    display: none;
  }

  .scroll-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .scroll-area::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0);
    border-radius: 9999px;
  }

  .scroll-area::-webkit-scrollbar-corner {
    background: transparent;
  }

  /* Hide scrollbars completely */
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }        /* Hide scrollbars completely during export */
        .export-mode .scroll-area::-webkit-scrollbar,
        .export-mode .scroll-area::-webkit-scrollbar-thumb,
        .export-mode .scroll-area::-webkit-scrollbar-track,
        .export-mode ::-webkit-scrollbar,
        .export-mode ::-webkit-scrollbar-thumb,
        .export-mode ::-webkit-scrollbar-track {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* Hide textarea scrollbars during export */
        .export-mode textarea::-webkit-scrollbar,
        .export-mode textarea {
          overflow: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        /* Force disable scrolling on all textareas during export */
        .export-mode textarea {
          overflow-x: hidden !important;
          overflow-y: hidden !important;
          resize: none !important;
        }

        /* Completely disable scrolling on footer textarea - it should never scroll */
        textarea[rows="1"] {
          overflow: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        textarea[rows="1"]::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      {/* FIXED WIDTH: maintain max constraint at all screen sizes */}
      <div className="w-full max-w-2xl mx-auto">
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
            <p>Your letter has been sent successfully! It will be delivered to your pen pal soon.</p>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-2">
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-2">
            <div className="flex items-center gap-1 sm:gap-2 sm:gap-3 bg-white/80 border border-amber-100 rounded px-2 sm:px-3 py-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={overlayFontOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onToggleFontOverlay?.()}
                  className={`gap-1 hover:scale-105 transition-transform duration-200 ${overlayFontOpen ? 'text-amber-900 bg-amber-100' : 'text-amber-700 hover:bg-amber-100'}`}
                >
                  <Type className="h-4 w-4" />
                  <span className="text-xs whitespace-nowrap">Fonts</span>
                </Button>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 sm:gap-3 pl-1 sm:pl-2 sm:pl-4">
                <span className="text-xs text-gray-500 select-none">Tt</span>
                <div className="w-30 sm:w-24 md:w-32 lg:w-64">
                  <Slider value={fontSize} onValueChange={setFontSize} min={8} max={36} step={0.5} />
                </div>
                <span className="text-lg text-gray-500 select-none">Tt</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkGrammar}
                  disabled={checkingGrammar}
                  aria-label="check-grammar"
                  className={`gap-1 hover:bg-amber-50 transition-all duration-200 w-20 justify-center ${
                    checkingGrammar ? 'animate-pulse' : ''
                  }`}
                >
                  {checkingGrammar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs whitespace-nowrap">Checking..</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      <span className="text-xs whitespace-nowrap">Grammar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Removed top-row Clear Letter button; moved to bottom toolbar */}
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
              {!isMobile && (
                <>
                  <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); handleUndo() }} disabled={!undoStack.length} aria-label="undo">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onMouseDown={(e) => { e.preventDefault(); handleRedo() }} disabled={!redoStack.length} aria-label="redo">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-5 bg-amber-200 mx-1" />
                </>
              )}
              {!isMobile && (
                <>
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
                  <div className="w-px h-5 bg-amber-200 mx-1" />
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleTemplates?.()}
                className="gap-1 border-amber-200 hover:bg-amber-50 hover:scale-105 transition-transform duration-200"
              >
                <BookTemplate className="h-4 w-4" />
                Templates
              </Button>
              {/* Clear letter moved here as trash icon with confirm */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={sending}
                aria-label="clear-letter"
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
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

        {/* Confirm Clear Letter Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear this letter?</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-gray-700">
              This will remove your current letter and clear the selected template. This can’t be undone.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => { setConfirmOpen(false); onNewLetter?.() }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Clear Letter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Grammar Check Dialog */}
        <Dialog open={grammarDialogOpen} onOpenChange={setGrammarDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] p-0 z-50 flex flex-col" showCloseButton={false}>
            <DialogTitle asChild>
              <VisuallyHidden.Root>Grammar Check</VisuallyHidden.Root>
            </DialogTitle>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Grammar Check</h2>
                  <p className="text-sm text-gray-500">
                    {grammarSuggestions.length === 0
                      ? "No issues found - great job!"
                      : `${grammarSuggestions.length} suggestion${grammarSuggestions.length === 1 ? '' : 's'} found`
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGrammarDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6">
                {grammarSuggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Perfect!</h3>
                    <p className="text-gray-600 max-w-sm mx-auto">
                      Your text looks great. No grammar or spelling issues were found.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {grammarSuggestions.map((match, index) => {
                      const isSpellingError = match.message.toLowerCase().includes('spelling') ||
                                             match.message.toLowerCase().includes('misspelled');
                      const isGrammarError = match.message.toLowerCase().includes('grammar') ||
                                            match.message.toLowerCase().includes('syntax');

                      return (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-3">
                            {/* Error Type Icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isSpellingError
                                ? 'bg-red-100 text-red-600'
                                : isGrammarError
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {isSpellingError ? '🔤' : isGrammarError ? '📝' : '💡'}
                            </div>

                            {/* Error Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 text-sm leading-5">
                                    {match.message}
                                  </h4>

                                  {/* Context with highlighting */}
                                  {match.context?.text && (
                                    <div className="mt-2 p-3 bg-gray-50 rounded-md border-l-2 border-gray-300">
                                      <p className="text-sm text-gray-700 font-mono">
                                        {(() => {
                                          const contextText = match.context.text;
                                          // Calculate where the error starts within the context
                                          // Context starts at max(0, match.offset - 20), so error starts at min(match.offset, 20)
                                          const errorStartInContext = Math.min(match.offset, 20);
                                          const errorEndInContext = errorStartInContext + match.length;

                                          const beforeError = contextText.substring(0, errorStartInContext);
                                          const errorText = contextText.substring(errorStartInContext, errorEndInContext);
                                          const afterError = contextText.substring(errorEndInContext);

                                          return (
                                            <>
                                              {beforeError}
                                              <span className="bg-red-200 text-red-900 px-1 rounded font-semibold">
                                                {errorText}
                                              </span>
                                              {afterError}
                                            </>
                                          );
                                        })()}
                                      </p>
                                    </div>
                                  )}

                                  {/* Suggestions */}
                                  {match.replacements && match.replacements.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                        Suggestions
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {match.replacements.slice(0, 3).map((replacement: { value: string }, repIndex: number) => (
                                          <Button
                                            key={repIndex}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyGrammarSuggestion(match, repIndex)}
                                            className="text-sm px-3 py-1 h-auto bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-300"
                                          >
                                            {replacement.value}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Apply Single Fix Button */}
                                {match.replacements && match.replacements.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => applyGrammarSuggestion(match, 0)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Fix
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {grammarSuggestions.length > 0 && (
              <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="text-sm text-gray-600">
                  {grammarSuggestions.length} issue{grammarSuggestions.length === 1 ? '' : 's'} found
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={applyAllGrammarSuggestions}
                    className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply All Fixes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div
          ref={containerRef}
          className="relative letter-content overflow-hidden rounded-lg"
          style={{
            transition: 'background-image 0.5s ease-in-out, background-size 0.5s ease-in-out',
            backgroundColor: backgroundColor ? `rgba(${parseInt(backgroundColor.slice(1, 3), 16)}, ${parseInt(backgroundColor.slice(3, 5), 16)}, ${parseInt(backgroundColor.slice(5, 7), 16)}, ${backgroundOpacity})` : 'transparent',
            backgroundRepeat: 'repeat-y',
            backgroundSize: '100% auto',
            boxShadow: 'none',
            border: '1px solid rgba(217, 119, 6, 0.1)',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            borderRadius: '16px', // Ensure corners stay rounded
            overflow: 'clip-padding' // Prevent content overflow from affecting border radius
          }}
        >
          {/* Solid background color and static line patterns */}
          <div aria-hidden className="absolute inset-0 rounded-lg pointer-events-none z-0 overflow-visible">
            {/* Background fill */}
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              backgroundColor: backgroundColor ? `rgba(${parseInt(backgroundColor.slice(1, 3), 16)}, ${parseInt(backgroundColor.slice(3, 5), 16)}, ${parseInt(backgroundColor.slice(5, 7), 16)}, ${backgroundOpacity})` : undefined,
              backgroundRepeat: 'repeat-y',
              backgroundSize: '100% auto',
              borderRadius: 'inherit' // Ensure corners stay rounded
            }} />
            {/* Static line pattern overlay */}
            {templateData?.lines && (() => {
              const cfg = templateData.lines as any;
              // Fallback to viewport dimensions if container hasn't measured yet (common on mobile)
              const w = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 600);
              const h = containerSize.height || (typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.6) : 800);
              // Choose pattern based on type
              let pattern: React.ReactNode | null = null;
              // Log pattern type to help with debugging
              console.log('Pattern type:', cfg.type);
              switch (cfg.type) {
                case 'straight':
                  pattern = generateStraightLines({ width: w, height: h, slope: 0, intercept: 0, spacing: cfg.spacing, count: Math.ceil(h / cfg.spacing) + 1, thickness: cfg.thickness, color: cfg.color, opacity: cfg.opacity, rotation: cfg.rotation });
                  break;
                case 'wavy':
                  pattern = generateWavePattern({ width: w, height: h, amplitude: cfg.spacing/4, frequency: 1/100, phase: 0, verticalOffset: 0, samples: 300, count: Math.ceil(h/cfg.spacing), spacing: cfg.spacing, thickness: cfg.thickness, color: cfg.color, opacity: cfg.opacity, rotation: cfg.rotation });
                  break;
                case 'zigzag':
                  pattern = generateZigzagPattern({ width: w, height: h, amplitude: cfg.spacing/4, period: 100, phase: 0, samples: 300, count: Math.ceil(h/cfg.spacing), spacing: cfg.spacing, thickness: cfg.thickness, color: cfg.color, opacity: cfg.opacity, rotation: cfg.rotation });
                  break;
                case 'arc':
                  pattern = generateArcPattern({
                    centerX: w / 2,
                    centerY: h / 2,
                    radius: Math.min(w, h) / 4,
                    startAngle: 0,
                    endAngle: Math.PI * 2,
                    count: Math.ceil(Math.min(w, h) / cfg.spacing),
                    spacing: cfg.spacing,
                    samples: 100,
                    thickness: cfg.thickness,
                    color: cfg.color,
                    opacity: cfg.opacity,
                    rotation: cfg.rotation,
                  });
                  break;
                // Spiral pattern removed to improve performance
                  break;
                case 'swirls':
                  pattern = generateSwirlGrid({ width: w, height: h, spacing: cfg.spacing, thickness: cfg.thickness, color: cfg.color, opacity: cfg.opacity, rotation: cfg.rotation });
                  break;
                case 'dotted':
                  // Dotted grid: radius now correctly uses thickness
                  // Add validation for cfg properties
                  const dottedConfig = {
                    width: w || 400,
                    height: h || 600,
                    originX: 0,
                    originY: 0,
                    spacing: Number(cfg?.spacing) || 24,
                    thickness: Number(cfg?.thickness) || 4,
                    jitter: 0,
                    gridType: 'rect' as const,
                    color: cfg?.color || '#3b82f6',
                    opacity: Number(cfg?.opacity) || 0.5,
                    rotation: Number(cfg?.rotation) || 0,
                    normalized: false,
                  };
                  pattern = generateDotsPattern(dottedConfig);
                  break;
                // Floral pattern removed to improve performance
                  break;
                default:
                  pattern = null;
              }
              return (
                <svg
                  className="absolute inset-0 pointer-events-none z-0"
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${w} ${h}`}
                  preserveAspectRatio="xMidYMid slice"
                >
                  {pattern}
                </svg>
              );
            })()}
          </div>

          <div 
            className="relative z-10 bg-transparent scroll-area rounded-lg"
            style={{ 
              overflowY: 'visible',
              paddingBottom: '20px',
              borderRadius: '16px', // Ensure corners stay rounded for scroll area
              overflow: 'clip-padding', // Prevent content overflow from affecting border radius
              marginBottom: '16px' // Add spacing to ensure the end of the page is visible
            }}
          >
            <div className="w-full bg-transparent space-y-0 overflow-hidden md:pl-4">
              <p className={`${fontClass} bg-transparent`} style={{ 
                fontSize: `${headerFooterSize}px`, 
                color: fontColor ? `rgba(${parseInt(fontColor.slice(1, 3), 16)}, ${parseInt(fontColor.slice(3, 5), 16)}, ${parseInt(fontColor.slice(5, 7), 16)}, ${fontOpacity})` : undefined,
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                outline: 'none',
                margin: 0,
                marginBottom: '4px',
                paddingTop: '10px',
                paddingBottom: '0px',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                ...(fontInlineStyle || {}) 
              }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>

              {/* Full width heading on small screens */}
              <textarea
                rows={1}
                value={letterHeading}
                onChange={(e) => handleTextareaChange(e, setLetterHeading, 100)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onPaste={(e) => handlePaste(e, 100)}
                className={`w-full md:w-auto bg-transparent ${fontClass}`}
                style={{ 
                  fontSize: `${headerFooterSize}px`, 
                  color: fontColor ? `rgba(${parseInt(fontColor.slice(1, 3), 16)}, ${parseInt(fontColor.slice(3, 5), 16)}, ${parseInt(fontColor.slice(5, 7), 16)}, ${fontOpacity})` : undefined,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(217, 119, 6, 0.1)',
                  outline: 'none',
                  boxShadow: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  margin: 0,
                  marginBottom: '12px',
                  padding: 0,
                  resize: 'none',
                  overflow: 'hidden',
                  ...(fontInlineStyle || {}) 
                }}
              />
            </div>

            <Card className="pt-5 pb-2 px-4 sm:px-5 bg-transparent shadow-none" style={{ 
              backgroundColor: 'transparent', 
              marginTop: '-1px', // Eliminate any gap between heading and card
              border: 'none',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              boxShadow: 'none'
            }}>
              <div className="relative flex flex-col bg-transparent" style={{ width: '100%' }}>
                <div
                  ref={editorRef}
                  contentEditable={!success}
                  suppressContentEditableWarning
                  onInput={handleInput}
                  onPaste={(e) => handlePaste(e, 5000)}
                  onTouchStart={handleTouchStart}
                  spellCheck="true"
                  className={`flex-1 border-none leading-relaxed ${fontClass} resize-none pb-2 min-h-[200px] bg-transparent`}
                  tabIndex={0}
                  style={{
                    fontSize: `${fontSize[0]}px`,
                    color: fontColor ? `rgba(${parseInt(fontColor.slice(1, 3), 16)}, ${parseInt(fontColor.slice(3, 5), 16)}, ${parseInt(fontColor.slice(5, 7), 16)}, ${fontOpacity})` : undefined,
                    backgroundColor: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none',
                    margin: '4px 0',
                    padding: 0,
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    ...(fontInlineStyle || {}),
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text',
                    direction: 'ltr'
                  }}
                />

                <div className="text-right pt-1 pb-1 z-20 bg-transparent overflow-hidden">
                  {/* Footer prefix full width on small, right-aligned */}
                  <textarea
                    rows={1}
                    value={letterFooterPrefix}
                    onChange={(e) => handleTextareaChange(e, setLetterFooterPrefix, 100)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    onPaste={(e) => handlePaste(e, 100)}
                    className={`w-full md:w-48 text-right bg-transparent ${fontClass}`}
                    style={{ 
                      fontSize: `${fontSize[0]}px`, 
                      color: fontColor ? `rgba(${parseInt(fontColor.slice(1, 3), 16)}, ${parseInt(fontColor.slice(3, 5), 16)}, ${parseInt(fontColor.slice(5, 7), 16)}, ${fontOpacity})` : undefined,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(217, 119, 6, 0.1)',
                      outline: 'none',
                      boxShadow: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      margin: 0,
                      padding: 0,
                      paddingBottom: '2px',
                      resize: 'none',
                      overflow: 'hidden',
                      ...(fontInlineStyle || {}) 
                    }}
                  />
                  <div className={`${fontClass} bg-transparent`} style={{ 
                    fontSize: `${fontSize[0]}px`, 
                    color: fontColor ? `rgba(${parseInt(fontColor.slice(1, 3), 16)}, ${parseInt(fontColor.slice(3, 5), 16)}, ${parseInt(fontColor.slice(5, 7), 16)}, ${fontOpacity})` : undefined,
                    backgroundColor: 'transparent',
                    margin: 0,
                    marginTop: '4px',
                    padding: 0,
                    ...(fontInlineStyle || {}) 
                  }}>
                    {anonymousHandle}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
