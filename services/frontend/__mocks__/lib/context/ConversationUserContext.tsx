import React from 'react';

export const useConversationUser = () => ({
  currentConversationUser: {
    user_id: "test_user_id",
    anonymous_handle: "TestUser",
    country_code: "US", 
    last_active: "2024-01-01T00:00:00Z",
  },
  setCurrentConversationUser: jest.fn(),
  clearConversationUser: jest.fn(),
});