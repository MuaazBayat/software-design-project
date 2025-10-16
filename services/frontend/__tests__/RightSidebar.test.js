import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the TemplateSidePanel child so tests can trigger the onPreview prop
jest.mock('../app/compose-letter/components/TemplateSidePanel', () => {
  const React = require('react')
  return function MockTemplateSidePanel(props) {
    return (
      React.createElement('div', null,
        React.createElement('h2', null, 'Templates'),
        React.createElement('button', { 'aria-label': 'Close templates', onClick: () => props.onClose && props.onClose() }, 'Close'),
        React.createElement('button', { onClick: () => props.onPreview && props.onPreview('TEMPLATE_ID') }, 'Preview'),
        React.createElement('button', { onClick: () => props.onSelect && props.onSelect(null) }, 'Clear Template')
      )
    )
  }
})

// Mock LetterSendAnimation to call onAnimationComplete immediately
jest.mock('../app/compose-letter/components/LetterSendAnimation', () => {
  const React = require('react')
  return function MockLetterSendAnimation({ onAnimationComplete }) {
    React.useEffect(() => {
      // Call onAnimationComplete immediately in tests
      onAnimationComplete && onAnimationComplete()
    }, [onAnimationComplete])
    return React.createElement('div', null, 'Mock Animation')
  }
}) 

const RightSidebar = require('../app/compose-letter/components/RightSidebar').default
const { ReadabilityRating } = require('../app/compose-letter/components/RightSidebar')

test('renders letter preview with selected match and anonymous handle', () => {
  const selectedMatch = { id: 'm1', name: 'Alice Example', location: 'Nowhere', interests: [] }
  render(<RightSidebar wordCount={10} charCount={100} readingTime={2} selectedMatch={selectedMatch} anonymousHandle={'Anon'} />)

  expect(screen.getByText('Alice Example')).toBeInTheDocument()
  expect(screen.getByText('Anon')).toBeInTheDocument()
})

test('send button calls onSend and respects sending/sendDisabled states', () => {
  const onSend = jest.fn()
  const { rerender } = render(<RightSidebar wordCount={0} charCount={0} readingTime={0} onSend={onSend} sendDisabled={false} sending={false} />)

  // clicking when enabled should call onSend
  const sendBtn = screen.getByRole('button', { name: /Send Letter/i })
  fireEvent.click(sendBtn)
  expect(onSend).toHaveBeenCalledTimes(2)

  // when sending=true, button shows 'Sending...' and is disabled
  rerender(<RightSidebar wordCount={0} charCount={0} readingTime={0} onSend={onSend} sendDisabled={false} sending={true} />)
  expect(screen.getByRole('button', { name: /Sending/i })).toBeDisabled()

  // when sendDisabled=true, button is disabled
  rerender(<RightSidebar wordCount={0} charCount={0} readingTime={0} onSend={onSend} sendDisabled={true} sending={false} />)
  expect(screen.getByRole('button', { name: /Send Letter/i })).toBeDisabled()
})

test('ReadabilityRating shows dialog and handles N/A', async () => {
  // explicit value shows the value
  const { findByText } = render(<ReadabilityRating value={'B1'} />)
  expect(screen.getByText('B1')).toBeInTheDocument()

  const infoBtn = screen.getByLabelText('Show readability details')
  fireEvent.click(infoBtn)
  expect(await findByText('Readability Rating (CEFR)')).toBeInTheDocument()

  // 0 or falsy value displays N/A
  const { getByText: getByText2 } = render(<ReadabilityRating value={0} />)
  expect(getByText2('N/A')).toBeInTheDocument()
})

// test('templates overlay renders and callbacks call setTemplatesOpen and onSelectTemplate', () => {
//   const onSelectTemplate = jest.fn()
//   const setTemplatesOpen = jest.fn()
//   render(
//     <RightSidebar
//       wordCount={1}
//       charCount={1}
//       readingTime={1}
//       templatesOpen={true}
//       setTemplatesOpen={setTemplatesOpen}
//       onSelectTemplate={onSelectTemplate}
//     />
//   )

//   // TemplateSidePanel header should be present
//   expect(screen.getByText('Templates')).toBeInTheDocument()

//   // Clicking the TemplateSidePanel close button should call setTemplatesOpen(false)
//   const closeBtn = screen.getByLabelText('Close templates')
//   fireEvent.click(closeBtn)
//   expect(setTemplatesOpen).toHaveBeenCalledWith(false)

