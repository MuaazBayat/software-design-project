// __tests__/integration/LetterSendAnimation.int.test.tsx
// Adjust the import path to where you place the component.
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LetterSendAnimation from '../../app/compose-letter/components/LetterSendAnimation';

const DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABP0lEQVQ4T6WTv0oDQRSGv9mQCEIw2jQyS3ZgK0oVbGm1u2jQyD2jS6QJwY2bP9B8g2Gq2oVE0K2oC0mYw5ZgJx3nQ2y7k8k7wGv8w2jv2Ci6Z9z/fu7m3gG0u5b3wSt1Rk6J0p5Q0r5f9D2Cw2A0y3N1wW3wS0S5gWqV9t0mXg1h4sQ8t3E3l0rG9f2iP5c9q7P3k2o1d5Uz2iXk9k8v8l4UqF9g2I5P6gJYtHkJ8wV0b0qkH1Q+U0k2L4mW1a3fN5kTgqLr3i0E0gqfJwz0Jt3gYFQHf8q2vD9aQK7h1Z2WwS3gq3lw2WwWg3vX1qH6B7Uo7u+gX3i6K6kE2KxiCq2tYzq2b5w2wQw/PbR9zq6nKcEwqZCkA5r4t6O19H8o2b1Lw3H8Bq3S9+Uh9d6o1nK9wJm8Cq0m1m5i8bC1m1S8oS9y2Vt8pKk+gF3wM9qgTXp7G9C1KQ9dJr2Qn/3hQX5wF3v0C2qvU0g9Z1kAAAAASUVORK5CYII=';

// ---- Test helpers ----
function mockImageThatLoads() {
  const OriginalImage = (global as any).Image;

  class MockImage {
    public onload: null | (() => void) = null;
    public onerror: null | ((e?: unknown) => void) = null;
    public _src = '';
    public crossOrigin = '';
    public naturalWidth = 816;
    public naturalHeight = 1056;
    set src(val: string) {
      this._src = val;
      // Simulate successful load in next tick (unless "ERROR" sentinel).
      setTimeout(() => {
        if (val === 'ERROR') this.onerror?.(new Event('error'));
        else this.onload?.();
      }, 0);
    }
    get src() {
      return this._src;
    }
  }

  (global as any).Image = MockImage as any;
  return () => {
    (global as any).Image = OriginalImage;
  };
}

function mockLayoutBox(width = 300, height = 450) {
  // Ensure non-zero size so sliceHeights become positive and progress can finish.
  const spy = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
  spy.mockImplementation(() => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON() {},
  }) as any);
  return () => spy.mockRestore();
}

function useRafPolyfill() {
  const origRaf = global.requestAnimationFrame;
  const origCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  global.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as number);
  return () => {
    global.requestAnimationFrame = origRaf;
    global.cancelAnimationFrame = origCancel;
  };
}

async function waitForImageAndProgressToHide() {
  // Progress hides 500ms after sliceHeights are positive and image loaded.
  // We use fake timers so tests are deterministic.
  await act(async () => {
    jest.advanceTimersByTime(600);
  });
  // Ensure the instruction banner is visible (progress overlay gone or not blocking)
  await screen.findByText(/Fold your letter by holding and dragging/i);
}

function getDragOverlay(container: HTMLElement): HTMLElement {
  // The absolute, full-coverage drag layer sits above canvases.
  const el = container.querySelector('.absolute.inset-0.z-10') as HTMLElement;
  if (!el) throw new Error('drag overlay not found');
  return el;
}

function anyCanvas(container: HTMLElement): HTMLElement {
  const el = container.querySelector('canvas') as HTMLCanvasElement;
  if (!el) throw new Error('canvas not found');
  return el;
}

// Toggle pointer lock (click without movement) then wheel up to fold past threshold.
async function foldLetter(container: HTMLElement) {
  const overlay = getDragOverlay(container);
  // Click (pointer down/up with same coords) toggles pointer lock
  fireEvent.pointerDown(overlay, { clientY: 100 });
  fireEvent.pointerUp(overlay, { clientY: 100 });
  // Wheel negative to move yDrag upward (towards -FOLD_RANGE); threshold is ~85% of 60 (=51).
  fireEvent.wheel(anyCanvas(container), { deltaY: -60 });
  // Confirm overlay should appear.
  await screen.findByText(/Are you sure the letter is readable/i);
}

