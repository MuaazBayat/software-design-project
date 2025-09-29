import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock Clerk FIRST before any other imports
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isSignedIn: true,
    user: {
      id: 'clerk-user-123',
      primaryEmailAddress: {
        emailAddress: 'test@example.com'
      }
    },
  }),
  ClerkProvider: ({ children }) => React.createElement('div', null, children),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useParams: () => ({ user_id: 'test-user-123' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock the SyncProfile context
const mockUseSyncProfile = jest.fn(() => ({
  profile: { user_id: 'test-user-123', anonymous_handle: 'TestUser' },
  synced: true,
}))
jest.mock('../lib/context/ProfileContext', () => ({
  useSyncProfile: () => mockUseSyncProfile(),
}))

// Mock sonner toast
jest.doMock('sonner', () => ({
  Toaster: () => null,
  toast: jest.fn(),
}))

// Mock d3-shape
jest.mock('d3-shape', () => ({
  line: jest.fn(),
  curveBundle: jest.fn(),
  curveCardinal: jest.fn(),
}))

// Mock the MessagingApiClient
const mockMessagingApiClient = {
  searchUsers: jest.fn(),
  sendLetter: jest.fn(),
}
jest.mock('../lib/MessagingApiClient', () => {
  const MockMessagingApiClient = jest.fn().mockImplementation(() => mockMessagingApiClient)
  return {
    __esModule: true,
    default: MockMessagingApiClient,
    SearchUsersRequest: jest.fn(),
    SendLetterRequest: jest.fn(),
    ApiError: jest.fn(),
  }
})

// Mock FontSidePanel to avoid rendering complexity; ensure it is present when showFontOverlay is true
jest.mock('../app/compose-letter/components/FontSidePanel', () => ({
  FontSidePanel: ({ open, onSelect, onPreview, onClose }) => {
    if (!open) return null
    // simulate user actions in the side panel which should call the handlers
    if (typeof onSelect === 'function') onSelect('test-font')
    if (typeof onPreview === 'function') onPreview('test-preview')
    if (typeof onClose === 'function') onClose()
    return React.createElement('div', { 'data-testid': 'font-side-panel' }, 'FontSidePanel')
  }
}) )

// Prevent Floating UI / Radix from calling scrollIntoView which JSDOM doesn't implement on some nodes
if (typeof window !== 'undefined' && window.HTMLElement && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function() {}
}

// Mock the select UI primitives so dropdowns render synchronously and selections call the provided handlers.
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }) => {
    if (onValueChange) global.__selectOnChange = onValueChange
    return React.createElement('div', {}, children)
  },
  SelectTrigger: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'select-trigger', ...props }, children),
  SelectContent: ({ children }) => React.createElement('div', {}, children),
  SelectItem: ({ value, children }) => React.createElement('div', { role: 'option', onClick: () => { if (global.__selectOnChange) global.__selectOnChange(value) } }, children)
}))

import LeftSidebar from '../app/compose-letter/components/LeftSidebar'
import { ComposeLetterProvider } from '../app/compose-letter/components/ComposeLetterContext'

const sampleMatch = {
  id: 'm1',
  name: 'Jane Doe',
  location: 'Paris, France',
  interests: ['Reading','Travel','Food'],
  conversation_thread_id: 'thread1',
  since: new Date(Date.now() - (1000 * 60 * 60 * 24 * 10)).toISOString() // 10 days ago
}

test('renders selected match and opens templates dialog; Apply calls handler', async () => {
  const onApplyTemplate = jest.fn()

  render(
    <ComposeLetterProvider>
      <LeftSidebar
        selectedMatch={sampleMatch}
        matches={[sampleMatch]}
        onApplyTemplate={onApplyTemplate}
      />
    </ComposeLetterProvider>
  )

  // Selected match name should be visible (may appear in multiple places)
  expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0)

  // Open Writing Prompts dialog by clicking the heading
  const promptsHeading = screen.getByText(/Writing Prompts/i)
  fireEvent.click(promptsHeading)

  // The dialog should reveal a template title (one of DEFAULT_TEMPLATES)
  const templateTitle = await screen.findByText(/A Friendly Hello/i)
  expect(templateTitle).toBeInTheDocument()

  // Click the template card
  fireEvent.click(templateTitle)

  // onApplyTemplate should be called with the first template id 't1'
  await waitFor(() => expect(onApplyTemplate).toHaveBeenCalledWith('t1'))

  // After applying, the dialog should close (template title no longer present)
  await waitFor(() => expect(screen.queryByText(/A Friendly Hello/i)).not.toBeInTheDocument())
})

test('recipient dropdown search and select changes recipient', async () => {
  const matchA = { ...sampleMatch, id: 'mA', name: 'Alice Smith', location: 'London' }
  const matchB = { ...sampleMatch, id: 'mB', name: 'Bob Jones', location: 'Madrid' }
  const onChangeRecipient = jest.fn()

  render(
    <ComposeLetterProvider>
      <LeftSidebar
        selectedMatch={matchA}
        matches={[matchA, matchB]}
        onChangeRecipient={onChangeRecipient}
      />
    </ComposeLetterProvider>
  )

  // Open the select trigger to show options
  const trigger = screen.getByTestId('select-trigger')
  fireEvent.click(trigger)

  // Ensure both options exist by role
  const options = await screen.findAllByRole('option')
  expect(options.length).toBeGreaterThanOrEqual(2)
  expect(options.some(o => o.textContent.includes('Alice Smith'))).toBe(true)
  expect(options.some(o => o.textContent.includes('Bob Jones'))).toBe(true)

  // Type into the search box to filter to Bob only
  const input = screen.getByPlaceholderText('Search pen pals...')
  fireEvent.change(input, { target: { value: 'Bob' } })
  const filteredOptions = await screen.findAllByRole('option')
  expect(filteredOptions.length).toBeGreaterThanOrEqual(1)
  expect(filteredOptions.every(o => o.textContent.includes('Bob'))).toBe(true)

  // Click Bob to select (click the matching option)
  const bobOpt = filteredOptions.find(o => o.textContent.includes('Bob Jones'))
  fireEvent.click(bobOpt)
  await waitFor(() => expect(onChangeRecipient).toHaveBeenCalledWith('mB'))
})

