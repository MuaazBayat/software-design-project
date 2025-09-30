// __tests__/integration/RightSidebar.int.test.tsx
import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ----- Mocks that make child components predictable & test-friendly -----

// Some code paths are mobile-only in related components; ensure we're not blocked by viewport checks
jest.mock('../../hooks/use-mobile', () => ({ useIsMobile: () => true }));
jest.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));

// Mock TemplateSidePanel so we can trigger its important callbacks from the test
jest.mock(
  '../../app/compose-letter/components/TemplateSidePanel',
  () => ({
    __esModule: true,
    default: ({
      onClose,
      onSelect,
      onPreview,
      onLineConfigChange,
    }: {
      onClose?: () => void;
      onSelect?: (id: string | null) => void;
      onPreview?: (id: string | null) => void;
      onLineConfigChange?: (cfg: any) => void;
    }) => {
      return (
        <div data-testid="mock-template-side-panel">
          <button onClick={() => onClose?.()} aria-label="Close Templates">Close Templates</button>
          <button onClick={() => onSelect?.('minimal')} aria-label="Select Minimal">Select Minimal</button>
          <button onClick={() => onPreview?.('ziggy')} aria-label="Preview Ziggy">Preview Ziggy</button>
          <button onClick={() => onLineConfigChange?.({ type: 'dotted', thickness: 3 })} aria-label="Apply Dotted">Apply Dotted</button>
        </div>
      );
    },
  })
);

// Mock LetterSendAnimation: when shown, immediately call onAnimationComplete; also render a Cancel button
let __autoCompleteSendAnimation = true;
export const __setSendAnimationAutoComplete = (v: boolean) => {
  __autoCompleteSendAnimation = v;
};

jest.mock(
  '../../app/compose-letter/components/LetterSendAnimation',
  () => ({
    __esModule: true,
    default: ({
      show,
      onAnimationComplete,
      onCancel,
    }: {
      show: boolean;
      onAnimationComplete?: () => void;
      onCancel?: () => void;
    }) => {
      React.useEffect(() => {
        if (show && __autoCompleteSendAnimation) onAnimationComplete?.();
      }, [show, onAnimationComplete]);
      return (
        <div role="dialog" aria-label="Send Animation" data-testid="mock-send-animation">
          <button onClick={() => onCancel?.()} aria-label="Cancel Send">Cancel Send</button>
        </div>
      );
    },
  })
);
// ----- Import the component under test -----
import RightSidebar from '../../app/compose-letter/components/RightSidebar';

// ----- Helpers -----
const nf = new Intl.NumberFormat();

function renderSidebar(overrides: Partial<React.ComponentProps<typeof RightSidebar>> = {}) {
  const onSend = jest.fn();
  const onExportPDF = jest.fn();
  const onExportJPG = jest.fn();
  const onSelectTemplate = jest.fn();
  const onPreviewTemplate = jest.fn();
  const setTemplatesOpen = jest.fn();
  const onLineConfigChange = jest.fn();
  const onFontColorChange = jest.fn();
  const onFontOpacityChange = jest.fn();
  const onBackgroundColorChange = jest.fn();
  const onBackgroundOpacityChange = jest.fn();

  const props: React.ComponentProps<typeof RightSidebar> = {
    onSend,
    onExportPDF,
    onExportJPG,
    sending: false,
    sendDisabled: false,
    wordCount: 123,
    charCount: 1234,
    readingTime: 3,
    readability: 'B2',
    selectedMatch: { id: '1', name: 'Alice', location: 'Cape Town', interests: [], conversation_thread_id: 't1' },
    anonymousHandle: 'Anon',
    fontStyle: 'handwritten',
    templateBackground: null,
    onSelectTemplate,
    onPreviewTemplate,
    templatesOpen: false,
    setTemplatesOpen,
    lineConfig: { type: 'none', spacing: 24, thickness: 2, color: '#333333', opacity: 0.8, rotation: 0 },
    onLineConfigChange,
    fontColor: '#000000',
    onFontColorChange,
    fontOpacity: 1,
    onFontOpacityChange,
    backgroundColor: '#ffffff',
    onBackgroundColorChange,
    backgroundOpacity: 1,
    onBackgroundOpacityChange,
    ...overrides,
  };

  const utils = render(<RightSidebar {...props} />);
  return { ...utils, props };
}

// ---------------------- Tests ----------------------

