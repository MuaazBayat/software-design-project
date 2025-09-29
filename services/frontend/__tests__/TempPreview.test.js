import React from 'react'
import { render, screen ,act} from '@testing-library/react'
import { TempPreviewProvider, useTempPreview } from '../app/compose-letter/components/TempPreview'

const TestComponent = () => {
  const { previewState, setPreviewState, savedState, setSavedState } = useTempPreview()

  return (
    <div>
      <div data-testid="preview-state">{previewState ? 'has-preview' : 'no-preview'}</div>
      <div data-testid="saved-state">{savedState ? 'has-saved' : 'no-saved'}</div>
      <button onClick={() => setPreviewState({ backgroundColor: 'red', fontColor: 'blue', lineConfig: null, fontOpacity: 1, backgroundOpacity: 1 })}>
        Set Preview
      </button>
      <button onClick={() => setSavedState({ backgroundColor: 'green', fontColor: 'yellow', lineConfig: null, fontOpacity: 0.5, backgroundOpacity: 0.5 })}>
        Set Saved
      </button>
    </div>
  )
}

describe('TempPreview Context', () => {
  test('provides initial null states', () => {
    render(
      <TempPreviewProvider>
        <TestComponent />
      </TempPreviewProvider>
    )

    expect(screen.getByTestId('preview-state')).toHaveTextContent('no-preview')
    expect(screen.getByTestId('saved-state')).toHaveTextContent('no-saved')
  })

test('allows setting preview state', () => {
  let api;

  function Probe() {
    const ctx = useTempPreview();
    api = ctx;
    return (
      <div data-testid="preview-state">
        {ctx.previewState ? 'has-preview' : 'no-preview'}
      </div>
    );
  }

  render(
    <TempPreviewProvider>
      <Probe />
    </TempPreviewProvider>
  );

  // Initially none
  expect(screen.getByTestId('preview-state')).toHaveTextContent('no-preview');

  // Wrap direct state update in act so React flushes it
  act(() => {
    api.setPreviewState({
      backgroundColor: '#000',
      fontColor: '#fff',
      lineConfig: {},
      fontOpacity: 1,
      backgroundOpacity: 1,
    });
  });

  expect(screen.getByTestId('preview-state')).toHaveTextContent('has-preview');
});

test('allows setting saved state', () => {
  let api;

  function Probe() {
    const ctx = useTempPreview();
    api = ctx;
    return (
      <div data-testid="saved-state">
        {ctx.savedState ? 'has-saved' : 'no-saved'}
      </div>
    );
  }

  render(
    <TempPreviewProvider>
      <Probe />
    </TempPreviewProvider>
  );

  // Initially none
  expect(screen.getByTestId('saved-state')).toHaveTextContent('no-saved');

  // Wrap direct state update in act so React flushes it
  act(() => {
    api.setSavedState({
      backgroundColor: '#111',
      fontColor: '#eee',
      lineConfig: {},
      fontOpacity: 0.9,
      backgroundOpacity: 0.8,
    });
  });

  expect(screen.getByTestId('saved-state')).toHaveTextContent('has-saved');
});

  test('throws error when used outside provider', () => {
    // Mock console.error to avoid noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestComponent />)).toThrow('useTempPreview must be used within a TempPreviewProvider')

    consoleSpy.mockRestore()
  })
})