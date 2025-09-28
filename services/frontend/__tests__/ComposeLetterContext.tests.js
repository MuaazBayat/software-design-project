import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ComposeLetterProvider, useComposeLetter } from '../app/compose-letter/components/ComposeLetterContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => 'mock-uuid-123' },
  writable: true,
});

// Test component to access context
const TestComponent = () => {
  const { presets, loadPresets, applyPreset, savePreset, deletePreset, toggleFavorite } = useComposeLetter();

  return (
    <div>
      <div data-testid="presets-count">{presets.length}</div>
      <button data-testid="load-presets" onClick={loadPresets}>Load Presets</button>
      <button data-testid="apply-preset" onClick={() => applyPreset('preset1')}>Apply Preset</button>
      <button data-testid="save-preset" onClick={() => savePreset('New Preset', {
        background: { color: '#fff', filterKey: 'none', opacity: 1 },
        pattern: { type: 'none', params: {} },
        patternBlendMode: 'normal',
        fontColor: '#000',
        fontOpacity: 1,
      })}>Save Preset</button>
      <button data-testid="delete-preset" onClick={() => deletePreset('preset1')}>Delete Preset</button>
      <button data-testid="toggle-favorite" onClick={() => toggleFavorite('preset1')}>Toggle Favorite</button>
      {presets.map(preset => (
        <div key={preset.id} data-testid={`preset-${preset.id}`}>
          {preset.name} - {preset.isFavorite ? 'Favorite' : 'Not Favorite'}
        </div>
      ))}
    </div>
  );
};

describe('ComposeLetterContext', () => {
  const mockPreset = {
    id: 'preset1',
    name: 'Test Preset',
    config: {
      background: { color: '#ffffff', filterKey: 'none', opacity: 1 },
      pattern: { type: 'none', params: {} },
      patternBlendMode: 'normal',
      fontColor: '#000000',
      fontOpacity: 1,
    },
    thumbnailDataUrl: 'data:image/png;base64,mock',
    isFavorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(JSON.stringify([mockPreset]));
    localStorageMock.setItem.mockImplementation(() => {});
  });

  describe('Provider Rendering', () => {
    test('renders children correctly', () => {
      render(
        <ComposeLetterProvider>
          <div data-testid="child">Test Child</div>
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    test('loads presets from localStorage on mount', () => {
      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith('compose-letter-presets');
      expect(screen.getByTestId('presets-count')).toHaveTextContent('1');
    });

    test('handles empty localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('presets-count')).toHaveTextContent('0');
    });

    test('handles invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('presets-count')).toHaveTextContent('0');
    });
  });

  describe('loadPresets', () => {
    test('loads presets from localStorage', async () => {
      const user = userEvent.setup();

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      // Clear initial load
      localStorageMock.getItem.mockClear();

      const loadButton = screen.getByTestId('load-presets');
      await user.click(loadButton);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('compose-letter-presets');
    });

    test('handles localStorage errors gracefully', async () => {
      const user = userEvent.setup();
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const loadButton = screen.getByTestId('load-presets');
      await user.click(loadButton);

      // Should not crash, console.error should be called
      expect(screen.getByTestId('presets-count')).toHaveTextContent('0');
    });
  });

  describe('applyPreset', () => {
    test('moves applied preset to top of list', async () => {
      const user = userEvent.setup();
      const preset2 = { ...mockPreset, id: 'preset2', name: 'Preset 2' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockPreset, preset2]));

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const applyButton = screen.getByTestId('apply-preset');
      await user.click(applyButton);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData[0].id).toBe('preset1');
    });

    test('returns undefined for non-existent preset', async () => {
      const user = userEvent.setup();

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const applyButton = screen.getByTestId('apply-preset');
      await user.click(applyButton);

      // Should handle gracefully without crashing
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('savePreset', () => {
    test('saves new preset to localStorage', async () => {
      const user = userEvent.setup();

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const saveButton = screen.getByTestId('save-preset');
      await user.click(saveButton);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData[0].name).toBe('New Preset');
      expect(savedData[0].id).toBe('mock-uuid-123');
      expect(savedData[0].isFavorite).toBe(false);
      expect(savedData[0].createdAt).toBeDefined();
      expect(savedData[0].updatedAt).toBeDefined();
    });

    test('adds new preset to existing presets', async () => {
      const user = userEvent.setup();

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const saveButton = screen.getByTestId('save-preset');
      await user.click(saveButton);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
      expect(savedData[0].name).toBe('New Preset');
      expect(savedData[1].name).toBe('Test Preset');
    });

    test('handles localStorage save errors gracefully', async () => {
      const user = userEvent.setup();
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Save error');
      });

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const saveButton = screen.getByTestId('save-preset');
      await user.click(saveButton);

      // Should not crash, console.error should be called
      expect(screen.getByTestId('presets-count')).toHaveTextContent('1');
    });
  });

  describe('deletePreset', () => {
    test('removes preset from localStorage', async () => {
      const user = userEvent.setup();

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const deleteButton = screen.getByTestId('delete-preset');
      await user.click(deleteButton);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(0);
    });

    test('updates state after deletion', async () => {
      const user = userEvent.setup();

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('presets-count')).toHaveTextContent('1');

      const deleteButton = screen.getByTestId('delete-preset');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('presets-count')).toHaveTextContent('0');
      });
    });
  });

  describe('toggleFavorite', () => {
    test('toggles favorite status of preset', async () => {
      const user = userEvent.setup();

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('preset-preset1')).toHaveTextContent('Not Favorite');

      const toggleButton = screen.getByTestId('toggle-favorite');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('preset-preset1')).toHaveTextContent('Favorite');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData[0].isFavorite).toBe(true);
      expect(savedData[0].updatedAt).toBeGreaterThan(savedData[0].createdAt);
    });

    test('handles non-existent preset gracefully', async () => {
      const user = userEvent.setup();
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      const toggleButton = screen.getByTestId('toggle-favorite');
      await user.click(toggleButton);

      // Should not crash
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('useComposeLetter hook', () => {
    test('throws error when used outside provider', () => {
      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useComposeLetter must be used within ComposeLetterProvider');

      consoleSpy.mockRestore();
    });

    test('provides all required methods', () => {
      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('load-presets')).toBeInTheDocument();
      expect(screen.getByTestId('apply-preset')).toBeInTheDocument();
      expect(screen.getByTestId('save-preset')).toBeInTheDocument();
      expect(screen.getByTestId('delete-preset')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-favorite')).toBeInTheDocument();
    });
  });

  describe('Data Persistence', () => {
    test('persists data across component re-renders', () => {
      const { rerender } = render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('presets-count')).toHaveTextContent('1');

      rerender(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('presets-count')).toHaveTextContent('1');
    });

    test('reloads data from localStorage on provider remount', () => {
      const { unmount } = render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      unmount();

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockPreset, { ...mockPreset, id: 'preset2' }]));

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('presets-count')).toHaveTextContent('2');
    });
  });

  describe('Edge Cases', () => {
    test('handles crypto undefined gracefully', () => {
      const originalCrypto = global.crypto;
      delete global.crypto;

      render(
        <ComposeLetterProvider>
          <TestComponent />
        </ComposeLetterProvider>
      );

      expect(screen.getByTestId('presets-count')).toHaveTextContent('1');

      global.crypto = originalCrypto;
    });

    test('handles window undefined gracefully', () => {
      const originalWindow = global.window;
      delete global.window;

      expect(() => {
        render(
          <ComposeLetterProvider>
            <TestComponent />
          </ComposeLetterProvider>
        );
      }).not.toThrow();

      global.window = originalWindow;
    });
  });
});