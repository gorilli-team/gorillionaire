// AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { usePrivy, useLogout, useLogin } from "@privy-io/react-auth";
import {
  getAuthToken,
  isTokenValid,
  removeAuthToken,
  setAuthToken,
} from "@/app/helpers/auth";
import { safe, apiClient } from "@/app/services/api";
import { ENDPOINTS } from "@/app/const/Endpoints";
import Cookies from "js-cookie";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const privy = usePrivy();
  const { logout: privyLogout } = useLogout();
  const { login: privyLogin } = useLogin({
    onComplete: () => {
      handlePrivyLogin();
    },
  });

  const logout = useCallback(() => {
    removeAuthToken();
    setToken(null);
    privyLogout();
  }, [privyLogout]);

  const login = useCallback(() => {
    const existing = getAuthToken();
    if (privy.authenticated && !existing) {
      logout();
      privyLogin();
    } else {
      privyLogin();
    }
  }, [privyLogin, privy, logout]);

  const validateToken = useCallback(() => {
    const existing = getAuthToken();
    if (existing && isTokenValid(existing)) {
      setToken(existing);
    } else {
      logout();
    }
    setIsLoading(false);
  }, [logout]);

  const handlePrivyLogin = useCallback(async () => {
    if (!privy.ready || !privy.authenticated || !privy.user?.wallet?.address)
      return;

    const privyToken = Cookies.get("privy-token");
    if (!privyToken) return;

    const [response, error] = await safe(
      apiClient.post({
        url: ENDPOINTS.PRIVY_VERIFY,
        data: {
          wallet_address: privy.user.wallet.address,
          privy_token: privyToken,
        },
        csrfToken: true,
      })
    );

    if (error || response?.status !== 200) {
      logout();
    } else {
      setAuthToken(response.data.token, response.data.refreshToken);
      setToken(response.data.token);
    }
  }, [privy, logout]);

  useEffect(() => {
    const token = getAuthToken();
    if (token)
      if (isTokenValid(token)) {
        setToken(token);
      } else {
        logout();
      }
  }, [logout]);



  // useEffect(() => {
  //   if (!token && privy.ready && privy.authenticated) {
  //     handlePrivyLogin();
  //   }
  // }, [privy, token, handlePrivyLogin]);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
