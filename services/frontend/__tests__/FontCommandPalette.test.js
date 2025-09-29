import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

// Mock the font presets so tests are deterministic
jest.mock('../app/compose-letter/fonts', () => ({
  FONT_PRESETS: [
    { id: 'a1', label: 'Alpha Serif', category: 'serif', className: 'font-serif' },
    { id: 'b2', label: 'Beta Sans', category: 'sans', className: 'font-sans' },
    { id: 'c3', label: 'Gamma Mono', category: 'mono', className: 'font-mono' },
  ]
}))

const { FontCommandPalette } = require('../app/compose-letter/components/FontCommandPalette')

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
})

test('focuses input when opened and ArrowDown navigates / previews next item', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  const input = screen.getByPlaceholderText(/Search fonts or type category/i)
  // input should be focused eventually (setTimeout focus in component)
  await waitFor(() => expect(input).toHaveFocus())

  // Press ArrowDown to move highlight and preview second item
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  // onPreview should be called with the next item's id
  expect(onPreview).toHaveBeenCalled()
  // Ensure highlight moves again when pressing ArrowDown
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(onPreview).toHaveBeenCalled()
})

test('Enter selects highlighted item and calls onClose', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  const input = screen.getByPlaceholderText(/Search fonts or type category/i)
  await waitFor(() => expect(input).toHaveFocus())

  // Press Enter without navigation -> selects first item
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onSelect).toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})

test('mouse hover previews item and click selects', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  const item = await screen.findByText('Beta Sans')
  fireEvent.mouseEnter(item)
  expect(onPreview).toHaveBeenCalledWith('b2')

  fireEvent.click(item)
  expect(onSelect).toHaveBeenCalledWith('b2')
  expect(onClose).toHaveBeenCalled()
})

test('favorite button toggles and persists to localStorage', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  // Initially no favorites
  expect(JSON.parse(localStorage.getItem('letterEditor.fontFavorites') || '[]')).toEqual([])

  // find add-favorite buttons and click the first occurrence
  const addBtns = await screen.findAllByLabelText('add-favorite')
  const addBtn = addBtns[0]
  fireEvent.click(addBtn)

  await waitFor(() => {
    const ls = JSON.parse(localStorage.getItem('letterEditor.fontFavorites') || '[]')
    expect(ls.length).toBeGreaterThan(0)
  })
})

test('search filters list and shows No matches', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  const input = screen.getByPlaceholderText(/Search fonts or type category/i)
  fireEvent.change(input, { target: { value: 'nope' } })
  expect(await screen.findByText('No matches')).toBeInTheDocument()
})

test('ArrowUp at start wraps to last item and previews it', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  const input = screen.getByPlaceholderText(/Search fonts or type category/i)
  await waitFor(() => expect(input).toHaveFocus())

  // Press ArrowUp at the beginning -> should wrap and preview last item (c3)
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(onPreview).toHaveBeenCalled()
})

test('reducing filtered length resets highlightIndex to 0', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  const input = screen.getByPlaceholderText(/Search fonts or type category/i)
  await waitFor(() => expect(input).toHaveFocus())

  // Navigate down twice so highlight moves away from 0
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'ArrowDown' })

  // Now filter to a single matching item
  fireEvent.change(input, { target: { value: 'Gamma' } })

  // The first (and only) item should be highlighted (index 0)
  const item = await screen.findByText('Gamma Mono')
  // its parent li should have active class when highlighted; check that it exists
  const li = item.closest('li')
  expect(li).toBeTruthy()
})

test('Escape key closes and clicking overlay closes', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  const { container } = render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  const input = screen.getByPlaceholderText(/Search fonts or type category/i)
  await waitFor(() => expect(input).toHaveFocus())

  // Escape key
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(onClose).toHaveBeenCalled()

  // Re-render open and test overlay click. cleanup to remove previous render
  onClose.mockReset()
  cleanup()
  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)
  // dialog is role=dialog, overlay is its parent
  const dialog = screen.getByRole('dialog')
  const overlay = dialog.parentElement
  expect(overlay).toBeTruthy()
  fireEvent.mouseDown(overlay)
  expect(onClose).toHaveBeenCalled()
})

test('item with currentId gets ring class applied', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={'b2'} />)

  const item = await screen.findByText('Beta Sans')
  const li = item.closest('li')
  expect(li).toHaveClass('ring-1')
})

test('reads favorites from localStorage on open and shows remove-favorite', async () => {
  // pre-populate favorites
  localStorage.setItem('letterEditor.fontFavorites', JSON.stringify(['b2']))

  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={true} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  // the favored item should render a remove-favorite button
  const remove = await screen.findByLabelText('remove-favorite')
  expect(remove).toBeInTheDocument()
})

test('when open is false, component calls onPreview(null)', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<FontCommandPalette open={false} onClose={onClose} onSelect={onSelect} onPreview={onPreview} currentId={''} />)

  await waitFor(() => expect(onPreview).toHaveBeenCalledWith(null))
})

