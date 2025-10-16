import { toPng } from 'html-to-image';

// Global JPEG compression quality - lower values = more compression = smaller files
// Range: 0.0 (maximum compression, lowest quality) to 1.0 (minimum compression, highest quality)
export const JPEG_COMPRESSION_QUALITY = 0.8; // Current: 70% quality - good balance of size vs quality

export interface JPEGGeneratorOptions {
  targetWidth?: number;
  quality?: number;
  pixelRatio?: number;
  desiredFontSize?: number;
  isMobile?: boolean;
}

export interface JPEGResult {
  dataUrl: string;
  scalingFactor: number;
}

/**
 * Adjusts font sizes for export to better fill the US-letter aspect ratio.
 * Returns a cleanup function and the scaling factor applied.
 */
export const adjustFontSizeForExport = (
  element: HTMLElement,
  desiredFontSize?: number,
  targetWidth?: number,
  debug = false
): { cleanup: () => void; scalingFactor: number } => {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const debugMode = urlParams ? urlParams.get('exportDebug') === '1' : debug;

  const originalFontSizes = new Map<HTMLElement, {
    original: string;
    computed: string;
    originalLineHeight?: string;
    originalLetterSpacing?: string;
    computedLineHeight?: string;
    computedLetterSpacing?: string;
  }>();

  // Collect only text-bearing elements
  const candidates: HTMLElement[] = [];
  if (element instanceof HTMLElement) candidates.push(element);
  element.querySelectorAll('*').forEach((n) => {
    if (n instanceof HTMLElement) candidates.push(n);
  });

  const textBearing = candidates.filter((el) => {
    try {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true;
      const txt = el.textContent || '';
      return txt.trim().length > 0;
    } catch {
      return false;
    }
  });

  textBearing.forEach((el) => {
    try {
      const cs = window.getComputedStyle(el);
      originalFontSizes.set(el, {
        original: el.style.fontSize,
        computed: cs.fontSize,
        originalLineHeight: el.style.lineHeight,
        originalLetterSpacing: el.style.letterSpacing,
        computedLineHeight: cs.lineHeight,
        computedLetterSpacing: cs.letterSpacing,
      });
    } catch {
      // ignore unreadable elements
    }
  });

  const US_LETTER_ASPECT_RATIO = 11 / 8.5;
  const targetHeight = (targetWidth ?? element.offsetWidth) * US_LETTER_ASPECT_RATIO;
  const currentHeight = element.scrollHeight;

  const baseScalingFactor = targetHeight / currentHeight;

  if (debugMode) console.debug('[adjustFontSizeForExport] baseScalingFactor', baseScalingFactor, 'currentHeight', currentHeight, 'targetHeight', targetHeight);

  let finalScalingFactor = 1;

  if (baseScalingFactor < 1) {
    // Shrink: content is larger than target, reduce font sizes
    const computedSizes: number[] = [];
    for (const styles of originalFontSizes.values()) {
      const n = parseFloat(styles.computed || '0');
      if (!isNaN(n) && n > 0) computedSizes.push(n);
    }
    const avgComputed = computedSizes.length ? (computedSizes.reduce((a, b) => a + b, 0) / computedSizes.length) : 0;

    let boost = 1;
    if (avgComputed > 0 && avgComputed < 14) {
      boost = 1 + ((14 - avgComputed) / 14) * 0.6;
    } else if (avgComputed >= 14 && avgComputed < 18) {
      boost = 1 + ((18 - avgComputed) / 18) * 0.15;
    }

    const maxComputed = computedSizes.length ? Math.max(...computedSizes) : 16;
    const minAllowedFactor = Math.max(0.35, 10 / Math.max(1, maxComputed));

    finalScalingFactor = baseScalingFactor * boost;
    finalScalingFactor = Math.min(finalScalingFactor, 10);

    if (debugMode) console.debug('[adjustFontSizeForExport] baseScalingFactor, boost, avgComputed', baseScalingFactor, boost, avgComputed);

    let candidate = Math.min(baseScalingFactor, finalScalingFactor);

    const applyFactor = (factor: number) => {
      for (const [el, styles] of originalFontSizes.entries()) {
        const computedSize = parseFloat(styles.computed || '0');
        if (!isNaN(computedSize) && computedSize > 0) {
          const newFont = computedSize * factor;
          el.style.fontSize = `${newFont}px`;

          let compLH = parseFloat(styles.computedLineHeight || '0');
          if (isNaN(compLH) || compLH === 0) compLH = computedSize * 1.25;
          const minLH = Math.max(newFont * 1.18, compLH * 0.9);
          const newLH = Math.max(compLH * factor, minLH);
          try { el.style.lineHeight = `${newLH}px`; } catch {}

          const compLS = parseFloat(styles.computedLetterSpacing || '0');
          if (!isNaN(compLS)) {
            const newLS = compLS * factor;
            try { el.style.letterSpacing = `${Math.max(newLS, 0)}px`; } catch {}
          }
        }
      }
    };

    let attempts = 0;
    applyFactor(candidate);
    while (element.scrollHeight > targetHeight && attempts < 12 && candidate > minAllowedFactor) {
      attempts += 1;
      candidate = Math.max(minAllowedFactor, candidate * 0.92);
      applyFactor(candidate);
    }
    finalScalingFactor = candidate;
    if (debugMode) console.debug('[adjustFontSizeForExport] shrink attempts', attempts, 'finalScalingFactor', finalScalingFactor, 'element.scrollHeight', element.scrollHeight, 'targetHeight', targetHeight);
  } else if (baseScalingFactor > 1) {
    // Grow: content is smaller than target, increase font sizes
    finalScalingFactor = baseScalingFactor;
    for (const [el, styles] of originalFontSizes.entries()) {
      const computedSize = parseFloat(styles.computed || '0');
      if (!isNaN(computedSize) && computedSize > 0) {
        const newFont = computedSize * finalScalingFactor;
        el.style.fontSize = `${newFont}px`;

        let compLH = parseFloat(styles.computedLineHeight || '0');
        if (isNaN(compLH) || compLH === 0) compLH = computedSize * 1.25;
        const newLH = Math.max(compLH * finalScalingFactor, newFont * 1.12);
        try { el.style.lineHeight = `${newLH}px`; } catch {}

        const compLS = parseFloat(styles.computedLetterSpacing || '0');
        if (!isNaN(compLS) && Math.abs(compLS) > 0.01) {
          try { el.style.letterSpacing = `${compLS * finalScalingFactor}px`; } catch {}
        }
      }
    }
    if (debugMode) console.debug('[adjustFontSizeForExport] grow finalScalingFactor', finalScalingFactor, 'element.scrollHeight', element.scrollHeight, 'targetHeight', targetHeight);
  } else {
    // No scaling needed
    finalScalingFactor = 1;
    if (debugMode) console.debug('[adjustFontSizeForExport] no scaling needed');
  }

  if (debugMode) {
    const report: Array<{ tag: string; old: string; new: string }> = [];
    let i = 0;
    for (const [el, styles] of originalFontSizes.entries()) {
      if (i++ > 6) break;
      report.push({ tag: el.tagName.toLowerCase(), old: styles.computed || '', new: el.style.fontSize || '' });
    }
    console.debug('[adjustFontSizeForExport] sample scaled elements', report);
  }

  return {
    cleanup: () => {
      for (const [el, styles] of originalFontSizes.entries()) {
        try {
          el.style.fontSize = styles.original || '';
          el.style.lineHeight = styles.originalLineHeight || '';
          el.style.letterSpacing = styles.originalLetterSpacing || '';
        } catch {}
      }
    },
    scalingFactor: finalScalingFactor
  };
};

