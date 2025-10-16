// __tests__/MainContent.integration.test.jsx
// 🔧 Adjust the import path below to where MainContent actually lives in your repo
import React from 'react';
import { render, screen, waitFor, fireEvents,within  } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import MainContent from '../../app/compose-letter/components/MainContent';

// Radix UI dialogs can log noisy accessibility warnings in tests.
// If your project-level jest.setup.js already filters console, you can remove this.
const origError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = String(args[0] ?? '');
    if (/Missing `Description`|aria-describedby/i.test(msg)) return;
    origError(...args);
  };
});
afterAll(() => (console.error = origError));
// ---- BEGIN TEST-LOCAL MOCKS (must be before imports) ----
/**
 * Why: MainContent -> patternGenerators (ESM via d3-shape) crashes in Jest's integration config.
 * We stub the exports MainContent touches so UI flows can be tested without ESM transforms.
 */
jest.mock('../../app/compose-letter/utils/patternGenerators', () => {
  // Minimal, stable surface for MainContent to consume.
  // Add/rename keys if your component calls more helpers.
  const NOOP = () => undefined;

  const patterns = [
    { id: 'none', label: 'None' },
    { id: 'grid', label: 'Grid' },
    { id: 'dots', label: 'Dots' },
  ];

  return {
    __esModule: true,

    // Common lookups used by UIs (names may differ in your codebase — adjust if needed)
    LIST: patterns,
    DEFAULT_PATTERNS: patterns,
    getAllPatterns: () => patterns,
    getPatternById: (id: string) => patterns.find(p => p.id === id) ?? patterns[0],

    // Render-time helpers — keep outputs deterministic
    generatePatternDataURL: async () => 'data:image/png;base64,AA==',
    generatePatternSVG: () => '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    registerCanvasPatterns: NOOP,
    makePatternById: NOOP,
    computeStrokePath: NOOP,
  };
});
// ---- END TEST-LOCAL MOCKS ----

// This module is imported by MainContent; keep it simple for integration tests
jest.mock('../../lib/listFormatting', () => ({
  applyCustomList: jest.fn(),
  wrapSelectionInList: jest.fn(),
}));

function renderMainContent(overrides = {}) {
  const props = {
    letterContent: '',
    setLetterContent: jest.fn(),
    fontStyle: 'serif',
    fontSize: [16],
    fontColor: '#000000',
    fontOpacity: 1,
    backgroundColor: '#ffffff',
    backgroundOpacity: 1,
    success: false,
    letterHeading: 'To a kindred spirit,',
    setLetterHeading: jest.fn(),
    letterFooterPrefix: 'Yours,',
    setLetterFooterPrefix: jest.fn(),
    setFontStyle: jest.fn(),
    setFontSize: jest.fn(),
    anonymousHandle: '',
    onNewLetter: jest.fn(),
    sending: false,
    previewFontIdExternal: null,
    onToggleFontOverlay: jest.fn(),
    overlayFontOpen: false,
    templateBackground: null,
    onToggleTemplates: jest.fn(),
    toggleLeftSidebar: jest.fn(),
    templateData: undefined,
    ...overrides,
  };

  const utils = render(<MainContent {...props} />);
  // Handy handle for the contenteditable editor:
  const editor = utils.container.querySelector('[contenteditable="true"]');
  return { ...utils, props, editor };
}

// Small helpers to set/get the editor text like a user would.
function setEditorHtml(editor, html) {
  editor.innerHTML = html;
  // Trigger the component's input handler
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}
function getEditorText(editor) {
  return editor.textContent || '';
}

