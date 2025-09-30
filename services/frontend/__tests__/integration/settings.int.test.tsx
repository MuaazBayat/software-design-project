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
import { server } from '../setup/msw/server';
import { http, HttpResponse, delay } from 'msw';

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

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: 'user_123' } }),
}));

const API = process.env.NEXT_PUBLIC_CORE_URL || '';

beforeAll(() => {
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

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

async function waitUntilNotLoading() {
  await screen.findByText(/loading/i);
  await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
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
    server.use(
      http.get(`${API}/profiles/user_123`, () => new HttpResponse(null, { status: 404 })),
      http.put(`${API}/profiles/user_123`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(body, { status: 200 });
      })
    );

    render(<Page />);
    await waitUntilNotLoading();

    await setHandle('momo_handle');
    await userEvent.type(screen.getByPlaceholderText(/tell people about yourself/i), 'Hi! I enjoy hiking and anime.');
    await userEvent.type(screen.getByPlaceholderText(/e\.g\./i), 'anime');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Saved changes.'));
  });

  test('invalid handle shows validation and blocks save', async () => {
    const putSpy = jest.fn();
    server.use(
      http.get(`${API}/profiles/user_123`, () => new HttpResponse(null, { status: 404 })),
      http.put(`${API}/profiles/user_123`, async () => {
        putSpy();
        return HttpResponse.text('should not be hit', { status: 500 });
      })
    );

    render(<Page />);
    await waitUntilNotLoading();

    await setHandle('ab');
    expect(await screen.findByText(/invalid handle format/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeDisabled();

    await userEvent.click(saveBtn);
    await waitFor(() => expect(alertSpy).not.toHaveBeenCalled());
    expect(putSpy).not.toHaveBeenCalled();
  });

  test('GET 500 → error message; spinner visible during delay', async () => {
    server.use(
      http.get(`${API}/profiles/user_123`, async () => {
        await delay(200);
        return HttpResponse.text('boom', { status: 500 });
      })
    );

    render(<Page />);
    expect(await screen.findByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByText(/get failed: 500/i)).toBeInTheDocument();
  });

  test('PUT 409 (handle taken) → surface server validation', async () => {
    server.use(
      http.get(`${API}/profiles/user_123`, () => new HttpResponse(null, { status: 404 })),
      http.put(`${API}/profiles/user_123`, async () =>
        HttpResponse.json({ detail: 'Handle is already taken.' }, { status: 409 })
      )
    );

    render(<Page />);
    await waitUntilNotLoading();

    await setHandle('taken_handle');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    const msg = (await screen.findByText(/already taken/i)) || (await screen.findByText(/put failed: 409/i));
    expect(msg).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('Age “Prefer not to say” maps to null in request', async () => {
    let lastBody: any = null;
    server.use(
      http.get(`${API}/profiles/user_123`, () => new HttpResponse(null, { status: 404 })),
      http.put(`${API}/profiles/user_123`, async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json(lastBody, { status: 200 });
      })
    );

    render(<Page />);
    await waitUntilNotLoading();

    const ageTrigger = await findSelectTriggerByPlaceholderOrLabel({ placeholder: /select age range/i, label: /age range/i });
    ageTrigger.focus();
    await userEvent.keyboard('{Enter}'); // open Radix select via keyboard
    await screen.findByRole('listbox');
    await userEvent.click(await screen.findByText(/prefer not to say/i));

    await setHandle('ok_');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(lastBody?.age_range).toBeNull();
  });

  // Flaky test removed: "Language & Time: set primary, time zone, add secondary with dedupe"
});
