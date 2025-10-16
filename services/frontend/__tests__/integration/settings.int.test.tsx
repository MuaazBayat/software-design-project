// __tests__/integration/settings.int.test.tsx — robust Radix Select handling in JSDOM
// Edits in this patch:
// 1) Polyfilled Element pointer capture APIs (has/set/releasePointerCapture) to satisfy Radix Select.
// 2) Polyfilled Element.scrollIntoView to avoid Floating UI / SelectContent errors in JSDOM.
// 3) Opened Selects via keyboard (focus + Enter) which is more reliable in JSDOM than mouse.
// 4) After opening, we wait for the listbox to mount, then locate options by visible text.
// 5) Hardened trigger discovery helper for Radix-triggered <button>/<div role="combobox"> patterns.
// NOTE: The flaky "Language & Time" test has been removed per request.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Page from '@/app/settings/page';

// Mock sonner toast
const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  }),
  Toaster: () => null,
}));

// Mock fetch globally
let fetchMock: jest.SpyInstance;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Finds the “Add a secondary language” button scoped to the Languages & Time section. */
function getAddSecondaryLanguageControl(): HTMLElement {
  // 1) Find the actual field label element (avoid card descriptions)
  const labelEls = screen.getAllByText(/secondary languages/i);
  const label = labelEls.find(el => el.tagName === 'LABEL') as HTMLElement | undefined;
  if (!label) {
    // Fallback: try an accessible region/group named "Secondary languages"
    const region =
      screen.queryByRole('group', { name: /secondary languages/i }) ??
      screen.queryByRole('region', { name: /secondary languages/i });
    if (!region) {
      throw new Error('Could not locate the Secondary languages section');
    }
    // 2) Search for a button inside that region
    const btn =
      within(region).queryByRole('button', {
        name: /^(add(\s*(a\s*)?secondary\s+language)?|add\s+language|add)$/i,
      }) ?? within(region).getAllByRole('button').find(b =>
        /add/i.test(b.getAttribute('aria-label') || b.getAttribute('title') || ''),
      );
    if (!btn) throw new Error('Add button not found in Secondary languages region');
    return btn as HTMLElement;
  }

  // 2) From the label, choose a sensible container to scope searches
  const scope =
    (label.closest('section,fieldset,div') as HTMLElement | null) ??
    (label.parentElement as HTMLElement | null) ??
    (document.body as HTMLElement);

  // 3) Find the add control in that scope (supports text or icon-only)
  return (
    within(scope).queryByRole('button', {
      name: /^(add(\s*(a\s*)?secondary\s+language)?|add\s+language|add)$/i,
    }) ??
    (within(scope).getAllByRole('button').find(b =>
      /add/i.test(b.getAttribute('aria-label') || b.getAttribute('title') || ''),
    ) as HTMLElement | undefined) ??
    // last-ditch: the only button right next to the label
    (label.parentElement?.querySelector('button') as HTMLElement) ??
    (() => {
      throw new Error('Add button not found near Secondary languages label');
    })()
  );
}

// Mock clerk with stable getToken function
const mockGetToken = jest.fn(() => Promise.resolve('mock-token'));

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: 'user_123' } }),
  useAuth: () => ({
    getToken: mockGetToken,
    isLoaded: true,
    isSignedIn: true,
    userId: 'user_123',
  }),
}));

const API = process.env.NEXT_PUBLIC_CORE_URL || '';

beforeAll(() => {
  // Initialize fetch mock
  fetchMock = jest.spyOn(global, 'fetch') as jest.SpyInstance;

  // Polyfills missing in JSDOM that Radix Select & Floating UI rely on
  // Pointer capture APIs
  // @ts-ignore
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  // @ts-ignore
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {};
  // @ts-ignore
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
  // scrollIntoView is called on option candidates; stub it
  // @ts-ignore
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  fetchMock.mockRestore();
});

beforeEach(() => {
  toastSuccess.mockClear();
  toastError.mockClear();
  mockGetToken.mockClear();
});

async function waitUntilNotLoading() {
  // Wait for the form to be ready and loading to finish
  await waitFor(async () => {
    // Look for the anonymous handle input which should be available when loading is done
    // Try different ways to find the handle input since it might have different labels
    const handleInput = 
      screen.queryByLabelText(/anonymous handle/i) ||
      screen.queryByPlaceholderText(/your_handle/i) ||
      screen.queryByRole('textbox', { name: /handle/i });
      
    if (!handleInput) {
      // Debug: log what's actually available
      const textboxes = screen.queryAllByRole('textbox');
      console.log('Available textboxes:', textboxes.map(el => el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name')));
      throw new Error('Still loading - handle input not found');
    }
    // Make sure it's not disabled (disabled indicates loading state)
    if (handleInput.hasAttribute('disabled')) {
      throw new Error('Still loading - handle input is disabled');
    }
    
    // Also verify no visible loading text remains
    const loadingElements = screen.queryAllByText(/loading/i);
    const visibleLoadingElements = loadingElements.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0;
    });
    
    if (visibleLoadingElements.length > 0) {
      throw new Error('Loading text still visible');
    }
  }, { timeout: 15000, interval: 200 });
}

