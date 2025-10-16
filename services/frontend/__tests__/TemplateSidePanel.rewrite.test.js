/**
 * New, behavior-driven test suite for TemplateSidePanel
 * - Focused on user interactions and observable outcomes
 * - Minimal, high-value coverage without redundancy
 */

import React from 'react'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Environment / polyfills
// ---------------------------------------------------------------------------

beforeAll(() => {
  // Stub IntersectionObserver used by the component
  class IO {
    constructor(cb) { this.cb = cb }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.IntersectionObserver = IO
})

// Use modern fake timers for debounce/inactivity behavior
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Simple, DOM-first mocks for external UI wrappers
// These avoid portals/contexts and let us test behavior directly
// ---------------------------------------------------------------------------

jest.mock('next/image', () => (props) => React.createElement('img', props))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }) => <button {...rest}>{children}</button>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ children, ...rest }) => <input {...rest} />,
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }) => <label {...rest}>{children}</label>,
}))

// Represent Slider as a simple range input that triggers onValueChange([value])
jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min = 0, max = 100, step = 1, ...rest }) => (
    <input
      type="range"
      aria-label={rest['aria-label'] || 'slider'}
      min={min}
      max={max}
      step={step}
      value={Array.isArray(value) ? value[0] : value}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...rest}
    />
  ),
}))

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...rest }) => <div {...rest}>{children}</div>,
}))

// Dialog/AlertDialog: always render children (no portals/state) to keep it simple
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }) => <div>{children}</div>,
  DialogTrigger: ({ asChild, children }) => <div>{children}</div>,
  DialogContent: ({ children, ...rest }) => <div {...rest}>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h4>{children}</h4>,
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogClose: ({ children }) => <button>{children}</button>,
}))

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }) => <div>{children}</div>,
  AlertDialogTrigger: ({ asChild, children }) => <div>{children}</div>,
  AlertDialogContent: ({ children, ...rest }) => <div role="dialog" {...rest}>{children}</div>,
  AlertDialogHeader: ({ children }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }) => <h4>{children}</h4>,
  AlertDialogDescription: ({ children }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, ...rest }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
  AlertDialogCancel: ({ children, onClick, ...rest }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))

// motion/react: render as a div to avoid animation complexity
jest.mock('motion/react', () => ({
  motion: { div: ({ children, ...rest }) => <div {...rest}>{children}</div> },
}))

// ---------------------------------------------------------------------------
// ComposeLetterContext mock
// ---------------------------------------------------------------------------

const favoritePreset = {
  id: 'p1',
  name: 'Fav Lines',
  isFavorite: true,
  updatedAt: 1000,
  config: {
    background: { color: '#ffeeee', opacity: 0.75 },
    pattern: {
      type: 'straight',
      params: { type: 'straight', spacing: 24, thickness: 3, color: '#222222', opacity: 0.5, rotation: 10 },
    },
    fontColor: '#111111',
    fontOpacity: 0.9,
  },
}

const otherPreset = {
  id: 'p2',
  name: 'Ocean Dots',
  isFavorite: false,
  updatedAt: 2000,
  config: {
    background: { color: '#e0f7ff', opacity: 0.5 },
    pattern: {
      type: 'dotted',
      params: { type: 'dotted', spacing: 16, thickness: 6, color: '#0088ff', opacity: 0.6, rotation: 0 },
    },
    fontColor: '#004466',
    fontOpacity: 0.8,
  },
}

const mockApplyPreset = jest.fn((id) => (id === 'p1' ? favoritePreset : id === 'p2' ? otherPreset : undefined))
const mockSavePreset = jest.fn()
const mockDeletePreset = jest.fn()
const mockToggleFavorite = jest.fn()

jest.mock('../app/compose-letter/components/ComposeLetterContext', () => ({
  useComposeLetter: () => ({
    presets: [favoritePreset, otherPreset],
    applyPreset: mockApplyPreset,
    savePreset: mockSavePreset,
    deletePreset: mockDeletePreset,
    toggleFavorite: mockToggleFavorite,
  }),
}))

// TempPreview provider isn’t required for these behavioral tests
jest.mock('../app/compose-letter/components/TempPreview', () => ({
  TempPreviewProvider: ({ children }) => <>{children}</>,
  useTempPreview: () => ({ set: jest.fn() }),
}))

// ---------------------------------------------------------------------------
// SUT import
// ---------------------------------------------------------------------------
import TemplateSidePanel from '../app/compose-letter/components/TemplateSidePanel'

