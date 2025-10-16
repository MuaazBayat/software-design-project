import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Page from "../app/settings/page";

// Mock Clerk hooks
jest.mock("@clerk/nextjs", () => ({
    useUser: () => ({
        isLoaded: true,
        isSignedIn: true,
        user: { id: "user_123" },
    }),
    useAuth: () => ({
        getToken: jest.fn().mockResolvedValue("fake-token"),
    }),
}));

// Mock toast
jest.mock("sonner", () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

// Mock fetch
const mockProfile = {
    anonymous_handle: "test_handle",
    age_range: "26-35",
    primary_language: "en",
    secondary_languages: ["fr"],
    time_zone: "Africa/Johannesburg",
    country_code: "ZA",
    bio: "This is my bio",
    interests: ["coding", "music"],
};

global.fetch = jest.fn((url, options) => {
    if (options?.method === "GET") {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockProfile),
        });
    }
    if (options?.method === "PUT") {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ ...mockProfile, ...JSON.parse(options.body) }),
        });
    }
    return Promise.resolve({ ok: false, status: 404 });
});

describe("Settings Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the bio field with initial value", async () => {
        render(<Page />);
        
        // Wait for the API call to complete and the bio field to be populated
        await waitFor(() => {
            const bioTextarea = screen.getByLabelText(/bio/i);
            expect(bioTextarea).toHaveValue(mockProfile.bio);
        });
    });

    it("allows editing the bio field", async () => {
        render(<Page />);
        const bioTextarea = await screen.findByLabelText(/bio/i);
        fireEvent.change(bioTextarea, { target: { value: "New bio content" } });
        expect(bioTextarea).toHaveValue("New bio content");
    });

    it("saves changes to the bio field", async () => {
        render(<Page />);
        const bioTextarea = await screen.findByLabelText(/bio/i);
        fireEvent.change(bioTextarea, { target: { value: "Updated bio" } });

        const saveButton = screen.getByRole("button", { name: /save changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(require("sonner").toast.success).toHaveBeenCalledWith("Settings saved successfully!");
        });
    });

    it("disables save button if handle is invalid", async () => {
        render(<Page />);
        const handleInput = await screen.findByLabelText(/anonymous handle/i);
        
        // Wait for component to load first
        await waitFor(() => {
            expect(handleInput).toBeInTheDocument();
        });
        
        // Set a single character which should be invalid (too short)
        fireEvent.change(handleInput, { target: { value: "a" } });
        
        // Verify the input actually has the value "a"
        expect(handleInput).toHaveValue("a");

        const saveButton = screen.getByRole("button", { name: /save changes/i });
        expect(saveButton).toBeDisabled();
    });
});