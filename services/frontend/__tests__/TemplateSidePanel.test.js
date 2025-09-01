import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

const TemplateSidePanel = require('../components/TemplateSidePanel').default

test('renders when open and close button calls onClose', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  expect(screen.getByText('Templates')).toBeInTheDocument()
  const closeBtn = screen.getByLabelText('Close templates')
  fireEvent.click(closeBtn)
  expect(onClose).toHaveBeenCalled()
})

test('Preview and Apply open info dialog', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  const preview = screen.getByText('Preview')
  fireEvent.click(preview)
  const title = await screen.findByText('Hold tight')
  expect(title).toBeInTheDocument()

  // scope to the dialog node and close it
  const dialogNode = title.closest('[role="dialog"]')
  const closeBtns = within(dialogNode).getAllByRole('button', { name: /Close/i })
  // pick the visible content button (textContent === 'Close') rather than the sr-only/dialog-close button
  const closeBtn = closeBtns.find(b => (b.textContent || '').trim() === 'Close') || closeBtns[0]
  fireEvent.click(closeBtn)
  await waitFor(() => expect(screen.queryByText('Hold tight')).not.toBeInTheDocument())

  const apply = screen.getByText('Apply')
  fireEvent.click(apply)
  expect(await screen.findByText('Hold tight')).toBeInTheDocument()
})

test('Clear Template calls onSelect(null)', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  const clear = screen.getByText('Clear Template')
  fireEvent.click(clear)
  expect(onSelect).toHaveBeenCalledWith(null)
})

test('thumbnail placeholder (lines) is present and aria-hidden', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(<TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

  const { container } = render(<TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)
  const thumb = container.querySelector('[aria-hidden]')
  expect(thumb).toBeTruthy()
})

test('does not render when open is false', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  const { container } = render(<TemplateSidePanel open={false} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)
  // component should return null when not open
  expect(container.firstChild).toBeNull()
})

test('renders anchored within sidebar when anchorWithinSidebar is true', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  const { container } = render(<TemplateSidePanel open={true} anchorWithinSidebar={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)
  // outer root container should use the absolute positioning class
  const outer = container.firstChild
  expect(outer.className).toMatch(/absolute left-0/)
})

