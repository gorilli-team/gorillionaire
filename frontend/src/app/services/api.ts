// src/api/apiClient.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from "axios";
import { ENDPOINTS, BASE_URL } from "@/app/const/Endpoints";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/app/const/Vars";
import { getAuthToken, getRefreshToken } from "@/app/helpers/auth";

interface PropsRequest {
  url: string;
  params?: Record<string, string | number | boolean>;
  data?: Record<string, unknown>;
  config?: AxiosRequestConfig;
  csrfToken?: boolean;
  auth?: boolean;
  onResponse?: (response: AxiosResponse) => void;
  onError?: (error: AxiosError) => void;
  onFinally?: () => void;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: {
    resolve: (value?: unknown) => void;
    reject: (error: AxiosError) => void;
  }[] = [];

  private cachedCsrfToken: string | null = null; // Cached token for reuse

  constructor(baseURL?: string) {
    const config: AxiosRequestConfig = {
      baseURL: baseURL || BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    };

    this.client = axios.create(config);
    this.client.interceptors.request.use(this.handleRequest, this.handleError);
    this.client.interceptors.response.use(this.handleResponse, this.handleError);
  }

  private handleRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer at_${token}`;
    }
    return config;
  };

  private handleResponse = (response: AxiosResponse): AxiosResponse => response;

  private handleError = (error: AxiosError): Promise<AxiosResponse> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest?._retry
    ) {
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        }).then(() => this.client(originalRequest)).catch(Promise.reject);
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
      .post<{ token: string }>(ENDPOINTS.REFREFH_TOKEN, { refreshToken }, mergedConfig)
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

  public async post<T = unknown>(
    props: PropsRequest
  ): Promise<AxiosResponse<T>> {
  const mergedConfig = await this.mergeConfigWithCsrf(props.config, props.csrfToken, props.auth);
    return this.client.post<T>(props.url, props.data, mergedConfig);
  }

  public async put<T = unknown>(
    props: PropsRequest
  ): Promise<AxiosResponse<T>> {
  const mergedConfig = await this.mergeConfigWithCsrf(props.config, props.csrfToken, props.auth);
    return this.client.put<T>(props.url, props.data, mergedConfig);
  }

  public async patch<T = unknown>(
    props: PropsRequest
  ): Promise<AxiosResponse<T>> {
  const mergedConfig = await this.mergeConfigWithCsrf(props.config, props.csrfToken, props.auth);
    return this.client.patch<T>(props.url, props.data, mergedConfig);
  }

  public async delete<T = unknown>(
    props: PropsRequest
  ): Promise<AxiosResponse<T>> {
  const mergedConfig = await this.mergeConfigWithCsrf(props.config, props.csrfToken, props.auth);
    return this.client.delete<T>(props.url, mergedConfig);
  }

  // public get<T = any>(props: {
  //   url: string;
  //   params?: any;
  //   config?: AxiosRequestConfig;
  //   auth?: boolean
  //   onResponse?: (response: AxiosResponse<T>) => void;
  //   onError?: (error: any) => void;
  //   onFinally?: () => void;
  // }): Promise<AxiosResponse<T>> {
  //   this._get<T>(props.url, props.params, props.config)
  //     .then((response) => props.onResponse?.(response))
  //     .catch((error) => props.onError?.(error))
  //     .finally(() => props.onFinally?.());
  // }

  public async get<T = unknown>(
    props: PropsRequest
  ): Promise<AxiosResponse<T>> {
    const mergedConfig = await this.mergeConfigWithCsrf(props.config, props.csrfToken, props.auth);
    return this.client.get<T>(props.url, { ...mergedConfig, params: props.params });
  }
}

// const storeTokens = (token: string, refreshToken: string) => {
//   localStorage.setItem(TOKEN_KEY, token);
//   localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
// }

// const cleanUpTokens = () => {
//   localStorage.removeItem(TOKEN_KEY);
//   localStorage.removeItem(REFRESH_TOKEN_KEY);
// }

// const getToken = () => {
//   return localStorage.getItem(TOKEN_KEY);
// }

// const getRefreshToken = () => {
//   return localStorage.getItem(REFRESH_TOKEN_KEY);
// }

const safe = <T>(promise: Promise<T>): Promise<[T, null] | [null, AxiosError]> =>
  promise.then((data): [T, null] => [data, null]).catch((err): [null, AxiosError] => [null, err]);
const apiClient = new ApiClient();
export { apiClient, safe };
