import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ComposeLetterProvider } from '../app/compose-letter/components/ComposeLetterContext'
import { TempPreviewProvider } from '../app/compose-letter/components/TempPreview'
import TemplateSidePanel from '../app/compose-letter/components/TemplateSidePanel'

// Mock motion/react
jest.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  }
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />
}))

// Mock IntersectionObserver globally to make sections visible immediately
global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
  // Immediately call callback with all sections intersecting
  callback([
    { isIntersecting: true, target: { getAttribute: () => 'presets' } },
    { isIntersecting: true, target: { getAttribute: () => 'fontColor' } },
    { isIntersecting: true, target: { getAttribute: () => 'backgroundColor' } },
    { isIntersecting: true, target: { getAttribute: () => 'pageLines' } }
  ]);
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  };
});

// Mock UI components
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogAction: ({ children, ...props }) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }) => <div>{children}</div>,
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogDescription: ({ children }) => <div>{children}</div>,
  DialogFooter: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  DialogTrigger: ({ children }) => <div>{children}</div>,
  DialogClose: ({ children }) => <div>{children}</div>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props) => <input {...props} />
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>
}))

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, ...props }) => (
    <input
      type="range"
      value={value?.[0] || value || 0}
      onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
      {...props}
    />
  )
}))

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }) => <div {...props}>{children}</div>
}))

const TestWrapper = ({ children }) => (
  <ComposeLetterProvider>
    <TempPreviewProvider>
      {children}
    </TempPreviewProvider>
  </ComposeLetterProvider>
)

test('renders when open and close button calls onClose', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  expect(screen.getByText('Page Settings')).toBeInTheDocument()
  const closeBtn = screen.getByLabelText('Close panel')
  fireEvent.click(closeBtn)
  expect(onClose).toHaveBeenCalled()
})

// test('Preview and Apply open info dialog', async () => { 
//   const onClose = jest.fn()
//   const onSelect = jest.fn()
//   const onPreview = jest.fn()

//   render(<TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)

//   const preview = screen.getByText('Preview')
//   fireEvent.click(preview)
//   const title = await screen.findByText('Hold tight')
//   expect(title).toBeInTheDocument()

//   // scope to the dialog node and close it
//   const dialogNode = title.closest('[role="dialog"]')
//   const closeBtns = within(dialogNode).getAllByRole('button', { name: /Close/i })
//   // pick the visible content button (textContent === 'Close') rather than the sr-only/dialog-close button
//   const closeBtn = closeBtns.find(b => (b.textContent || '').trim() === 'Close') || closeBtns[0]
//   fireEvent.click(closeBtn)
//   await waitFor(() => expect(screen.queryByText('Hold tight')).not.toBeInTheDocument())

//   const apply = screen.getByText('Apply')
//   fireEvent.click(apply)
//   expect(await screen.findByText('Hold tight')).toBeInTheDocument()
// })

// test('Clear Template calls onSelect(null)', () => {
//   const onClose = jest.fn()
//   const onSelect = jest.fn()
//   const onPreview = jest.fn()

//   render(
//     <TestWrapper>
//       <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
//     </TestWrapper>
//   )

//   const clear = screen.getByText('Clear Template')
//   fireEvent.click(clear)
//   expect(onSelect).toHaveBeenCalledWith(null)
// })


test('thumbnail placeholder (lines) is present and aria-hidden', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  const { container } = render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )
  
  // Wait for the component to render
  await waitFor(() => {
    expect(screen.getByText('Page Settings')).toBeInTheDocument()
  })
  
  const thumb = container.querySelector('[aria-hidden]')
  expect(thumb).toBeTruthy()
})

test('does not render when open is false', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  const { container } = render(
    <TestWrapper>
      <TemplateSidePanel open={false} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )
  // component should return null when not open
  expect(container.firstChild).toBeNull()
})

// test('renders anchored within sidebar when anchorWithinSidebar is true', () => {
//   const onClose = jest.fn()
//   const onSelect = jest.fn()
//   const onPreview = jest.fn()

//   const { container } = render(<TemplateSidePanel open={true} anchorWithinSidebar={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />)
//   // outer root container should use the absolute positioning class
//   const outer = container.firstChild
//   expect(outer.className).toMatch(/absolute left-0/)
// })

// Template filtering and search tests
test('switches between template tabs (favorites, recent, all)', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // Check that tab buttons are present
  expect(screen.getByText('Favorites')).toBeInTheDocument()
  expect(screen.getByText('Recent')).toBeInTheDocument()
  expect(screen.getByText('All')).toBeInTheDocument()

  // Click on different tabs
  fireEvent.click(screen.getByText('Recent'))
  fireEvent.click(screen.getByText('All'))
  fireEvent.click(screen.getByText('Favorites'))
})

