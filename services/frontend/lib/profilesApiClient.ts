// types/profiles.ts
export interface ExtendedUserProfile {
  user_id: string;
  anonymous_handle: string;
  country_code?: string | null;
  bio?: string;
  age_range?: string;
  interests?: string[];
  primary_language?: string;
  secondary_languages?: string[];
  last_active?: string;
  favorite_local_fact?: string;
}

export interface ProfileCreateRequest {
  anonymous_handle: string;
  country_code?: string;
  bio?: string;
  age_range?: string;
  interests?: string[];
  primary_language?: string;
  secondary_languages?: string[];
  favorite_local_fact?: string;
}

export interface ProfileUpdateRequest {
  anonymous_handle?: string;
  country_code?: string;
  bio?: string;
  age_range?: string;
  interests?: string[];
  primary_language?: string;
  secondary_languages?: string[];
  favorite_local_fact?: string;
}

export interface ApiError {
  detail: string;
}

export interface MatchedUserProfile {
  user_id: string;
  anonymous_handle: string;
  country_code?: string | null;
  bio?: string;
  age_range?: string;
  interests?: string[];
  primary_language?: string;
  secondary_languages?: string[];
  favorite_local_fact?: string;
}

export interface Match {
  match_id: string;
  conversation_thread_id?: string | null;
  match_type?: string | null;
  compatibility_score?: number | null;
  status: string;
  created_at: string;
  penpal_profile: MatchedUserProfile;
}

export interface MatchesResponse {
  matches: Match[];
  total_count: number;
}

export class ProfilesApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private getToken: (() => Promise<string | null>) | null;

  constructor(
    baseUrl?: string,
    getToken?: () => Promise<string | null>
  ) {
    // Use provided baseUrl, or env var, or default to localhost:8000
    this.baseUrl = (baseUrl || process.env.NEXT_PUBLIC_CORE_URL || 'http://localhost:8000').replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.getToken = getToken ?? null;
  }

  // Getter for baseUrl to make it accessible in tests
  get baseUrlValue(): string {
    return this.baseUrl;
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
   * Get a profile by user ID
   * @param userId - The user ID to fetch the profile for
   * @returns Promise with the user profile
   */
  async getProfileByUserId(userId: string): Promise<ExtendedUserProfile> {
    return this.makeRequest<ExtendedUserProfile>(`/profiles/by-user-id/${userId}`, {
      method: 'GET',
    });
  }

  /**
   * Get all matches for a user by their user ID
   * @param userId - The user ID to fetch matches for
   * @returns Promise with the user's matches
   */
  async getMatches(userId: string): Promise<MatchesResponse> {
    return this.makeRequest<MatchesResponse>(`/profiles/matches/${userId}`, {
      method: 'GET',
    });
  }
}

// Export a default instance for convenience
export const profilesApiClient = new ProfilesApiClient();