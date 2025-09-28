import '@testing-library/jest-dom';
import 'whatwg-fetch';
import path from 'node:path';
import dotenv from 'dotenv';


// Point at your frontend-root env file (pick one)
const ENV_PATH = path.resolve(__dirname, '../../.env.local'); // or '.env.test'
dotenv.config({ path: ENV_PATH });

// Provide a default if the key isn’t present
if (!process.env.NEXT_PUBLIC_CORE_API_BASE_URL) {
  process.env.NEXT_PUBLIC_CORE_API_BASE_URL = '';
}
// ---- POLYFILLS (must run BEFORE requiring the MSW server) ----

// 1) TextEncoder/TextDecoder (needed by @mswjs/interceptors)
import { TextEncoder, TextDecoder } from 'node:util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as unknown as typeof window.TextDecoder;
(global as any).BroadcastChannel ??= require('worker_threads').BroadcastChannel;
// 2) WHATWG Streams (fixes "TransformStream is not defined" and friends)
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
if (!(global as any).ReadableStream) (global as any).ReadableStream = ReadableStream;
if (!(global as any).WritableStream) (global as any).WritableStream = WritableStream;
if (!(global as any).TransformStream) (global as any).TransformStream = TransformStream;

// 3) WebCrypto (Clerk/Next sometimes need this)
import { webcrypto } from 'node:crypto';
if (!(global as any).crypto) (global as any).crypto = webcrypto as unknown as Crypto;

// 4) Helpful DOM shims for jsdom (optional but common)
if (!window.matchMedia) {
  (window as any).matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
class MockResizeObserver { observe(){} unobserve(){} disconnect(){} }
if (!(global as any).ResizeObserver) (global as any).ResizeObserver = MockResizeObserver as any;
class MockIntersectionObserver { observe(){} unobserve(){} disconnect(){} takeRecords(){return[]} root=null; rootMargin=''; thresholds=[] }
if (!(global as any).IntersectionObserver) (global as any).IntersectionObserver = MockIntersectionObserver as any;

// ---- NOW import MSW (it will see the globals above) ----
const { server } = require('./msw/server');
const { resetDb } = require('./msw/handlers');
const { resetModerationDb } = require('./msw/moderation-handler');
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); resetDb();resetModerationDb();  });
afterAll(() => server.close());

// (Optional) Next.js App Router stubs
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), forward: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: () => null, toString: () => '' }),
}));
