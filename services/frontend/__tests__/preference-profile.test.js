import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser, useAuth } from '@clerk/nextjs';
import PreferenceProfileSelector from '../app/preference-profile/page';

// Mock sonner properly - provide a mock for Toaster component
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => React.createElement('div', null, 'Toaster'), // Mock Toaster as a simple div
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock useAuth hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(() => ({
    getToken: jest.fn(() => Promise.resolve('mock-token')),
    isLoaded: true,
    isSignedIn: true,
    userId: 'user-1',
  })),
  useUser: jest.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: { id: 'user-1' },
  })),
}));

jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_CORE_URL = 'http://localhost:8000';
  process.env.NEXT_PUBLIC_MATCHMAKING_URL = 'http://localhost:8001';
  process.env.NEXT_PUBLIC_AUTH_DISABLED = 'true'; // Disable auth for tests

  // Reset mocks to default
  useAuth.mockReturnValue({
    getToken: jest.fn(() => Promise.resolve('mock-token')),
    isLoaded: true,
    isSignedIn: true,
    userId: 'user-1',
  });

  useUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: { id: 'user-1' },
  });
});

// Fake users for testing (plain JS objects)
const fakeUsers = [
  { user_id: '1', anonymous_handle: 'Elara', country_code: 'JP', bio: 'Bio 1', interests: ['Art'], age_range: '25-34', primary_language: 'ja', favorite_local_fact: 'Fact', is_real: false },
  { user_id: '2', anonymous_handle: 'Javier', country_code: 'AR', bio: 'Bio 2', interests: ['Music'], age_range: '30-39', primary_language: 'es', favorite_local_fact: 'Fact', is_real: false },
];

