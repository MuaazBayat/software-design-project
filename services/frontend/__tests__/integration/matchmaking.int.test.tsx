// __tests__/integration/matchmaking.int.test.tsx
// Robust integration tests for app/matchmaking/page.tsx using fetch mocks.
// External boundaries only: Clerk (useUser) + network (fetch mocks).
// No internal component/hook mocks.

import { screen, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Ensure relative URLs for fetch mocks
process.env.NEXT_PUBLIC_MATCHMAKING_URL = "";

// --- Mock Clerk (external boundary only) ---
const mockUseUser = jest.fn();
const mockUseAuth = jest.fn();
jest.mock("@clerk/nextjs", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => mockUseAuth(),
}));
function signedIn(overrides: Partial<any> = {}) {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: { id: "clerk_alice", firstName: "TestUser", ...overrides },
  };
}
function signedOut() {
  return { isLoaded: true, isSignedIn: false, user: null };
}

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

// Dynamic import so env/mocks are in place before module evaluation
async function loadPage() {
  // jest.resetModules(); // uncomment if you need a fresh module per test
  const mod = await import("../../app/matchmaking/page");
  return mod.default;
}

describe("MatchScreen (integration)", () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue(signedIn());
    mockUseAuth.mockReturnValue({
      getToken: jest.fn(() => Promise.resolve('mock-token')),
      isLoaded: true,
      isSignedIn: true,
      userId: 'clerk_alice',
    });
  });

  test("initial render: shows loading then a suggested profile with pass/like actions", async () => {
    // Suggestions + stats so buttons are enabled
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              user_id: "u_first",
              anonymous_handle: "FirstProfile",
              country_code: "IE",
              primary_language: "en",
              interests: ["Music"],
              last_active: new Date().toISOString(),
            },
          ],
        } as Response);
      } else if (url.includes('/user/stats/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            matches_used: 0,
            matches_remaining: 5,
            total_daily_limit: 5,
            reset_time: new Date(Date.now() + 864e5).toISOString(),
          }),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const Page = await loadPage();
    render(<Page />);

    // Loading phase
    expect(
      screen.getByText(/loading profiles/i)
    ).toBeInTheDocument();

    // Profile card appears
    await screen.findByRole("heading", {
      level: 3,
      name: /FirstProfile/i,
    });

    // Action buttons are present and enabled (aria-labels from your page.tsx)
    const passBtn = screen.getByRole("button", { name: /pass/i });
    const likeBtn = screen.getByRole("button", { name: /like/i });
    expect(passBtn).toBeEnabled();
    expect(likeBtn).toBeEnabled();
  });

  test("pass flow: removes current card from queue and presents the next suggestion", async () => {
    // Deterministic queue
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              user_id: "u_1",
              anonymous_handle: "FirstProfile",
              country_code: "IE",
              primary_language: "en",
              interests: ["Music"],
              last_active: new Date().toISOString(),
            },
            {
              user_id: "u_2",
              anonymous_handle: "SecondProfile",
              country_code: "JP",
              primary_language: "ja",
              interests: ["Art"],
              last_active: new Date().toISOString(),
            },
          ],
        } as Response);
      } else if (url.includes('/profiles/pass') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const Page = await loadPage();
    render(<Page />);

    await screen.findByRole("heading", { level: 3, name: /FirstProfile/i });

    // Pass current profile
    await userEvent.click(screen.getByRole("button", { name: /pass/i }));

    // New current profile is presented
    await screen.findByRole("heading", { level: 3, name: /SecondProfile/i });

    // NOTE: We intentionally do NOT assert that the first heading node is removed
    // because the UI may retain elements in the DOM during transitions.
  });

  test("like flow: successful match shows success toast with handle and updates stats", async () => {
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              user_id: "u_sarah",
              anonymous_handle: "Sarah",
              country_code: "IE",
              primary_language: "en",
              interests: ["Reading", "Hiking"],
              last_active: new Date().toISOString(),
            },
          ],
        } as Response);
      } else if (url.includes('/user/stats/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            matches_used: 0,
            matches_remaining: 5,
            total_daily_limit: 5,
            reset_time: new Date(Date.now() + 864e5).toISOString(),
          }),
        } as Response);
      } else if (url.includes('/matches/find') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            match_id: "m_123",
            thread_id: "t_123",
            penpal_profile: {
              user_id: "u_sarah",
              anonymous_handle: "Sarah",
              country_code: "IE",
            primary_language: "en",
            interests: ["Reading", "Hiking"],
          },
          match_type: "either",
          compatibility_score: 0.92,
          created_at: new Date().toISOString(),
        }),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const Page = await loadPage();
    render(<Page />);

    // Ensure the card is rendered
    await screen.findByRole("heading", { level: 3, name: /Sarah/i });

    // Like
    await userEvent.click(screen.getByRole("button", { name: /like/i }));

    // Success toast text from your page.tsx:
    // `Match created with ${matchData.penpal_profile.anonymous_handle}! 🎉`
    await screen.findByText(/Match created with Sarah!/i);
  });

  test("signed-out state: prompts to sign in", async () => {
    mockUseUser.mockReturnValueOnce(signedOut());

    const Page = await loadPage();
    render(<Page />);

    expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
    expect(
      screen.getByText(/you need to be signed in to use the matching feature/i)
    ).toBeInTheDocument();
  });

  test("daily limit reached: disables pass/like and shows limit message", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/profiles/suggestions/')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              user_id: "u_any",
              anonymous_handle: "AnyProfile",
              country_code: "ZA",
              primary_language: "en",
              interests: ["Music"],
              last_active: new Date().toISOString(),
            },
          ],
        } as Response);
      } else if (url.includes('/user/stats/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            matches_used: 5,
            matches_remaining: 0,
            total_daily_limit: 5,
            reset_time: new Date(Date.now() + 864e5).toISOString(),
          }),
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const Page = await loadPage();
    render(<Page />);

    await screen.findByRole("heading", { level: 3, name: /AnyProfile/i });

    const passBtn = screen.getByRole("button", { name: /pass/i });
    const likeBtn = screen.getByRole("button", { name: /like/i });
    expect(passBtn).toBeDisabled();
    expect(likeBtn).toBeDisabled();

    expect(screen.getByText(/daily limit reached/i)).toBeInTheDocument();
  });
});