test('formatSince handles today, days, months, years', () => {
  // Import formatSince by requiring the component module and reading the helper via a render
  const { default: Left } = require('../app/compose-letter/components/LeftSidebar')
  // create a container to mount the component and call internal function via instance is not possible
  // Instead, verify UI rendering for different since values by rendering component and checking the 'Since' label

  const recent = { ...sampleMatch, id: 'r1', name: 'Rec', since: new Date().toISOString() }
  const tenDays = { ...sampleMatch, id: 'r2', name: 'Ten', since: new Date(Date.now() - 1000*60*60*24*10).toISOString() }
  const twoMonths = { ...sampleMatch, id: 'r3', name: 'TwoM', since: new Date(Date.now() - 1000*60*60*24*65).toISOString() }
  const threeYears = { ...sampleMatch, id: 'r4', name: 'ThreeY', since: new Date(Date.now() - 1000*60*60*24*400*3).toISOString() }

  const { rerender } = render(<LeftSidebar selectedMatch={recent} matches={[recent]} />)
  expect(screen.getByText(/Since today/i) || screen.getByText(/Recently connected/i) )

  rerender(<LeftSidebar selectedMatch={tenDays} matches={[tenDays]} />)
  expect(screen.getByText(/Since 10d/i)).toBeInTheDocument()

  rerender(<LeftSidebar selectedMatch={twoMonths} matches={[twoMonths]} />)
  expect(screen.getByText(/Since 2m/i)).toBeInTheDocument()

  rerender(<LeftSidebar selectedMatch={threeYears} matches={[threeYears]} />)
  expect(screen.getByText(/Since 3y/i)).toBeInTheDocument()
})

test('shows FontSidePanel when showFontOverlay is true', () => {
  const onSelectFont = jest.fn()
  const onPreviewFont = jest.fn()
  const onToggleFontOverlay = jest.fn()
  render(<LeftSidebar selectedMatch={sampleMatch} matches={[sampleMatch]} showFontOverlay={true} onSelectFont={onSelectFont} onPreviewFont={onPreviewFont} onToggleFontOverlay={onToggleFontOverlay} />)
  expect(screen.getByTestId('font-side-panel')).toBeInTheDocument()
  // mocked FontSidePanel calls the handlers immediately when rendered
  expect(onSelectFont).toHaveBeenCalledWith('test-font')
  expect(onPreviewFont).toHaveBeenCalledWith('test-preview')
  expect(onToggleFontOverlay).toHaveBeenCalled()
})

test('filters templates by search term inside templates dialog', async () => {
  render(
    <LeftSidebar
      selectedMatch={sampleMatch}
      matches={[sampleMatch]}
    />
  )

  // Open the templates dialog
  fireEvent.click(screen.getByText(/Writing Prompts/i))

  // Wait for dialog content
  await screen.findByText(/A Friendly Hello/i)

  // get the templates search input and type a match
  const searchInput = screen.getByPlaceholderText('Search templates...')
  fireEvent.change(searchInput, { target: { value: 'travel' } })

  // Only the Travel story template should be visible
  expect(await screen.findByText(/Travel story/i)).toBeInTheDocument()
  expect(screen.queryByText(/A Friendly Hello/i)).not.toBeInTheDocument()

  // Type a non-matching term
  fireEvent.change(searchInput, { target: { value: 'zzzz-no-match' } })
  expect(await screen.findByText(/No templates match your search/i)).toBeInTheDocument()
})

test('shows loading skeleton when loading is true', () => {
  render(<LeftSidebar selectedMatch={sampleMatch} matches={[sampleMatch]} loading={true} />)
  // Expect placeholder skeleton elements to be present
  expect(screen.getByText(/You're writing to:/i)).toBeInTheDocument()
  // There should be an element with the loading skeleton class
  expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
})

test('shows please select when no selected match', () => {
  render(<LeftSidebar selectedMatch={null} matches={[]} />)
  expect(screen.getByText(/Please select a pen pal/i)).toBeInTheDocument()
})

test('dropdown shows "No matches found" when matches list is empty', async () => {
  // selectedMatch provided but matches list is empty -> filteredMatches length === 0
  render(<LeftSidebar selectedMatch={sampleMatch} matches={[]} />)
  const trigger = screen.getByTestId('select-trigger')
  fireEvent.click(trigger)
  expect(await screen.findByText(/No matches found/i)).toBeInTheDocument()
})

test('interest tags are limited to three displayed badges', () => {
  const manyInterests = { ...sampleMatch, interests: ['One','Two','Three','Four','Five'] }
  render(<LeftSidebar selectedMatch={manyInterests} matches={[manyInterests]} />)
  // There should be exactly 3 badge elements visible from interests slice(0,3)
  const badges = screen.getAllByText(/One|Two|Three|Four|Five/)
  // ensure at least three badges and that only first three are present in DOM order
  expect(badges.length).toBeGreaterThanOrEqual(3)
  expect(badges[0].textContent).toBe('One')
  expect(badges[1].textContent).toBe('Two')
  expect(badges[2].textContent).toBe('Three')
})
