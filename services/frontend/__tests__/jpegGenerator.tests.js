import React from 'react';
import { render } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock html-to-image before any imports
jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => 'data:image/png;base64,mockPNG'),
}));

// Mock DOM APIs
const mockGetComputedStyle = jest.fn();
const mockCreateElement = jest.fn();
const mockCloneNode = jest.fn();
const mockQuerySelectorAll = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockRequestAnimationFrame = jest.fn();

Object.defineProperty(window, 'getComputedStyle', {
  value: mockGetComputedStyle,
});

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(window, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
});

// Define mockImage at top level
const mockImage = {
  src: '',
  onload: null,
  onerror: null,
  width: 800,
  height: 600,
};

// Mock Image constructor globally
global.Image = jest.fn().mockImplementation(() => {
  const img = {
    _pendingOnload: false,
    _onload: null,
    _src: '',
    width: 800,
    height: 600,
  };
  
  Object.defineProperty(img, 'onload', {
    set(value) {
      img._onload = value;
      // If src is already set, trigger onload synchronously for testing
      if (img._src && value) {
        value();
      }
    },
    get() {
      return img._onload;
    }
  });
  
  Object.defineProperty(img, 'src', {
    set(value) {
      img._src = value;
      img._pendingOnload = true;
      if (img._onload) {
        img._onload();
      }
    },
    get() {
      return img._src;
    }
  });
  
  return img;
});

// Mock canvas and context globally
const mockCanvas = {
  width: 816,
  height: 1056,
  getContext: jest.fn(),
  toDataURL: jest.fn().mockReturnValue('data:image/jpeg;base64,mockJPEG'),
  style: {},
};

const mockCanvasContext = {
  fillStyle: '',
  fillRect: jest.fn(),
  drawImage: jest.fn(),
};

mockCanvas.getContext.mockReturnValue(mockCanvasContext);

// Update createElement mock to return canvas
const originalCreateElement = mockCreateElement;
mockCreateElement.mockImplementation((tag) => {
  if (tag === 'canvas') return mockCanvas;
  return originalCreateElement(tag);
});

// Import after mocks
import { toPng } from 'html-to-image';
import {
  JPEG_COMPRESSION_QUALITY,
  adjustFontSizeForExport,
  generateJPEG,
  generateJPEGDataUrl,
  captureLetterCloneAsPng,
} from '../app/compose-letter/lib/jpegGenerator';

