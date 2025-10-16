// types/moderation.ts
export interface CheckProfanityRequest {
  text: string;
}

export interface CheckProfanityResponse {
  contains_profanity: boolean;
  censored_text: string | null;
}

export interface ReportUserRequest {
  reporterId: string;
  reportedId: string;
  violationType: string;
}

export interface ReportMessageRequest {
  reporterId: string;
  reportedUserId: string;
  reportedMessageId: string;
  violationType: string;
}

export interface BlockUserRequest {
  reporterId: string;
  reportedId: string;
}

export interface BanUserResponse {
  message: string;
}

export interface FingerprintCheckResponse {
  is_banned: boolean;
  message: string;
}

export interface ModerationLogEntry {
  log_id: string;
  created_at: string;
  target_type: 'user' | 'message';
  target_id: string;
  reported_user_id: string;
  reporting_user_id: string | null;
  violation_type: string;
  violation_description: string;
  severity_level: 'low' | 'medium' | 'high';
  automated_detection: boolean;
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  moderator_id?: string;
  reviewed_at?: string;
  resolution_action?: string;
  resolution_notes?: string;
  appeal_status?: string;
  evidence_message_ids?: string[];
  evidence_screenshots?: string[];
  system_context?: any;
}

export interface ModerationLogResponse {
    logs: ModerationLogEntry[];
}

export interface ApiError {
  detail: string;
}

export class ModerationApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private getToken: (() => Promise<string | null>) | null;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_MODERATION_URL || '',
    getToken?: () => Promise<string | null>
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.getToken = getToken ?? null;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get auth token if available and auth is enabled
    const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';
    const token = (!authDisabled && this.getToken) ? await this.getToken() : null;

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...headers,
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  /**
   * Check text for profanity
   * @param text - Text to check for profanity
   * @param userId - Internal user ID (for X-User-Id header)
   * @returns Promise with profanity check results
   */
  async checkProfanity(
    text: string,
    userId?: string
  ): Promise<CheckProfanityResponse> {

    const headers: Record<string, string> = {};
    
    if (userId) {
      headers['X-User-Id'] = userId;
    }

    return this.makeRequest<CheckProfanityResponse>(
      '/api/v1/check',
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      },
      headers
    );
  }

  /**
   * Report a user
   * @param reporterId - ID of the user making the report
   * @param reportedId - ID of the user being reported
   * @param violationType - Type of violation
   * @returns Promise with updated reported users list
   */
  async reportUser(
    reporterId: string,
    reportedId: string,
    violationType: string
  ): Promise<string[]> {
    return this.makeRequest<string[]>('/api/v1/report-user', {
      method: 'POST',
      body: JSON.stringify({
        reporterId,
        reportedId,
        violationType,
      }),
    });
  }

  /**
   * Report a message
   * @param reporterId - ID of the user making the report
   * @param reportedUserId - ID of the user who sent the message
   * @param reportedMessageId - ID of the message being reported
   * @param violationType - Type of violation
   * @returns Promise with moderation log entry
   */
  async reportMessage(
    reporterId: string,
    reportedUserId: string,
    reportedMessageId: string,
    violationType: string
  ): Promise<ModerationLogEntry | ModerationLogEntry[]> {
    return this.makeRequest<ModerationLogEntry | ModerationLogEntry[]>('/api/v1/report-message', {
      method: 'POST',
      body: JSON.stringify({
        reporterId,
        reportedUserId,
        reportedMessageId,
        violationType,
      }),
    });
  }

  /**
   * Block a user
   * @param reporterId - ID of the user doing the blocking
   * @param reportedId - ID of the user being blocked
   * @returns Promise with updated blocked users list
   */
  async blockUser(
    reporterId: string,
    reportedId: string
  ): Promise<string[]> {
    return this.makeRequest<string[]>('/api/v1/block-user', {
      method: 'POST',
      body: JSON.stringify({
        reporterId,
        reportedId,
      }),
    });
  }

  /**
   * Ban a user (moderator function)
   * @param logId - ID of the user to ban
   * @returns Promise with ban confirmation
   */
  async banUser(logId: string): Promise<BanUserResponse> {
    return this.makeRequest<BanUserResponse>(`/api/v1/ban-user/${encodeURIComponent(logId)}`, {
      method: 'POST',
    });
  }

/**
 * Ban a Clerk user (moderator function)
 * @param clerkId - Clerk user ID to ban
 * @returns Promise with ban confirmation
 */
async banClerkUser(clerkId: string): Promise<BanUserResponse> {
  return this.makeRequest<BanUserResponse>(`/api/v1/ban-clerk-user/${encodeURIComponent(clerkId)}`, {
    method: 'POST',
  });
}

  /**
   * Unban a user (moderator function)
   * @param userId - user ID to unban
   * @returns Promise with unban confirmation
   */
  async unbanUser(userId: string): Promise<BanUserResponse> {
    return this.makeRequest<BanUserResponse>(`/api/v1/unban-user/${encodeURIComponent(userId)}`, {
      method: 'POST',
    });
  }

  /**
   * Unban a Clerk user (moderator function)
   * @param clerkId - Clerk user ID to unban
   * @returns Promise with unban confirmation
   */
  async unbanClerkUser(clerkId: string): Promise<BanUserResponse> {
    return this.makeRequest<BanUserResponse>(`/api/v1/unban-clerk-user/${encodeURIComponent(clerkId)}`, {
      method: 'POST',
    });
  }

  /**
   * Check if a fingerprint is banned
   * @param fingerprint - Device fingerprint to check
   * @returns Promise with ban status
   */
  async checkFingerprint(fingerprint: string): Promise<FingerprintCheckResponse> {
    return this.makeRequest<FingerprintCheckResponse>(`/api/v1/fingerprint/${encodeURIComponent(fingerprint)}`, {
      method: 'GET',
    });
  }

  /**
   * Fetch all moderation logs
   * @param userId - ID of the user making the request (for X-User-Id header)
   * @returns Promise with a list of moderation log entries
   */
  async getModerationLogs(userId: string): Promise<ModerationLogEntry[]> {
    const headers: Record<string, string> = {
      'X-User-Id': userId,
    };
    const response = await this.makeRequest<ModerationLogResponse>('/api/v1/logs', {
      method: 'GET',
    }, headers);

    return response.logs;
  }

  /**
   * Fetch all banned users
   * @returns Promise with an array of banned user objects
   */
  async getBannedUsers(): Promise<any[]> {
    const response = await this.makeRequest<{ banned_users: any[] }>(`/api/v1/banned-users`, {
      method: 'GET',
    });

    return response.banned_users;
  }

  /**
   * Resolve a moderation case
   * @param logId - ID of the moderation log entry
   * @param action - Resolution action ("warning", "no_action", "content_removal", "temporary_ban", "permanent_ban")
   * @param notes - Notes explaining the resolution
   * @returns Promise with confirmation message
   */
  async resolveCase(
    log_id: string,
    action: string,
    notes: string
  ): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(
      `/api/v1/resolve-case`,
      {
        method: "POST",
        body: JSON.stringify({ log_id, action, notes }),
      }
    );
  }


}

// Create a default instance (without auth - for backwards compatibility)
// Note: Pages should create their own instance with getToken for authenticated requests
export const moderationApi = new ModerationApiClient();