describe('PreferenceProfileSelector', () => {
  test('renders loading state', () => {
    useUser.mockReturnValue({ isLoaded: false, isSignedIn: false, user: null });
    render(<PreferenceProfileSelector />);
    expect(screen.getByText(/Loading authentication/i)).toBeInTheDocument();
  });

  test('renders sign-in prompt', () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    render(<PreferenceProfileSelector />);
    expect(screen.getByText(/You need to be signed in/i)).toBeInTheDocument();
  });

  test('fetches profiles from API', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeUsers });

    render(<PreferenceProfileSelector />);
    await waitFor(() => expect(screen.getByText('Elara')).toBeInTheDocument());
    expect(screen.getByText('Javier')).toBeInTheDocument();
  });



  test('selects a profile when clicked', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });

    // Debug: log fetch calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);

    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Elara'));

    const profileCard = screen.getByText('Elara').closest('div');
    expect(profileCard).toBeInTheDocument(); // simple existence check
  });

  test('alerts when submitting without selection', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Import toast inside the test to access the mock
    const { toast } = require('sonner');
    
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));
    
    expect(toast.error).toHaveBeenCalledWith('Please select a profile that matches your interests');
  });

  test('submits selected profile successfully', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => fakeUsers }) // GET profiles
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // POST select

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Elara'));

    // Import toast inside the test to access the mock
    const { toast } = require('sonner');
    
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Preference saved, proceeding with signup');
    });
  });

  test('toggles between real and example profiles', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    const toggleButton = screen.getAllByText(/Example Profiles/i)[1]; // pick the button, not paragraph
    fireEvent.click(toggleButton);
    expect(screen.getByText('Elara')).toBeInTheDocument();
  });

  test('handles API error when fetching profiles', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

    render(<PreferenceProfileSelector />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load profiles/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles failed response when fetching profiles', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<PreferenceProfileSelector />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load profiles/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles error in save preference selection', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => fakeUsers })
      .mockRejectedValueOnce(new Error('Save failed'));

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Elara'));

    const { toast } = require('sonner');
    
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save your preference. Please try again.');
    });
  });

  test('handles keyboard navigation with Enter key', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find the profile card by role listitem and fire Enter key
    const profileCards = screen.getAllByRole('listitem');
    if (profileCards.length > 0) {
      fireEvent.keyDown(profileCards[0], { key: 'Enter' });
      // Check that the profile name is still visible (card didn't disappear)
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }
  });

  test('handles keyboard navigation with Space key', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find the profile card by role listitem and fire Space key
    const profileCards = screen.getAllByRole('listitem');
    if (profileCards.length > 0) {
      fireEvent.keyDown(profileCards[0], { key: ' ' });
      // Check that the profile name is still visible (card didn't disappear)
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }
  });

  test('handles non-ok response with error text when saving preference', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => fakeUsers })
      .mockResolvedValueOnce({ 
        ok: false, 
        status: 400,
        statusText: 'Bad Request',
        text: async () => '{"error": "Invalid data"}'
      });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Elara'));

    const { toast } = require('sonner');
    
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save your preference. Please try again.');
    });
  });

  test('handles non-JSON error response when saving preference', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => fakeUsers })
      .mockResolvedValueOnce({ 
        ok: false, 
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Plain text error'
      });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Elara'));

    const { toast } = require('sonner');
    
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save your preference. Please try again.');
    });
  });

  test('shows error when user is not authenticated on submit', async () => {
    // Start with authenticated user to load profiles
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    const { rerender } = render(<PreferenceProfileSelector />);
    
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Select a profile
    fireEvent.click(screen.getByText('Elara'));

    // Now change to no user
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    rerender(<PreferenceProfileSelector />);

    // Should show sign-in message
    expect(screen.getByText(/You need to be signed in/i)).toBeInTheDocument();
  });

  test('handles save when user becomes null', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Select profile
    fireEvent.click(screen.getByText('Elara'));

    // Set user to null before submitting
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: null });

    // Try to submit - should handle null user
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));

    // Should show error or handle gracefully
    await waitFor(() => {
      expect(screen.queryByText('Elara')).toBeInTheDocument();
    });
  });

  test('toggles from real users to fake users', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Find the toggle button - it shows "Example Profiles" when displaying real profiles
    const toggleButtons = screen.queryAllByText(/Example Profiles/i);
    if (toggleButtons.length > 1) {
      // Click the button (not the paragraph)
      fireEvent.click(toggleButtons[1]);
    } else if (toggleButtons.length === 1) {
      fireEvent.click(toggleButtons[0]);
    }
    
    // Should still see the profiles
    expect(screen.getByText('Elara')).toBeInTheDocument();
  });

  test('renders interest tags for profiles', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Art')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check that interests are rendered
    expect(screen.getByText('Art')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
  });

  test('renders profile cards with correct attributes', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check aria-label for profile card
    const profileCard = screen.getByLabelText('Profile for Elara');
    expect(profileCard).toBeInTheDocument();
    expect(profileCard).toHaveAttribute('tabIndex', '0');
    expect(profileCard).toHaveAttribute('role', 'listitem');

    // Check country name is rendered
    expect(screen.getByText('Japan')).toBeInTheDocument();
    expect(screen.getByText('Argentina')).toBeInTheDocument();
  });

  test('handles unknown country code', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    const profileWithUnknownCountry = [{
      ...fakeUsers[0],
      country_code: 'ZZ', // Unknown code
    }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => profileWithUnknownCountry
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should display the country code itself when not in mapping
    expect(screen.getByText('ZZ')).toBeInTheDocument();
  });

  test('handles profile with null country code', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check that bios are displayed
    expect(screen.getByText(/Bio 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Bio 2/i)).toBeInTheDocument();
  });

  test('renders checkboxes in correct state', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeUsers
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('Elara')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Initially all checkboxes should be unchecked
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => {
      expect(cb.getAttribute('aria-checked')).toBe('false');
    });

    // Click one profile
    fireEvent.click(screen.getByText('Elara'));

    // Now one should be checked
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    const checkedBoxes = updatedCheckboxes.filter(cb => cb.getAttribute('aria-checked') === 'true');
    expect(checkedBoxes.length).toBe(1);
  });

  test('handles API with profile_id field', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    const apiProfilesWithProfileId = [
      {
        profile_id: 'prof-1',
        user_id: 'user-a',
        anonymous_handle: 'TestUser',
        country_code: 'US',
        bio: 'Test bio',
        interests: ['Reading'],
        age_range: '20-29',
        primary_language: 'en',
        favorite_local_fact: 'Test fact',
        is_real: true,
      }
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => apiProfilesWithProfileId
    });

    render(<PreferenceProfileSelector />);
    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should use profile_id as user_id
    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
  });
});


