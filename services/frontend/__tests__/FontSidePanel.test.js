import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the font presets used by the component so tests are deterministic
jest.mock('../app/compose-letter/fonts', () => ({
  FONT_PRESETS: [
    { id: 'f1', label: 'Friendly Serif', category: 'serif', className: 'font-serif' },
    { id: 'f2', label: 'Neutral Sans', category: 'sans', className: 'font-sans' },
    { id: 'f3', label: 'Playful Mono', category: 'mono', className: 'font-mono' },
    { id: 'f4', label: 'Another Serif', category: 'serif', className: 'font-serif' },
  ]
}))

const { FontSidePanel } = require('../components/FontSidePanel')

beforeEach(() => {
  // reset localStorage between tests
  localStorage.clear()
  jest.clearAllMocks()
})

test('hovering list item calls onPreview with id and mouseleave calls onPreview(null)', async () => {
  const onPreview = jest.fn()
  const onSelect = jest.fn()
  const onClose = jest.fn()

  render(<FontSidePanel open={true} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  // find an item by its label
  const item = await screen.findByText('Friendly Serif')

  fireEvent.mouseEnter(item)
  expect(onPreview).toHaveBeenCalledWith('f1')

  fireEvent.mouseLeave(item)
  expect(onPreview).toHaveBeenCalledWith(null)
})

test('clicking an item calls onSelect with id and then onClose', async () => {
  const onPreview = jest.fn()
  const onSelect = jest.fn()
  const onClose = jest.fn()

  render(<FontSidePanel open={true} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  const item = await screen.findByText('Neutral Sans')
  fireEvent.click(item)

  expect(onSelect).toHaveBeenCalledWith('f2')
  expect(onClose).toHaveBeenCalled()
})

test('favorite button toggles and writes to localStorage without triggering select', async () => {
  const onPreview = jest.fn()
  const onSelect = jest.fn()
  const onClose = jest.fn()

  // Pre-populate favorites for f1
  localStorage.setItem('letterEditor.fontFavorites', JSON.stringify(['f1']))

  render(<FontSidePanel open={true} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  // The favorite for f1 should be present as 'remove-favorite'
  const removeBtn = await screen.findByLabelText('remove-favorite')
  expect(removeBtn).toBeInTheDocument()

  // Click the favorite button: should toggle off favorite and update localStorage
  fireEvent.click(removeBtn)

  await waitFor(() => {
    const ls = JSON.parse(localStorage.getItem('letterEditor.fontFavorites') || '[]')
    expect(ls).not.toContain('f1')
  })

  // Clicking the favorite button should not trigger onSelect or onClose because of stopPropagation
  expect(onSelect).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})

test('search input filters list and shows No matches when none', async () => {
  const onPreview = jest.fn()
  const onSelect = jest.fn()
  const onClose = jest.fn()

  render(<FontSidePanel open={true} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  const input = screen.getByPlaceholderText('Search fonts...')
  // type a query that matches one item
  fireEvent.change(input, { target: { value: 'Playful' } })
  expect(await screen.findByText('Playful Mono')).toBeInTheDocument()

  // type a query that matches nothing
  fireEvent.change(input, { target: { value: 'no-such-font' } })
  expect(await screen.findByText('No matches')).toBeInTheDocument()
})

test('renders with anchorWithinSidebar uses absolute classes', async () => {
  const onPreview = jest.fn()
  const onSelect = jest.fn()
  const onClose = jest.fn()

  const { container } = render(<FontSidePanel open={true} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} anchorWithinSidebar={true} />)

  // aside should include the absolute/inset classes when anchored
  const aside = container.querySelector('aside')
  expect(aside).toBeInTheDocument()
  expect(aside.className).toMatch(/absolute/) // covers the alternate baseClasses branch
})

test('initial load reads favorites from localStorage and prioritizes them in ordering', async () => {
  const onPreview = jest.fn()
  const onSelect = jest.fn()
  const onClose = jest.fn()

  // mark f4 as favorite ahead of render
  localStorage.setItem('letterEditor.fontFavorites', JSON.stringify(['f4']))

  const { container } = render(<FontSidePanel open={true} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  // first list item should be the favorite (Another Serif)
  const firstItem = container.querySelector('ul > li')
  expect(firstItem).toBeInTheDocument()
  expect(firstItem.textContent).toMatch(/Another Serif/)
})

test('close button calls onClose and open=false triggers onPreview(null)', async () => {
  const onPreview = jest.fn()
  const onSelect = jest.fn()
  const onClose = jest.fn()

  // Render open=true and verify close button triggers onClose
  const { rerender } = render(<FontSidePanel open={true} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)
  const closeBtn = screen.getByLabelText('close')
  fireEvent.click(closeBtn)
  expect(onClose).toHaveBeenCalled()

  // Now render with open=false to exercise the else branch in the effect
  rerender(<FontSidePanel open={false} currentId={''} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  await waitFor(() => {
    expect(onPreview).toHaveBeenCalledWith(null)
  })
})

