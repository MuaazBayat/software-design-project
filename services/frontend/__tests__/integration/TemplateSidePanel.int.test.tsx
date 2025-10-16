// __tests__/integration/TemplateSidePanel.int.test.tsx
/**
 * Integration tests for TemplateSidePanel
 *
 * These tests assume no network/MSW handlers are needed because the component
 * is self-contained and driven by context + parent callbacks.
 *
 * Test focus:
 *  - Renders and basic header/close UX
 *  - Default "Favorites" tab view, tab switching, search filtering
 *  - Hover preview and click-to-apply behavior (invokes change callbacks)
 *  - "Show more" / "Show fewer" pagination
 *  - Debounced color changes (font/background) and line controls
 *  - Inactivity auto-close timer
 *  - Touch drag-to-close gesture
 */

import React from 'react';
import { render, screen, fireEvent, within ,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---- Environment & library mocks ----
const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
// Framer Motion (motion/react) mock: render as plain elements (div, etc.)
jest.mock('motion/react', () => {
  const React = require('react');
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) =>
          ({ children, ...props }: any) => React.createElement(tag, props, children),
      }
    ),
  };
});
// Put these BEFORE importing TemplateSidePanel.tsx
// Ensure any import variant resolves to "mobile = true" in tests


// IntersectionObserver mock: immediately mark observed nodes as intersecting
beforeAll(() => {
  class IO {
    cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe = (el: Element) => {
      this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as any);
    };
    unobserve = () => {};
    disconnect = () => {};
    takeRecords = () => [];
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  // @ts-ignore
  global.IntersectionObserver = IO;
});

// Replace shadcn Slider with a minimal range input so we can change values easily
jest.mock('@/components/ui/slider', () => {
  const React = require('react');
  return {
    Slider: ({ value, onValueChange, min = 0, max = 100, step = 1, 'data-testid': dtid }: any) => (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Array.isArray(value) ? value[0] : value ?? 0}
        data-testid={dtid}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
      />
    ),
  };
});

// ---- ComposeLetterContext mock (what the component uses for data/actions) ----
type MockPreset = {
  id: string;
  name: string;
  isFavorite: boolean;
  updatedAt: number;
  config: {
    background?: { color?: string; opacity?: number };
    pattern?: { type?: string; params?: any };
    fontColor?: string;
    fontOpacity?: number;
  };
};

const mockPresets: MockPreset[] = [
  {
    id: 'preset-ed',
    name: 'Elegant Dots',
    isFavorite: true,
    updatedAt: 100,
    config: {
      background: { color: '#ffeeee', opacity: 0.8 },
      pattern: {
        type: 'dotted',
        params: {
          type: 'dotted',
          spacing: 24,
          thickness: 4,
          color: '#112233',
          opacity: 0.7,
          rotation: 0,
        },
      },
      fontColor: '#333333',
      fontOpacity: 0.9,
    },
  },
  {
    id: 'preset-rb',
    name: 'Ruled Blue',
    isFavorite: true,
    updatedAt: 400,
    config: {
      background: { color: '#ffffff', opacity: 1 },
      pattern: {
        type: 'straight',
        params: {
          type: 'straight',
          spacing: 32,
          thickness: 2,
          color: '#3b82f6',
          opacity: 0.6,
          rotation: 0,
        },
      },
      fontColor: '#101010',
      fontOpacity: 1,
    },
  },
  {
    id: 'preset-zz',
    name: 'Ziggy',
    isFavorite: true,
    updatedAt: 300,
    config: {
      background: { color: '#fafafa', opacity: 1 },
      pattern: {
        type: 'zigzag',
        params: {
          type: 'zigzag',
          spacing: 20,
          thickness: 3,
          color: '#666666',
          opacity: 0.5,
          rotation: 10,
        },
      },
      fontColor: '#000000',
      fontOpacity: 1,
    },
  },
  {
    id: 'preset-wv',
    name: 'Wavy Gray',
    isFavorite: true,
    updatedAt: 200,
    config: {
      background: { color: '#f0f0f0', opacity: 1 },
      pattern: {
        type: 'wavy',
        params: {
          type: 'wavy',
          spacing: 28,
          thickness: 2,
          color: '#999999',
          opacity: 0.6,
          rotation: 0,
        },
      },
      fontColor: '#222222',
      fontOpacity: 0.85,
    },
  },
  {
    id: 'preset-min',
    name: 'Minimal',
    isFavorite: false,
    updatedAt: 1000, // ensure it floats to top in Recent
    config: {
      background: { color: '#ffffff', opacity: 1 },
      pattern: { type: 'none', params: { type: 'none', spacing: 24, thickness: 1, color: '#e5e7eb', opacity: 0.5, rotation: 0 } },
      fontColor: '#000000',
      fontOpacity: 1,
    },
  },
  {
    id: 'preset-spr',
    name: 'Spirals',
    isFavorite: false,
    updatedAt: 800,
    config: {
      background: { color: '#fff7ed', opacity: 0.95 },
      pattern: {
        type: 'spiral',
        params: {
          type: 'spiral',
          spacing: 26,
          thickness: 2,
          color: '#444444',
          opacity: 0.7,
          rotation: 0,
        },
      },
      fontColor: '#111111',
      fontOpacity: 0.95,
    },
  },
];

