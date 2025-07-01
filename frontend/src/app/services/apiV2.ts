import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosError,
} from "axios";
import { ENDPOINTS, BASE_URL } from "@/app/const/Endpoints";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/app/const/Vars";
import { getAuthToken, getRefreshToken } from "@/app/helpers/auth";

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
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: {
    resolve: (value?: unknown) => void;
    reject: (error: AxiosError) => void;
  }[] = [];

  private cachedCsrfToken: string | null = null; // Cached token for reuse

  constructor() {
    const config: AxiosRequestConfig = {
      baseURL: BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    };

    this.client = axios.create(config);
    this.client.interceptors.request.use(this.handleRequest, this.handleError);
    this.client.interceptors.response.use(
      this.handleResponse,
      this.handleError
    );
  }

  private handleRequest = (
    config: InternalAxiosRequestConfig
  ): InternalAxiosRequestConfig => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer at_${token}`;
    }
    return config;
  };

  private handleResponse = (response: AxiosResponse): AxiosResponse => response;

  private handleError = (error: AxiosError): Promise<AxiosResponse> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest?._retry
    ) {
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        })
          .then(() => this.client(originalRequest))
          .catch(Promise.reject);
      }

      originalRequest._retry = true;
      this.isRefreshing = true;

      const refreshToken = getRefreshToken();

      return new Promise((resolve, reject) => {
        this.refreshToken(refreshToken)
          .then((newToken) => {
            localStorage.setItem(TOKEN_KEY, newToken);
            this.client.defaults.headers.common.Authorization = `Bearer at_${newToken}`;
            originalRequest.headers.Authorization = `Bearer at_${newToken}`;
            this.processQueue(null as unknown as AxiosError);
            resolve(this.client(originalRequest));
          })
          .catch((err) => {
            this.processQueue(err);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            reject(err);
          })
          .finally(() => {
            this.isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  };

  private async refreshToken(refreshToken: string | null): Promise<string> {
    const mergedConfig = await this.mergeConfigWithCsrf({}, true, true);
    return this.client
      .post<{ token: string }>(
        ENDPOINTS.REFREFH_TOKEN,
        { refreshToken },
        mergedConfig
      )
      .then((response) => response.data.token);
  }

  private processQueue(error: AxiosError) {
    this.failedQueue.forEach((prom) => {
      if (error) prom.reject(error);
      else prom.resolve();
    });
    this.failedQueue = [];
  }

  private async mergeConfigWithCsrf(
    config?: AxiosRequestConfig,
    csrfToken?: string | boolean,
    auth?: boolean
  ): Promise<AxiosRequestConfig> {
    const headers: Record<string, string> = {};
    if (config?.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        if (value !== undefined) headers[key] = String(value);
      });
    }

    // Fetch CSRF token if needed
    if (csrfToken === true && !this.cachedCsrfToken) {
      const res = await this.client.get<{ csrf_token: string }>(
        ENDPOINTS.CSRF_TOKEN,
        { withCredentials: true }
      );
      if (res.status === 200) {
        this.cachedCsrfToken = res.data.csrf_token;
      } else {
        this.cachedCsrfToken = null;
        return Promise.reject("Failed to fetch CSRF token");
      }
    }

    if (typeof csrfToken === "string") {
      headers["X-CSRF-Token"] = csrfToken;
    } else if (csrfToken === true && this.cachedCsrfToken) {
      headers["X-CSRF-Token"] = this.cachedCsrfToken;
    }

    // Add Authorization header if required
    if (auth) {
      const storedToken = getAuthToken();
      if (storedToken) {
        headers["Authorization"] = `Bearer at_${storedToken}`;
      }
    }

    return {
      ...config,
      headers,
      withCredentials: csrfToken ? true : config?.withCredentials,
    };
  }

  async get<T>(
    options: Omit<ApiRequestOptions, "method">
  ): Promise<ApiResponse<T>> {
    const { url, auth = false, headers = {} } = options;
    const mergedConfig = await this.mergeConfigWithCsrf(
      { headers },
      false,
      auth
    );

    const response = await this.client.get<T>(url, mergedConfig);

    return {
      data: response.data,
      status: response.status,
    };
  }

  async post<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const { url, data, auth = false, headers = {} } = options;
    const mergedConfig = await this.mergeConfigWithCsrf(
      { headers },
      false,
      auth
    );

    const response = await this.client.post<T>(url, data, mergedConfig);

    return {
      data: response.data,
      status: response.status,
    };
  }

  async put<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const { url, data, auth = false, headers = {} } = options;
    const mergedConfig = await this.mergeConfigWithCsrf(
      { headers },
      false,
      auth
    );

    const response = await this.client.put<T>(url, data, mergedConfig);

    return {
      data: response.data,
      status: response.status,
    };
  }

  async delete<T>(
    options: Omit<ApiRequestOptions, "method">
  ): Promise<ApiResponse<T>> {
    const { url, auth = false, headers = {} } = options;
    const mergedConfig = await this.mergeConfigWithCsrf(
      { headers },
      false,
      auth
    );

    const response = await this.client.delete<T>(url, mergedConfig);

    return {
      data: response.data,
      status: response.status,
    };
  }
}

export const apiClientV2 = new ApiClientV2();
