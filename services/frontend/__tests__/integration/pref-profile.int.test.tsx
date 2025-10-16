// __tests__/integration/pref-profile.int.test.tsx
// Integration tests for app/preference-profile/page.tsx
// External boundaries only: Clerk, Next router, network (fetch mocks).
// No internal component/hook mocks.

import { render, screen, waitFor, waitForElementToBeRemoved, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Ensure path-only URLs for fetch mocks
process.env.NEXT_PUBLIC_MATCHMAKING_URL = "";

// --- Mock Clerk (external boundary) ---
const mockUseUser = jest.fn();
const mockUseAuth = jest.fn();
jest.mock("@clerk/nextjs", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => mockUseAuth(),
}));
const signedIn = (overrides: Partial<any> = {}) => ({
  isLoaded: true,
  isSignedIn: true,
  user: { id: "clerk_alice", firstName: "TestUser", ...overrides },
});
const signedOut = () => ({ isLoaded: true, isSignedIn: false, user: null });

// --- Mock Next.js router (external boundary) ---
const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn(), back: jest.fn() }),
}));

// Mock fetch globally
let fetchMock: jest.SpyInstance;

beforeAll(() => {
  fetchMock = jest.spyOn(global, 'fetch') as jest.SpyInstance;
});

afterEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  fetchMock.mockRestore();
});

// --- Dynamic import so mocks are set before module evaluation ---
async function loadPage() {
  const mod = await import("../../app/preference-profile/page");
  return mod.default;
}

// click the best available target to select a card by handle
async function selectCardByHandle(handle: RegExp | string) {
  // try a button first (many cards are clickable buttons)
  const button = screen.queryByRole("button", { name: handle });
  if (button) {
    await userEvent.click(button);
    return;
  }
  // fallback to heading (card title)
  const heading = await screen.findByRole("heading", { name: handle, level: 2 });
  const clickable = heading.closest("button") ?? heading;
  await userEvent.click(clickable as HTMLElement);
}