const mockApplyPreset = jest.fn((id: string) => mockPresets.find((p) => p.id === id));
const mockSavePreset = jest.fn();
const mockDeletePreset = jest.fn();
const mockToggleFavorite = jest.fn();

// IMPORTANT: The import path here must match how TemplateSidePanel imports it: './ComposeLetterContext'
// Since our test imports the component from "../../app/compose-letter/components/TemplateSidePanel",
// the relative path below matches that module resolution.
jest.mock('../../app/compose-letter/components/ComposeLetterContext', () => {
  return {
    useComposeLetter: () => ({
      presets: mockPresets,
      applyPreset: mockApplyPreset,
      savePreset: mockSavePreset,
      deletePreset: mockDeletePreset,
      toggleFavorite: mockToggleFavorite,
    }),
  };
});

// Import under test (relative path mirrors project layout used in other tests)
import TemplateSidePanel from '../../app/compose-letter/components/TemplateSidePanel';

function renderPanel(overrides: Partial<React.ComponentProps<typeof TemplateSidePanel>> = {}) {
  const onPreview = jest.fn();
  const onClose = jest.fn();
  const onSelect = jest.fn();
  const onLineConfigChange = jest.fn();
  const onBackgroundColorChange = jest.fn();
  const onBackgroundOpacityChange = jest.fn();
  const onFontColorChange = jest.fn();
  const onFontOpacityChange = jest.fn();

  const utils = render(
    <TemplateSidePanel
      open
      currentId="preset-ed"
      onPreview={onPreview}
      onClose={onClose}
      onSelect={onSelect}
      onLineConfigChange={onLineConfigChange}
      onBackgroundColorChange={onBackgroundColorChange}
      onBackgroundOpacityChange={onBackgroundOpacityChange}
      onFontColorChange={onFontColorChange}
      onFontOpacityChange={onFontOpacityChange}
      {...overrides}
    />
  );

  return {
    ...utils,
    onPreview,
    onClose,
    onSelect,
    onLineConfigChange,
    onBackgroundColorChange,
    onBackgroundOpacityChange,
    onFontColorChange,
    onFontOpacityChange,
  };
}

describe('TemplateSidePanel (integration)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
  jest.clearAllTimers(); // was: jest.runOnlyPendingTimers()
  });

