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
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  clearCurrentUser: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ConversationUserContext = createContext<ConversationUserContextType | undefined>(
  undefined
);

export function ConversationUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearCurrentUser = () => {
    setCurrentUser(null);
    setIsLoading(false);
  };

  return (
    <ConversationUserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        clearCurrentUser,
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