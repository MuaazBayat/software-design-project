// __tests__/profilesApiClient.test.js
import { ProfilesApiClient } from '../lib/profilesApiClient';

// Mock fetch
global.fetch = jest.fn();

describe('ProfilesApiClient', () => {
  let client;
  let mockGetToken;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables to ensure clean test state
    delete process.env.NEXT_PUBLIC_AUTH_DISABLED;
    mockGetToken = jest.fn().mockResolvedValue('mock-token');
    client = new ProfilesApiClient('http://localhost:8000', mockGetToken);
  });

  describe('getProfileByUserId', () => {
    it('should fetch profile by user ID successfully', async () => {
      const mockProfile = {
        user_id: 'user-123',
        anonymous_handle: 'TestUser',
        country_code: 'US',
        bio: 'Test bio',
        age_range: '20-25',
        interests: ['reading', 'coding'],
        primary_language: 'en',
        secondary_languages: ['es', 'fr'],
        last_active: '2025-10-15T10:00:00Z',
        favorite_local_fact: 'Test fact'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const result = await client.getProfileByUserId('user-123');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/profiles/by-user-id/user-123',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
        }
      );
      expect(result).toEqual(mockProfile);
    });

    it('should handle 404 error when profile not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Profile not found' }),
      });

      await expect(client.getProfileByUserId('nonexistent')).rejects.toThrow('Profile not found');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getProfileByUserId('user-123')).rejects.toThrow('Network error');
    });
  });

  describe('getCurrentProfile', () => {
    it('should fetch current user profile successfully', async () => {
      const mockProfile = {
        user_id: 'current-user',
        anonymous_handle: 'CurrentUser',
        bio: 'My bio'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const result = await client.getCurrentProfile();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/profiles/me',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
        }
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe('createProfile', () => {
    it('should create profile successfully', async () => {
      const profileData = {
        anonymous_handle: 'NewUser',
        country_code: 'US',
        bio: 'New user bio',
        age_range: '25-30',
        interests: ['music'],
        primary_language: 'en'
      };

      const mockCreatedProfile = {
        ...profileData,
        user_id: 'new-user-id'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedProfile,
      });

      const result = await client.createProfile(profileData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/profiles',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify(profileData),
        }
      );
      expect(result).toEqual(mockCreatedProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        bio: 'Updated bio',
        interests: ['reading', 'writing']
      };

      const mockUpdatedProfile = {
        user_id: 'user-123',
        anonymous_handle: 'TestUser',
        ...updateData
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedProfile,
      });

      const result = await client.updateProfile(updateData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/profiles',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify(updateData),
        }
      );
      expect(result).toEqual(mockUpdatedProfile);
    });
  });

  describe('constructor and configuration', () => {
    it('should use default base URL when none provided', () => {
      const defaultClient = new ProfilesApiClient();
      expect(defaultClient.baseUrlValue).toBe('http://localhost:8000');
    });

    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new ProfilesApiClient('http://localhost:8000/', mockGetToken);
      expect(clientWithSlash.baseUrlValue).toBe('http://localhost:8000');
    });

    it('should work without authentication when auth is disabled', async () => {
      process.env.NEXT_PUBLIC_AUTH_DISABLED = 'true';
      const noAuthClient = new ProfilesApiClient('http://localhost:8000');

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user_id: 'test' }),
      });

      await noAuthClient.getCurrentProfile();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/profiles/me',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      delete process.env.NEXT_PUBLIC_AUTH_DISABLED;
    });
  });
});