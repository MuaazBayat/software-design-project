// Extracted list formatting utilities for testability.
// These functions manipulate the DOM of a contentEditable editor.

export interface ListFormattingDeps {
  editor: HTMLDivElement | null
  preservedRangeRef: React.MutableRefObject<Range | null>
  setLetterContent: (html: string) => void
}

// Fallback wrapper similar to previous inline implementation.
export function wrapSelectionInList(ordered: boolean, deps: ListFormattingDeps) {
  const { editor, preservedRangeRef, setLetterContent } = deps
  if (!editor) return
  const sel = window.getSelection()
  let range: Range | null = null
  try { if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0) } catch {}
  if (!range && preservedRangeRef.current) range = preservedRangeRef.current.cloneRange()
  if (!range || range.collapsed) return
  const frag = range.cloneContents()
  const temp = document.createElement('div')
  temp.appendChild(frag)
  const list = document.createElement(ordered ? 'ol' : 'ul')
  if (ordered) {
    list.className = 'pl-4 list-decimal list-inside'
    list.style.listStyleType = 'decimal'; list.style.listStylePosition = 'inside'
  } else {
    list.className = 'pl-4 list-disc list-inside'
    list.style.listStyleType = 'disc'; list.style.listStylePosition = 'inside'
  }
  const nodes = Array.from(temp.childNodes)
  if (!nodes.length) return
  nodes.forEach(n => {
    if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === 'LI') {
      list.appendChild(n.cloneNode(true)); return
    }
    const li = document.createElement('li')
    if (n.nodeType === Node.ELEMENT_NODE) li.appendChild((n as Element).cloneNode(true))
    else li.textContent = n.textContent || ''
    list.appendChild(li)
  })
  range.deleteContents(); range.insertNode(list)
  if (sel) {
    sel.removeAllRanges(); const nr = document.createRange(); nr.selectNodeContents(list); sel.addRange(nr)
  }
  setTimeout(() => { try { setLetterContent(editor.innerHTML) } catch {} }, 0)
}

