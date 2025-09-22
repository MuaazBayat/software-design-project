/** @jest-environment jsdom */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mocks ---
// Mock Clerk so the page thinks a user is signed in
jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: "user_123" } }),
}));

// Mock next/link so it renders a normal <a>
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// (Optional) keep lucide icons lightweight in tests
jest.mock("lucide-react", () => new Proxy({}, { get: () => (props) => <span {...props} /> }));

// FIX: Mock window.alert before each test, as it's not implemented in JSDOM.
beforeEach(() => {
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

beforeAll(() => {
  // Ensure the page sees a non-empty API base
  process.env.NEXT_PUBLIC_CORE_API_BASE_URL = "http://example.test";
});

afterEach(() => {
  jest.clearAllMocks();
});

// FIX: Correct the import path to be a relative path from the project root,
// which is more robust for Jest configs that may not handle the '@/' alias.
// This assumes your `__tests__` directory is at the root of your project.
import Page from "../app/settings/page";


describe("Settings page", () => {
  test("renders title and Return link", async () => {
    // GET /profiles/:id -> 404 (no profile yet)
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}), text: async () => "" });

    render(<Page />);

    // Title
    expect(await screen.findByRole("heading", { name: /your settings/i })).toBeInTheDocument();

    // Return button links home
    const link = screen.getByRole("link", { name: /return/i });
    expect(link).toHaveAttribute("href", "/");
  });

  test("clicking Save sends FULL PUT body (age_range null by default)", async () => {
    const user = userEvent.setup();

    // 1) GET 404
    // 2) PUT success — echo body + required fields
    const putSpy = jest.fn(async (url, init) => {
      const body = JSON.parse(init?.body ?? "{}");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          clerk_id: "user_123",
          created_at: "2025-08-31T12:00:00Z",
          updated_at: "2025-08-31T12:00:05Z",
          last_active: null,
          ...body,
        }),
      };
    });

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}), text: async () => "" })
      .mockImplementationOnce(putSpy);

    render(<Page />);

    const saveBtns = await screen.findAllByRole("button", { name: /save changes/i });
    await user.click(saveBtns[0]);

    await waitFor(() => {
        expect(putSpy).toHaveBeenCalledTimes(1);
    });

    const [, init] = putSpy.mock.calls[0];
    const sent = JSON.parse(init.body);

    expect(sent).toEqual({
      anonymous_handle: null,
      age_range: null, // "prefer-not" → null mapping
      primary_language: null,
      secondary_languages: [],
      time_zone: null,
      country_code: null,
      bio: null,
      interests: [],
    });
  });

  test("invalid handle format disables Save; becomes enabled when valid", async () => {
    const user = userEvent.setup();
    // GET 404, then we'll never reach PUT in this test
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}), text: async () => "" });

    render(<Page />);

    // FIX: Wait for the initial loading to be complete before interacting with form elements.
    await waitFor(() => {
        expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument();
    });

    const saveBtns = await screen.findAllByRole("button", { name: /save changes/i });
    const save = saveBtns[0];
    const handleInput = screen.getByLabelText(/anonymous handle/i);

    // Type invalid (too short) → disabled
    // FIX: user.clear can be problematic. A better way is to select all text and type over it.
    await user.type(handleInput, "ab");
    expect(save).toBeDisabled();

    // Type valid → enabled
    await user.type(handleInput, "c"); // now "abc"
    expect(save).not.toBeDisabled();
  });

  test("adds an interest chip and includes it in PUT payload", async () => {
    const user = userEvent.setup();

    const putSpy = jest.fn(async (url, init) => {
      const body = JSON.parse(init?.body ?? "{}");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          clerk_id: "user_123",
          created_at: "2025-08-31T12:00:00Z",
          updated_at: "2025-08-31T12:00:05Z",
          last_active: null,
          ...body,
        }),
      };
    });

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}), text: async () => "" })
      .mockImplementationOnce(putSpy);

    render(<Page />);

    // Wait for loading to finish
    await waitFor(() => {
        expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument();
    });

    const interestInput = screen.getByPlaceholderText(/e\.g\. hiking, anime, cooking/i);
    await user.type(interestInput, "hiking{enter}");

    // Visual chip appears
    expect(screen.getByText("hiking")).toBeInTheDocument();

    const saveBtns = await screen.findAllByRole("button", { name: /save changes/i });
    await user.click(saveBtns[0]);

    await waitFor(() => {
        const [, init] = putSpy.mock.calls[0];
        const sent = JSON.parse(init.body);
        expect(sent.interests).toEqual(["hiking"]);
    });
  });

  test("Save on Languages & Time tab triggers PUT too", async () => {
    const user = userEvent.setup();

    const putSpy = jest.fn(async (url, init) => ({
      ok: true,
      status: 200,
      json: async () => ({
        clerk_id: "user_123",
        created_at: "2025-08-31T12:00:00Z",
        updated_at: "2025-08-31T12:00:05Z",
        last_active: null,
        ...JSON.parse(init?.body ?? "{}"),
      }),
    }));

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}), text: async () => "" })
      .mockImplementationOnce(putSpy);

    render(<Page />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument();
    });

    // Switch to Languages & Time tab
    await user.click(screen.getByRole("tab", { name: /languages & time/i }));

    // FIX: Find the save button specifically within the now-visible tab panel.
    // This is more robust than selecting by index, which can be flaky.
    const activeTabPanel = await screen.findByRole("tabpanel", { hidden: false });
    const saveButton = within(activeTabPanel).getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    // Wait for the async click handler and fetch to be called.
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledTimes(1);
    });
  });

  test("server 409 from PUT surfaces an error message", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      // GET 404
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}), text: async () => "" })
      // PUT 409
      .mockResolvedValueOnce({ ok: false, status: 409, text: async () => "Handle already taken" });

    render(<Page />);
    
    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText(/loading…/i)).not.toBeInTheDocument();
    });

    const saveBtns = await screen.findAllByRole("button", { name: /save changes/i });
    await user.click(saveBtns[0]);

    // The page's apiUpdateProfile throws `PUT failed: 409 <detail>`; we render that.
    await waitFor(() => {
      expect(screen.getByText(/409/i)).toBeInTheDocument();
    });
  });
});

