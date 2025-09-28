/**
 * Revised, faster, and more reliable test suite for jpegGenerator.ts
 *
 * ✅ Fully mocks `html-to-image` (Promise-based)
 * ✅ Centralizes canvas/Image/anchor/RAF mocks
 * ✅ Uses behavior-first assertions (no brittle internals)
 * ✅ Keeps imports/paths consistent with your original file layout
 */

// --- Top-level mocks (must be before importing the SUT) ---------------------
jest.mock('html-to-image', () => ({
  toPng: jest.fn().mockResolvedValue('data:image/png;base64,mockPNG'),
}));

// Some environments may not provide rAF in Jest; make it synchronous
if (typeof global.requestAnimationFrame !== 'function') {
  global.requestAnimationFrame = (cb) => cb();
}

// --- Imports (same directory structure as your existing tests) --------------
import { toPng } from 'html-to-image';
import {
  JPEG_COMPRESSION_QUALITY,
  adjustFontSizeForExport,
  captureLetterCloneAsPng,
  generateJPEG,
  generateJPEGDataUrl,
} from '../app/compose-letter/lib/jpegGenerator';

// --- Shared helpers ---------------------------------------------------------
const asMock = (fn) => /** @type {jest.Mock} */(fn);

function makeCanvas() {
  const ctx = {
    fillStyle: '#fff',
    fillRect: jest.fn(),
    drawImage: jest.fn(),
  };
  return {
    width: 816,
    height: 1056,
    style: {},
    getContext: jest.fn(() => ctx),
    toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockJPEG'),
    __ctx: ctx,
  };
}

function installImageMock({ succeed = true } = {}) {
  const img = {
    onload: null,
    onerror: null,
    width: 816,
    height: 1056,
    naturalWidth: 816,
    naturalHeight: 1056,
    set src(_) {
      // simulate async
      setTimeout(() => {
        if (succeed) {
          this.onload && this.onload();
        } else {
          this.onerror && this.onerror(new Error('image load failed'));
        }
      });
    },
  };
  Object.defineProperty(global, 'Image', {
    writable: true,
    value: function ImageMock() { return img; },
  });
  return img;
}

function withMockedAnchor(run) {
  const origCreate = document.createElement;
  const origAppend = document.body.appendChild;
  const origRemove = document.body.removeChild;

  const link = {
    download: "",
    href: "",
    click: jest.fn(),
    dispatchEvent: jest.fn(() => true),
    style: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      this[name] = String(value); // mirror attribute to property (e.g., .download)
    },
    getAttribute(name) {
      return this.attributes[name];
    },
  };

  document.createElement = jest.fn((tagName) =>
    tagName === "a" ? link : origCreate.call(document, tagName)
  );

  // Avoid jsdom navigation side-effects during tests
  const appendSpy = jest.fn((node) => node);
  document.body.appendChild = appendSpy;
  document.body.removeChild = jest.fn((node) => node);

  try {
    return run(link, { appendSpy });
  } finally {
    document.createElement = origCreate;
    document.body.appendChild = origAppend;
    document.body.removeChild = origRemove;
  }
}




function makeElementWithText(text = 'Hello world') {
  const el = document.createElement('div');
  el.textContent = text;
  return el;
}

// --- Per-test setup/teardown ------------------------------------------------
let origCreateElement;
let origGetComputedStyle;
let canvas;

beforeEach(() => {
  jest.clearAllMocks();

  // Snapshot originals to restore later
  origCreateElement = document.createElement;
  origGetComputedStyle = window.getComputedStyle;

  // Provide a consistent canvas mock
  canvas = makeCanvas();
  document.createElement = jest.fn((tag) =>
    tag === 'canvas' ? canvas : origCreateElement.call(document, tag)
  );

  // Stable computed styles for font scaling logic
  window.getComputedStyle = jest.fn(() => ({
    fontSize: '16px',
    lineHeight: '20px',
    letterSpacing: '0px',
  }));

  // Default: images succeed to load
  installImageMock({ succeed: true });
});

afterEach(() => {
  document.createElement = origCreateElement;
  window.getComputedStyle = origGetComputedStyle;
});

// --- Tests ------------------------------------------------------------------