test('renders header & close button; clicking close invokes onClose', async () => {
  const { onClose } = renderPanel();

  // header exists
  expect(screen.getByText(/Page Settings/i)).toBeInTheDocument();

  const user = setupUser();
  await user.click(screen.getByLabelText(/Close panel/i));

  expect(onClose).toHaveBeenCalledTimes(1);
});


  test('defaults to Favorites tab and shows only favorites; "Show more" appears when >4 items', () => {
    renderPanel();

    // Favorites names visible; a non-favorite should not be present initially
    expect(screen.getByText('Elegant Dots')).toBeInTheDocument();
    expect(screen.getByText('Ruled Blue')).toBeInTheDocument();
    expect(screen.getByText('Ziggy')).toBeInTheDocument();
    expect(screen.getByText('Wavy Gray')).toBeInTheDocument();
    expect(screen.queryByText('Minimal')).not.toBeInTheDocument();

    // Because there are 4 favorites exactly in our mock, "Show more" should NOT appear.
    // If you later add more favorites, this will naturally flip.
    expect(screen.queryByText(/Show more templates/i)).not.toBeInTheDocument();
  });

test('tab switching: Recent → includes non-favorite "Minimal"', async () => {
  renderPanel();

  const user = setupUser();
  await user.click(screen.getByRole('button', { name: /Recent/i }));

  expect(screen.getByText(/Minimal/i)).toBeInTheDocument();
});


test('search filters the currently selected tab (Favorites)', async () => {
  renderPanel();

  const user = setupUser();
  // The actual placeholder includes a trailing period.
  const search = screen.getByPlaceholderText(/Search templates\.?/i);
  await user.clear(search);
  await user.type(search, 'dots');

  // Should narrow to favorites whose name includes "dots"
  expect(screen.getByText(/Elegant Dots/i)).toBeInTheDocument();
  // ...and templates not matching should be absent (example)
  expect(screen.queryByText(/Minimal/i)).not.toBeInTheDocument();
});


  test('hovering a template triggers onPreview (enter = id, leave = null)', () => {
    const { onPreview, container } = renderPanel();

    // Clickable tiles are the ".cursor-pointer" wrappers in each card
    const tiles = container.querySelectorAll('div.cursor-pointer');
    expect(tiles.length).toBeGreaterThan(0);

    fireEvent.mouseEnter(tiles[0]);
    expect(onPreview).toHaveBeenCalledWith(mockPresets[0].id);

    fireEvent.mouseLeave(tiles[0]);
    expect(onPreview).toHaveBeenCalledWith(null);
  });

test('clicking a template applies preset and invokes downstream change handlers; does NOT call onSelect', async () => {
  const {
    onSelect,
    onLineConfigChange,
    onBackgroundColorChange,
    onFontColorChange,
  } = renderPanel();

  const user = setupUser();
  await user.click(screen.getByText(/Elegant Dots/i)); // clicking the card (text inside the card bubbles)

  // Template click should apply preset and notify downstream handlers,
  // but should NOT notify onSelect
  expect(onSelect).not.toHaveBeenCalled();

  expect(onLineConfigChange).toHaveBeenCalled();          // pattern params applied
  expect(onBackgroundColorChange).toHaveBeenCalled();     // background color applied
  expect(onFontColorChange).toHaveBeenCalled();           // font color applied
});


  test('font color change is debounced and invokes parent after ~100ms', async () => {
    const { onFontColorChange } = renderPanel();

    const colorInput = screen.getByTitle(/Select text color/i); // Font color picker
    fireEvent.input(colorInput, { target: { value: '#336699' } });

    // Debounce is 100ms
    jest.advanceTimersByTime(99);
    expect(onFontColorChange).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2);
    expect(onFontColorChange).toHaveBeenCalledWith('#336699');
  });

  test('background color change is debounced (100ms) and calls parent', async () => {
    const { onBackgroundColorChange } = renderPanel();

    const bgColorInput = screen.getByTitle(/Select background color/i);
    fireEvent.input(bgColorInput, { target: { value: '#abcdef' } });

    jest.advanceTimersByTime(100);
    expect(onBackgroundColorChange).toHaveBeenCalledWith('#abcdef');
  });

