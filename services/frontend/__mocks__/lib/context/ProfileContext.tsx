import React from 'react';

export const useSyncProfile = () => ({
  profile: {
    user_id: "user_123",
    clerk_id: "clerk_123",
    anonymous_handle: "test_user",
    moderator: false,
    country_code: "US",
  },
  loading: false,
  error: null,
  synced: true,
  matches: [],
  matchesLoading: false,
  syncProfile: async () => {},
  clearProfile: () => {},
  fetchMatches: async () => {},
});