describe('MainContent (integration)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    // Some tests stub fetch:
    if (global.fetch && 'mockClear' in global.fetch) global.fetch.mockClear();
  });

  test('initial render: shows toolbar + editor affordances', () => {
    const { editor } = renderMainContent();
    expect(editor).toBeTruthy();

    // Fonts button (top-left)
    expect(screen.getByRole('button', { name: /fonts/i })).toBeInTheDocument();

    // Grammar button is accessible via its aria-label
    expect(screen.getByLabelText('check-grammar')).toBeInTheDocument();

    // Clear Letter icon button
    expect(screen.getByLabelText('clear-letter')).toBeInTheDocument();

    // Templates button is visible
    expect(screen.getByRole('button', { name: /templates/i })).toBeInTheDocument();
  });

  test('clicking Fonts calls onToggleFontOverlay', async () => {
    const onToggleFontOverlay = jest.fn();
    renderMainContent({ onToggleFontOverlay });

    await userEvent.click(screen.getByRole('button', { name: /fonts/i }));
    expect(onToggleFontOverlay).toHaveBeenCalledTimes(1);
  });

  test('success banner appears when success=true', () => {
    renderMainContent({ success: true });
    expect(
      screen.getByText(/Your letter has been sent successfully!/i)
    ).toBeInTheDocument();
  });

  test('Templates button calls onToggleTemplates', async () => {
    const onToggleTemplates = jest.fn();
    renderMainContent({ onToggleTemplates });

    await userEvent.click(screen.getByRole('button', { name: /templates/i }));
    expect(onToggleTemplates).toHaveBeenCalledTimes(1);
  });

  test('Clear Letter flow: cancel then confirm', async () => {
    const onNewLetter = jest.fn();
    renderMainContent({ onNewLetter });

    // Open confirm dialog
    await userEvent.click(screen.getByLabelText('clear-letter'));
    expect(await screen.findByText(/Clear this letter\?/i)).toBeInTheDocument();

    // Cancel closes the dialog
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByText(/Clear this letter\?/i)).not.toBeInTheDocument()
    );

    // Confirm path
    await userEvent.click(screen.getByLabelText('clear-letter'));
    await userEvent.click(await screen.findByRole('button', { name: /clear letter/i }));
    expect(onNewLetter).toHaveBeenCalledTimes(1);
  });

  test('Grammar: empty editor → opens dialog and shows Perfect state without calling fetch', async () => {
    const { editor } = renderMainContent();
    expect(getEditorText(editor)).toBe(''); // starts empty

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [] }),
    });

    await userEvent.click(screen.getByLabelText('check-grammar'));

    // The component early-returns on empty text, so no network call:
    expect(fetchSpy).not.toHaveBeenCalled();

    // Dialog shows "Perfect!" and helpful copy
    expect(await screen.findByText(/Perfect!/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No grammar or spelling issues were found/i)
    ).toBeInTheDocument();

    // Close the dialog
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    await waitFor(() =>
      expect(screen.queryByText(/Perfect!/i)).not.toBeInTheDocument()
    );
  });

test('Grammar: successful API return → shows suggestions and applying a fix edits the editor content', async () => {
  // Mount and get editor handle (replace renderMain with your helper if named differently)
  const { editor } = renderMainContent();

  // Seed text that should trigger suggestions
  await act(async () => setEditorHtml(editor, 'Ths is a tset.'));

  // Stub fetch to return two suggestions (LanguageTool-like shape)
  const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({
      matches: [
        {
          message: 'Possible spelling mistake found',
          offset: 0,
          length: 3,
          replacements: [{ value: 'This' }],
          rule: { id: 'MISC', description: 'Spelling' },
        },
        {
          message: 'Possible spelling mistake found',
          offset: 10,
          length: 4,
          replacements: [{ value: 'test' }],
          rule: { id: 'MISC', description: 'Spelling' },
        },
      ],
    }),
  } as any);

  // Open the grammar dialog
  await userEvent.click(screen.getByLabelText('check-grammar'));

  // Scope to the dialog and assert heading
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: /Grammar Check/i })).toBeInTheDocument();

  // Wait for suggestion "Fix" buttons created from the mocked matches
  const fixButtons = await within(dialog).findAllByRole('button', { name: /^Fix$/ });
  expect(fixButtons.length).toBeGreaterThan(0);

  // Apply the first fix
  await userEvent.click(fixButtons[0]);

  // Editor content should reflect at least the first fix;
  // many UIs also auto-apply both in sequence, so be flexible
  const updated = getEditorText(editor);
  expect(updated).toMatch(/This is a (tset|test)\./i);

  // Clean up fetch mock
  fetchMock.mockRestore();
});


test('Grammar: API failure → falls back to basic checks; Apply All Fixes updates text and closes dialog', async () => {
  // Mount and get editor + props (capture props so we can assert setLetterContent)
  const { editor, props } = renderMainContent(); // <-- added props

  // Seed text with double space to exercise whitespace fix in fallback
  await act(async () => setEditorHtml(editor, 'i  forgot.'));

  // Mock fetch to fail initially, forcing fallback behavior
  const fetchMock = jest.spyOn(global, 'fetch' as any).mockRejectedValueOnce(new Error('Network down'));

  // Open dialog
  await userEvent.click(screen.getByLabelText('check-grammar'));

  // Wait for dialog to appear after grammar check completes (even with failure)
  const dialog = await screen.findByRole('dialog', {}, { timeout: 5000 });
  expect(within(dialog).getByRole('heading', { name: /Grammar Check/i })).toBeInTheDocument();

  // Apply all fixes (fallback path renders this control)
  await userEvent.click(await within(dialog).findByRole('button', { name: /Apply All Fixes/i }));

  // Fallback may collapse spaces; assert tolerantly
  const content = getEditorText(editor);
  expect(content).toMatch(/^I\s*forgot\.$/);

  // Parent setter should receive the same corrected value
  expect(props.setLetterContent).toHaveBeenCalledWith(expect.stringMatching(/^I\s*forgot\.$/));

  // Dialog closed
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  // Cleanup
  fetchMock.mockRestore();
});



});