describe('RightSidebar (integration)', () => {
test('initial render: shows letter preview header, recipient/sender, stats and readability', () => {
  const { props } = renderSidebar();

  // Header
  expect(screen.getByText(/Letter Preview/i)).toBeInTheDocument();

  // Recipient and Sender labels
  expect(screen.getByText('To')).toBeInTheDocument();
  expect(screen.getByText(props.selectedMatch!.name)).toBeInTheDocument();
  expect(screen.getByText('From')).toBeInTheDocument();
  expect(screen.getByText(props.anonymousHandle!)).toBeInTheDocument();

  // Word count card (scope to the card, then to the numeric <p>)
  const wordsCardLabel = screen.getByText(/Words/i);
  const wordsCard = wordsCardLabel.closest('[data-slot="card"]') ?? wordsCardLabel.parentElement!;
  expect(
    within(wordsCard).getByText((_, node) => {
      const digits = (node?.textContent ?? '').replace(/[^\d]/g, '');
      return digits === String(props.wordCount); // '123'
    }, { selector: 'p' })
  ).toBeInTheDocument();

  // Character count card (scope to the card, then to the numeric <p>)
  const charsCardLabel = screen.getByText(/Characters/i);
  const charsCard = charsCardLabel.closest('[data-slot="card"]') ?? charsCardLabel.parentElement!;
  expect(
    within(charsCard).getByText((_, node) => {
      const digits = (node?.textContent ?? '').replace(/[^\d]/g, '');
      return digits === String(props.charCount); // '1234'
    }, { selector: 'p' })
  ).toBeInTheDocument();

  // Reading time (~3min)
  expect(screen.getByText(/~3min/i)).toBeInTheDocument();

  // Readability and info
  expect(screen.getByText('B2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Show readability details/i })).toBeInTheDocument();
});


  test('readability details dialog opens via info button', async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole('button', { name: /Show readability details/i }));
    // Dialog header text should appear
    expect(await screen.findByText(/Readability Rating \(CEFR\)/i)).toBeInTheDocument();
  });

  test('Send flow: uses onExportJPG callback, opens dialog, and calls onSend when animation completes', async () => {
    const { props } = renderSidebar();

    // Make onExportJPG mimic the "callback with data URL" contract
    props.onExportJPG!.mockImplementation((cb?: (dataUrl: string | null) => void) => {
      cb?.('data:image/jpeg;base64,ABC');
    });

    await userEvent.click(screen.getByRole('button', { name: /Send Letter/i }));

    // Dialog should open and then auto-complete via mocked LetterSendAnimation
    await waitFor(() => expect(props.onSend).toHaveBeenCalledTimes(1));

    // After completion, dialog should close
    await waitFor(() => {
      const dialogs = screen.queryAllByRole('dialog');
      expect(dialogs.length).toBe(0);
    });

    // onExportJPG should have been called once
    expect(props.onExportJPG).toHaveBeenCalledTimes(1);
  });

test('Send flow: user cancels (Cancel button), dialog closes and onSend is NOT called', async () => {
  const { props } = renderSidebar();

  // Keep the export callback behavior
  props.onExportJPG!.mockImplementation((cb?: (dataUrl: string | null) => void) => {
    cb?.(null);
  });

  // Turn OFF auto-complete so the dialog stays open and shows the Cancel button
  __setSendAnimationAutoComplete(false);

  await userEvent.click(screen.getByRole('button', { name: /Send Letter/i }));

  const cancel = await screen.findByRole('button', { name: /Cancel Send/i });
  await userEvent.click(cancel);

  // Dialog should close
  await waitFor(() => {
    const dialogs = screen.queryAllByRole('dialog');
    expect(dialogs.length).toBe(0);
  });

  // onSend should not have fired
  expect(props.onSend).not.toHaveBeenCalled();

  // Reset mock behavior for any subsequent tests
  __setSendAnimationAutoComplete(true);
});

  test('Export dropdown: Export as PDF and Export as JPG items trigger respective callbacks', async () => {
    const { props, container } = renderSidebar();

    // The dropdown trigger is the second button in the "Send" row
    const sendRow = container.querySelector('div.mb-8')!;
    const buttons = within(sendRow).getAllByRole('button');
    // buttons[0] -> "Send Letter", buttons[1] -> icon-only dropdown trigger
    await userEvent.click(buttons[1]);

    // Click "Export as PDF"
    await userEvent.click(await screen.findByText(/Export as PDF/i));
    expect(props.onExportPDF).toHaveBeenCalledTimes(1);

    // Open again for JPG
    await userEvent.click(buttons[1]);
    await userEvent.click(await screen.findByText(/Export as JPG/i));
    expect(props.onExportJPG).toHaveBeenCalledTimes(1); // called with no args in this path
  });

  test('TemplateSidePanel open: forwards callbacks (close, select, preview, line config)', async () => {
    const onSelectTemplate = jest.fn();
    const onPreviewTemplate = jest.fn();
    const setTemplatesOpen = jest.fn();
    const onLineConfigChange = jest.fn();

    renderSidebar({
      templatesOpen: true,
      onSelectTemplate,
      onPreviewTemplate,
      setTemplatesOpen,
      onLineConfigChange,
    });

    // Our mock panel is visible
    expect(screen.getByTestId('mock-template-side-panel')).toBeInTheDocument();

    // Close templates
    await userEvent.click(screen.getByRole('button', { name: /Close Templates/i }));
    expect(setTemplatesOpen).toHaveBeenCalledWith(false);

    // Select a template
    await userEvent.click(screen.getByRole('button', { name: /Select Minimal/i }));
    expect(onSelectTemplate).toHaveBeenCalledWith('minimal');

    // Preview a template
    await userEvent.click(screen.getByRole('button', { name: /Preview Ziggy/i }));
    expect(onPreviewTemplate).toHaveBeenCalledWith('ziggy');

    // Apply a line config change from within the panel
    await userEvent.click(screen.getByRole('button', { name: /Apply Dotted/i }));
    expect(onLineConfigChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'dotted' }));
  });

  test('Send button reflects disabled/sending states', async () => {
    const { rerender } = render(
      <RightSidebar
        onSend={jest.fn()}
        onExportPDF={jest.fn()}
        onExportJPG={jest.fn()}
        sendDisabled={true}
        sending={false}
        wordCount={0}
        charCount={0}
        readingTime={'~1min'}
        readability={'A2'}
        selectedMatch={{ id: '1', name: 'Alice', location: '', interests: [], conversation_thread_id: 't1' }}
        anonymousHandle="Anon"
        fontStyle="handwritten"
        templateBackground={null}
        onSelectTemplate={jest.fn()}
        onPreviewTemplate={jest.fn()}
        templatesOpen={false}
        setTemplatesOpen={jest.fn()}
        lineConfig={{ type: 'none', spacing: 24, thickness: 2, color: '#333', opacity: 0.8, rotation: 0 }}
        onLineConfigChange={jest.fn()}
        fontColor="#000"
        onFontColorChange={jest.fn()}
        fontOpacity={1}
        onFontOpacityChange={jest.fn()}
        backgroundColor="#fff"
        onBackgroundColorChange={jest.fn()}
        backgroundOpacity={1}
        onBackgroundOpacityChange={jest.fn()}
      />
    );

    const sendBtn = screen.getByRole('button', { name: /Send Letter/i });
    expect(sendBtn).toBeDisabled();

    // Update to "sending"
    rerender(
      <RightSidebar
        onSend={jest.fn()}
        onExportPDF={jest.fn()}
        onExportJPG={jest.fn()}
        sendDisabled={false}
        sending={true}
        wordCount={0}
        charCount={0}
        readingTime={'~1min'}
        readability={'A2'}
        selectedMatch={{ id: '1', name: 'Alice', location: '', interests: [], conversation_thread_id: 't1' }}
        anonymousHandle="Anon"
        fontStyle="handwritten"
        templateBackground={null}
        onSelectTemplate={jest.fn()}
        onPreviewTemplate={jest.fn()}
        templatesOpen={false}
        setTemplatesOpen={jest.fn()}
        lineConfig={{ type: 'none', spacing: 24, thickness: 2, color: '#333', opacity: 0.8, rotation: 0 }}
        onLineConfigChange={jest.fn()}
        fontColor="#000"
        onFontColorChange={jest.fn()}
        fontOpacity={1}
        onFontOpacityChange={jest.fn()}
        backgroundColor="#fff"
        onBackgroundColorChange={jest.fn()}
        backgroundOpacity={1}
        onBackgroundOpacityChange={jest.fn()}
      />
    );

    // Button text changes to "Sending..." and remains disabled
    expect(screen.getByRole('button', { name: /Sending.../i })).toBeDisabled();
  });
});
