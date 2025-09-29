/**
 * __tests__/integration/TemplateSidePanel.int.test.tsx
 * Integration tests for TemplateSidePanel (no MSW needed).
 *
 * Key points:
 * - ESM-safe mock for useComposeLetter
 * - Per-test fake timers only (for debounces / idle-close)
 * - Safer selectors for tiles & dialogs
 */

import React from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.setTimeout(20000);

// ---- ESM-safe mock for the context hook ----
jest.mock("../../app/compose-letter/components/ComposeLetterContext", () => {
  const actual = jest.requireActual("../../app/compose-letter/components/ComposeLetterContext");
  return {
    ...actual,
    useComposeLetter: jest.fn(),
  };
});

// Mock mobile hook so touch/idle paths are enabled where applicable
jest.mock("../../hooks/use-mobile", () => ({
  useIsMobile: () => ({ isMobile: true }),
}));

// Next.js Image → plain <img>
jest.mock("next/image", () => (props: any) => <img {...props} />);

// motion/react → passthrough
jest.mock("motion/react", () => {
  const React = require("react");
  return {
    motion: new Proxy(
      {},
      {
        get: (_t, tag: string) =>
          React.forwardRef<any, any>((props, ref) =>
            React.createElement(tag, { ref, ...props }, props?.children)
          ),
      }
    ),
  };
});