/**
 * Captures a letter element as PNG using html-to-image.
 */
const captureLetterCloneAsPng = async (
  element: HTMLElement,
  targetWidth = 768,
  desiredFontSize?: number,
  options: { quality?: number; pixelRatio?: number; isMobile?: boolean } = {}
): Promise<JPEGResult> => {
  if (typeof document === 'undefined') throw new Error('No document');

  const clone = element.cloneNode(true) as HTMLElement;

  // Apply desktop CSS classes for mobile exports
  if (options.isMobile) {
    const allElements = [clone, ...clone.querySelectorAll('*')];
    allElements.forEach((el) => {
      if (el instanceof HTMLElement && el.className) {
        // Replace responsive width classes with desktop equivalents
        el.className = el.className
          .replace(/\bsm:w-\S+/g, '') // Remove small breakpoint width classes
          .replace(/\bmd:w-\S+/g, '') // Remove medium breakpoint width classes
          .replace(/\blg:w-\S+/g, '') // Remove large breakpoint width classes
          .replace(/\bxl:w-\S+/g, '') // Remove extra large breakpoint width classes
          .replace(/\bw-full\b/g, 'w-auto') // Replace full width with auto
          .trim();
      }
    });
  }

  // Remove scrolling constraints from the clone for proper export
  const scrollableContainers = clone.querySelectorAll('[style*="maxHeight"], [style*="overflowY"], [style*="overflow"]');
  scrollableContainers.forEach((container) => {
    const style = (container as HTMLElement).style;
    style.maxHeight = '';
    style.overflowY = '';
    style.overflow = '';
  });

  const originalWidth = element.offsetWidth;
  const originalHeight = element.offsetHeight;

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${targetWidth}px`;
  wrapper.style.height = 'auto';
  wrapper.style.overflow = 'visible';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '99999';
  clone.style.width = `${targetWidth}px`;
  clone.style.height = 'auto';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const { cleanup, scalingFactor } = adjustFontSizeForExport(clone, desiredFontSize, targetWidth);

  await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));

  const dataUrl = await toPng(clone, {
    quality: options.quality ?? 0.9, // Reduced PNG quality for smaller intermediate files
    pixelRatio: options.pixelRatio ?? 2
  });

  try { cleanup(); } catch (e) {}
  if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);

  return { dataUrl, scalingFactor };
};

/**
 * Generates a JPEG data URL from the given element.
 * If callback is provided, calls it with the data URL; otherwise, downloads the file.
 */
export const generateJPEG = async (
  element: HTMLElement,
  filename: string = 'letter.jpeg',
  callback?: (dataUrl: string | null) => void,
  options: JPEGGeneratorOptions = {}
): Promise<void> => {
  try {
    const { dataUrl, scalingFactor } = await captureLetterCloneAsPng(
      element,
      options.targetWidth ?? 768,
      undefined, // desiredFontSize not used here, but can be passed
      { quality: options.quality ?? 0.9, pixelRatio: options.pixelRatio ?? 2, isMobile: options.isMobile }
    );

    // Convert PNG data to JPG on a canvas to force white background
    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('Image load failed'));
    });

    const canvas = document.createElement('canvas');
    const w = 816; // US Letter width in pixels at 72 DPI
    const h = 1056; // US Letter height
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const jpegData = canvas.toDataURL('image/jpeg', options.quality ?? JPEG_COMPRESSION_QUALITY);

      if (callback) {
        callback(jpegData);
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = jpegData;
        link.click();
      }
    } else {
      throw new Error('Canvas context not available');
    }
  } catch (error) {
    console.error('Failed to generate JPEG:', error);
    if (callback) {
      callback(null);
    } else {
      throw error;
    }
  }
};

export { captureLetterCloneAsPng };

/**
 * Generates a JPEG data URL from the given element and returns it.
 */
export const generateJPEGDataUrl = async (
  element: HTMLElement,
  options: JPEGGeneratorOptions = {}
): Promise<string | null> => {
  try {
    const { dataUrl, scalingFactor } = await captureLetterCloneAsPng(
      element,
      options.targetWidth ?? 768,
      undefined, // desiredFontSize not used here, but can be passed
      { quality: options.quality ?? 0.98, pixelRatio: options.pixelRatio ?? 2, isMobile: options.isMobile }
    );

    // Convert PNG data to JPG on a canvas to force white background
    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('Image load failed'));
    });

    const canvas = document.createElement('canvas');
    const w = 816; // US Letter width in pixels at 72 DPI
    const h = 1056; // US Letter height
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const jpegData = canvas.toDataURL('image/jpeg', options.quality ?? JPEG_COMPRESSION_QUALITY);
      return jpegData;
    } else {
      throw new Error('Canvas context not available');
    }
  } catch (error) {
    console.error('Failed to generate JPEG data URL:', error);
    return null;
  }
};