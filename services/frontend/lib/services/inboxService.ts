// frontend/lib/services/inboxService.ts
import { ApiBase } from "../apiBase";

export type InboxIn = {
  my_user_id: string;
  limit?: number;  // default 15
  offset?: number; // default 0
};

export type InboxItem = {
  user_profile: Record<string, any> | null;
  conversation_thread_id: string;
  latest_message: {
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
};

export type InboxOut = {
  count: number;
  items: InboxItem[];
  has_more: boolean;
  next_offset: number | null;
};

export class InboxService extends ApiBase {
  /** POST /inbox — 15 per page, newest→oldest by latest visible message (SAST cutoff) */
  async getInbox(body: InboxIn): Promise<InboxOut> {
    return this.request<InboxOut>("/inbox", {
      method: "POST",
      body: JSON.stringify({
        my_user_id: body.my_user_id,
        limit: body.limit ?? 15,
        offset: body.offset ?? 0,
      }),
    });
  }
}
