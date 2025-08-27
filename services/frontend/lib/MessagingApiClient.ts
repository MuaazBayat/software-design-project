// lib/MessagingApiClient.ts
export type UUID = string;

export interface LetterStyles {
  font_size: number;
  font_family: string;
}

export interface SendLetterRequest {
  match_id: UUID;
  sender_id: UUID;
  recipient_id: UUID;
  conversation_thread_id: UUID;
  message_content: string;
  letter_styles?: LetterStyles;
}

export interface SendLetterResponse {
  message_id: UUID;
  conversation_thread_id: UUID;
  message_sequence: number;
  message_content: string;
  scheduled_delivery_at: string;
  sender_id: UUID;
  recipient_id: UUID;
  [k: string]: unknown;
}

export interface PageLettersRequest {
  conversation_thread_id: UUID;
  page_size?: number;
  last_message_id?: UUID;
}

export interface MessageRow {
  message_id: UUID;
  conversation_thread_id: UUID;
  message_sequence?: number;
  message_content: string;
  scheduled_delivery_at: string;
  read_at?: string | null;
  sender_id: UUID;
  recipient_id: UUID;
  [k: string]: unknown;
}

export interface PageLettersResponse {
  items: MessageRow[];
  count: number;
  next_cursor: UUID | null;
  has_more: boolean;
}

export interface SearchUsersRequest {
  anonymous_handle: string; // "" to act like inbox
  my_user_id: UUID;
  limit?: number;
  offset?: number;
}

export interface SearchUsersResponseItem {
  user_profile: {
    user_id: UUID;
    anonymous_handle: string;
    country_code?: string | null;
    [k: string]: unknown;
  };
  latest_message: MessageRow | null;
}

export interface SearchUsersResponse {
  count: number;
  items: SearchUsersResponseItem[];
}

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export default class MessagingApiClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(opts?: { timeoutMs?: number }) {
    const fromEnv = process.env.NEXT_PUBLIC_MESSAGING_API_BASE_URL;
    if (!fromEnv) {
      throw new Error(
        "NEXT_PUBLIC_MESSAGING_API_BASE_URL is not set. Add it to .env.local"
      );
    }
    try {
      // validate and normalize (remove trailing slash)
      const u = new URL(fromEnv);
      this.baseUrl = u.toString().replace(/\/+$/, "");
    } catch {
      throw new Error(
        `Invalid NEXT_PUBLIC_MESSAGING_API_BASE_URL: ${fromEnv}`
      );
    }
    this.timeoutMs = opts?.timeoutMs ?? 15000;
  }

  // --- public methods ---
  async sendLetter(body: SendLetterRequest): Promise<SendLetterResponse> {
    return this.post<SendLetterResponse>("/messages", body);
  }

  async pageLetters(body: PageLettersRequest): Promise<PageLettersResponse> {
    return this.post<PageLettersResponse>("/messages/page", body);
  }

  async searchUsers(body: SearchUsersRequest): Promise<SearchUsersResponse> {
    return this.post<SearchUsersResponse>("/search", body);
  }

  // --- core request helper ---
  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      });

      const text = await res.text();
      const maybeJson = text ? safeJsonParse(text) : null;

      if (!res.ok) {
        const msg = (maybeJson as any)?.detail
          ? `Request failed: ${JSON.stringify((maybeJson as any).detail)}`
          : `Request failed with status ${res.status}`;
        throw new ApiError(msg, res.status, maybeJson ?? text);
      }

      return (maybeJson as T) ?? ({} as T);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new ApiError("Request timed out", 408);
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError(err?.message ?? "Unknown error", 500);
    } finally {
      clearTimeout(timer);
    }
  }
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