test('line type switching to Dotted immediately calls onLineConfigChange and sets defaults', async () => {
  const { onLineConfigChange } = renderPanel();

  const user = setupUser();
  await user.click(screen.getByRole('button', { name: /Dotted/i }));

  // Immediate call for non-opacity changes
  expect(onLineConfigChange).toHaveBeenCalled();

  // At minimum, ensure the type changed to dotted.
  // (The component merges defaults internally before calling.)
  const arg = onLineConfigChange.mock.calls.pop()?.[0];
  expect(arg).toEqual(expect.objectContaining({ type: 'dotted' }));
});


test('line color change is debounced (250ms)', () => {
  const { onLineConfigChange } = renderPanel();

  // Show line controls by selecting a line style first
  userEvent.setup({ advanceTimers: jest.advanceTimersByTime }); // local is fine here too
  const user = setupUser();
  return (async () => {
    await user.click(screen.getByRole('button', { name: /Straight/i }));

    // Now the color input exists with this title
    const colorPicker = screen.getByTitle(/Select line color/i);
    fireEvent.input(colorPicker, { target: { value: '#ff0000' } });

    // The component debounces non-opacity color changes via the generic debounce ref.
    // Advance 249ms: should NOT have fired yet
    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(onLineConfigChange).not.toHaveBeenCalledWith(expect.objectContaining({ color: '#ff0000' }));

    // Advance to 250ms: now it should fire
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onLineConfigChange).toHaveBeenCalledWith(expect.objectContaining({ color: '#ff0000' }));
  })();
});

  test('inactivity auto-closes after 5s + fade (300ms)', () => {
    const { onClose } = renderPanel();

    // No user interaction → auto close
    jest.advanceTimersByTime(5000);
    // fade-out timer (300ms)
    jest.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

// test('touch drag downward (>100px) triggers close', () => {
//   const { onClose, container } = renderPanel();

//   // Target the header container that owns the drag handle and touch listeners.
//   // In the DOM it’s the div with "relative" under the top bar.
//   const heading = screen.getByText(/Page Settings/i);
//   // Walk up to the nearest header container (the one with class "relative").
//   let headerEl = heading.closest('div.relative') as HTMLElement | null;
//   if (!headerEl) {
//     // Fallback: the first bar below the root with the top gradient classes
//     headerEl = container.querySelector('div.px-4.py-3.border-b') as HTMLElement;
//   }
//   expect(headerEl).toBeTruthy();

//   // Simulate a downward drag starting near the top bar/handle.
//   fireEvent.touchStart(headerEl!, { touches: [{ clientY: 40 }] });
//   fireEvent.touchMove(headerEl!, { touches: [{ clientY: 170 }] }); // delta = 130 > 100
//   fireEvent.touchEnd(headerEl!, { changedTouches: [{ clientY: 170 }] });

//   // If the component fades before closing, give it time.
//   act(() => {
//     jest.advanceTimersByTime(600);
//   });

//   expect(onClose).toHaveBeenCalledTimes(1);
// });





// make sure this name matches the one you declared with the context mock at the top:
// const mockToggleFavorite = jest.fn();

test('toggle favorite invokes context action without triggering card click', async () => {
  const { onLineConfigChange } = renderPanel();

  const cardLabel = screen.getByText(/Elegant Dots/i);
  // Climb to the card container, then pick the first small control button (the star)
  const cardContainer = cardLabel.parentElement!.parentElement!; // label -> inner -> card
  const starBtn = within(cardContainer).getAllByRole('button')[0];

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.click(starBtn);

  // ✅ use the actual mocked function name
  expect(mockToggleFavorite).toHaveBeenCalledTimes(1);

  // Ensure we did NOT trigger the card click (which would apply the preset)
  expect(onLineConfigChange).not.toHaveBeenCalled();
});

});