describe('jpegGenerator', () => {
  beforeAll(() => {
    // Don't use fake timers for these tests as they interfere with async Image loading
    // jest.useFakeTimers();
  });

  afterAll(() => {
    // jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-set global Image mock after clearing
    global.Image = jest.fn().mockImplementation(() => {
      const img = {
        _pendingOnload: false,
        _onload: null,
        _src: '',
        width: 800,
        height: 600,
      };
      
      Object.defineProperty(img, 'onload', {
        set(value) {
          img._onload = value;
          // If src is already set, trigger onload synchronously for testing
          if (img._src && value) {
            value();
          }
        },
        get() {
          return img._onload;
        }
      });
      
      Object.defineProperty(img, 'src', {
        set(value) {
          img._src = value;
          img._pendingOnload = true;
          if (img._onload) {
            img._onload();
          }
        },
        get() {
          return img._src;
        }
      });
      
      return img;
    });

    // Setup default mocks
    mockGetComputedStyle.mockImplementation((element) => {
      // Handle both mock objects and real DOM elements
      const fontSize = element.style?.fontSize || '16px';
      const lineHeight = element.style?.lineHeight || '20px';
      const letterSpacing = element.style?.letterSpacing || '0px';
      
      const result = {
        fontSize,
        lineHeight,
        letterSpacing,
        getPropertyValue: jest.fn((prop) => {
          switch (prop) {
            case 'font-size': return fontSize;
            case 'line-height': return lineHeight;
            case 'letter-spacing': return letterSpacing;
            default: return '';
          }
        }),
      };
      return result;
    });

    mockCreateElement.mockImplementation((tag) => {
      if (tag === 'canvas') return mockCanvas;
      const element = {
        style: {
          position: '',
          left: '',
          top: '',
          width: '',
          height: '',
          maxHeight: '',
          overflowY: '',
          fontSize: '',
          lineHeight: '',
          letterSpacing: '',
        },
        appendChild: jest.fn(),
        cloneNode: mockCloneNode,
        querySelectorAll: mockQuerySelectorAll,
        offsetWidth: 800,
        offsetHeight: 600,
        scrollHeight: 600,
        tagName: tag.toUpperCase(),
        textContent: tag === 'div' ? 'test content' : '',
        className: '',
        ownerDocument: {
          defaultView: window,
        },
      };
      return element;
    });

    mockCloneNode.mockReturnValue({
      style: {},
      appendChild: jest.fn(),
      querySelectorAll: mockQuerySelectorAll,
      offsetWidth: 800,
      offsetHeight: 600,
      scrollHeight: 600,
      tagName: 'DIV',
      textContent: 'test content',
      className: '',
      ownerDocument: {
        defaultView: window,
      },
    });

    mockQuerySelectorAll.mockReturnValue([]);
    mockRequestAnimationFrame.mockImplementation((cb) => cb());
  });

  describe('JPEG_COMPRESSION_QUALITY', () => {
    test('should export JPEG_COMPRESSION_QUALITY constant', () => {
      expect(JPEG_COMPRESSION_QUALITY).toBeDefined();
      expect(typeof JPEG_COMPRESSION_QUALITY).toBe('number');
      expect(JPEG_COMPRESSION_QUALITY).toBeGreaterThan(0);
      expect(JPEG_COMPRESSION_QUALITY).toBeLessThanOrEqual(1);
    });

    test('should have reasonable compression quality', () => {
      expect(JPEG_COMPRESSION_QUALITY).toBe(0.8);
    });
  });

  describe('adjustFontSizeForExport', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        offsetWidth: 800,
        scrollHeight: 500,
        style: {},
        querySelectorAll: jest.fn().mockReturnValue([]),
      };
    });

    test('should return cleanup function and scaling factor', () => {
      const result = adjustFontSizeForExport(mockElement);

      expect(result).toHaveProperty('cleanup');
      expect(result).toHaveProperty('scalingFactor');
      expect(typeof result.cleanup).toBe('function');
      expect(typeof result.scalingFactor).toBe('number');
    });

    test('should handle elements with text content', () => {
      const textElement = {
        ...mockElement,
        textContent: 'Hello World',
        tagName: 'DIV',
      };

      mockQuerySelectorAll.mockReturnValue([textElement]);

      const result = adjustFontSizeForExport(mockElement);
      expect(result.scalingFactor).toBeGreaterThan(0);
    });

    test('should handle textarea and input elements', () => {
      const textareaElement = {
        ...mockElement,
        tagName: 'TEXTAREA',
        textContent: '',
      };

      mockQuerySelectorAll.mockReturnValue([textareaElement]);

      const result = adjustFontSizeForExport(mockElement);
      expect(result.scalingFactor).toBeGreaterThan(0);
    });

    test('should scale up when content is smaller than target', () => {
      // Create a real DOM element for testing
      const realElement = document.createElement('div');
      // Fix the prototype chain for jsdom
      Object.setPrototypeOf(realElement, HTMLElement.prototype);
      
      realElement.textContent = 'Test content';
      realElement.style.fontSize = '14px';
      realElement.style.lineHeight = '18px';
      realElement.style.letterSpacing = '0px';
      
      // Mock offsetWidth and scrollHeight
      Object.defineProperty(realElement, 'offsetWidth', { value: 800, configurable: true });
      Object.defineProperty(realElement, 'scrollHeight', { value: 400, configurable: true }); // Smaller than target to trigger scaling up

      const result = adjustFontSizeForExport(realElement, 16, 800, true); // Enable debug mode

      // Should scale up when content is smaller than target
      expect(result.scalingFactor).toBeGreaterThan(1);
    });

    test('should scale down when content is larger than target', () => {
      mockElement.scrollHeight = 1400; // Larger than target (1035.29)
      mockElement.offsetWidth = 800;
      mockElement.textContent = 'Test content'; // Make the element itself text-bearing

      // Mock querySelectorAll to return the element itself as a text-bearing element
      mockQuerySelectorAll.mockReturnValue([mockElement]);

      // Mock getComputedStyle to return valid font size
      mockGetComputedStyle.mockReturnValue({
        fontSize: '16px',
        lineHeight: '20px',
        letterSpacing: '0px',
        getPropertyValue: jest.fn((prop) => {
          switch (prop) {
            case 'font-size': return '16px';
            case 'line-height': return '20px';
            case 'letter-spacing': return '0px';
            default: return '';
          }
        }),
      });

      const result = adjustFontSizeForExport(mockElement, 16, 800, true); // Enable debug

      expect(result.scalingFactor).toBeLessThan(1); // Should scale down
    });

    test('should apply font size changes and cleanup properly', () => {
      const textElement = {
        ...mockElement,
        textContent: 'Test',
        tagName: 'DIV',
        style: { fontSize: '', lineHeight: '', letterSpacing: '' },
      };

      mockQuerySelectorAll.mockReturnValue([textElement]);

      const result = adjustFontSizeForExport(mockElement);

      // Check that styles were modified
      expect(textElement.style.fontSize).toBeDefined();

      // Call cleanup
      result.cleanup();

      // Check that styles were restored
      expect(textElement.style.fontSize).toBe('');
    });

    test('should handle debug mode', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Mock URLSearchParams to return debug mode
      const originalURLSearchParams = global.URLSearchParams;
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: jest.fn((key) => key === 'exportDebug' ? '1' : null)
      }));

      // Mock text-bearing elements
      const textElement = {
        tagName: 'DIV',
        textContent: 'Test content',
        style: { fontSize: '', lineHeight: '', letterSpacing: '' },
      };
      mockQuerySelectorAll.mockReturnValue([textElement]);

      // Mock getComputedStyle for the text element
      mockGetComputedStyle.mockImplementation((el) => {
        if (el === textElement) {
          return {
            fontSize: '14px',
            lineHeight: '18px',
            letterSpacing: '0px',
            getPropertyValue: jest.fn((prop) => {
              switch (prop) {
                case 'font-size': return '14px';
                case 'line-height': return '18px';
                case 'letter-spacing': return '0px';
                default: return '';
              }
            }),
          };
        }
        return {
          fontSize: '16px',
          lineHeight: '20px',
          letterSpacing: '0px',
          getPropertyValue: jest.fn((prop) => {
            switch (prop) {
              case 'font-size': return '16px';
              case 'line-height': return '20px';
              case 'letter-spacing': return '0px';
              default: return '';
            }
          }),
        };
      });

      adjustFontSizeForExport(mockElement, 16, 800, true);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      global.URLSearchParams = originalURLSearchParams;
    });

    test('should handle invalid computed styles gracefully', () => {
      mockGetComputedStyle.mockReturnValue({
        fontSize: 'invalid',
        lineHeight: 'invalid',
        letterSpacing: 'invalid',
      });

      expect(() => adjustFontSizeForExport(mockElement)).not.toThrow();
    });

    test('should respect minimum scaling factor', () => {
      mockElement.scrollHeight = 2000; // Much larger than target
      mockElement.offsetWidth = 800;

      const result = adjustFontSizeForExport(mockElement, 16, 800);
      expect(result.scalingFactor).toBeGreaterThanOrEqual(0.35);
    });

    test('should not scale when content height matches target height', () => {
      mockElement.scrollHeight = 1035; // Exactly target height
      mockElement.offsetWidth = 800;
      mockElement.textContent = 'Test content';

      mockQuerySelectorAll.mockReturnValue([mockElement]);

      const result = adjustFontSizeForExport(mockElement, 16, 800, true);

      expect(result.scalingFactor).toBeCloseTo(1, 3);
      expect(result.cleanup).toBeDefined();
    });
  });

  describe('captureLetterCloneAsPng', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        offsetWidth: 800,
        offsetHeight: 600,
        cloneNode: jest.fn((deep = false) => {
          const clone = {
            style: {},
            querySelectorAll: jest.fn().mockReturnValue([]),
            ownerDocument: {
              defaultView: window,
            },
            cloneNode: jest.fn((deep = false) => ({
              style: {},
              querySelectorAll: jest.fn().mockReturnValue([]),
              ownerDocument: {
                defaultView: window,
              },
            })),
            tagName: 'DIV',
            className: '',
            id: '',
            textContent: '',
            innerHTML: '',
            children: [],
            childNodes: []
          };
          return clone;
        }),
        ownerDocument: {
          defaultView: window,
        },
      };
    });

    test('should return dataUrl and scalingFactor', async () => {
      const result = await captureLetterCloneAsPng(mockElement);

      expect(result).toHaveProperty('dataUrl');
      expect(result).toHaveProperty('scalingFactor');
      expect(typeof result.dataUrl).toBe('string');
      expect(typeof result.scalingFactor).toBe('number');
    });

    test('should apply mobile CSS transformations', async () => {
      const mobileElement = {
        ...mockElement,
        cloneNode: jest.fn().mockReturnValue({
          style: {},
          querySelectorAll: jest.fn().mockReturnValue([
            { className: 'sm:w-1/2 md:w-full lg:w-1/3', style: {} }
          ]),
        }),
      };

      await captureLetterCloneAsPng(mobileElement, 768, undefined, { isMobile: true });

      expect(mobileElement.cloneNode).toHaveBeenCalledWith(true);
    });

    test('should remove scrolling constraints', async () => {
      const scrollableElement = {
        style: { maxHeight: '500px', overflowY: 'auto', overflow: 'scroll' },
      };

      const clone = {
        style: {},
        querySelectorAll: jest.fn().mockReturnValue([scrollableElement]),
        ownerDocument: {
          defaultView: window,
        },
      };

      mockElement.cloneNode.mockReturnValue(clone);

      await captureLetterCloneAsPng(mockElement);

      expect(scrollableElement.style.maxHeight).toBe('');
      expect(scrollableElement.style.overflowY).toBe('');
      expect(scrollableElement.style.overflow).toBe('');
    });

    test('should call toPng with correct parameters', async () => {
      await captureLetterCloneAsPng(mockElement, 768, 16, { quality: 0.9, pixelRatio: 2 });

      expect(toPng).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          quality: 0.9,
          pixelRatio: 2,
        })
      );
    });

    test('should handle toPng errors', async () => {
      toPng.mockRejectedValueOnce(new Error('PNG generation failed'));

      await expect(captureLetterCloneAsPng(mockElement)).rejects.toThrow('PNG generation failed');
    });
  });

  describe('generateJPEG', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        offsetWidth: 800,
        offsetHeight: 600,
        cloneNode: jest.fn().mockReturnValue({
          style: {},
          querySelectorAll: jest.fn().mockReturnValue([]),
          ownerDocument: {
            defaultView: window,
          },
          cloneNode: jest.fn().mockReturnValue({
            style: {},
            querySelectorAll: jest.fn().mockReturnValue([]),
            ownerDocument: {
              defaultView: window,
            },
            cloneNode: jest.fn().mockReturnValue({
              style: {},
              querySelectorAll: jest.fn().mockReturnValue([]),
              ownerDocument: {
                defaultView: window,
              },
            }),
          }),
        }),
        ownerDocument: {
          defaultView: window,
        },
      };

      // Reset canvas mocks
      mockCanvas.getContext.mockReturnValue(mockCanvasContext);
      mockCanvas.toDataURL.mockReturnValue('data:image/jpeg;base64,mockJPEG');
      mockCanvasContext.fillRect.mockClear();
      mockCanvasContext.drawImage.mockClear();
    });

    test('should generate JPEG and call callback when provided', async () => {
      const callback = jest.fn();

      await generateJPEG(mockElement, 'test.jpeg', callback);

      expect(callback).toHaveBeenCalledWith('data:image/jpeg;base64,mockJPEG');
    });

    test('should download file when no callback provided', async () => {
      const linkMock = { download: '', href: '', click: jest.fn() };
      const originalImpl = mockCreateElement.getMockImplementation();
      mockCreateElement.mockImplementation((tag) => {
        if (tag === 'a') return linkMock;
        return originalImpl(tag);
      });

      await generateJPEG(mockElement, 'test.jpeg');

      expect(linkMock.download).toBe('test.jpeg');
      expect(linkMock.click).toHaveBeenCalled();

      mockCreateElement.mockImplementation(originalImpl);
    });

    test('should handle image load errors', async () => {
      const callback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock image load failure
      const originalImage = global.Image;
      global.Image = jest.fn().mockImplementation(() => {
        const img = {
          _onload: null,
          _onerror: null,
          _src: '',
          width: 800,
          height: 600,
        };
        
  Object.defineProperty(img, 'onload', {
    set(value) {
      img._onload = value;
      if (img._pendingOnload) {
        value();
      }
    },
    get() {
      return img._onload;
    }
  });        Object.defineProperty(img, 'onerror', {
          set(value) {
            img._onerror = value;
            // If src is already set, trigger onerror asynchronously
            if (img._src && value) {
              process.nextTick(() => value());
            }
          },
          get() {
            return img._onerror;
          }
        });
        
        Object.defineProperty(img, 'src', {
          set(value) {
            img._src = value;
            // If onerror is already set, trigger it asynchronously
            if (img._onerror) {
              process.nextTick(() => img._onerror());
            }
          },
          get() {
            return img._src;
          }
        });
        
        return img;
      });

      await generateJPEG(mockElement, 'test.jpeg', callback);

      expect(callback).toHaveBeenCalledWith(null);

      // Restore original Image mock
      global.Image = originalImage;
      consoleSpy.mockRestore();
    });

    test('should handle canvas context not available', async () => {
      const callback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock canvas.getContext to return null
      mockCanvas.getContext.mockReturnValue(null);

      await generateJPEG(mockElement, 'test.jpeg', callback);

      expect(callback).toHaveBeenCalledWith(null);

      consoleSpy.mockRestore();
    });

    test('should apply custom options', async () => {
      const callback = jest.fn();

      await generateJPEG(mockElement, 'test.jpeg', callback, {
        targetWidth: 1024,
        quality: 0.95,
        pixelRatio: 3,
        isMobile: true,
      });

      expect(callback).toHaveBeenCalledWith('data:image/jpeg;base64,mockJPEG');
    });

    test('should use default JPEG compression quality', async () => {
      const callback = jest.fn();

      await generateJPEG(mockElement, 'test.jpeg', callback);

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', JPEG_COMPRESSION_QUALITY);
    });

    test('should throw error when PNG generation fails and no callback', async () => {
      toPng.mockRejectedValueOnce(new Error('PNG generation failed'));

      await expect(generateJPEG(mockElement, 'test.jpeg')).rejects.toThrow('PNG generation failed');
    });

    test('should throw error when canvas context not available and no callback', async () => {
      mockCanvas.getContext.mockReturnValue(null);

      await expect(generateJPEG(mockElement, 'test.jpeg')).rejects.toThrow('Canvas context not available');
    });
  });

  describe('generateJPEGDataUrl', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        offsetWidth: 800,
        offsetHeight: 600,
        cloneNode: jest.fn().mockReturnValue({
          style: {},
          querySelectorAll: jest.fn().mockReturnValue([]),
          ownerDocument: {
            defaultView: window,
          },
          cloneNode: jest.fn().mockReturnValue({
            style: {},
            querySelectorAll: jest.fn().mockReturnValue([]),
            ownerDocument: {
              defaultView: window,
            },
            cloneNode: jest.fn().mockReturnValue({
              style: {},
              querySelectorAll: jest.fn().mockReturnValue([]),
              ownerDocument: {
                defaultView: window,
              },
            }),
          }),
          tagName: 'DIV',
          className: '',
          id: '',
          textContent: '',
          innerHTML: '<div>Test content</div>',
          children: [],
          childNodes: []
        }),
        ownerDocument: {
          defaultView: window,
        },
      };

      // Reset canvas mocks
      mockCanvas.getContext.mockReturnValue(mockCanvasContext);
      mockCanvas.toDataURL.mockReturnValue('data:image/jpeg;base64,mockJPEG');
      mockCanvasContext.fillRect.mockClear();
      mockCanvasContext.drawImage.mockClear();
    });

    test('should return JPEG data URL on success', async () => {
      const result = await generateJPEGDataUrl(mockElement);

      expect(result).toBe('data:image/jpeg;base64,mockJPEG');
    });

    test('should return null on image load error', async () => {
      global.Image = jest.fn().mockImplementation(() => {
        const img = { ...mockImage, onerror: jest.fn(), _src: '' };
        Object.defineProperty(img, 'src', {
          set(value) {
            img._src = value;
            // Trigger onerror asynchronously
            process.nextTick(() => {
              if (img.onerror) {
                img.onerror();
              }
            });
          },
          get() {
            return img._src;
          }
        });
        return img;
      });

      const result = await generateJPEGDataUrl(mockElement);

      expect(result).toBeNull();
    });

    test('should return null when canvas context not available', async () => {
      mockCanvas.getContext.mockReturnValue(null);

      const result = await generateJPEGDataUrl(mockElement);

      expect(result).toBeNull();
    });

    test('should apply custom quality option', async () => {
      await generateJPEGDataUrl(mockElement, { quality: 0.95 });

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.95);
    });

    test('should use default quality when not specified', async () => {
      await generateJPEGDataUrl(mockElement);

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', JPEG_COMPRESSION_QUALITY);
    });
  });
});