describe("PreferenceProfileSelector (integration)", () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue(signedIn());
    mockUseAuth.mockReturnValue({
      getToken: jest.fn(() => Promise.resolve('mock-token')),
      isLoaded: true,
      isSignedIn: true,
      userId: 'clerk_alice',
    });
    pushMock.mockReset();
  });

  test("initial render → loads profiles from API and shows cards", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          profile_id: "u_1",
          anonymous_handle: "Alice",
          country_code: "IE",
          bio: "Hello from Dublin",
          interests: ["Music"],
          age_range: "26-35",
          primary_language: "en",
          favorite_local_fact: "Giants Causeway",
          is_real: true,
        },
        {
          profile_id: "u_2",
          anonymous_handle: "Bob",
          country_code: "JP",
          bio: "Kansai local",
          interests: ["Art"],
          age_range: "26-35",
          primary_language: "ja",
          favorite_local_fact: "Takoyaki!",
          is_real: true,
        },
      ],
    } as Response);

    const Page = await loadPage();
    render(<Page />);

    // Loading first, then list
    expect(screen.getByText(/loading profiles/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByText(/loading profiles/i));

    await screen.findByRole("heading", { name: /Alice/i, level: 2 });
    await screen.findByRole("heading", { name: /Bob/i, level: 2 });

    expect(
      screen.getByRole("button", { name: /continue with selected preferences/i })
    ).toBeInTheDocument();
  });

  test("toggle Example Profiles → shows fake user cards and 'Example Profile' tag", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          profile_id: "u_real",
          anonymous_handle: "RealOne",
          country_code: "US",
          bio: "Bio",
          interests: ["Music"],
          age_range: "18-25",
          primary_language: "en",
          favorite_local_fact: "Fact",
          is_real: true,
        },
      ],
    } as Response);

    const Page = await loadPage();
    render(<Page />);

    await waitForElementToBeRemoved(() => screen.queryByText(/loading profiles/i));
    await screen.findByRole("heading", { name: /RealOne/i, level: 2 });

    // Switch to Example Profiles
    await userEvent.click(screen.getByRole("button", { name: /example profiles/i }));

    // Fake list contains "Elara" in mocks/handlers
    await screen.findByRole("heading", { name: /Elara/i, level: 2 });
    expect(screen.getAllByText(/example profile/i).length).toBeGreaterThan(0);
  });

  test(
    "select + submit (success) → posts selection and navigates home",
    async () => {
      let capturedBody: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('/preferences/profiles/')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                profile_id: "u_sarah",
                anonymous_handle: "Sarah",
                country_code: "IE",
                bio: "Reader",
                interests: ["Reading", "Hiking"],
                age_range: "26-35",
                primary_language: "en",
                favorite_local_fact: "Fact",
                is_real: true,
              },
              {
                profile_id: "u_mike",
                anonymous_handle: "Mike",
                country_code: "AR",
                bio: "Foodie",
                interests: ["Food"],
                age_range: "26-35",
                primary_language: "es",
                favorite_local_fact: "Asado!",
                is_real: true,
              },
            ],
          } as Response);
        } else if (url.includes('/preferences/select') && options?.method === 'POST') {
          capturedBody = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, message: "saved" }),
            status: 200,
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const Page = await loadPage();
      render(<Page />);

      await waitForElementToBeRemoved(() => screen.queryByText(/loading profiles/i));
      await screen.findByRole("heading", { name: /Sarah/i, level: 2 });

      // select Sarah (make sure CTA becomes enabled)
      await selectCardByHandle(/Sarah/i);

      const cta = screen.getByRole("button", { name: /continue with selected preferences/i });
      await waitFor(() => expect(cta).toBeEnabled());
      await userEvent.click(cta);

      // Verify POST payload (don’t rely on a specific toast copy)
      await waitFor(() => expect(capturedBody).toBeTruthy());
      expect(capturedBody).toMatchObject({
        clerk_id: "clerk_alice",
        selected_profile_id: "u_sarah",
        preference_type: "real",
      });

      // Component navigates after a short delay; wait for it without faking timers.
      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    },
    10000
  );

  test(
    "submit with no selection → CTA disabled (or validation message) and no navigation",
    async () => {
      let posted = false;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('/preferences/profiles/')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                profile_id: "u1",
                anonymous_handle: "One",
                country_code: "IE",
                bio: null,
                interests: [],
                age_range: "26-35",
                primary_language: "en",
                favorite_local_fact: null,
                is_real: true,
              },
            ],
          } as Response);
        } else if (url.includes('/preferences/select') && options?.method === 'POST') {
          posted = true;
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, message: "saved" }),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const Page = await loadPage();
      render(<Page />);

      await waitForElementToBeRemoved(() => screen.queryByText(/loading profiles/i));
      await screen.findByRole("heading", { name: /One/i, level: 2 });

      const cta = screen.getByRole("button", {
        name: /continue with selected preferences/i,
      });

      // Many UIs disable the CTA until a selection is made.
      // If disabled: assert disabled + no navigation.
      if (cta.hasAttribute("disabled") || (cta as HTMLButtonElement).disabled) {
        expect(cta).toBeDisabled();
        expect(pushMock).not.toHaveBeenCalled();
        expect(posted).toBe(false);
        return;
      }

      // If enabled: clicking should not navigate and should not POST (or should show validation).
      await userEvent.click(cta);

      await waitFor(() => {
        expect(pushMock).not.toHaveBeenCalled();
      });
      expect(posted).toBe(false);
    },
    10000
  );

  test("save failure → shows error toast and stays on page", async () => {
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/preferences/profiles/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              profile_id: "u_err",
              anonymous_handle: "ErrUser",
              country_code: "IE",
              bio: null,
              interests: [],
              age_range: "26-35",
              primary_language: "en",
              favorite_local_fact: null,
              is_real: true,
            },
          ],
        } as Response);
      } else if (url.includes('/preferences/select') && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ detail: "oops" }),
          status: 500,
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const Page = await loadPage();
    render(<Page />);

    await waitForElementToBeRemoved(() => screen.queryByText(/loading profiles/i));
    await screen.findByRole("heading", { name: /ErrUser/i, level: 2 });

    await selectCardByHandle(/ErrUser/i);
    const cta = screen.getByRole("button", { name: /continue with selected preferences/i });
    await waitFor(() => expect(cta).toBeEnabled());
    await userEvent.click(cta);

    // Generic error copy from page: “Failed to save your preference…”
    await screen.findByText(/failed to save your preference/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

// test("initial API error → shows error view, then retry fetches and shows profiles", async () => {
//   // One handler: first call fails, second call succeeds
//   let calls = 0;
//   server.use(
//     http.get("*/preferences/profiles/:clerk_id", () => {
//       calls += 1;
//       if (calls === 1) {
//         return HttpResponse.json({ detail: "boom" }, { status: 500 });
//       }
//       return HttpResponse.json([
//         {
//           profile_id: "u_fix",
//           anonymous_handle: "Recovered",
//           country_code: "IE",
//           bio: "ok",
//           interests: ["Music"],
//           age_range: "26-35",
//           primary_language: "en",
//           favorite_local_fact: null,
//           is_real: true,
//         },
//       ]);
//     })
//   );

//   const Page = await loadPage();
//   render(<Page />);

//   // Error UI on first call
//   await screen.findByText(/failed to load profiles/i);

//   // Retry -> triggers second fetch
//   await userEvent.click(screen.getByRole("button", { name: /try again/i }));
//   await waitFor(() => expect(calls).toBe(2));

//   // Wait until either the error disappears OR the CTA shows up (loaded state)
//   await waitFor(() => {
//     const errorGone = !screen.queryByText(/failed to load profiles/i);
//     const ctaVisible = !!screen.queryByRole("button", {
//       name: /continue with selected preferences/i,
//     });
//     expect(errorGone || ctaVisible).toBe(true);
//   });

//   // Loaded state: CTA present…
//   expect(
//     await screen.findByRole("button", { name: /continue with selected preferences/i })
//   ).toBeInTheDocument();

//   // …and at least one profile card heading is rendered
//   expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
// });





  test("signed-out → asks user to sign in", async () => {
    mockUseUser.mockReturnValueOnce(signedOut());
    const Page = await loadPage();
    render(<Page />);

    expect(
      screen.getByText(/you need to be signed in to access this page/i)
    ).toBeInTheDocument();
  });
});