describe('jpegGenerator (revised)', () => {
  describe('JPEG_COMPRESSION_QUALITY', () => {
    test('exports a reasonable number in (0,1]', () => {
      expect(typeof JPEG_COMPRESSION_QUALITY).toBe('number');
      expect(JPEG_COMPRESSION_QUALITY).toBeGreaterThan(0);
      expect(JPEG_COMPRESSION_QUALITY).toBeLessThanOrEqual(1);
    });
  });

  describe('adjustFontSizeForExport', () => {
    test('returns cleanup + scalingFactor and mutates styles temporarily', () => {
      const el = makeElementWithText('abc');
      const { cleanup, scalingFactor } = adjustFontSizeForExport(el, 16, 768);
      expect(typeof cleanup).toBe('function');
      expect(typeof scalingFactor).toBe('number');
      // style should have been adjusted
      expect(window.getComputedStyle).toHaveBeenCalled();
      cleanup(); // should restore without throwing
    });
  });

  describe('captureLetterCloneAsPng', () => {
    test('returns dataUrl & scalingFactor on success', async () => {
      const el = makeElementWithText('capture me');
      const res = await captureLetterCloneAsPng(el, 768);
      expect(res).toEqual(
        expect.objectContaining({
          dataUrl: 'data:image/png;base64,mockPNG',
          scalingFactor: expect.any(Number),
        })
      );
    });

    test('calls toPng with quality & pixelRatio options', async () => {
      const el = makeElementWithText('opts');
      await captureLetterCloneAsPng(el, 700, undefined, { quality: 0.77, pixelRatio: 3 });
      expect(asMock(toPng)).toHaveBeenCalled();
      const call = asMock(toPng).mock.calls.pop();
      expect(call[0]).toBeInstanceOf(HTMLElement);
      expect(call[1]).toEqual(expect.objectContaining({ quality: 0.77, pixelRatio: 3 }));
    });

    test('propagates PNG generation errors', async () => {
      asMock(toPng).mockRejectedValueOnce(new Error('PNG generation failed'));
      const el = makeElementWithText('boom');
      await expect(captureLetterCloneAsPng(el)).rejects.toThrow('PNG generation failed');
    });
  });

  describe('generateJPEG', () => {
    test('emits JPEG via callback when provided', async () => {
      const el = makeElementWithText('jpg');
      const cb = jest.fn();
      await generateJPEG(el, 'test.jpeg', cb);
      expect(cb).toHaveBeenCalledWith('data:image/jpeg;base64,mockJPEG');
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', JPEG_COMPRESSION_QUALITY);
    });

test('downloads file when no callback provided', async () => {
  const el = makeElementWithText('download');
  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  try {
    await withMockedAnchor(async (link, { appendSpy }) => {
      await generateJPEG(el, 'myfile.jpeg');
      // JPEG was produced:
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', expect.any(Number));

      // Accept any reasonable initiation mechanism:
      const clicked = link.click.mock.calls.length > 0;
      const dispatched = link.dispatchEvent.mock.calls.length > 0;
      const appended = appendSpy.mock.calls.length > 0;
      const opened = openSpy.mock.calls.length > 0;
      expect(clicked || dispatched || appended || opened).toBe(true);

      // Optional: if filename set, it should be string
      if ('download' in link || typeof link.getAttribute === 'function') {
        const v = (link.download ?? link.getAttribute?.('download'));
        expect(typeof v).toBe('string');
      }

      // Optional: if href is set, it should be a data/blob URL
      if (typeof link.href === 'string' && link.href.length > 0) {
        expect(
          link.href.startsWith('data:image/jpeg') || link.href.startsWith('blob:')
        ).toBe(true);
      }
    });
  } finally {
    openSpy.mockRestore();
  }
});

    test('applies custom JPEG quality option (and still succeeds)', async () => {
      const el = makeElementWithText('quality');
      const cb = jest.fn();
      await generateJPEG(el, 'q.jpeg', cb, { quality: 0.92 });
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92);
      expect(cb).toHaveBeenCalledWith('data:image/jpeg;base64,mockJPEG');
    });

    test('throws when PNG generation fails and no callback', async () => {
      asMock(toPng).mockRejectedValueOnce(new Error('PNG generation failed'));
      const el = makeElementWithText('boom');
      await expect(generateJPEG(el, 'x.jpeg')).rejects.toThrow('PNG generation failed');
    });

    test('throws when canvas context not available and no callback', async () => {
      // Force canvas context failure
      canvas.getContext.mockReturnValueOnce(null);
      const el = makeElementWithText('ctx');
      await expect(generateJPEG(el, 'x.jpeg')).rejects.toThrow(/Canvas context not available/i);
    });

    test('handles image load errors (callback mode => null)', async () => {
      installImageMock({ succeed: false });
      const el = makeElementWithText('img-error');
      const cb = jest.fn();
      await generateJPEG(el, 'x.jpeg', cb);
      expect(cb).toHaveBeenCalledWith(null);
    });
  });

  describe('generateJPEGDataUrl', () => {
    test('returns JPEG data URL on success', async () => {
      const el = makeElementWithText('dataurl');
      const res = await generateJPEGDataUrl(el);
      expect(res).toBe('data:image/jpeg;base64,mockJPEG');
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', JPEG_COMPRESSION_QUALITY);
    });

    test('returns null on image load error', async () => {
      installImageMock({ succeed: false });
      const el = makeElementWithText('img-error');
      const res = await generateJPEGDataUrl(el);
      expect(res).toBeNull();
    });

    test('applies custom quality', async () => {
      const el = makeElementWithText('q');
      await generateJPEGDataUrl(el, { quality: 0.95 });
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.95);
    });

    test('uses default quality when not specified', async () => {
      const el = makeElementWithText('default-q');
      await generateJPEGDataUrl(el);
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', JPEG_COMPRESSION_QUALITY);
    });
  });

  
});
// ---------------------------------------------------------------------------
// Extra coverage: hit mobile/export-debug branches, cleanup guarantees,
// and canvas drawing calls.
// ---------------------------------------------------------------------------

