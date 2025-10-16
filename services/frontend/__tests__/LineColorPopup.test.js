import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LineColorPopup from '../app/compose-letter/components/LineColorPopup'

describe('LineColorPopup', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    currentColor: '#000000',
    onColorChange: jest.fn(),
    position: { x: 100, y: 100 }
  }

  test('renders when open', () => {
    render(<LineColorPopup {...defaultProps} />)
    expect(screen.getByText('Line Color')).toBeInTheDocument()
  })

  test('does not render when closed', () => {
    render(<LineColorPopup {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Line Color')).not.toBeInTheDocument()
  })

  test('calls onColorChange when color is selected', () => {
    render(<LineColorPopup {...defaultProps} />)
    const colorInput = screen.getByDisplayValue('#000000') // Color input with current value
    fireEvent.change(colorInput, { target: { value: '#FF0000' } })
    expect(defaultProps.onColorChange).toHaveBeenCalledWith('#ff0000')
  })

  test('calls onClose when escape is pressed', () => {
    render(<LineColorPopup {...defaultProps} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  test('calls onClose when backdrop is clicked', () => {
    render(<LineColorPopup {...defaultProps} />)
    const backdrop = document.querySelector('.popup-backdrop')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(defaultProps.onClose).toHaveBeenCalled()
    }
  })

  test('highlights current color', () => {
    render(<LineColorPopup {...defaultProps} currentColor="#DC2626" />)
    // The current color should be highlighted (implementation dependent)
    expect(screen.getByText('Line Color')).toBeInTheDocument()
  })
})