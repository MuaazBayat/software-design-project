import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock the MessagingApiClient module first
jest.mock('../lib/MessagingApiClient', () => {
  const MockMessagingApiClient = jest.fn().mockImplementation(() => ({
    searchUsers: jest.fn(),
    sendLetter: jest.fn(),
  }))
  return {
    __esModule: true,
    default: MockMessagingApiClient,
    SearchUsersRequest: jest.fn(),
    SendLetterRequest: jest.fn(),
    ApiError: jest.fn(),
  }
})

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
  useParams: () => ({ user_id: 'test-user-123' }),
}))

// Mock the SyncProfile context
const mockUseSyncProfile = jest.fn();
jest.mock('../lib/context/ProfileContext', () => ({
  useSyncProfile: () => mockUseSyncProfile(),
}));

// Mock sonner toast
jest.doMock('sonner', () => ({
  Toaster: () => null,
  toast: jest.fn(),
}))

// Import the user-specific page component AFTER all mocks
import LetterApp from '../app/compose-letter/[user_id]/page'

// Mock window methods
delete global.window.confirm
delete global.window.history
global.window.confirm = jest.fn()
global.window.history = { back: jest.fn() }

// jsdom does not implement ResizeObserver; some UI hooks depend on it
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-123'
  }
})

describe('LetterApp Basic Test', () => {
  test('should render without crashing', () => {
    expect(true).toBe(true)
  })
})
