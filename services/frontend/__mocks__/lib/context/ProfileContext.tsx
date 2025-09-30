import React from 'react';

export const useProfile = () => ({
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
  syncProfile: async () => {},
  clearProfile: () => {},
});