// ---- Tests ----
describe('LetterSendAnimation (integration)', () => {
  let restoreImage: () => void;
  let restoreLayout: () => void;
  let restoreRaf: () => void;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    restoreImage = mockImageThatLoads();
    restoreLayout = mockLayoutBox(360, 540); // any non-zero, consistent box
    restoreRaf = useRafPolyfill();
  });

  afterEach(() => {
    restoreImage();
    restoreLayout();
    restoreRaf();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

test('initial render: shows instruction; progress reaches 100% after image load', async () => {
  const { container } = render(
    <div style={{ width: 800, height: 600 }}>
      <LetterSendAnimation show imageSrc={DATA_URL} onAnimationComplete={() => {}} />
    </div>
  );

  // Instruction is visible
  expect(
    await screen.findByText(/Fold your letter by holding and dragging/i)
  ).toBeInTheDocument();

  // Progress element exists…
  const progressEl = container.querySelector(
    '.bg-pink-500.h-4.rounded-full'
  ) as HTMLDivElement | null;
  expect(progressEl).toBeInTheDocument();

  // …and after timers advance (image load + settling), it’s at 100%
  await waitForImageAndProgressToHide(); // keeps your existing helper & fake timers
  const finalProgressEl = container.querySelector(
    '.bg-pink-500.h-4.rounded-full'
  ) as HTMLDivElement | null;
  expect(finalProgressEl).toBeInTheDocument();
  expect(finalProgressEl!.style.width).toBe('100%');
});


  test('fold flow via pointer lock + wheel shows confirmation overlay', async () => {
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <LetterSendAnimation show imageSrc={DATA_URL} onAnimationComplete={() => {}} />
      </div>
    );
    await waitForImageAndProgressToHide();

    await foldLetter(container);

    expect(
      screen.getByText(/Are you sure the letter is readable for the receiver\?/i)
    ).toBeInTheDocument();
    // Both action buttons visible
    expect(screen.getByRole('button', { name: /Send Letter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('Cancel: resets fold state and calls onCancel (if provided)', async () => {
    const onCancel = jest.fn();
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <LetterSendAnimation show imageSrc={DATA_URL} onAnimationComplete={() => {}} onCancel={onCancel} />
      </div>
    );
    await waitForImageAndProgressToHide();
    await foldLetter(container);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    });

    // Confirmation overlay should disappear
    expect(
      screen.queryByText(/Are you sure the letter is readable/i)
    ).not.toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('Send without onSendWithImage: completes locally and calls onAnimationComplete', async () => {
    const onDone = jest.fn();
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <LetterSendAnimation show imageSrc={DATA_URL} onAnimationComplete={onDone} />
      </div>
    );
    await waitForImageAndProgressToHide();
    await foldLetter(container);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send Letter/i }));
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    // Overlay should be gone after reset
    expect(screen.queryByText(/Are you sure the letter is readable/i)).not.toBeInTheDocument();
  });

  test('Send with onSendWithImage (success): calls callback with imageSrc, resets, and calls onAnimationComplete', async () => {
    const onDone = jest.fn();
    const onSend = jest.fn().mockResolvedValue(undefined);
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <LetterSendAnimation
          show
          imageSrc={DATA_URL}
          onAnimationComplete={onDone}
          onSendWithImage={onSend}
        />
      </div>
    );
    await waitForImageAndProgressToHide();
    await foldLetter(container);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send Letter/i }));
    });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(DATA_URL);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Are you sure the letter is readable/i)).not.toBeInTheDocument();
  });

  test('Send with onSendWithImage (error): shows inline error, keeps overlay; then Cancel closes', async () => {
    const err = new Error('Network fail');
    const onSend = jest.fn().mockRejectedValue(err);
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <LetterSendAnimation
          show
          imageSrc={DATA_URL}
          onAnimationComplete={() => {}}
          onSendWithImage={onSend}
        />
      </div>
    );
    await waitForImageAndProgressToHide();
    await foldLetter(container);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send Letter/i }));
    });

    // Error message appears (component renders error.message)
    expect(screen.getByText(/Network fail/i)).toBeInTheDocument();
    // Overlay still present
    expect(screen.getByRole('button', { name: /Send Letter/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    });

    expect(screen.queryByText(/Network fail/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Are you sure the letter is readable/i)).not.toBeInTheDocument();
  });

  test('embedded mode renders the same interactive content without extra outer wrapper', async () => {
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <LetterSendAnimation
          show
          embedded
          imageSrc={DATA_URL}
          onAnimationComplete={() => {}}
        />
      </div>
    );
    await waitForImageAndProgressToHide();

    // Instruction visible
    expect(
      screen.getByText(/Fold your letter by holding and dragging/i)
    ).toBeInTheDocument();

    // Can still fold and see confirm UI
    await foldLetter(container);
    expect(
      screen.getByText(/Are you sure the letter is readable/i)
    ).toBeInTheDocument();
  });
});
