// frontend/lib/apiBase.ts
export class ApiBase {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Prefer server-side env if available, else public (browser) env, else passed-in
    this.baseUrl =
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      baseUrl ||
      "https://probable-acorn-7qjgxwj6wgvhrqpr-8000.app.github.dev";
    if (!this.baseUrl) {
      throw new Error("API base URL not configured. Set API_BASE_URL or NEXT_PUBLIC_API_BASE_URL.");
    }
  }

  protected async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const msg = (data && (data.detail || data.message)) || res.statusText;
      throw new Error(`API ${res.status}: ${msg}`);
    }
    return data as T;
  }
}