async function setHandle(value: string) {
  const handle = await screen.findByLabelText(/anonymous handle/i);
  await waitFor(() => expect(handle).not.toBeDisabled());
  await userEvent.clear(handle);
  await userEvent.type(handle, value);
  return handle;
}

async function findSelectTriggerByPlaceholderOrLabel(options: { placeholder?: RegExp; label?: RegExp }) {
  // Try explicit button/combobox role first by placeholder text
  if (options.placeholder) {
    const btn =
      screen.queryByRole('button', { name: options.placeholder }) ||
      screen.queryByRole('combobox', { name: options.placeholder });
    if (btn) return btn as HTMLElement;
    const node = await screen.findByText(options.placeholder);
    return (node.closest('button') || node.closest('[role="combobox"]')) as HTMLElement;
  }
  // Or by a nearby label node
  if (options.label) {
    const combobox = screen.queryByRole('combobox', { name: options.label });
    if (combobox) return combobox as HTMLElement;
    const labelNode = await screen.findByText(options.label);
    const container = labelNode.closest('div') || labelNode.parentElement || document.body;
    return container.querySelector('button,[role="combobox"]') as HTMLElement;
  }
  throw new Error('Select trigger not found');
}

describe('Settings Page – integration', () => {
  test('GET 404 → empty model; edit + PUT 200 success', async () => {
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/profiles/user_123')) {
        if (options?.method === 'PUT') {
          const body = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            json: async () => body,
            status: 200,
            statusText: 'OK',
          } as Response);
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          } as Response);
        }
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<Page />);
    await waitUntilNotLoading();

    await setHandle('momo_handle');
    await userEvent.type(screen.getByPlaceholderText(/tell people about yourself/i), 'Hi! I enjoy hiking and anime.');
    await userEvent.type(screen.getByPlaceholderText(/e\.g\./i), 'anime');
    await userEvent.click(screen.getByRole('button', { name: /add interest/i }));

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Settings saved successfully!'));
  }, 15000);

  test('invalid handle shows validation and blocks save', async () => {
    const putSpy = jest.fn();
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/profiles/user_123')) {
        if (options?.method === 'PUT') {
          putSpy();
          return Promise.resolve({
            ok: false,
            text: async () => 'should not be hit',
            status: 500,
          } as Response);
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<Page />);
    await waitUntilNotLoading();

    await setHandle('ab');
    expect(await screen.findByText(/invalid handle format/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeDisabled();

    await userEvent.click(saveBtn);
    await waitFor(() => expect(toastSuccess).not.toHaveBeenCalled());
    expect(putSpy).not.toHaveBeenCalled();
  }, 15000);

  test('GET 500 → error message; spinner visible during delay', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/profiles/user_123')) {
        await delay(200);
        return Promise.resolve({
          ok: false,
          text: async () => 'boom',
          status: 500,
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<Page />);
    expect(await screen.findByText(/loading/i)).toBeInTheDocument();
    // Look for the error message that includes the status code
    expect(await screen.findByText(/GET failed: 500/i)).toBeInTheDocument();
  }, 15000);

  test('PUT 409 (handle taken) → surface server validation', async () => {
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/profiles/user_123')) {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            text: async () => 'Handle is already taken.',
            status: 409,
            statusText: 'Conflict',
          } as Response);
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          } as Response);
        }
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<Page />);
    await waitUntilNotLoading();

    await setHandle('taken_handle');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // The component should show an error message in the UI
    await waitFor(() => {
      expect(screen.getByText(/PUT failed: 409/i)).toBeInTheDocument();
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  }, 15000);

  test('Age "Prefer not to say" maps to null in request', async () => {
    let lastBody: any = null;
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/profiles/user_123')) {
        if (options?.method === 'PUT') {
          lastBody = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            json: async () => lastBody,
            status: 200,
          } as Response);
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    render(<Page />);
    await waitUntilNotLoading();

    const ageTrigger = await findSelectTriggerByPlaceholderOrLabel({ placeholder: /select age range/i, label: /age range/i });
    ageTrigger.focus();
    await userEvent.keyboard('{Enter}'); // open Radix select via keyboard
    await screen.findByRole('listbox');
    await userEvent.click(await screen.findByRole('option', { name: /prefer not to say/i }));

    await setHandle('ok_');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(lastBody?.age_range).toBeNull();
  }, 15000);

  // Flaky test removed: "Language & Time: set primary, time zone, add secondary with dedupe"
});
