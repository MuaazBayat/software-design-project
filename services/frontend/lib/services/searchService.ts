// frontend/lib/services/searchService.ts
import { ApiBase } from "../apiBase";

export type SearchUsersWithConvoIn = {
  anonymous_handle: string; // the handle fragment to search
  my_user_id: string;
  limit?: number;  // default 20
  offset?: number; // default 0
};

export type UserProfile = Record<string, any>;
export type LatestMessage = {
  message_id: string;
  conversation_thread_id: string;
  message_content: string;
  sender_id: string;
  recipient_id: string;
  scheduled_delivery_at: string;
  read_at: string | null;
  from_me: boolean;
  is_read: boolean;
  delivery_status?: string;
} | null;

export type SearchUsersWithConvoOut = {
  count: number;
  items: Array<{
    user_profile: UserProfile;
    latest_message: LatestMessage;
  }>;
};

export class SearchService extends ApiBase {
  /** POST /search/users-with-convo — only users you have an ACTIVE convo with, handle filter */
  async usersWithConvo(body: SearchUsersWithConvoIn): Promise<SearchUsersWithConvoOut> {
    return this.request<SearchUsersWithConvoOut>("/search/users-with-convo", {
      method: "POST",
      body: JSON.stringify({
        anonymous_handle: body.anonymous_handle,
        my_user_id: body.my_user_id,
        limit: body.limit ?? 20,
        offset: body.offset ?? 0,
      }),
    });
  }
}
