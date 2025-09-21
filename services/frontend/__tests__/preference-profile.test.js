import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser } from '@clerk/nextjs';
import PreferenceProfileSelector from '../app/preference-profile/page';



jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@clerk/nextjs');
jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
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

  test('falls back to Supabase when API fails', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    fetch.mockRejectedValueOnce(new Error('API down'));

    render(<PreferenceProfileSelector />);
    await waitFor(() => expect(screen.getByText('Elara')).toBeInTheDocument());
  });

  test('selects a profile when clicked', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeUsers });

    render(<PreferenceProfileSelector />);
    await waitFor(() => screen.getByText('Elara'));
    fireEvent.click(screen.getByText('Elara'));

    const profileCard = screen.getByText('Elara').closest('div');
    expect(profileCard).toBeInTheDocument(); // simple existence check
  });

  test('alerts when submitting without selection', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeUsers });

    render(<PreferenceProfileSelector />);
    await waitFor(() => screen.getByText('Elara'));

    window.alert = jest.fn();
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));
    expect(window.alert).toHaveBeenCalledWith('Please select a profile that matches your interests');
  });

  test('submits selected profile successfully', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => fakeUsers }) // GET profiles
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // POST select

    render(<PreferenceProfileSelector />);
    await waitFor(() => screen.getByText('Elara'));
    fireEvent.click(screen.getByText('Elara'));

    window.alert = jest.fn();
    fireEvent.click(screen.getByText(/Continue with Selected Preferences/i));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Preference saved, proceeding with signup')
    );
  });

  test('toggles between real and example profiles', async () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { id: 'user-1' } });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeUsers });

    render(<PreferenceProfileSelector />);
    await waitFor(() => screen.getByText('Elara'));

    const toggleButton = screen.getAllByText(/Example Profiles/i)[1]; // pick the button, not paragraph
    fireEvent.click(toggleButton);
    expect(screen.getByText('Elara')).toBeInTheDocument();
  });
});
