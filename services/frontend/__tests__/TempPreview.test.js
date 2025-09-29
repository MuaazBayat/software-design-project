import React from 'react'
import { render, screen } from '@testing-library/react'
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
    render(
      <TempPreviewProvider>
        <TestComponent />
      </TempPreviewProvider>
    )

    // Initially no preview
    expect(screen.getByTestId('preview-state')).toHaveTextContent('no-preview')

    // Click to set preview
    const setPreviewBtn = screen.getByText('Set Preview')
    setPreviewBtn.click()

    // Now has preview
    expect(screen.getByTestId('preview-state')).toHaveTextContent('has-preview')
  })

  test('allows setting saved state', () => {
    render(
      <TempPreviewProvider>
        <TestComponent />
      </TempPreviewProvider>
    )

    // Initially no saved
    expect(screen.getByTestId('saved-state')).toHaveTextContent('no-saved')

    // Click to set saved
    const setSavedBtn = screen.getByText('Set Saved')
    setSavedBtn.click()

    // Now has saved
    expect(screen.getByTestId('saved-state')).toHaveTextContent('has-saved')
  })

  test('throws error when used outside provider', () => {
    // Mock console.error to avoid noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestComponent />)).toThrow('useTempPreview must be used within a TempPreviewProvider')

    consoleSpy.mockRestore()
  })
})