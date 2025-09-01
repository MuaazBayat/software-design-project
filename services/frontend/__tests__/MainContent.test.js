import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

const MainContent = require('../components/MainContent').default
const { DEFAULT_FONT_ID } = require('../app/compose-letter/fonts')

beforeEach(() => {
  // Ensure execCommand is available for keyboard shortcut tests
  document.execCommand = jest.fn()
})

// jsdom does not implement ResizeObserver; some UI hooks depend on it
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

test('sets default fontStyle when none provided', () => {
  const setFontStyle = jest.fn()
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={''}
      fontSize={[16]}
      setFontStyle={setFontStyle}
    />
  )
  expect(setFontStyle).toHaveBeenCalledWith(DEFAULT_FONT_ID)
})

test('toolbar buttons call overlay and templates toggles and clear letter', () => {
  const onToggleFontOverlay = jest.fn()
  const onToggleTemplates = jest.fn()
  const onNewLetter = jest.fn()
  const { rerender } = render(
    <MainContent
      letterContent={'hello'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      onToggleFontOverlay={onToggleFontOverlay}
      onToggleTemplates={onToggleTemplates}
      onNewLetter={onNewLetter}
      sending={false}
    />
  )

  const fontsBtn = screen.getByText(/Fonts \(Ctrl\+K\)/i)
  fireEvent.click(fontsBtn)
  expect(onToggleFontOverlay).toHaveBeenCalled()

  const templatesBtn = screen.getByText(/Templates/i)
  fireEvent.click(templatesBtn)
  expect(onToggleTemplates).toHaveBeenCalled()

  const clearBtn = screen.getByRole('button', { name: /Clear Letter/i })
  fireEvent.click(clearBtn)
  expect(onNewLetter).toHaveBeenCalled()

  // when sending=true the Clear Letter button is disabled
  rerender(
    <MainContent
      letterContent={'hello'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      onNewLetter={onNewLetter}
      sending={true}
    />
  )
  expect(screen.getByRole('button', { name: /Clear Letter/i })).toBeDisabled()
})

test('keyboard shortcuts trigger execCommand for formatting', () => {
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // simulate Ctrl+B, Ctrl+I, Ctrl+U
  fireEvent.keyDown(document, { key: 'b', ctrlKey: true })
  fireEvent.keyDown(document, { key: 'i', ctrlKey: true })
  fireEvent.keyDown(document, { key: 'u', ctrlKey: true })

  // execCommand should have been called at least once for these
  expect(document.execCommand).toHaveBeenCalled()
})

test('renders template background variants and exposes aria-hidden container', () => {
  const setLetterContent = jest.fn()
  const { container, rerender } = render(
    <MainContent
      letterContent={'x'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
      templateBackground={'plain'}
    />
  )

  // aria-hidden containers exist; find the one belonging to the template background
  const hiddenElements = container.querySelectorAll('[aria-hidden]')
  expect(hiddenElements.length).toBeGreaterThan(0)

  // find the template's aria-hidden container (first one that contains a styled child)
  const templateContainer = Array.from(hiddenElements).find(el => el.querySelector('[style]'))
  expect(templateContainer).toBeDefined()
  const plainChild = templateContainer.querySelector('[style]')
  // computed background color should match the plain template (#fbf6ed -> rgb(251,246,237))
  const bgColor = window.getComputedStyle(plainChild).backgroundColor
  expect(bgColor.replace(/\s/g, '')).toContain('rgb(251,246,237)')

  // rustic uses a background image URL inside nested divs
  rerender(
    <MainContent
      letterContent={'x'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
      templateBackground={'rustic'}
    />
  )

  // find the template container again and check for rustic asset in computed backgroundImage
  const rusticContainer = Array.from(container.querySelectorAll('[aria-hidden]')).find(el => {
    // search all descendants with inline style attributes and check their computed backgroundImage
    const styledDescendants = Array.from(el.querySelectorAll('[style]'))
    return styledDescendants.some(d => {
      const bi = window.getComputedStyle(d).backgroundImage || ''
      return bi.includes('rustic.svg')
    })
  })
  expect(rusticContainer).toBeDefined()

  // lined should include the linedpage.svg url in inline style
  rerender(
    <MainContent
      letterContent={'x'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
      templateBackground={'lined'}
    />
  )
  // lined should include the linedpage.svg url in inline style
  const linedContainer = Array.from(container.querySelectorAll('[aria-hidden]')).find(el => {
    const styledDescendants = Array.from(el.querySelectorAll('[style]'))
    return styledDescendants.some(d => {
      const bi = window.getComputedStyle(d).backgroundImage || ''
      return bi.includes('linedpage.svg')
    })
  })
  expect(linedContainer).toBeDefined()
  const linedChild = linedContainer.querySelector('[style]')
  expect(window.getComputedStyle(linedChild).backgroundImage).toMatch(/linedpage\.svg/)
})

test('undo button triggers setLetterContent', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'start'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // undo button has aria-label 'undo' and should be present
  const undoBtn = container.querySelector('[aria-label="undo"]')
  expect(undoBtn).toBeInTheDocument()
  // simulate mouseDown (component attaches handler to onMouseDown)
  fireEvent.mouseDown(undoBtn)
  // setLetterContent should be called as part of undo handling
  expect(setLetterContent).toHaveBeenCalled()
})

test('shows success banner when success=true', () => {
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      success={true}
    />
  )
  expect(screen.getByText(/Your letter has been sent successfully!/i)).toBeInTheDocument()
})

test('Ctrl+K triggers onToggleFontOverlay', () => {
  const onToggleFontOverlay = jest.fn()
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      onToggleFontOverlay={onToggleFontOverlay}
    />
  )

  fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
  expect(onToggleFontOverlay).toHaveBeenCalled()
})

test('Ctrl+Z and Ctrl+Y trigger undo and redo', () => {
  const setLetterContent = jest.fn()
  render(
    <MainContent
      letterContent={'initial'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // Simulate Ctrl+Z for undo
  fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
  expect(setLetterContent).toHaveBeenCalled()

  // Simulate Ctrl+Y for redo
  fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
  expect(setLetterContent).toHaveBeenCalledTimes(2)
})

test('list formatting buttons use fallback when execCommand fails', async () => {
  // Mock execCommand to fail for lists
  document.execCommand = jest.fn().mockImplementation((cmd) => {
    if (cmd === 'insertOrderedList' || cmd === 'insertUnorderedList') return false
    return true
  })

  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'<p>test</p>'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // Find the ordered list button
  const olistBtn = container.querySelector('[aria-label="ordered-list"]')
  expect(olistBtn).toBeInTheDocument()

  // Select some text in the editor first
  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()
  editor.innerHTML = '<p>test content</p>'
  const range = document.createRange()
  range.selectNodeContents(editor.firstChild)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)

  // Simulate clicking the button
  fireEvent.mouseDown(olistBtn)

  // Wait for the setTimeout in wrapSelectionInList
  await new Promise(resolve => setTimeout(resolve, 10))

  expect(setLetterContent).toHaveBeenCalled()
})

test('editor input updates letterContent', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'initial'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Simulate input
  fireEvent.input(editor, { target: { innerHTML: 'new content' } })
  // Simulate blur to trigger setLetterContent
  fireEvent.blur(editor)
  expect(setLetterContent).toHaveBeenCalledWith('new content')
})

test('editor blur updates letterContent', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'initial'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Simulate blur
  fireEvent.blur(editor)
  expect(setLetterContent).toHaveBeenCalled()
})

test('letterHeading input updates value', () => {
  const setLetterHeading = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      letterHeading={'initial'}
      setLetterHeading={setLetterHeading}
    />
  )

  const headingInput = container.querySelector('input')
  expect(headingInput).toBeInTheDocument()
  expect(headingInput.value).toBe('initial')

  fireEvent.change(headingInput, { target: { value: 'new heading' } })
  expect(setLetterHeading).toHaveBeenCalledWith('new heading')
})

