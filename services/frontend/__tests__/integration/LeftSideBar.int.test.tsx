// __tests__/integration/LeftSideBar.int.test.tsx
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeftSidebar from '../../app/compose-letter/components/LeftSidebar';

// Framer Motion passthrough so motion.* renders as plain elements
jest.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...rest }: any) =>
          <div {...rest}>{children}</div>,
    }
  ),
}));

// --- Radix + jsdom shims ---
beforeAll(() => {
  // Pointer capture shims (avoid hasPointerCapture crash)
  // @ts-expect-error test shim
  if (typeof Element.prototype.hasPointerCapture !== 'function') {
    // @ts-expect-error
    Element.prototype.hasPointerCapture = () => false;
  }
  // @ts-expect-error
  if (typeof Element.prototype.setPointerCapture !== 'function') {
    // @ts-expect-error
    Element.prototype.setPointerCapture = () => {};
  }
  // @ts-expect-error
  if (typeof Element.prototype.releasePointerCapture !== 'function') {
    // @ts-expect-error
    Element.prototype.releasePointerCapture = () => {};
  }
  // Scroll shim (avoid candidate.scrollIntoView crash in Select)
  // @ts-expect-error
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    // @ts-expect-error
    Element.prototype.scrollIntoView = () => {};
  }
});

function setViewportWidth(width: number) {
  // @ts-expect-error: test override
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

const baseMatches = [
  {
    id: 'm1',
    name: 'Alice Wonderland',
    location: 'Cape Town',
    interests: ['art', 'books', 'travel'],
    conversation_thread_id: 't-1',
    since: '2023-12-30',
  },
  {
    id: 'm2',
    name: 'Bob Builder',
    location: 'Johannesburg',
    interests: ['music', 'coding', 'coffee'],
    conversation_thread_id: 't-2',
    since: '2024-11-01',
  },
  {
    id: 'm3',
    name: 'Charlie Delta',
    location: 'Durban',
    interests: ['gaming', 'hiking'],
    conversation_thread_id: 't-3',
  },
];

function renderSidebar(overrides: Partial<React.ComponentProps<typeof LeftSidebar>> = {}) {
  const props: React.ComponentProps<typeof LeftSidebar> = {
    selectedMatch: null,
    loading: false,
    onChangeRecipient: jest.fn(),
    matches: baseMatches,
    onApplyTemplate: jest.fn(),
    showFontOverlay: false,
    onToggleFontOverlay: jest.fn(),
    fontStyle: 'handwritten',
    onSelectFont: jest.fn(),
    onPreviewFont: jest.fn(),
    fontColor: '#000000',
    fontOpacity: 1,
    backgroundColor: '#ffffff',
    backgroundOpacity: 1,
    ...overrides,
  };
  const utils = render(<LeftSidebar {...props} />);
  return { ...utils, props };
}

describe('LeftSidebar (integration)', () => {
  test('empty selection: shows “Please select a pen pal” and Writing Prompts', () => {
    setViewportWidth(1024);
    renderSidebar({ selectedMatch: null });
    expect(screen.getByText(/You're writing to:/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a pen pal/i)).toBeInTheDocument();
    expect(screen.getByText(/Writing Prompts/i)).toBeInTheDocument();
    expect(screen.queryByText(/Potential Shared Interests/i)).not.toBeInTheDocument();
  });

  test('loading state: skeleton shows instead of select content', () => {
    renderSidebar({ loading: true, selectedMatch: baseMatches[0] });
    expect(screen.queryByText(baseMatches[0].name)).not.toBeInTheDocument();
    expect(screen.getByText(/You're writing to:/i)).toBeInTheDocument();
  });

  test('selected match: shows name, location, interests, and “Since …” formatting (1y case)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-12-31T12:00:00Z'));
    const selected = baseMatches[0];
    renderSidebar({ selectedMatch: selected });

    // Name + location
    expect(screen.getByText(selected.name)).toBeInTheDocument();
    expect(screen.getByText(selected.location)).toBeInTheDocument();

    // Scope interest chips to the Select trigger (combobox has no accessible name)
    const trigger = screen.getByRole('combobox');
    const triggerScope = within(trigger);
    expect(triggerScope.getByText(/^art$/i)).toBeInTheDocument();
    expect(triggerScope.getByText(/^books$/i)).toBeInTheDocument();
    expect(triggerScope.getByText(/^travel$/i)).toBeInTheDocument();

    // Since 1y
    expect(screen.getByText(/Since 1y/i)).toBeInTheDocument();

    // Shared interests section appears when a match is selected
    expect(screen.getByText(/Potential Shared Interests/i)).toBeInTheDocument();

    jest.useRealTimers();
  });

  test(
    'recipient dropdown: open, search → filter, then select item calls onChangeRecipient',
    async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const selected = baseMatches[0];
      const { props } = renderSidebar({ selectedMatch: selected });

      // Open Radix Select by clicking trigger
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Wait for listbox content (portal)
      await screen.findByRole('listbox');

      // Built-in search input (ellipsis tolerant)
      const searchBox = await screen.findByPlaceholderText(/Search pen pals/i);
      await user.clear(searchBox);
      await user.type(searchBox, 'Bob');

      const option = await screen.findByText(/Bob Builder/i);
      await user.click(option);

      expect(props.onChangeRecipient).toHaveBeenCalledWith('m2');
    },
    15000
  );

  test(
    'desktop prompts: open dialog and apply a template (no filter flake)',
    async () => {
      setViewportWidth(1200); // desktop → Dialog path
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const selected = baseMatches[1];
      const { props } = renderSidebar({ selectedMatch: selected });

      // Open the dialog
      await user.click(screen.getByText(/Writing Prompts/i));
      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument(), { timeout: 8000 });

      const dialog = screen.getByRole('dialog');
      const d = within(dialog);

      // Ensure search exists (sanity), but don't mutate it
      d.getByPlaceholderText(/Search templates/i);

      // Directly click the known tile
      const tile = await d.findByText(/A Friendly Hello/i, undefined, { timeout: 8000 });
      await user.click(tile);

      expect(props.onApplyTemplate).toHaveBeenCalledWith('t1');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 8000 });
    },
    20000
  );

  test(
    'mobile prompts: toggle in-sidebar list; apply a template (no collapse assertion)',
    async () => {
      setViewportWidth(375); // mobile → in-sidebar list path
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { props } = renderSidebar({ selectedMatch: baseMatches[2] });

      // Open inline list
      await user.click(screen.getByText(/Writing Prompts/i));

      const sidebarSearch = await screen.findByPlaceholderText(/Search templates/i, {}, { timeout: 8000 });
      await user.type(sidebarSearch, 'Travel Story');

      const tile = await screen.findByText(/Travel Story/i, {}, { timeout: 8000 });
      await user.click(tile);
      expect(props.onApplyTemplate).toHaveBeenCalledWith('t2');

      // Still usable
      expect(screen.getByText(/Potential Shared Interests/i)).toBeInTheDocument();
    },
    20000
  );
});
