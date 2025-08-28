// Export all components from a single file for easier imports
export { default as LeftSidebar } from './LeftSidebar';
export { default as MainContent } from './MainContent';
export { default as RightSidebar } from './RightSidebar';

// Export shared types
export interface Match {
  id: string;
  name: string;
  location: string;
  interests: string[];
  conversation_thread_id: string;
  match_id?: string;
}
