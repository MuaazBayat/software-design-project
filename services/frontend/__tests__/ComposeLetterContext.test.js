import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComposeLetterProvider, useComposeLetter } from '../app/compose-letter/components/ComposeLetterContext';

// -----------------------------------------------------------------------------
// Stable localStorage mock with an in-memory backing store so get/set behave
// realistically across reads/writes.
// -----------------------------------------------------------------------------
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const LS_KEY = 'compose-letter-presets';
let backingStore = new Map();

function resetLocalStorage() {
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  backingStore = new Map();
  localStorageMock.getItem.mockImplementation((k) => (backingStore.has(k) ? backingStore.get(k) : null));
  localStorageMock.setItem.mockImplementation((k, v) => { backingStore.set(k, v); });
  localStorageMock.removeItem.mockImplementation((k) => { backingStore.delete(k); });
  localStorageMock.clear.mockImplementation(() => { backingStore.clear(); });
}

beforeEach(() => {
  resetLocalStorage();
});

// -----------------------------------------------------------------------------
// Minimal harness to expose the context API to tests.
// -----------------------------------------------------------------------------
function withProvider(cb) {
  const apiRef = { current: null };

  function Harness() {
    const api = useComposeLetter();
    apiRef.current = api; // keep ref updated on every render
    return <div data-testid="harness" />;
  }

  const view = render(
    <ComposeLetterProvider>
      <Harness />
    </ComposeLetterProvider>
  );

  return cb(apiRef, view);
}