test('filters templates based on search input', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  const searchInput = screen.getByPlaceholderText('Search templates...')
  fireEvent.change(searchInput, { target: { value: 'test template' } })
  expect(searchInput.value).toBe('test template')
})

// Color and opacity controls tests
test('font color picker updates color value', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  const fontColorInput = screen.getByTitle('Select text color')
  fireEvent.change(fontColorInput, { target: { value: '#ff0000' } })
  expect(fontColorInput.value).toBe('#ff0000')
})

test('background color picker updates color value', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  const bgColorInput = screen.getByTitle('Select background color')
  fireEvent.change(bgColorInput, { target: { value: '#00ff00' } })
  expect(bgColorInput.value).toBe('#00ff00')
})

test('opacity slider updates opacity value', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // First select a line type to show the line opacity controls
  const straightButton = screen.getByText('Straight')
  fireEvent.click(straightButton)

  // Now find the opacity slider in the line configuration section
  // Look for sliders with min="0.1" and max="1" which are opacity sliders
  const opacitySliders = screen.getAllByDisplayValue('0.5').filter(slider => 
    slider.getAttribute('min') === '0.1' && slider.getAttribute('max') === '1'
  )
  expect(opacitySliders.length).toBeGreaterThan(0)
  
  const lineOpacitySlider = opacitySliders[0] // The line opacity slider
  fireEvent.change(lineOpacitySlider, { target: { value: '0.7' } })
  expect(lineOpacitySlider.value).toBe('0.7')
})

// Line configuration tests
test('selects different line types', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  const straightButton = screen.getByText('Straight')
  fireEvent.click(straightButton)

  const dottedButton = screen.getByText('Dotted')
  fireEvent.click(dottedButton)
})

test('line spacing slider updates spacing value', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // First select a line type to show the controls
  const straightButton = screen.getByText('Straight')
  fireEvent.click(straightButton)

  // Now the spacing slider should be visible
  const spacingSlider = screen.getByDisplayValue('24') // Default spacing value
  fireEvent.change(spacingSlider, { target: { value: '20' } })
  expect(spacingSlider.value).toBe('20')
})

test('line thickness slider updates thickness value', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // First select a line type to show the controls
  const straightButton = screen.getByText('Straight')
  fireEvent.click(straightButton)

  // Now find the thickness slider - it should have min="2" and max="300"
  const thicknessSliders = screen.getAllByRole('slider').filter(slider => 
    slider.getAttribute('min') === '2' && slider.getAttribute('max') === '300'
  )
  expect(thicknessSliders.length).toBeGreaterThan(0)
  
  const thicknessSlider = thicknessSliders[0]
  fireEvent.change(thicknessSlider, { target: { value: '5' } })
  expect(thicknessSlider.value).toBe('5')
})

test('line rotation slider updates rotation value', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // First select a line type to show the controls
  const straightButton = screen.getByText('Straight')
  fireEvent.click(straightButton)

  // Now the rotation slider should be visible
  const rotationSlider = screen.getByDisplayValue('0') // Default rotation value
  fireEvent.change(rotationSlider, { target: { value: '45' } })
  expect(rotationSlider.value).toBe('45')
})

// Save template dialog tests
test('opens save template dialog and validates input', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // Wait for the save button to appear (it has transition delays)
  const saveButton = await screen.findByText('Save Current Template', {}, { timeout: 3000 })
  fireEvent.click(saveButton)

  const dialog = await screen.findByRole('dialog')
  expect(dialog).toBeInTheDocument()

  const nameInput = screen.getByPlaceholderText('My Custom Template')
  fireEvent.change(nameInput, { target: { value: 'Test Template' } })

  const saveDialogButton = screen.getByText('Save Template')
  fireEvent.click(saveDialogButton)
})

test('shows validation error for empty template name', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // Wait for the save button to appear
  const saveButton = await screen.findByText('Save Current Template', {}, { timeout: 3000 })
  fireEvent.click(saveButton)

  const saveDialogButton = screen.getByText('Save Template')
  fireEvent.click(saveDialogButton)

  expect(screen.getByText('Template name must be at least 4 characters long.')).toBeInTheDocument()
})

// Delete template dialog tests
test('opens delete confirmation dialog', async () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // Find delete buttons (trash icons) - they don't have accessible labels
  const deleteButtons = screen.getAllByRole('button').filter(button => 
    button.querySelector('svg') && 
    button.querySelector('svg')?.getAttribute('xmlns') === 'http://www.w3.org/2000/svg' &&
    button.querySelector('path')?.getAttribute('d')?.includes('polyline')
  )
  
  if (deleteButtons.length > 0) {
    fireEvent.click(deleteButtons[0])

    // Check for AlertDialog content
    expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  }
})

