// __tests__/integration/jpeg-generator.int.test.tsx
/**
 * Integration tests for app/compose-letter/lib/jpegGenerator.ts
 * - No network calls -> no MSW needed.
 * - We mock `html-to-image` to return a tiny data: URL.
 * - We stub Image + canvas methods so the PNG->JPEG conversion completes.
 */

import '@testing-library/jest-dom';
import { act } from '@testing-library/react';

// <<< UPDATE THIS PATH >>> if your repo structure differs
import {
  generateJPEG,
  generateJPEGDataUrl,
  JPEG_COMPRESSION_QUALITY,
} from 'app/compose-letter/lib/jpegGenerator';

// ---- Stable mocks/stubs for the environment ----

// Mock html-to-image so we don't depend on real canvas/DOM rendering.
const toPngMock = jest.fn(async () => 'data:image/png;base64,MOCKPNG==');
jest.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => (toPngMock as any)(...args),
}));

// Provide a minimal requestAnimationFrame so double-rAF steps resolve instantly
beforeAll(() => {
  if (!('requestAnimationFrame' in global)) {
    // @ts-ignore
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(0), 0) as unknown as number;
    };
  }
});

// Stub Image to auto-fire onload when src is set
class MockImage {
  onload: null | (() => void) = null;
  onerror: null | ((err?: unknown) => void) = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set src(_v: string) {
    // Simulate async decode
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}
beforeEach(() => {
  // @ts-ignore
  global.Image = MockImage;
});

// Spy canvas 2D context + toDataURL so we can assert quality and return a JPEG
let lastToDataURLArgs: unknown[] = [];
const getContextSpy = jest
  .spyOn(HTMLCanvasElement.prototype, 'getContext')
  .mockImplementation(() => {
    // Minimal 2D context mock used by the implementation
    return {
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
  });

const toDataURLSpy = jest
  .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
  .mockImplementation(function (this: HTMLCanvasElement, ...args: any[]) {
    lastToDataURLArgs = args;
    // Always return a valid JPEG data URL
    return 'data:image/jpeg;base64,MOCKJPG==';
  });

afterEach(() => {
  jest.clearAllMocks();
  // Reset URL to avoid leaking ?exportDebug=1 between tests
  window.history.pushState({}, '', window.location.pathname);
});

// Helper to create a reasonable “letter” element for export
function makeLetter(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'letter-root';
  el.style.width = '600px';
  el.style.padding = '16px';
  el.innerHTML = `
    <div style="font-size: 16px; line-height: 1.5">
      <h1>Test Letter</h1>
      <p>Hello world — this will be exported.</p>
    </div>
  `;

  // JSDOM doesn't compute layout. Provide offset* so scaling logic has numbers.
  Object.defineProperty(el, 'offsetWidth', { value: 600, configurable: true });
  Object.defineProperty(el, 'offsetHeight', { value: 800, configurable: true });

  document.body.appendChild(el);
  return el;
}

describe('jpegGenerator integration', () => {
  test('generateJPEGDataUrl returns a JPEG data URL and respects pixelRatio & quality', async () => {
    const letter = makeLetter();

    const pixelRatio = 3;
    const quality = 0.42;

    let result: string | null = null;
    await act(async () => {
      result = await generateJPEGDataUrl(letter, {
        targetWidth: 768,
        pixelRatio,
        quality,
      });
    });

    expect(result).toMatch(/^data:image\/jpeg;base64,/);

    // html-to-image called with our pixelRatio
    expect(toPngMock).toHaveBeenCalledTimes(1);
    const [, toPngOpts] = toPngMock.mock.calls[0];
    expect(toPngOpts).toEqual(expect.objectContaining({ pixelRatio }));

    // Final canvas.toDataURL used JPEG mime and our quality
    expect(toDataURLSpy).toHaveBeenCalled();
    expect(lastToDataURLArgs[0]).toBe('image/jpeg');
    expect(lastToDataURLArgs[1]).toBe(quality);

    letter.remove();
  });

  test('generateJPEG (callback path) invokes the callback, does not trigger a download link', async () => {
    const letter = makeLetter();

    // Spy on *prototype* to avoid recursion and restore afterward
    const originalCreate = Document.prototype.createElement;
    const createSpy = jest
      .spyOn(Document.prototype, 'createElement')
      .mockImplementation(function (this: Document, tagName: any, options?: any) {
        // Delegate to the true original
        return originalCreate.call(this, tagName, options) as any;
      });

    const cb = jest.fn<void, [string | null]>();
    await act(async () => {
      await generateJPEG(letter, 'letter.jpeg', cb, { pixelRatio: 2, quality: 0.5 });
    });

    expect(cb).toHaveBeenCalledTimes(1);
    const dataUrl = cb.mock.calls[0][0];
    expect(typeof dataUrl).toBe('string');
    expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);

    // Ensure we didn't create a download link when callback is supplied
    const createdTags = createSpy.mock.calls.map((c) => String(c[0]).toLowerCase());
    expect(createdTags.includes('a')).toBe(false);

    createSpy.mockRestore();
    letter.remove();
  });

  test('generateJPEG (no callback) creates an <a download> and clicks it', async () => {
    const letter = makeLetter();

    // Intercept <a> creation safely via the prototype; delegate others to the original.
    const originalCreate = Document.prototype.createElement;
    let createdAnchor: HTMLAnchorElement | null = null;

    const createSpy = jest
      .spyOn(Document.prototype, 'createElement')
      .mockImplementation(function (this: Document, tagName: any, options?: any) {
        const el = originalCreate.call(this, tagName, options);
        if (String(tagName).toLowerCase() === 'a') {
          createdAnchor = el as HTMLAnchorElement;
          // Replace click with a spy so we can assert it was invoked
          (createdAnchor as any).click = jest.fn();
        }
        return el as any;
      });

    await act(async () => {
      await generateJPEG(letter, 'my-letter.jpeg', undefined, { quality: 0.75, pixelRatio: 2 });
    });

    // The anchor was created and clicked
    expect(createSpy).toHaveBeenCalledWith('a');
    expect(createdAnchor).not.toBeNull();
    expect((createdAnchor!.click as jest.Mock)).toHaveBeenCalled();

    // Correct attributes
    expect(createdAnchor!.download).toBe('my-letter.jpeg');
    expect(createdAnchor!.href).toMatch(/^data:image\/jpeg;base64,/);

    createSpy.mockRestore();
    letter.remove();
  });

  test('respects ?exportDebug=1 (debug mode) and still succeeds', async () => {
    // Toggle the debug query param via pushState (do NOT spy on window.location)
    window.history.pushState({}, '', `${window.location.pathname}?exportDebug=1`);

    const letter = makeLetter();

    let result: string | null = null;
    await act(async () => {
      result = await generateJPEGDataUrl(letter, { pixelRatio: 2 });
    });

    expect(result).toMatch(/^data:image\/jpeg;base64,/);

    letter.remove();
  });

  test('falls back to default JPEG_COMPRESSION_QUALITY when no quality is provided', async () => {
    const letter = makeLetter();

    await act(async () => {
      await generateJPEGDataUrl(letter, { pixelRatio: 2 });
    });

    expect(toDataURLSpy).toHaveBeenCalled();
    // [mime, encoderOptions]
    expect(lastToDataURLArgs[0]).toBe('image/jpeg');
    expect(lastToDataURLArgs[1]).toBe(JPEG_COMPRESSION_QUALITY);

    letter.remove();
  });
});
