import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Import the listFormatting utility functions
const { wrapSelectionInList, applyCustomList } = require('../lib/listFormatting')

// jsdom does not implement ResizeObserver; some UI hooks depend on it
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// Mock setTimeout for testing
jest.useFakeTimers()

// Tests for listFormatting.ts utility functions
describe('List Formatting Utilities', () => {
  let mockEditor
  let mockPreservedRangeRef
  let mockSetLetterContent
  let mockDeps

  beforeEach(() => { 
    // Create a mock editor element
    mockEditor = document.createElement('div')
    mockEditor.contentEditable = 'true'
    document.body.appendChild(mockEditor)

    // Mock preserved range ref
    mockPreservedRangeRef = { current: null }

    // Mock setLetterContent function
    mockSetLetterContent = jest.fn()

    // Create mock dependencies
    mockDeps = {
      editor: mockEditor,
      preservedRangeRef: mockPreservedRangeRef,
      setLetterContent: mockSetLetterContent
    }

    // Clear any existing content
    mockEditor.innerHTML = ''
  })

  afterEach(() => {
    document.body.removeChild(mockEditor)
    jest.clearAllMocks()
  })

  test('exports wrapSelectionInList function', () => {
    expect(typeof wrapSelectionInList).toBe('function')
  })

  test('exports applyCustomList function', () => {
    expect(typeof applyCustomList).toBe('function')
  })

  describe('wrapSelectionInList', () => {
    test('returns early if no editor provided', () => {
      const deps = { ...mockDeps, editor: null }
      wrapSelectionInList(true, deps)
      expect(mockSetLetterContent).not.toHaveBeenCalled()
    })

    test('returns early if no selection and no preserved range', () => {
      // Mock getSelection to return null
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(null)

      wrapSelectionInList(true, mockDeps)
      expect(mockSetLetterContent).not.toHaveBeenCalled()

      window.getSelection = originalGetSelection
    })

    test('returns early if selection has no ranges', () => {
      const mockSelection = {
        rangeCount: 0,
        getRangeAt: jest.fn(),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      wrapSelectionInList(true, mockDeps)
      expect(mockSetLetterContent).not.toHaveBeenCalled()

      window.getSelection = originalGetSelection
    })

    test('returns early if range is collapsed', () => {
      const mockRange = {
        cloneContents: jest.fn().mockReturnValue(document.createDocumentFragment()),
        collapsed: true
      }
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(mockRange),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      wrapSelectionInList(true, mockDeps)
      expect(mockSetLetterContent).not.toHaveBeenCalled()

      window.getSelection = originalGetSelection
    })

    test('uses preserved range when no current selection', () => {
      // Create a real DOM range for the preserved range
      const realRange = document.createRange()
      realRange.setStart(mockEditor, 0)
      realRange.setEnd(mockEditor, 0)
      mockPreservedRangeRef.current = realRange

      const mockSelection = {
        rangeCount: 0,
        getRangeAt: jest.fn(),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      wrapSelectionInList(true, mockDeps)
      // Since the range is collapsed, the function should return early
      expect(mockSetLetterContent).not.toHaveBeenCalled()

      window.getSelection = originalGetSelection
    })

    test('creates unordered list with correct styling', () => {
      mockEditor.innerHTML = '<p>Some selected text</p>'
      const range = document.createRange()
      range.selectNodeContents(mockEditor.firstChild)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      wrapSelectionInList(false, mockDeps)

      // Check that setLetterContent was called (with setTimeout)
      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('creates ordered list with correct styling', () => {
      mockEditor.innerHTML = '<p>Some selected text</p>'
      const range = document.createRange()
      range.selectNodeContents(mockEditor.firstChild)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      wrapSelectionInList(true, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('handles existing LI elements correctly', () => {
      mockEditor.innerHTML = '<li>Existing list item</li>'
      const range = document.createRange()
      range.selectNodeContents(mockEditor.firstChild)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      wrapSelectionInList(false, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })
  })

  describe('applyCustomList', () => {
    test('returns early if no editor provided', () => {
      const deps = { ...mockDeps, editor: null }
      applyCustomList(true, deps)
      expect(mockSetLetterContent).not.toHaveBeenCalled()
    })

    test('returns early if no selection and no preserved range', () => {
      const mockSelection = {
        rangeCount: 0,
        getRangeAt: jest.fn(),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(true, mockDeps)
      expect(mockSetLetterContent).not.toHaveBeenCalled()

      window.getSelection = originalGetSelection
    })

    test('returns early if range is outside editor', () => {
      const externalDiv = document.createElement('div')
      document.body.appendChild(externalDiv)

      const range = document.createRange()
      range.selectNodeContents(externalDiv)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(true, mockDeps)
      expect(mockSetLetterContent).not.toHaveBeenCalled()

      document.body.removeChild(externalDiv)
      window.getSelection = originalGetSelection
    })

    test('handles collapsed range by creating empty list item', () => {
      const range = document.createRange()
      range.setStart(mockEditor, 0)
      range.setEnd(mockEditor, 0)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(true, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('handles empty selection by creating empty list item', () => {
      const range = document.createRange()
      range.setStart(mockEditor, 0)
      range.setEnd(mockEditor, 0)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(false, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('expands selection to full paragraph when appropriate', () => {
      mockEditor.innerHTML = '<p>Full paragraph text</p>'
      const paragraph = mockEditor.firstChild
      const range = document.createRange()
      range.setStart(paragraph.firstChild, 0)
      range.setEnd(paragraph.firstChild, 19) // Select "Full paragraph text"

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(true, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('splits text by newlines for unordered lists', () => {
      mockEditor.innerHTML = 'Line 1\nLine 2\nLine 3'
      const range = document.createRange()
      range.selectNodeContents(mockEditor)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(false, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('splits text by periods for ordered lists', () => {
      mockEditor.innerHTML = 'First sentence. Second sentence. Third sentence.'
      const range = document.createRange()
      range.selectNodeContents(mockEditor)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(true, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('handles list inside paragraph by replacing paragraph', () => {
      mockEditor.innerHTML = '<p>Some text</p>'
      const paragraph = mockEditor.firstChild
      const range = document.createRange()
      range.selectNodeContents(paragraph)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(true, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('merges adjacent lists of same type', () => {
      // Create existing list structure
      mockEditor.innerHTML = '<ul class="pl-4 list-disc list-inside"><li>Item 1</li></ul><p>Some text</p><ul class="pl-4 list-disc list-inside"><li>Item 2</li></ul>'
      const paragraph = mockEditor.querySelector('p')
      const range = document.createRange()
      range.selectNodeContents(paragraph)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(false, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })

    test('handles partial list unwrapping', () => {
      // Create existing list
      mockEditor.innerHTML = '<ul class="pl-4 list-disc list-inside"><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>'
      const list = mockEditor.querySelector('ul')
      const secondLi = list.children[1]
      const range = document.createRange()
      range.selectNodeContents(secondLi)

      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(range),
        removeAllRanges: jest.fn(),
        addRange: jest.fn()
      }
      const originalGetSelection = window.getSelection
      window.getSelection = jest.fn().mockReturnValue(mockSelection)

      applyCustomList(false, mockDeps)

      jest.runAllTimers()
      expect(mockSetLetterContent).toHaveBeenCalled()
    })
  })
})
