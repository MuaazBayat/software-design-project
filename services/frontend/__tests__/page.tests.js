import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Import the main page component
const ComposeLetterPage = require('../app/compose-letter/page').default

// Mock Next.js router
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}))

// jsdom does not implement ResizeObserver; some UI hooks depend on it
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// Tests for the main compose-letter page component
describe('ComposeLetterRedirect', () => {
  beforeEach(() => {
    mockReplace.mockClear()
  })

  test('renders loading state', () => {
    render(<ComposeLetterPage />)
    expect(screen.getByText('Loading Compose Page...')).toBeInTheDocument()
    expect(screen.getByText('Setting up your letter writing experience.')).toBeInTheDocument()
    expect(screen.getByText('📝')).toBeInTheDocument()
  })

  test('calls router.replace on mount', () => {
    render(<ComposeLetterPage />)
    expect(mockReplace).toHaveBeenCalledWith('/compose-letter/default')
  })

  test('renders with correct styling', () => {
    const { container } = render(<ComposeLetterPage />)
    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('min-h-screen', 'bg-gradient-to-br', 'from-amber-50', 'to-orange-50', 'flex', 'items-center', 'justify-center')
  })

  test('displays animated spinner', () => {
    render(<ComposeLetterPage />)
    const spinner = screen.getByText('📝')
    expect(spinner).toHaveClass('animate-spin', 'text-4xl', 'mb-4')
  })
})