// Utility to render the panel with sensible defaults
const setup = (props = {}) => {
  const onClose = jest.fn()
  const onPreview = jest.fn()
  const onSelect = jest.fn()

  const onLineConfigChange = jest.fn()
  const onFontColorChange = jest.fn()
  const onFontOpacityChange = jest.fn()
  const onBackgroundColorChange = jest.fn()
  const onBackgroundOpacityChange = jest.fn()

  const utils = render(
    <TemplateSidePanel
      open
      currentId="p1"
      onClose={onClose}
      onPreview={onPreview}
      onSelect={onSelect}
      thumbSize={60}
      lineConfig={{ type: 'none', spacing: 24, thickness: 1, color: '#e5e7eb', opacity: 0.5, rotation: 0 }}
      onLineConfigChange={onLineConfigChange}
      fontColor="#000000"
      onFontColorChange={onFontColorChange}
      fontOpacity={1}
      onFontOpacityChange={onFontOpacityChange}
      backgroundColor="#ffffff"
      onBackgroundColorChange={onBackgroundColorChange}
      backgroundOpacity={1}
      onBackgroundOpacityChange={onBackgroundOpacityChange}
      {...props}
    />
  )

  return {
    ...utils,
    onClose,
    onPreview,
    onSelect,
    onLineConfigChange,
    onFontColorChange,
    onFontOpacityChange,
    onBackgroundColorChange,
    onBackgroundOpacityChange,
  }
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

test('renders when open and can be closed via header button', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  const { onClose } = setup({ showCloseButton: true })

  expect(screen.getByText(/Page Settings/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /close panel/i }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

// Inactivity auto-close (5s) and activity resets the timer
test('auto-closes after inactivity but not if user is active', () => {
  const { onClose } = setup()

  // Initial schedule at mount => advance 5s + 300ms fade triggers close
  act(() => {
    jest.advanceTimersByTime(5000)
    jest.advanceTimersByTime(300)
  })
  expect(onClose).toHaveBeenCalledTimes(1)

  // Re-render to test reset on activity
  onClose.mockClear()
  setup()

  // Dispatch activity to reset timer
  act(() => {
    document.dispatchEvent(new Event('mousemove'))
    jest.advanceTimersByTime(4000)
  })
  expect(onClose).not.toHaveBeenCalled()

  act(() => {
    jest.advanceTimersByTime(1001)
    jest.advanceTimersByTime(300)
  })
  expect(onClose).toHaveBeenCalledTimes(1)
})

// Hover/preview and clicking a template applies it without calling onSelect
test('hover previews; click applies preset and pushes all related changes (debounced where applicable)', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  const {
    onPreview,
    onSelect,
    onLineConfigChange,
    onFontColorChange,
    onFontOpacityChange,
    onBackgroundColorChange,
    onBackgroundOpacityChange,
  } = setup()

  // Two template cards should be present initially (favorites tab only => 1 favorite visible; but grid always renders cards from filtered list)
  // Switch to All to make both visible for interaction
  await user.click(screen.getByRole('button', { name: /all/i }))

  const grid = screen.getByText('Fav Lines').closest('div').parentElement // card container
  expect(screen.getByText('Fav Lines')).toBeInTheDocument()
  expect(screen.getByText('Ocean Dots')).toBeInTheDocument()

  const favCard = screen.getByText('Fav Lines').closest('.cursor-pointer') || screen.getByText('Fav Lines').closest('div')

  // Hover triggers preview with id; unhover sends null
  fireEvent.mouseEnter(favCard)
  expect(onPreview).toHaveBeenCalledWith('p1')
  fireEvent.mouseLeave(favCard)
  expect(onPreview).toHaveBeenCalledWith(null)

  // Click applies preset p1 and updates outward via callbacks, some debounced
  await user.click(favCard)

  // Immediate line type change (applyPreset calls onLineConfigChange via TemplateItem)
  expect(onLineConfigChange).toHaveBeenCalled()

  // Debounced color/opacity callbacks
  act(() => {
    jest.runAllTimers()
  })

  expect(onBackgroundColorChange).toHaveBeenCalledWith('#ffeeee')
  expect(onBackgroundOpacityChange).toHaveBeenCalledWith(0.75)
  expect(onFontColorChange).toHaveBeenCalledWith('#111111')
  expect(onFontOpacityChange).toHaveBeenCalledWith(0.9)

  // Ensure onSelect was NOT used to close the panel
  expect(onSelect).not.toHaveBeenCalled()
})

// Favorite toggle & delete confirmation
test('deletes a preset via confirmation dialog', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  setup()

  await user.click(screen.getByRole('button', { name: /all/i }))

  const title = screen.getByText('Fav Lines')
  const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

  // Pick the delete button whose ancestor tree contains the Fav Lines title
  const cardDelete = deleteButtons.find((btn) => {
    let el = btn
    while (el) {
      if (el.contains(title)) return true
      el = el.parentElement
    }
    return false
  })

  expect(cardDelete).toBeTruthy()
  await user.click(cardDelete)

  // Confirm inside the dialog only
const dialogs = screen.getAllByRole('dialog')
const targetDialog = dialogs.find((d) => within(d).queryByText(/Fav Lines/i))
expect(targetDialog).toBeTruthy()
await user.click(within(targetDialog).getByRole('button', { name: /delete/i }))

expect(mockDeletePreset).toHaveBeenCalledWith('p1')
})

// Search and tab filtering
test('tab filtering defaults to Favorites; switching tabs and searching narrows results', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  setup()

  // Favorites default => only favorite visible
  expect(screen.getByText('Fav Lines')).toBeInTheDocument()
  expect(screen.queryByText('Ocean Dots')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /all/i }))
  expect(screen.getByText('Ocean Dots')).toBeInTheDocument()

  const search = screen.getByPlaceholderText(/search templates/i)
  await user.type(search, 'Ocean')
  expect(screen.queryByText('Fav Lines')).not.toBeInTheDocument()
  expect(screen.getByText('Ocean Dots')).toBeInTheDocument()
})

