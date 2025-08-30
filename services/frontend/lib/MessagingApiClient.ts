// lib/MessagingApiClient.ts
export type UUID = string;

export interface LetterStyles {
  font_size: number;
  font_family: string;
}

export interface SendLetterRequest {
  sender_id: UUID;
  recipient_id: UUID;
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

export interface UserProfile {
  user_id: string;
  anonymous_handle: string;
  country_code?: string | null;
  bio?: string;
  age_range?: string;
  interests?: string[];
  // add other fields as needed
}

export interface SearchUsersResponseItem {
  user_profile: UserProfile;
  latest_message?: {
    is_read: boolean;
    from_me: boolean;
    message_content: string;
    scheduled_delivery_at: string;
    delivery_status: string;
    // add other fields as needed
  };
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
    const fromEnv = process.env.NEXT_PUBLIC_MESSAGING_URL;
    if (!fromEnv) {
      throw new Error(
        "NEXT_PUBLIC_MESSAGING_URL is not set. Add it to .env.local"
      );
    }
    try {
      const u = new URL(fromEnv);
      this.baseUrl = u.toString().replace(/\/+$/, "");
    } catch {
      throw new Error(`Invalid NEXT_PUBLIC_MESSAGING_URL: ${fromEnv}`);
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
      const maybeJson: unknown = text ? safeJsonParse(text) : null;

      if (!res.ok) {
        const msg = hasDetail(maybeJson)
          ? `Request failed: ${JSON.stringify(maybeJson.detail)}`
          : `Request failed with status ${res.status}`;
        throw new ApiError(msg, res.status, maybeJson);
      }

      return (maybeJson as T) ?? ({} as T);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        throw new ApiError("Request timed out", 408);
      }
      if (err instanceof ApiError) throw err;
      if (err instanceof Error) {
        throw new ApiError(err.message, 500);
      }
      throw new ApiError("Unknown error", 500);
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------- tiny helpers (typed, no-any) ----------
function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function hasDetail(x: unknown): x is { detail: unknown } {
  return typeof x === "object" && x !== null && "detail" in x;
}

function isAbortError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const maybeName = (e as { name?: unknown }).name;
  return typeof maybeName === "string" && maybeName === "AbortError";
}
