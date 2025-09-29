// services/frontend/jest.setup.js

// Optional: configure or set up a testing framework before each test
// If you are using the fetch API in your components, you might want to mock it
import '@testing-library/jest-dom';
const origError = console.error;
console.error = (...args) => {
  const msg = String(args[0] ?? '');
  // ignore act() warnings and your provider’s expected error logs
  if (
    /not wrapped in act|Warning: An update to/i.test(msg) ||
    /Failed to load presets from localStorage/i.test(msg) ||
    /Failed to save presets to localStorage/i.test(msg)
  ) return;
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