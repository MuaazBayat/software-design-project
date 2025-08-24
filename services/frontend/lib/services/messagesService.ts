// frontend/lib/services/messagesService.ts
import { ApiBase } from "../apiBase";

// --- Types that match your FastAPI models ---
export type MessageCreate = {
  match_id: string;
  sender_id: string;
  recipient_id: string;
  conversation_thread_id: string;
  message_content: string;
};

export type MessageRow = Record<string, any>; // shape from DB; keep flexible

export type PageMessagesSAIn = {
  conversation_thread_id: string;
  page_size?: number;        // default 5
  last_message_id?: string;  // cursor
};

export type PageMessagesSAOut = {
  items: MessageRow[];
  count: number;
  next_cursor: string | null;
  has_more: boolean;
};

export class MessagesService extends ApiBase {
  /** POST /messages — schedules +5min SAST and returns inserted row */
  async sendMessage(body: MessageCreate): Promise<MessageRow> {
    return this.request<MessageRow>("/messages", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** POST /messages/page-sa — newest→oldest, only visible by SA time */
  async pageMessagesSA(body: PageMessagesSAIn): Promise<PageMessagesSAOut> {
    return this.request<PageMessagesSAOut>("/messages/page-sa", {
      method: "POST",
      body: JSON.stringify({
        conversation_thread_id: body.conversation_thread_id,
        page_size: body.page_size ?? 5,
        last_message_id: body.last_message_id ?? null,
      }),
    });
  }
}
