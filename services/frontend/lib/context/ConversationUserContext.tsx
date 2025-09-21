"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export interface UserProfile {
  user_id: string;
  anonymous_handle: string;
  country_code?: string | null;
  bio?: string;
  age_range?: string;
  interests?: string[];
}

interface ConversationUserContextType {
  currentConversationUser: UserProfile | null;
  setCurrentConversationUser: (user: UserProfile | null) => void;
  clearCurrentConversationUser: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ConversationUserContext = createContext<ConversationUserContextType | undefined>(
  undefined
);

export function ConversationUserProvider({ children }: { children: ReactNode }) {
  const [currentConversationUser, setCurrentConversationUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearCurrentConversationUser = () => {
    setCurrentConversationUser(null);
    setIsLoading(false);
  };

  return (
    <ConversationUserContext.Provider
      value={{
        currentConversationUser,
        setCurrentConversationUser,
        clearCurrentConversationUser,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </ConversationUserContext.Provider>
  );
}

export function useConversationUser() {
  const context = useContext(ConversationUserContext);
  if (context === undefined) {
    throw new Error(
      "useConversationUser must be used within a ConversationUserProvider"
    );
  }
  return context;
}