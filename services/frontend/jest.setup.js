// services/frontend/jest.setup.js

// Optional: configure or set up a testing framework before each test
// If you are using the fetch API in your components, you might want to mock it
import '@testing-library/jest-dom';

// Polyfills for Node.js environment (required for MSW)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Import whatwg-fetch to polyfill fetch in jsdom environment
// This is needed for MSW to work in jest-environment-jsdom
import 'whatwg-fetch';

// Mock ResizeObserver for tests (used by some UI libraries)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock BroadcastChannel for tests (used by MSW)
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Mock TransformStream for tests (used by MSW)
global.TransformStream = class TransformStream {
  constructor() {
    this.readable = {};
    this.writable = {};
  }
};

// Disable auth for tests using environment variable
process.env.NEXT_PUBLIC_AUTH_DISABLED = 'true';

// Mock Clerk hooks with jest.fn() so individual tests can override
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(() => ({
    getToken: jest.fn(() => Promise.resolve(null)),
    isLoaded: true,
    isSignedIn: true,
    userId: 'mock-user-id',
  })),
  useUser: jest.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'mock-user-id',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
    },
  })),
  ClerkProvider: ({ children }) => children,
  SignedIn: ({ children }) => children,
  SignedOut: () => null,
}));

// Mock d3-shape to avoid ES module issues
jest.mock('d3-shape', () => ({
  arc: jest.fn(),
  area: jest.fn(),
  line: jest.fn(),
  pie: jest.fn(),
  radialLine: jest.fn(),
  symbol: jest.fn(),
}));

// Mock d3-path to avoid ES module issues
jest.mock('d3-path', () => ({
  path: jest.fn(() => ({
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    closePath: jest.fn(),
    toString: jest.fn(() => ''),
  })),
}));

const origError = console.error;
console.error = (...args) => {
  if (/not wrapped in act/.test(String(args[0]))) return;
  return origError(...args);
};
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

// // --- Optional: light mock for App Router bits if your components call them ---
// jest.mock('next/navigation', () => {
//   // Minimal stub for useRouter() in App Router
//   return {
//     useRouter: () => ({
//       push: jest.fn(),
//       replace: jest.fn(),
//       back: jest.fn(),
//       forward: jest.fn(),
//       prefetch: jest.fn(),
//     }),
//     usePathname: () => '/',
//     useSearchParams: () => ({
//       get: () => null,
//       toString: () => '',
//     }),
//   };
// });