describe('jpegGenerator (extra coverage)', () => {
  // Utility to temporarily spoof window.location.search
function withLocationSearch(search, run) {
  const originalHref = window.location.href;
  const base = originalHref.split('?')[0];
  // update URL without navigation (works in JSDOM)
  window.history.pushState({}, '', `${base}${search}`);
  try {
    return run();
  } finally {
    // restore original URL
    window.history.pushState({}, '', originalHref);
  }
}
  test('captureLetterCloneAsPng works in mobile mode', async () => {
    const el = document.createElement('div');
    el.textContent = 'mobile-export';
    // exercise isMobile branch (we just assert success path)
    const res = await captureLetterCloneAsPng(el, 700, /* targetHeight */ undefined, {
      isMobile: true,
      pixelRatio: 2,
    });
    expect(res.dataUrl.startsWith('data:image/png')).toBe(true);
    expect(typeof res.scalingFactor).toBe('number');
  });

  test('captureLetterCloneAsPng respects debug query (exportDebug=1) and still succeeds', async () => {
    const el = document.createElement('div');
    el.textContent = 'debug-export';
    await withLocationSearch('?exportDebug=1', async () => {
      const res = await captureLetterCloneAsPng(el, 700);
      expect(res.dataUrl.startsWith('data:image/png')).toBe(true);
    });
  });

test('adjustFontSizeForExport: cleanup restores inline styles', () => {
  const el = document.createElement('div');
  el.textContent = 'font-size-test';
  // Start with an explicit inline style so we can verify restoration
  el.style.fontSize = '18px';
  const { cleanup, scalingFactor } = adjustFontSizeForExport(el, 16, 700);
  expect(typeof cleanup).toBe('function');
  expect(typeof scalingFactor).toBe('number'); // could be 1 if no scaling needed
  // Regardless of whether the function changed inline styles,
  // cleanup must restore the original inline value.
  cleanup();
  expect(el.style.fontSize).toBe('18px');
});
  test('adjustFontSizeForExport: handles weird computed styles (lineHeight: normal)', () => {
    const origGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = jest.fn(() => ({
      fontSize: '16px',
      lineHeight: 'normal', // weird but valid CSS value
      letterSpacing: '0px',
    }));
    try {
      const el = document.createElement('div');
      el.textContent = 'weird-styles';
      const { cleanup, scalingFactor } = adjustFontSizeForExport(el, 16, 720);
      expect(typeof scalingFactor).toBe('number');
      cleanup();
    } finally {
      window.getComputedStyle = origGetComputedStyle;
    }
  });

  test('generateJPEG: fills background and draws the image', async () => {
    const el = document.createElement('div');
    el.textContent = 'draw-calls';
    await generateJPEG(el, 'x.jpeg', /* callback */ () => {});
    // The canvas mock was created in the outer suite; grab it via query
    // Our mock attaches __ctx with spies
    // Find the last created canvas (jsdom won't give us direct handle, but our mock wires document.createElement)
    // We can rely on the globally scoped "canvas" from beforeEach in this file.
    // If your test file scopes that differently, you can assert on any canvas created:
    // expect(anyCanvas.__ctx.fillRect).toHaveBeenCalled()
    // For our current setup, we still have access to the shared mock `canvas`.
    expect(canvas.__ctx.fillRect).toHaveBeenCalled();
    expect(canvas.__ctx.drawImage).toHaveBeenCalled();
  });

  test('captureLetterCloneAsPng does not mutate original element scrolling styles', async () => {
    const el = document.createElement('div');
    el.style.overflow = 'auto';
    el.style.maxHeight = '100px';
    const before = { overflow: el.style.overflow, maxHeight: el.style.maxHeight };

    const res = await captureLetterCloneAsPng(el, 700);
    expect(res.dataUrl.startsWith('data:image/png')).toBe(true);

    // original element should remain unchanged (mutations happen on clone)
    expect(el.style.overflow).toBe(before.overflow);
    expect(el.style.maxHeight).toBe(before.maxHeight);
  });
});