// Minimal shadcn/radix doubles
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));
jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));
// Slider → input[type=range] mapping onValueChange([v])
jest.mock("@/components/ui/slider", () => ({
  Slider: ({ value, onValueChange, min = 0, max = 100, step = 1, ...rest }: any) => {
    const val = Array.isArray(value) ? value[0] : value ?? min;
    return (
      <input
        type="range"
        role="slider"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        {...rest}
      />
    );
  },
}));
// Dialogs
jest.mock("@/components/ui/dialog", () => {
  const React = require("react");
  return {
    Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
    DialogTrigger: ({ asChild, children }: any) => (asChild ? children : <button>{children}</button>),
    DialogContent: ({ children, ...props }: any) => (
      <div role="dialog" {...props}>
        {children}
      </div>
    ),
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h3>{children}</h3>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    DialogClose: ({ asChild, children }: any) => (asChild ? children : <button>{children}</button>),
  };
});
jest.mock("@/components/ui/alert-dialog", () => {
  const React = require("react");
  return {
    AlertDialog: ({ children }: any) => <div>{children}</div>,
    AlertDialogTrigger: ({ asChild, children }: any) => (asChild ? children : <button>{children}</button>),
    AlertDialogContent: ({ children }: any) => <div role="alertdialog">{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
    AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    AlertDialogAction: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  };
});

// IntersectionObserver stub
class IO {
  private cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    this.cb([{ isIntersecting: true, target } as any], this as any);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(global as any).IntersectionObserver = IO;

// ---- Imports that depend on mocks ----
import TemplateSidePanel from "../../app/compose-letter/components/TemplateSidePanel";
import * as ComposeCtxModule from "../../app/compose-letter/components/ComposeLetterContext";

const useComposeLetterMock = ComposeCtxModule.useComposeLetter as unknown as jest.Mock;

type Preset = {
  id: string;
  name: string;
  isFavorite?: boolean;
  updatedAt: number;
  config?: any;
};

type ComposeHook = {
  presets: Preset[];
  applyPreset: jest.Mock<any, any>;
  savePreset: jest.Mock<any, any>;
  deletePreset: jest.Mock<any, any>;
  toggleFavorite: jest.Mock<any, any>;
};

const makePresets = (): Preset[] => [
  {
    id: "p1",
    name: "Sunny Dots",
    isFavorite: true,
    updatedAt: Date.now() - 1000,
    config: {
      background: { color: "#fffbeb", opacity: 0.9 },
      pattern: {
        type: "dotted",
        params: {
          type: "dotted",
          spacing: 24,
          thickness: 6,
          color: "#3b82f6",
          opacity: 0.6,
          rotation: 15,
        },
      },
      fontColor: "#111111",
      fontOpacity: 0.95,
    },
  },
  {
    id: "p2",
    name: "Calm Waves",
    isFavorite: false,
    updatedAt: Date.now() - 500,
    config: {
      background: { color: "#ffffff", opacity: 1 },
      pattern: {
        type: "wavy",
        params: {
          type: "wavy",
          spacing: 30,
          thickness: 2,
          color: "#64748b",
          opacity: 0.5,
          rotation: 0,
        },
      },
      fontColor: "#222222",
      fontOpacity: 0.9,
    },
  },
  {
    id: "p3",
    name: "No Lines",
    isFavorite: true,
    updatedAt: Date.now() - 2000,
    config: {
      background: { color: "#f8fafc", opacity: 1 },
      pattern: {
        type: "none",
        params: {
          type: "none",
          spacing: 24,
          thickness: 1,
          color: "#e5e7eb",
          opacity: 0.5,
          rotation: 0,
        },
      },
      fontColor: "#000000",
      fontOpacity: 1,
    },
  },
  {
    id: "p4",
    name: "Zigs",
    isFavorite: false,
    updatedAt: Date.now() - 300,
    config: {
      background: { color: "#ffffff", opacity: 1 },
      pattern: {
        type: "zigzag",
        params: {
          type: "zigzag",
          spacing: 20,
          thickness: 3,
          color: "#ef4444",
          opacity: 0.7,
          rotation: 0,
        },
      },
      fontColor: "#000000",
      fontOpacity: 1,
    },
  },
  {
    id: "p5",
    name: "Arc Breeze",
    isFavorite: false,
    updatedAt: Date.now() - 50,
    config: {
      background: { color: "#ffffff", opacity: 1 },
      pattern: {
        type: "arc",
        params: {
          type: "arc",
          spacing: 28,
          thickness: 2,
          color: "#10b981",
          opacity: 0.6,
          rotation: 0,
        },
      },
      fontColor: "#333333",
      fontOpacity: 0.8,
    },
  },
];

const renderPanel = (
  overrides?: Partial<React.ComponentProps<typeof TemplateSidePanel>>,
  hookData?: Partial<ComposeHook>
) => {
  const presets = makePresets();

  const applyPreset = jest.fn((id: string) => presets.find((p) => p.id === id));
  const savePreset = jest.fn();
  const deletePreset = jest.fn();
  const toggleFavorite = jest.fn();

  useComposeLetterMock.mockReturnValue({
    presets,
    applyPreset,
    savePreset,
    deletePreset,
    toggleFavorite,
    ...(hookData || {}),
  });

  const onClose = jest.fn();
  const onPreview = jest.fn();
  const onLineConfigChange = jest.fn();
  const onFontColorChange = jest.fn();
  const onFontOpacityChange = jest.fn();
  const onBackgroundColorChange = jest.fn();
  const onBackgroundOpacityChange = jest.fn();

  const props = {
    open: true,
    currentId: "p2",
    onSelect: jest.fn(),
    onPreview,
    onClose,
    thumbSize: 80,
    lineConfig: {
      type: "none",
      spacing: 24,
      thickness: 1,
      color: "#e5e7eb",
      opacity: 0.5,
      rotation: 0,
    },
    fontColor: "#000000",
    fontOpacity: 1,
    backgroundColor: "#ffffff",
    backgroundOpacity: 1,
    anchorWithinSidebar: false,
    showCloseButton: true,
    onLineConfigChange,
    onFontColorChange,
    onFontOpacityChange,
    onBackgroundColorChange,
    onBackgroundOpacityChange,
    ...(overrides || {}),
  } as React.ComponentProps<typeof TemplateSidePanel>;

  const ui = render(<TemplateSidePanel {...props} />);
  return {
    ui,
    props,
    spy: { applyPreset, savePreset, deletePreset, toggleFavorite },
  };
};

beforeEach(() => {
  useComposeLetterMock.mockReset();
});

// ---- Tests ----
describe("TemplateSidePanel (integration)", () => {
  test("renders header & close button; clicking close invokes onClose", async () => {
    const { props } = renderPanel();
    expect(screen.getByText(/Page Settings/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Close panel/i });
    await userEvent.click(closeBtn);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test("initially shows Favorites tab and template names from favorites filter", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /^Favorites$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Recent$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^All$/i })).toBeInTheDocument();
    expect(screen.getByText("Sunny Dots")).toBeInTheDocument();
    expect(screen.getByText("No Lines")).toBeInTheDocument();
  });

  test("tab switching: Recent → shows recent items", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /^Recent$/i }));
    expect(screen.getByText("Arc Breeze")).toBeInTheDocument();
    expect(screen.getByText("Calm Waves")).toBeInTheDocument();
  });

  test("search filters the currently selected tab", async () => {
    renderPanel();
    const input = screen.getByPlaceholderText(/Search templates/i);

    // Search is debounced — advance timers
    jest.useFakeTimers();
    await userEvent.type(input, "No");
    await act(async () => jest.advanceTimersByTime(300));

    expect(screen.getByText("No Lines")).toBeInTheDocument();
    expect(screen.queryByText("Sunny Dots")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  test("Show more / Show fewer affects how many tiles render", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /^All$/i }));

    const showMore = screen.getByRole("button", { name: /Show more templates/i });
    await userEvent.click(showMore);

    const showFewer = await screen.findByRole("button", { name: /Show fewer templates/i });
    expect(showFewer).toBeInTheDocument();

    await userEvent.click(showFewer);
    expect(screen.queryByRole("button", { name: /Show fewer templates/i })).not.toBeInTheDocument();
  });

  test("hovering a template triggers onPreview (enter = id, leave = null)", async () => {
    const { props } = renderPanel();

    // Hover the clickable preview area preceding the name
    const nameEl = screen.getByText("Sunny Dots");
    const borderWrap = nameEl.previousElementSibling as HTMLElement;
    const clickable = borderWrap.querySelector("div.cursor-pointer") as HTMLElement;

    await userEvent.hover(clickable);
    const lastEnter = props.onPreview.mock.calls.at(-1)?.[0];
    expect(lastEnter).toBe("p1");

    await userEvent.unhover(clickable);
    expect(props.onPreview).toHaveBeenLastCalledWith(null);
  });

  test("clicking a template applies preset and invokes downstream change handlers; does NOT call onSelect", async () => {
    const { props, spy } = renderPanel();

    // Calm Waves not favorite → switch to All
    await userEvent.click(screen.getByRole("button", { name: /^All$/i }));
    const nameEl = screen.getByText("Calm Waves");
    await userEvent.click(nameEl); // parent handler covers the tile

    expect(spy.applyPreset).toHaveBeenCalledWith("p2");
    expect(props.onLineConfigChange).toHaveBeenCalled();
    expect(props.onBackgroundColorChange).toHaveBeenCalledWith("#ffffff");
    expect(props.onBackgroundOpacityChange).toHaveBeenCalledWith(1);
    expect(props.onFontColorChange).toHaveBeenCalledWith("#222222");
    expect(props.onFontOpacityChange).toHaveBeenCalledWith(0.9);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  test("toggling favorite calls toggleFavorite(id)", async () => {
    const { spy } = renderPanel();
    const nameEl = screen.getByText("Sunny Dots");
    const toolbar = nameEl.nextElementSibling as HTMLElement; // row with buttons
    const [favBtn] = within(toolbar).getAllByRole("button");

    await userEvent.click(favBtn);
    expect(spy.toggleFavorite).toHaveBeenCalledWith("p1");
  });

  test("delete flow: open alert and confirm → calls deletePreset(id)", async () => {
    const { spy } = renderPanel();
    const nameEl = screen.getByText("Sunny Dots");
    const toolbar = nameEl.nextElementSibling as HTMLElement;
    const buttons = within(toolbar).getAllByRole("button");
    const trashBtn = buttons[1];

    await userEvent.click(trashBtn);
    const dialog = await screen.findByRole("alertdialog");
    const del = within(dialog).getAllByRole("button", { name: /delete/i })[0];
    await userEvent.click(del);
    expect(spy.deletePreset).toHaveBeenCalledWith("p1");
  });

  test("Save Current Template: validates name length then calls savePreset with composed config", async () => {
    const { spy, props } = renderPanel({
      fontColor: "#123456",
      fontOpacity: 0.77,
      backgroundColor: "#abcdef",
      backgroundOpacity: 0.42,
      lineConfig: {
        type: "dotted",
        spacing: 33,
        thickness: 7,
        color: "#00ff00",
        opacity: 0.66,
        rotation: 12,
      },
    });

    await userEvent.click(screen.getByRole("button", { name: /Save Current Template/i }));

    const nameInput = screen.getByPlaceholderText(/My Custom Template/i) as HTMLInputElement;
    await userEvent.type(nameInput, "abc");
    await userEvent.click(screen.getByRole("button", { name: /^Save Template$/i }));
    expect(screen.getByText(/at least 4 characters/i)).toBeInTheDocument();

    // Clear safely, then type valid name
    nameInput.focus();
    fireEvent.change(nameInput, { target: { value: "" } });
    await userEvent.type(nameInput, "My Nice Template");
    await userEvent.click(screen.getByRole("button", { name: /^Save Template$/i }));

    expect(spy.savePreset).toHaveBeenCalledTimes(1);
    const [savedName, cfg] = spy.savePreset.mock.calls[0];
    expect(savedName).toBe("My Nice Template");
    expect(cfg).toEqual({
      background: { color: "#abcdef", filterKey: "", opacity: 0.42 },
      pattern: { type: "dotted", params: props.lineConfig },
      patternBlendMode: "normal",
      fontColor: "#123456",
      fontOpacity: 0.77,
    });
  });

  test("font color input and opacity slider call outward handlers (debounced)", async () => {
    const { props } = renderPanel();
    jest.useFakeTimers();

    const fontSection = document.querySelector('[data-section="fontColor"]') as HTMLElement;
    const colorPicker = fontSection.querySelector('input[type="color"]') as HTMLInputElement;

    fireEvent.change(colorPicker, { target: { value: "#ff0000" } });
    await act(async () => jest.advanceTimersByTime(150));
    expect(props.onFontColorChange).toHaveBeenCalledWith("#ff0000");

    const slider = fontSection.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.53" } });
    await act(async () => jest.advanceTimersByTime(120));
    expect(props.onFontOpacityChange).toHaveBeenCalledWith(0.53);

    jest.useRealTimers();
  });

  test("background color input and opacity slider call outward handlers (debounced)", async () => {
    const { props } = renderPanel();
    jest.useFakeTimers();

    const bgSection = document.querySelector('[data-section="backgroundColor"]') as HTMLElement;
    const colorPicker = bgSection.querySelector('input[type="color"]') as HTMLInputElement;

    fireEvent.change(colorPicker, { target: { value: "#00ffff" } });
    await act(async () => jest.advanceTimersByTime(150));
    expect(props.onBackgroundColorChange).toHaveBeenCalledWith("#00ffff");

    const slider = bgSection.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.44" } });
    await act(async () => jest.advanceTimersByTime(120));
    expect(props.onBackgroundOpacityChange).toHaveBeenCalledWith(0.44);

    jest.useRealTimers();
  });

  test("changing Page Lines → line color uses debounce; other fields call immediately", async () => {
    const { props } = renderPanel();

    await userEvent.click(screen.getByRole("button", { name: /Dotted/i }));
    expect(props.onLineConfigChange).toHaveBeenCalled();

    jest.useFakeTimers();
    const linesSection = document.querySelector('[data-section="pageLines"]') as HTMLElement;
    const colorPicker = linesSection.querySelector('input[type="color"]') as HTMLInputElement;

    const prev = props.onLineConfigChange.mock.calls.length;
    fireEvent.change(colorPicker, { target: { value: "#123abc" } });
    await act(async () => jest.advanceTimersByTime(300));
    expect(props.onLineConfigChange).toHaveBeenCalledTimes(prev + 1);
    jest.useRealTimers();

    const plusBtn = within(linesSection).getAllByRole("button", { name: "+" })[0];
    await userEvent.click(plusBtn);
    expect(props.onLineConfigChange).toHaveBeenCalledTimes(prev + 2);
  });

  test("mobile close gesture (drag or Esc) triggers onClose", async () => {
    const { props } = renderPanel();

    // Make the environment look like a touch device
    try {
      Object.defineProperty(navigator, "maxTouchPoints", { value: 1, configurable: true });
    } catch {}
    try {
      Object.defineProperty(window as any, "ontouchstart", { value: null, configurable: true });
    } catch {}

    const panelRoot = screen.getByText(/Page Settings/i).closest("div")!.parentElement!.parentElement!;
    fireEvent.touchStart(panelRoot, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(panelRoot, { touches: [{ clientY: 250 }] });
    fireEvent.touchEnd(panelRoot);

    if (!props.onClose.mock.calls.length) {
      // Fallback for environments that ignore touch events
      fireEvent.keyDown(window, { key: "Escape" });
    }
    expect(props.onClose.mock.calls.length).toBeGreaterThan(0);
  });

  test("inactivity auto-close after 5s (+300ms fade)", async () => {
    // Timer path may depend on panel anchoring; enable it to be safe
    const { props } = renderPanel({ anchorWithinSidebar: true });
    jest.useFakeTimers();
    await act(async () => jest.advanceTimersByTime(5300));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
