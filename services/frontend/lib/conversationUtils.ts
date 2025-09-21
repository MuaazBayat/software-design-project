import { MessageRow } from '@/lib/MessagingApiClient';

/**
 * Gets the other user's ID from a conversation
 * @param messages - Array of messages in the conversation
 * @param currentUserId - Current user's ID
 * @returns The other user's ID, or null if not found
 */
export function getOtherUserId(
  messages: MessageRow[], 
  currentUserId: string | undefined
): string | null {
  if (!currentUserId || messages.length === 0) {
    return null;
  }

  // Get the first message to determine the participants
  const firstMessage = messages[0];
  
  // Return the ID that's not the current user
  if (firstMessage.sender_id === currentUserId) {
    return firstMessage.recipient_id;
  } else if (firstMessage.recipient_id === currentUserId) {
    return firstMessage.sender_id;
  }
  
  // Fallback: search through all messages to find the other user
  for (const message of messages) {
    if (message.sender_id !== currentUserId) {
      return message.sender_id;
    }
    if (message.recipient_id !== currentUserId) {
      return message.recipient_id;
    }
  }
  
  return null;
}

/**
 * Alternative version that gets other user ID from a single message
 * @param message - Any message from the conversation
 * @param currentUserId - Current user's ID
 * @returns The other user's ID, or null if not found
 */
export function getOtherUserIdFromMessage(
  message: MessageRow,
  currentUserId: string | undefined
): string | null {
  if (!currentUserId) {
    return null;
  }

  if (message.sender_id === currentUserId) {
    return message.recipient_id;
  } else if (message.recipient_id === currentUserId) {
    return message.sender_id;
  }
  
  return null;
}

/**
 * Checks if the current user is the sender of a message
 * @param message - The message to check
 * @param currentUserId - Current user's ID
 * @returns True if current user is the sender
 */
export function isMyMessage(
  message: MessageRow,
  currentUserId: string | undefined
): boolean {
  return message.sender_id === currentUserId;
}