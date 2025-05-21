import axios, { AxiosError } from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { tokenService } from "./tokenService";
import type { TokenRefreshResponse } from "../types";

// Get API URL from environment variables or use default
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // Required for cookies
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Flag to track if a token refresh is already in progress
let isRefreshing = false;
// Queue of failed requests to retry after token refresh
let refreshSubscribers: Array<(token: string) => void> = [];

// Subscribe failed requests to retry after token refresh
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  console.log("🔄 Subscribing to token refresh" + refreshSubscribers);
  refreshSubscribers.push(callback);
};

// Notify subscribers that a new token is available
const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

// Retry failed requests with new token
const retryRequest = (
  originalRequest: AxiosRequestConfig,
  newToken: string
): Promise<AxiosResponse> => {
  const modifiedRequest = { ...originalRequest };

  if (!modifiedRequest.headers) {
    modifiedRequest.headers = {};
  }

  modifiedRequest.headers["Authorization"] = `Bearer ${newToken}`;
  return apiClient(modifiedRequest);
};

// Refresh the access token using refresh token
const refreshToken = async (): Promise<string> => {
  console.log("🔄 Refreshing access token...");
  try {
    // Use axios directly to bypass any interceptors
    const response = await axios.post<TokenRefreshResponse>(
      `${API_URL}/api/auth/refresh-token`,
      {},
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest", // Some servers check this for CORS
          Authorization: undefined, // Explicitly remove Authorization header
        },
      }
    );

    const { token, expiresIn } = response.data;

    console.log(
      "✅ Token refreshed successfully. New expiration:",
      expiresIn,
      "seconds"
    );

    // Update token in memory
    tokenService.setToken(token, expiresIn);

    // Update token in localStorage user object
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.token = token;
      localStorage.setItem("user", JSON.stringify(user));
    }

    return token;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    tokenService.clearToken();

    // Clean up localStorage
    localStorage.removeItem("user");

    // Redirect to login page
    window.location.href = "/login";

    return Promise.reject(error);
  }
};

// Request interceptor to add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();

    // Don't add Authorization header for refresh token endpoint
    if (config.url?.includes("refresh-token")) {
      // Ensure there's no Authorization header for refresh token requests
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Cast config to any since we're adding custom properties
    const originalRequest = error.config as any;

    // Prevent infinite loop if refresh token request fails
    if (originalRequest?.url?.includes("refresh-token")) {
      return Promise.reject(error);
    }

    // Handle 401 error with TOKEN_EXPIRED code
    if (
      error.response?.status === 401 &&
      (error.response?.data as any)?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await refreshToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);
          return retryRequest(originalRequest, newToken);
        } catch (refreshError) {
          isRefreshing = false;
          return Promise.reject(refreshError);
        }
      } else {
        // If a refresh is already in progress, add request to queue
        return new Promise<AxiosResponse>((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            try {
              resolve(retryRequest(originalRequest, token));
            } catch (err) {
              reject(err);
            }
          });
        });
      }
    }

    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Auth endpoints
  auth: {
    login: (phone: string, password: string) =>
      apiClient.post("/auth/login", { phone, password }),

    signup: (name: string, phone: string, password: string) =>
      apiClient.post("/auth/signup", { name, phone, password }),

    logout: () =>
      apiClient.post(
        "/auth/logout",
        {},
        {
          withCredentials: true,
        }
      ),

    refreshToken: () => {
      // Only use cookie-based authentication - explicitly remove any Authorization header
      return apiClient.post(
        "/auth/refresh-token",
        {},
        {
          withCredentials: true,
          headers: {
            // Override the default headers to ensure no Authorization header is sent
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: undefined,
          },
        }
      );
    },

    refreshTokenFallback: (token: string) => {
      // Fallback method that sends the current access token in the request body
      // The backend will validate this and use it to identify the user
      return apiClient.post(
        "/auth/refresh-token",
        {
          refreshToken: token, // Using access token as a fallback identification method
        },
        {
          withCredentials: true,
          headers: {
            Authorization: undefined, // Ensure no Bearer token is sent in header
          },
        }
      );
    },

    getUsers: (exclude?: string) =>
      apiClient.get("/auth/users", { params: { exclude } }),

    getSessions: () => apiClient.get("/auth/sessions"),

    terminateSession: (sessionId: string) =>
      apiClient.delete(`/auth/sessions/${sessionId}`),

    revokeAllTokens: () => apiClient.post("/auth/revoke-all"),
  },

  // Messages endpoints
  messages: {
    getConversation: (userId: string, otherUserId: string) =>
      apiClient.get(`/messages/conversation/${userId}/${otherUserId}`),

    markAsRead: (userId: string, otherUserId: string) =>
      apiClient.put(`/messages/mark-read/${userId}/${otherUserId}`),

    markAsReadOnFocus: (userId: string, otherUserId: string) =>
      apiClient.put(`/messages/mark-read-focus/${userId}/${otherUserId}`),

    getRecentConversations: (userId: string) =>
      apiClient.get(`/messages/recent/${userId}`),
  },
};

export default apiService;
