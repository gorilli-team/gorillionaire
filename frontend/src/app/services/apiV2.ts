const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_V2_URL || "http://localhost:3001";

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

interface ApiRequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

class ApiClientV2 {
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add auth token if available
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth-token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async get<T>(
    options: Omit<ApiRequestOptions, "method">
  ): Promise<ApiResponse<T>> {
    const { url, auth = false, headers = {} } = options;

    const requestHeaders = auth
      ? { ...this.getAuthHeaders(), ...headers }
      : headers;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "GET",
      headers: requestHeaders,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      data,
      status: response.status,
    };
  }

  async post<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const { url, data, auth = false, headers = {} } = options;

    const requestHeaders = auth
      ? { ...this.getAuthHeaders(), ...headers }
      : headers;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return {
      data: responseData,
      status: response.status,
    };
  }

  async put<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const { url, data, auth = false, headers = {} } = options;

    const requestHeaders = auth
      ? { ...this.getAuthHeaders(), ...headers }
      : headers;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return {
      data: responseData,
      status: response.status,
    };
  }

  async delete<T>(
    options: Omit<ApiRequestOptions, "method">
  ): Promise<ApiResponse<T>> {
    const { url, auth = false, headers = {} } = options;

    const requestHeaders = auth
      ? { ...this.getAuthHeaders(), ...headers }
      : headers;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: "DELETE",
      headers: requestHeaders,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      data,
      status: response.status,
    };
  }
}

export const apiClientV2 = new ApiClientV2();