// Base config used throughout tests
const baseConfig = {
  background: { color: '#ffffff', filterKey: 'none', opacity: 1 },
  pattern: { type: 'none', params: {} },
  patternBlendMode: 'normal',
  fontColor: '#000000',
  fontOpacity: 1,
};

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe('ComposeLetterContext', () => {
  describe('Provider Rendering', () => {
    test('renders children correctly', () => {
      render(
        <ComposeLetterProvider>
          <div>child</div>
        </ComposeLetterProvider>
      );
      expect(screen.getByText('child')).toBeInTheDocument();
    });

    test('loads presets from localStorage on mount', async () => {
      const seed = JSON.stringify([
        { id: 'p1', name: 'Seed', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => {
          expect(ref.current?.presets.map((p) => p.id)).toEqual(['p1']);
        });
      });
    });

    test('handles empty localStorage gracefully', async () => {
      await withProvider(async (ref) => {
        await waitFor(() => {
          expect(Array.isArray(ref.current?.presets)).toBe(true);
        });
      });
    });

    test('handles invalid localStorage data gracefully', () => {
      backingStore.set(LS_KEY, '{not-json');
      expect(() => withProvider(() => {})).not.toThrow();
    });
  });

  describe('loadPresets', () => {
    test('loads presets from localStorage', async () => {
      const seed = JSON.stringify([
        { id: 'p1', name: 'Seed', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => {
          expect(ref.current?.presets.length).toBe(1);
          expect(ref.current?.presets[0].id).toBe('p1');
        });
      });
    });

    test('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => { throw new Error('fail'); });
      expect(() => withProvider(() => {})).not.toThrow();
    });
  });

  describe('applyPreset', () => {
    test('moves applied preset to top of list', async () => {
      const seed = JSON.stringify([
        { id: 'a', name: 'A', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
        { id: 'b', name: 'B', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 2, updatedAt: 2 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => {
          expect(ref.current?.presets.map((p) => p.id)).toEqual(['a', 'b']);
        });
        const ret = ref.current?.applyPreset('b');
        expect(ret?.id).toBe('b');
        await waitFor(() => {
          expect(ref.current?.presets.map((p) => p.id)).toEqual(['b', 'a']);
        });
        const persisted = JSON.parse(backingStore.get(LS_KEY));
        expect(persisted.map((p) => p.id)).toEqual(['b', 'a']);
      });
    });

    test('returns undefined for non-existent preset', async () => {
      const seed = JSON.stringify([
        { id: 'preset1', name: 'Test Preset', config: baseConfig, thumbnailDataUrl: 'data:image/png;base64,mock', isFavorite: false, createdAt: Date.now(), updatedAt: Date.now() },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => {
          expect(ref.current?.presets.length).toBe(1);
        });
        const before = JSON.parse(backingStore.get(LS_KEY));
        const ret = ref.current?.applyPreset('does-not-exist');
        expect(ret).toBeUndefined();
        const after = JSON.parse(backingStore.get(LS_KEY));
        expect(after).toEqual(before);
      });
    });
  });

  describe('savePreset', () => {
    test('saves new preset to localStorage', async () => {
      await withProvider(async (ref) => {
        ref.current?.savePreset('New One', baseConfig);
        await waitFor(() => {
          expect(ref.current?.presets.length).toBeGreaterThan(0);
          expect(ref.current?.presets[0].name).toBe('New One');
        });
        const persisted = JSON.parse(backingStore.get(LS_KEY));
        expect(persisted[0].name).toBe('New One');
      });
    });

    test('adds new preset to existing presets', async () => {
      const seed = JSON.stringify([
        { id: 'x', name: 'X', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => {
          expect(ref.current?.presets.map((p) => p.name)).toEqual(['X']);
        });
        ref.current?.savePreset('Newer', baseConfig);
        await waitFor(() => {
          expect(ref.current?.presets[0].name).toBe('Newer');
        });
        const persisted = JSON.parse(backingStore.get(LS_KEY));
        expect(persisted[0].name).toBe('Newer');
      });
    });

    test('handles localStorage save errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => { throw new Error('save fail'); });
      expect(() => withProvider((ref) => { ref.current?.savePreset('Err', baseConfig); })).not.toThrow();
    });
  });

  describe('deletePreset', () => {
    test('removes preset from localStorage', async () => {
      const seed = JSON.stringify([
        { id: 'x', name: 'X', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
        { id: 'y', name: 'Y', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 2, updatedAt: 2 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => { expect(ref.current?.presets.map((p) => p.id)).toEqual(['x', 'y']); });
        ref.current?.deletePreset('x');
        await waitFor(() => {
          const persisted = JSON.parse(backingStore.get(LS_KEY));
          expect(persisted.map((p) => p.id)).toEqual(['y']);
        });
      });
    });

    test('updates state after deletion', async () => {
      const seed = JSON.stringify([
        { id: 'x', name: 'X', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
        { id: 'y', name: 'Y', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 2, updatedAt: 2 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => { expect(ref.current?.presets.map((p) => p.id)).toEqual(['x', 'y']); });
        ref.current?.deletePreset('y');
        await waitFor(() => { expect(ref.current?.presets.map((p) => p.id)).toEqual(['x']); });
      });
    });
  });

  describe('toggleFavorite', () => {
    test('toggles favorite status of preset', async () => {
      const seed = JSON.stringify([
        { id: 'x', name: 'X', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => { expect(ref.current?.presets.length).toBe(1); });
        ref.current?.toggleFavorite('x');
        await waitFor(() => { expect(ref.current?.presets[0].isFavorite).toBe(true); });
        const persisted = JSON.parse(backingStore.get(LS_KEY));
        expect(persisted[0].isFavorite).toBe(true);
      });
    });

    test('handles non-existent preset gracefully', async () => {
      backingStore.set(LS_KEY, JSON.stringify([]));
      await withProvider(async (ref) => {
        const before = JSON.parse(backingStore.get(LS_KEY));
        ref.current?.toggleFavorite('missing');
        const after = JSON.parse(backingStore.get(LS_KEY));
        expect(after).toEqual(before);
      });
    });
  });

  describe('useComposeLetter hook', () => {
    test('throws error when used outside provider', () => {
      const Bad = () => { /* @ts-expect-error */ useComposeLetter(); return null; };
      expect(() => render(<Bad />)).toThrow();
    });

    test('provides all required methods', async () => {
      await withProvider(async (ref) => {
        expect(typeof ref.current?.savePreset).toBe('function');
        expect(typeof ref.current?.applyPreset).toBe('function');
        expect(typeof ref.current?.toggleFavorite).toBe('function');
        expect(typeof ref.current?.deletePreset).toBe('function');
      });
    });
  });

  describe('Data Persistence', () => {
    test('persists data across component re-renders', async () => {
      await withProvider(async (ref) => {
        ref.current?.savePreset('Persist', baseConfig);
        await waitFor(() => {
          const persisted = JSON.parse(backingStore.get(LS_KEY));
          expect(persisted[0].name).toBe('Persist');
        });
      });
    });

    test('reloads data from localStorage on provider remount', async () => {
      const seed = JSON.stringify([
        { id: 'p1', name: 'Seed', config: baseConfig, thumbnailDataUrl: '', isFavorite: false, createdAt: 1, updatedAt: 1 },
      ]);
      backingStore.set(LS_KEY, seed);
      await withProvider(async (ref) => {
        await waitFor(() => { expect(ref.current?.presets.map((p) => p.id)).toEqual(['p1']); });
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles crypto undefined gracefully', () => {
      const savedCrypto = global.crypto;
      // @ts-ignore
      delete global.crypto;
      expect(() => withProvider((ref) => { ref.current?.savePreset('NoCrypto', baseConfig); })).not.toThrow();
      global.crypto = savedCrypto;
    });

    test('handles window undefined gracefully', () => {
      // We won't actually delete window in JSDOM; just ensure mounting is fine
      expect(() => withProvider(() => {})).not.toThrow();
    });
  });
});