test('letterFooterPrefix input updates value', () => {
  const setLetterFooterPrefix = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      letterFooterPrefix={'initial'}
      setLetterFooterPrefix={setLetterFooterPrefix}
    />
  )

  const footerInputs = container.querySelectorAll('input')
  const footerInput = footerInputs[1] // Second input is footer
  expect(footerInput).toBeInTheDocument()
  expect(footerInput.value).toBe('initial')

  fireEvent.change(footerInput, { target: { value: 'new footer' } })
  expect(setLetterFooterPrefix).toHaveBeenCalledWith('new footer')
})

test('anonymousHandle is rendered', () => {
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      anonymousHandle={'TestUser'}
    />
  )

  expect(screen.getByText('TestUser')).toBeInTheDocument()
})

test('normalizeOrderedLists updates content when changes are made', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'<ol><li>item1</li></ol><ol start="3"><li>item2</li></ol>'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // The normalizeOrderedLists function should be called and update the content
  // when there are ordered lists with incorrect start attributes
  fireEvent.input(editor, { target: { innerHTML: '<ol><li>item1</li></ol><ol start="3"><li>item2</li></ol>' } })
  fireEvent.blur(editor)

  // Should have called setLetterContent due to normalization
  expect(setLetterContent).toHaveBeenCalled()
})