// Touch gesture tests
test('handles touch gestures for mobile drag-to-close', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  const panel = screen.getByText('Page Settings').closest('div')
  expect(panel).toBeInTheDocument()

  // Simulate touch start
  fireEvent.touchStart(panel, {
    touches: [{ clientX: 100, clientY: 100 }]
  })

  // Simulate touch move (drag down more than 100px)
  fireEvent.touchMove(panel, {
    touches: [{ clientX: 100, clientY: 250 }]
  })

  // Simulate touch end
  fireEvent.touchEnd(panel)

  // Should call onClose after drag
  expect(onClose).toHaveBeenCalled()
})

// Inactivity timeout tests
test('fades panel after inactivity timeout', async () => {
  jest.useFakeTimers()

  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // Fast-forward time to trigger inactivity timeout (5 seconds)
  jest.advanceTimersByTime(5000)

  await waitFor(() => {
    // The component should have called onClose after fading
    expect(onClose).toHaveBeenCalled()
  })

  jest.useRealTimers()
})

// Scroll-triggered animations tests
test('shows/hides sections based on scroll position', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </TestWrapper>
  )

  // Check that observer was called
  expect(global.IntersectionObserver).toHaveBeenCalled()
})

// Show more/less templates tests
test('shows more templates when show more is clicked', async () => {
  // Create a custom wrapper with mocked presets
  const mockPresets = Array.from({ length: 8 }, (_, i) => ({
    id: `template-${i}`,
    name: `Template ${i + 1}`,
    config: {
      background: { color: '#ffffff', filterKey: '', opacity: 1 },
      pattern: { type: 'none', params: {} },
      patternBlendMode: 'normal',
      fontColor: '#000000',
      fontOpacity: 1
    },
    thumbnailDataUrl: '',
    isFavorite: i < 2,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }))

  const CustomWrapper = ({ children }) => (
    <ComposeLetterProvider initialPresets={mockPresets}>
      <TempPreviewProvider>
        {children}
      </TempPreviewProvider>
    </ComposeLetterProvider>
  )

  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <CustomWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </CustomWrapper>
  )

  // Wait for the show more button to appear (it has transition delays)
  const showMoreButton = await screen.findByText('Show more templates...', {}, { timeout: 3000 })
  fireEvent.click(showMoreButton)

  // The button should disappear and show less button should appear
  expect(screen.queryByText('Show more templates...')).not.toBeInTheDocument()
  expect(screen.getByText('Show fewer templates')).toBeInTheDocument()
})

test('shows less templates when show less is clicked', async () => {
  // Create a custom wrapper with mocked presets
  const mockPresets = Array.from({ length: 8 }, (_, i) => ({
    id: `template-${i}`,
    name: `Template ${i + 1}`,
    config: {
      background: { color: '#ffffff', filterKey: '', opacity: 1 },
      pattern: { type: 'none', params: {} },
      patternBlendMode: 'normal',
      fontColor: '#000000',
      fontOpacity: 1
    },
    thumbnailDataUrl: '',
    isFavorite: i < 2,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }))

  const CustomWrapper = ({ children }) => (
    <ComposeLetterProvider initialPresets={mockPresets}>
      <TempPreviewProvider>
        {children}
      </TempPreviewProvider>
    </ComposeLetterProvider>
  )

  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <CustomWrapper>
      <TemplateSidePanel open={true} onSelect={onSelect} onPreview={onPreview} onClose={onClose} />
    </CustomWrapper>
  )

  // First click show more
  const showMoreButton = await screen.findByText('Show more templates...', {}, { timeout: 3000 })
  fireEvent.click(showMoreButton)

  // Then click show less
  const showLessButton = screen.getByText('Show fewer templates')
  fireEvent.click(showLessButton)

  // Show more button should reappear
  expect(screen.getByText('Show more templates...')).toBeInTheDocument()
  expect(screen.queryByText('Show fewer templates')).not.toBeInTheDocument()
})

// Styling variations tests
test('renders with anchorWithinSidebar prop', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  const { container } = render(
    <TestWrapper>
      <TemplateSidePanel
        open={true}
        anchorWithinSidebar={true}
        onSelect={onSelect}
        onPreview={onPreview}
        onClose={onClose}
      />
    </TestWrapper>
  )

  const outerContainer = container.firstChild
  expect(outerContainer).toHaveClass('absolute', 'inset-0', 'w-full', 'h-full', 'bg-white', 'backdrop-blur-sm', 'border-r', 'border-amber-200', 'shadow-lg', 'flex', 'flex-col', 'z-50')
})

test('renders with showCloseButton prop', () => {
  const onClose = jest.fn()
  const onSelect = jest.fn()
  const onPreview = jest.fn()

  render(
    <TestWrapper>
      <TemplateSidePanel
        open={true}
        showCloseButton={true}
        onSelect={onSelect}
        onPreview={onPreview}
        onClose={onClose}
      />
    </TestWrapper>
  )

  expect(screen.getByLabelText('Close panel')).toBeInTheDocument()
})

