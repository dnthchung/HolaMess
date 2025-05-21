"use client";

import {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

import type { User, AuthResponse } from "../types";
import { apiService } from "../services/apiService";
import { tokenService } from "../services/tokenService";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (phone: string, password: string) => Promise<void>;
  signup: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        // console.log("Loaded user from localStorage", {
        //   name: parsedUser.name,
        //   id: parsedUser.id,
        // });
        return parsedUser;
      }
      return null;
    } catch (error) {
      // console.error("Error parsing user from localStorage:", error);
      localStorage.removeItem("user");
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const setUser = (newUser: User | null) => {
    // console.log(
    //   "Updating user state:",
    //   newUser ? { id: newUser.id, name: newUser.name } : "null"
    // );
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
      if (newUser.token) {
        tokenService.setToken(newUser.token, newUser.expiresIn || 0);
      }
    } else {
      localStorage.removeItem("user");
      tokenService.clearToken();
    }
  };

  const clearError = () => setError(null);

  const login = async (phone: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.auth.login(phone, password);
      const userData = response.data as AuthResponse;
      setUser({
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        token: userData.token,
        expiresIn: userData.expiresIn,
      });
      // console.log("Login successful - refresh token should be stored in cookies");
    } catch (err: any) {
      // console.error("Login error:", err);
      setError(err.response?.data?.error || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, phone: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.auth.signup(name, phone, password);
      const userData = response.data;
      setUser({
        id: userData.user.id,
        name: userData.user.name,
        phone: userData.user.phone,
        token: userData.token,
        expiresIn: userData.expiresIn,
      });
      // console.log("Signup successful");
    } catch (err: any) {
      // console.error("Signup error:", err);
      setError(err.response?.data?.error || "Signup failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (user) {
        await apiService.auth.logout();
        // console.log("Logout API call successful");
      }
      setUser(null);
    } catch (err) {
      // console.error("Logout error:", err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    setIsLoading(true);
    try {
      if (!user) {
        // console.error("No user data available for token refresh");
        throw new Error("No user to refresh token for");
      }
      // console.log("Manually refreshing token...");
      try {
        const response = await apiService.auth.refreshToken();
        const { token, expiresIn } = response.data;
        // console.log("✅ Manual token refresh successful", { expiresIn });
        setUser({ ...user, token, expiresIn });
      } catch (apiError: any) {
        // console.warn(
        //   "Cookie-based refresh failed, trying fallback with token in body",
        //   {
        //     status: apiError.response?.status,
        //     data: apiError.response?.data,
        //   }
        // );
        try {
          if (!user.token) {
            throw new Error("No token available for fallback refresh");
          }
          const fallbackResponse = await apiService.auth.refreshTokenFallback(
            user.token
          );
          const { token, expiresIn } = fallbackResponse.data;
          // console.log("✅ Fallback token refresh successful", { expiresIn });
          setUser({ ...user, token, expiresIn });
        } catch (fallbackError: any) {
          // console.error("Both refresh methods failed:", {
          //   cookieError: apiError?.message,
          //   fallbackError: fallbackError?.message,
          // });
          throw fallbackError;
        }
      }
    } catch (err) {
      // console.error("Token refresh failed, logging out user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.token || !user.expiresIn) return;
    const refreshTime = user.expiresIn * 0.8 * 1000;
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) {
      const refreshDate = new Date(
        Date.now() + refreshTime
      ).toLocaleTimeString();
      // console.log(
      //   `Token refresh scheduled for ${refreshDate} (${refreshTime / 1000}s from now)`
      // );
    }
    const timerId = setTimeout(() => {
      // console.log("Token refresh timer triggered");
      if (tokenService.hasValidToken()) {
        refreshToken();
      }
    }, refreshTime);
    return () => clearTimeout(timerId);
  }, [user?.token, user?.expiresIn]);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        login,
        signup,
        logout,
        refreshToken,
        isLoading,
        error,
        clearError,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