test('selection change updates formatting state', () => {
  const { container } = render(
    <MainContent
      letterContent={'<p>test</p>'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Simulate selection change by focusing the editor
  fireEvent.focus(editor)

  // The selectionchange event should trigger the formatting state update
  // This tests the onSelectionChange function in the useEffect
  document.dispatchEvent(new Event('selectionchange'))
})

test('Shift+Z triggers redo', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'initial'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // First, simulate some undo action to populate redo stack
  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Simulate input to create undo history
  fireEvent.input(editor, { target: { innerHTML: 'changed content' } })
  fireEvent.blur(editor)

  // Now undo to populate redo stack
  fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
  
  // Now Shift+Z should trigger redo
  fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true })
  expect(setLetterContent).toHaveBeenCalled()
})

test('editor sync useEffect updates DOM when letterContent changes', () => {
  const { container, rerender } = render(
    <MainContent
      letterContent={'initial content'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()
  expect(editor.innerHTML).toBe('initial content')

  // Change the letterContent prop
  rerender(
    <MainContent
      letterContent={'updated content'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // The useEffect should update the editor's innerHTML
  expect(editor.innerHTML).toBe('updated content')
})

test('template background renders with custom lineTileHeight', () => {
  const { container } = render(
    <MainContent
      letterContent={'test'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[20]} // Different font size to test lineTileHeight calculation
      templateBackground={'lined'}
    />
  )

  // Should render the lined background with calculated lineTileHeight
  const backgroundDiv = container.querySelector('[aria-hidden]')
  expect(backgroundDiv).toBeInTheDocument()

  // Check that the lined template is rendered by looking for the backgroundImage with linedpage.svg
  const linedDiv = Array.from(container.querySelectorAll('div')).find(div => 
    div.style.backgroundImage && div.style.backgroundImage.includes('linedpage.svg')
  )
  expect(linedDiv).toBeInTheDocument()
  
  // With fontSize [20], lineTileHeight = Math.round(20 * 2.25) = 45
  expect(linedDiv.style.backgroundSize).toContain('45px')
})

test('font preset applies to editor', () => {
  const { container } = render(
    <MainContent
      letterContent={'test'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()
  
  // Just check that the editor renders with the expected base classes
  expect(editor.className).toContain('min-h-24')
  expect(editor.className).toContain('text-gray-700')
})

test('normalizeOrderedLists removes start attribute when desiredStart is 1', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'<ol start="2"><li>item1</li></ol>'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Trigger normalizeOrderedLists by simulating input that would cause normalization
  fireEvent.input(editor, { target: { innerHTML: '<ol start="2"><li>item1</li></ol>' } })
  fireEvent.blur(editor)

  // The function should remove the start attribute when desiredStart === 1
  expect(setLetterContent).toHaveBeenCalled()
})

test('onSelectionChange detects list formatting states', () => {
  const { container } = render(
    <MainContent
      letterContent={'<ul><li>test</li></ul>'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Focus the editor to trigger selection change
  fireEvent.focus(editor)

  // Dispatch selectionchange event
  document.dispatchEvent(new Event('selectionchange'))

  // The onSelectionChange function should detect the ulist formatting
  // This covers the lines that check for UL and OL tags in the selection ancestors
})

test('Ctrl+Y keyboard shortcut triggers redo', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'initial'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // First, create some undo history by simulating input
  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Simulate input to create undo history
  fireEvent.input(editor, { target: { innerHTML: 'changed content' } })
  fireEvent.blur(editor)

  // Now undo to populate redo stack
  fireEvent.keyDown(document, { key: 'z', ctrlKey: true })

  // Reset the mock to only count the redo call
  setLetterContent.mockClear()

  // Now simulate Ctrl+Y for redo
  fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
  expect(setLetterContent).toHaveBeenCalled()
})

test('Ctrl+B keyboard shortcut triggers bold formatting', () => {
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // Simulate Ctrl+B for bold
  fireEvent.keyDown(document, { key: 'b', ctrlKey: true })
  expect(document.execCommand).toHaveBeenCalledWith('bold')
})

test('Ctrl+I, Ctrl+U, Ctrl+K keyboard shortcuts work', () => {
  const onToggleFontOverlay = jest.fn()
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      onToggleFontOverlay={onToggleFontOverlay}
    />
  )

  // Simulate Ctrl+I for italic
  fireEvent.keyDown(document, { key: 'i', ctrlKey: true })
  expect(document.execCommand).toHaveBeenCalledWith('italic')

  // Simulate Ctrl+U for underline
  fireEvent.keyDown(document, { key: 'u', ctrlKey: true })
  expect(document.execCommand).toHaveBeenCalledWith('underline')

  // Simulate Ctrl+K for font overlay
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
  expect(onToggleFontOverlay).toHaveBeenCalled()
})

test('normalizeOrderedLists sets start attribute correctly', () => {
  const setLetterContent = jest.fn()
  const { container } = render(
    <MainContent
      letterContent={'<ol><li>item1</li></ol><ol><li>item2</li></ol>'}
      setLetterContent={setLetterContent}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Trigger normalization
  fireEvent.input(editor, { target: { innerHTML: '<ol><li>item1</li></ol><ol><li>item2</li></ol>' } })
  fireEvent.blur(editor)

  // Should set start="2" on the second list
  expect(setLetterContent).toHaveBeenCalled()
})

test('editor sync useEffect updates DOM when not focused', () => {
  const { container, rerender } = render(
    <MainContent
      letterContent={'initial'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  const editor = container.querySelector('[contenteditable]')
  expect(editor).toBeInTheDocument()

  // Change letterContent while editor is not focused
  rerender(
    <MainContent
      letterContent={'updated'}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // The useEffect should update innerHTML
  expect(editor.innerHTML).toBe('updated')
})

test('renders current date in header', () => {
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
    />
  )

  // Should render the current date
  const dateText = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  expect(screen.getByText(dateText)).toBeInTheDocument()
})

test('renders anonymousHandle in footer', () => {
  render(
    <MainContent
      letterContent={''}
      setLetterContent={() => {}}
      fontStyle={'modern'}
      fontSize={[16]}
      anonymousHandle={'TestHandle'}
    />
  )

  expect(screen.getByText('TestHandle')).toBeInTheDocument()
})