export function applyCustomList(ordered: boolean, deps: ListFormattingDeps) {
  const { editor, preservedRangeRef, setLetterContent } = deps
  if (!editor) return
  const sel = window.getSelection()
  let range: Range | null = null
  if (sel && sel.rangeCount > 0) range = sel.getRangeAt(0)
  if ((!range || range.collapsed) && preservedRangeRef.current) {
    range = preservedRangeRef.current.cloneRange()
  }
  if (!range) return
  if (!editor.contains(range.commonAncestorContainer)) return

  // If inside existing list decide whether to partially unwrap or full unwrap.
  let ancestor: HTMLElement | null = range.commonAncestorContainer as HTMLElement
  while (ancestor && ancestor !== editor && ancestor.tagName !== 'UL' && ancestor.tagName !== 'OL') ancestor = ancestor.parentElement
  if (ancestor && (ancestor.tagName === 'UL' || ancestor.tagName === 'OL')) {
    const listEl = ancestor
    const allItems = Array.from(listEl.children).filter(c => (c as HTMLElement).tagName === 'LI') as HTMLElement[]
    const findLi = (n: Node | null): HTMLElement | null => { while (n && n !== listEl) { if (n instanceof HTMLElement && n.tagName === 'LI') return n; n = n.parentNode as Node } return null }
    const startLi = findLi(range.startContainer)
    const endLi = findLi(range.endContainer)
    if (!startLi || !endLi) return
    const startIndex = allItems.indexOf(startLi)
    const endIndex = allItems.indexOf(endLi)
    if (startIndex === -1 || endIndex === -1) return
    const from = Math.min(startIndex, endIndex)
    const to = Math.max(startIndex, endIndex)
    const full = from === 0 && to === allItems.length - 1
    const listTag = listEl.tagName
    if (full) {
      const text = allItems.map(li => li.textContent || '').join('\n')
      const tn = document.createTextNode(text)
      listEl.parentNode?.replaceChild(tn, listEl)
      const nr = document.createRange(); nr.setStart(tn, 0); nr.setEnd(tn, tn.textContent?.length || 0)
      sel?.removeAllRanges(); sel?.addRange(nr)
      setLetterContent(editor.innerHTML); return
    }
    const frag = document.createDocumentFragment()
    const buildList = (items: HTMLElement[], startAt?: number) => {
      const l = document.createElement(listTag.toLowerCase())
      if (listTag === 'OL') { l.className = 'pl-4 list-decimal list-inside'; l.style.listStyleType = 'decimal'; l.style.listStylePosition = 'inside'; if (startAt && startAt > 1) l.setAttribute('start', String(startAt)) }
      else { l.className = 'pl-4 list-disc list-inside'; l.style.listStyleType = 'disc'; l.style.listStylePosition = 'inside' }
      items.forEach(li => l.appendChild(li.cloneNode(true)))
      return l
    }
    const before = allItems.slice(0, from)
    const mid = allItems.slice(from, to + 1)
    const after = allItems.slice(to + 1)
    if (before.length) frag.appendChild(buildList(before, 1))
    mid.forEach(li => { const p = document.createElement('p'); p.textContent = li.textContent || ''; frag.appendChild(p) })
    if (after.length) frag.appendChild(buildList(after, listTag === 'OL' ? before.length + 1 : undefined))
    const parent = listEl.parentNode; if (parent) parent.replaceChild(frag, listEl)
    // focus first unlisted paragraph
    const firstP = (parent as ParentNode)?.querySelector('p')
    if (firstP) { const nr = document.createRange(); nr.selectNodeContents(firstP); nr.collapse(false); sel?.removeAllRanges(); sel?.addRange(nr) }
    setLetterContent(editor.innerHTML)
    return
  }

  const raw = range.toString().trim()
  if (range.collapsed || !raw) {
    const listEl = document.createElement(ordered ? 'ol' : 'ul')
    if (ordered) { listEl.className = 'pl-4 list-decimal list-inside'; listEl.style.listStyleType = 'decimal'; listEl.style.listStylePosition = 'inside' }
    else { listEl.className = 'pl-4 list-disc list-inside'; listEl.style.listStyleType = 'disc'; listEl.style.listStylePosition = 'inside' }
    const li = document.createElement('li'); li.appendChild(document.createElement('br')); listEl.appendChild(li)
    range.insertNode(listEl)
    const caret = document.createRange(); caret.selectNodeContents(li); caret.collapse(true); sel?.removeAllRanges(); sel?.addRange(caret)
    setLetterContent(editor.innerHTML); return
  }

  // Expand to full paragraph if selection fully covers one.
  const expandToParagraphIfWhole = () => {
    let container: Node | null = range.commonAncestorContainer
    if (container.nodeType === Node.TEXT_NODE) container = container.parentNode
    while (container && container !== editor && container.parentNode !== editor) container = container.parentNode
    if (container instanceof HTMLElement && container.tagName === 'P') {
      const full = container.textContent?.trim() || ''
      if (full && full === raw) range.selectNode(container)
    }
  }
  expandToParagraphIfWhole()

  let segments: string[]
  if (raw.includes('\n')) segments = raw.split(/\n+/).map(s => s.trim()).filter(Boolean)
  else if (ordered) { segments = raw.split(/\.+\s*/).map(s => s.trim()).filter(Boolean); segments = segments.map(s => /[.!?]$/.test(s) ? s : s + '.') }
  else segments = raw.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
  if (!segments.length) segments = [raw]

  const listEl = document.createElement(ordered ? 'ol' : 'ul')
  if (ordered) { listEl.className = 'pl-4 list-decimal list-inside'; listEl.style.listStyleType = 'decimal'; listEl.style.listStylePosition = 'inside' }
  else { listEl.className = 'pl-4 list-disc list-inside'; listEl.style.listStyleType = 'disc'; listEl.style.listStylePosition = 'inside' }
  segments.forEach(seg => { const li = document.createElement('li'); li.textContent = seg; listEl.appendChild(li) })
  range.deleteContents(); range.insertNode(listEl)
  if (listEl.parentElement && listEl.parentElement.tagName === 'P' && listEl.parentElement.childNodes.length === 1) {
    const p = listEl.parentElement; p.parentNode?.replaceChild(listEl, p)
  }
  // Merge adjacent lists of same type
  const merge = (list: HTMLElement) => {
    const isSame = (n: Node | null): n is HTMLElement => !!n && n instanceof HTMLElement && n.tagName === list.tagName
    let prev: Node | null = list.previousSibling; while (prev && prev.nodeType === Node.TEXT_NODE && !prev.textContent?.trim()) prev = prev.previousSibling
    if (isSame(prev)) { while (list.firstChild) prev.appendChild(list.firstChild); list.parentNode?.removeChild(list); list = prev }
    let next: Node | null = list.nextSibling; while (next && next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) next = next.nextSibling
    if (isSame(next)) { while (next.firstChild) list.appendChild(next.firstChild); next.parentNode?.removeChild(next) }
    return list
  }
  const merged = merge(listEl)
  const nr = document.createRange(); nr.selectNodeContents(merged); sel?.removeAllRanges(); sel?.addRange(nr)
  setLetterContent(editor.innerHTML)
}