//   // Clear mocks then click Clear Template in the same render
//   setTemplatesOpen.mockClear()
//   onSelectTemplate.mockClear()
//   const clearBtn = screen.getByText('Clear Template')
//   fireEvent.click(clearBtn)
//   expect(onSelectTemplate).toHaveBeenCalledWith(null)
//   expect(setTemplatesOpen).toHaveBeenCalledWith(false)
// })

// test('clicking Preview in templates triggers onPreviewTemplate pass-through', () => {
//   const onPreviewTemplate = jest.fn()
//   render(
//     <RightSidebar
//       wordCount={1}
//       charCount={1}
//       readingTime={1}
//       templatesOpen={true}
//       setTemplatesOpen={() => {}}
//       onPreviewTemplate={onPreviewTemplate}
//     />
//   )

//   const previewBtn = screen.getByText('Preview')
//   fireEvent.click(previewBtn)
//   expect(onPreviewTemplate).toHaveBeenCalledWith('TEMPLATE_ID')
// })

// test('templates overlay exercises default callbacks when props omitted (no errors)', () => {
//   // Render without onSelectTemplate/onPreviewTemplate/setTemplatesOpen so defaults run
//   render(
//     <RightSidebar
//       wordCount={1}
//       charCount={1}
//       readingTime={1}
//       templatesOpen={true}
//     />
//   )

//   // Mock TemplateSidePanel exposes Clear Template, Preview and Close buttons
//   const clearBtn = screen.getByText('Clear Template')
//   fireEvent.click(clearBtn)

//   const previewBtn2 = screen.getByText('Preview')
//   fireEvent.click(previewBtn2)

//   const closeBtn2 = screen.getByLabelText('Close templates')
//   fireEvent.click(closeBtn2)
//   // If no exceptions thrown we're exercising the inline default callbacks
//   expect(screen.getByText('Templates')).toBeInTheDocument()
// })

test('send button inline handler runs safely when no onSend provided', () => {
  render(<RightSidebar wordCount={0} charCount={0} readingTime={0} sendDisabled={false} sending={false} />)
  const sendBtn = screen.getByRole('button', { name: /Send Letter/i })
  fireEvent.click(sendBtn)
  // button exists and click did not throw
  expect(sendBtn).toBeInTheDocument()
})

test('shows Recipient and You when no selectedMatch and anonymousHandle empty', () => {
  render(<RightSidebar wordCount={0} charCount={0} readingTime={0} selectedMatch={null} anonymousHandle={''} />)
  expect(screen.getByText('Recipient')).toBeInTheDocument()
  expect(screen.getByText('You')).toBeInTheDocument()
})

test('formats charCount with locale string and displays string readingTime as-is', () => {
  render(<RightSidebar wordCount={0} charCount={12345} readingTime={'2 min'} selectedMatch={null} />)
  // formatted characters (allow commas or non-breaking spaces depending on locale)
  const charsNode = screen.getByText(content => content.replace(/\D/g, '') === '12345')
  expect(charsNode).toBeInTheDocument()
  // readingTime string rendered directly
  expect(screen.getByText('2 min')).toBeInTheDocument()
})

test('applies font preset styles (lineHeight and letterSpacing) from FONT_PRESETS', () => {
  // 'handwritten' preset includes lineHeight and letterSpacing
  const selectedMatch = { id: 'm1', name: 'Font User', location: '', interests: [] }
  const { getByText } = render(<RightSidebar wordCount={0} charCount={0} readingTime={0} selectedMatch={selectedMatch} fontStyle={'handwritten'} />)
  const toName = getByText('Font User')
  // style should include the preset lineHeight and letterSpacing
  expect(toName.style.lineHeight).toBe('1.6')
  expect(toName.style.letterSpacing).toBe('0.05em')
})

test('falls back to DEFAULT_FONT_ID when fontStyle not found', () => {
  const selectedMatch = { id: 'm1', name: 'Fallback User', location: '', interests: [] }
  const { getByText } = render(<RightSidebar wordCount={0} charCount={0} readingTime={0} selectedMatch={selectedMatch} fontStyle={'no-such-font'} />)
  const name = getByText('Fallback User')
  // When fontStyle not found, no styles are applied
  expect(name.style.lineHeight).toBe('')
  expect(name.style.letterSpacing).toBe('')
})
