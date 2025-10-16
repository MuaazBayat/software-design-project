/**
 * Authenticated Fetch Utility
 *
 * Provides a wrapper around fetch that automatically includes Clerk JWT tokens
 * in the Authorization header for all backend API requests.
 *
 * Usage:
 *   import { useAuthFetch } from '@/lib/authFetch';
 *
 *   const authFetch = useAuthFetch();
 *   const response = await authFetch('/api/profiles/user_123');
 */

import { useAuth } from '@clerk/nextjs';

export interface AuthFetchOptions extends RequestInit {
  skipAuth?: boolean; // Set to true to skip authentication for public endpoints
}

/**
 * Hook that returns an authenticated fetch function.
 * Automatically adds Clerk JWT token to all requests.
 *
 * @returns authFetch function that works like native fetch but with auth
 */
export function useAuthFetch() {
  const { getToken } = useAuth();

  /**
   * Authenticated fetch wrapper
   *
   * @param url - The URL to fetch
   * @param options - Standard fetch options plus skipAuth flag
   * @returns Promise<Response>
   */
  const authFetch = async (
    url: string | URL,
    options: AuthFetchOptions = {}
  ): Promise<Response> => {
    const { skipAuth = false, headers = {}, ...restOptions } = options;

    // Build headers object
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(typeof headers === 'object' && headers !== null ? headers as Record<string, string> : {}),
    };

    // Add Authorization header unless explicitly skipped or auth is disabled
    const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';
    if (!skipAuth && !authDisabled) {
      try {
        const token = await getToken();

        if (token) {
          fetchHeaders['Authorization'] = `Bearer ${token}`;
        } else {
          console.warn('authFetch: No Clerk token available. Request may fail if auth is enabled.');
        }
      } catch (error) {
        console.error('authFetch: Failed to get Clerk token:', error);
        // Continue without token - let the backend handle auth errors
      }
    }

    // Make the fetch request
    return fetch(url, {
      ...restOptions,
      headers: fetchHeaders,
    });
  };

  return authFetch;
}

/**
 * Helper function for authenticated GET requests
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function authGet<T = any>(
  getToken: () => Promise<string | null>,
  url: string,
  options: AuthFetchOptions = {}
): Promise<T> {
  const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';
  const token = authDisabled ? null : await getToken();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper function for authenticated POST requests
 *
 * @param url - The URL to fetch
 * @param body - Request body (will be JSON.stringified)
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function authPost<T = any>(
  getToken: () => Promise<string | null>,
  url: string,
  body: any,
  options: AuthFetchOptions = {}
): Promise<T> {
  const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true'; const token = authDisabled ? null : await getToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper function for authenticated PUT requests
 *
 * @param url - The URL to fetch
 * @param body - Request body (will be JSON.stringified)
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function authPut<T = any>(
  getToken: () => Promise<string | null>,
  url: string,
  body: any,
  options: AuthFetchOptions = {}
): Promise<T> {
  const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true'; const token = authDisabled ? null : await getToken();

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    throw new Error(`PUT ${url} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper function for authenticated DELETE requests
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function authDelete<T = any>(
  getToken: () => Promise<string | null>,
  url: string,
  options: AuthFetchOptions = {}
): Promise<T> {
  const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true'; const token = authDisabled ? null : await getToken();

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`DELETE ${url} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}