// Save template flow with validation
test('Save Current Template enforces name length and saves with composed config', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

  const props = {
    backgroundColor: '#abcdef',
    backgroundOpacity: 0.42,
    fontColor: '#135790',
    fontOpacity: 0.66,
    lineConfig: { type: 'straight', spacing: 10, thickness: 2, color: '#123456', opacity: 0.5, rotation: 15 },
  }
  setup(props)

  // Open dialog (mock renders content regardless, but clicking keeps parity with UX)
  await user.click(screen.getByRole('button', { name: /save current template/i }))

  const nameInput = screen.getByPlaceholderText(/my custom template/i)

  await user.clear(nameInput)
  await user.type(nameInput, 'abc') // too short
  await user.click(screen.getByRole('button', { name: /^save template$/i }))

  // Error rendered (border-red-500 on input is stylistic; we assert that savePreset not called)
  expect(mockSavePreset).not.toHaveBeenCalled()

  await user.clear(nameInput)
  await user.type(nameInput, 'Nice Template')
  await user.click(screen.getByRole('button', { name: /^save template$/i }))

  expect(mockSavePreset).toHaveBeenCalledTimes(1)
  const [passedName, passedConfig] = mockSavePreset.mock.calls[0]
  expect(passedName).toBe('Nice Template')
  expect(passedConfig).toMatchObject({
    background: { color: '#abcdef', opacity: 0.42 },
    pattern: { type: 'straight' },
    fontColor: '#135790',
    fontOpacity: 0.66,
  })
})

// Line controls: switch type sets default color and dotted thickness; sliders debounce
test('changing line style and controls emits expected updates', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  const { onLineConfigChange } = setup({ lineConfig: { type: 'none', spacing: 24, thickness: 1, color: '#e5e7eb', opacity: 0.5, rotation: 0 } })

  await user.click(screen.getByRole('button', { name: /dotted/i }))
  expect(onLineConfigChange).toHaveBeenCalled()

  // Adjust opacity slider (debounced)
  const opacitySlider = screen.getAllByRole('slider')[0]
  fireEvent.change(opacitySlider, { target: { value: '0.75' } })
  act(() => { jest.advanceTimersByTime(60) })
  
  // Spacing +/- buttons update immediately — choose the first visible ones
  const minusButtons = screen.getAllByRole('button', { name: '-' })
  const plusButtons = screen.getAllByRole('button', { name: '\+' })
  await user.click(minusButtons[0])
  await user.click(plusButtons[0])

  expect(onLineConfigChange).toHaveBeenCalled()
})

// Mobile gesture: drag down > 100px closes panel
test('touch drag downward closes the panel', () => {
  const { onClose } = setup()

  const panel = screen.getByText(/page settings/i).closest('div')

  // JSDOM: synthesize touch events using plain objects
  fireEvent.touchStart(panel, { touches: [{ clientY: 100 }] })
  fireEvent.touchMove(panel, { touches: [{ clientY: 230 }] })
  fireEvent.touchEnd(panel)

  expect(onClose).toHaveBeenCalled()
})
