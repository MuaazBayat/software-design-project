/**
 * Type definitions for the compose-letter module
 */

export interface Match {
  id: string;
  name: string;
  location: string;
  interests: string[];
  conversation_thread_id: string;
  match_id?: string;
}

export interface LetterStyle {
  fontFamily: string;
  fontSize: number;
}

export interface LetterDraft {
  id?: string;
  content: string;
  recipient: Match | null;
  style: LetterStyle;
  lastEdited: Date;
}

// Make sure all UUID values are in the correct format
export type UUID = string;
