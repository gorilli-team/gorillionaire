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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const privy = usePrivy();
  const { logout: privyLogout } = useLogout();
  const { login: privyLogin } = useLogin({
    onComplete: () => {
      handlePrivyLogin();
    },
  });

  const logout = useCallback(() => {
    privyLogout();
    removeAuthToken();
    setToken(null);
  }, [privyLogout]);

  const login = useCallback(() => {
    const existing = getAuthToken();
    console.log("existing", existing);
    console.log("privy.authenticated", privy.authenticated);
    if (privy.authenticated && !existing) {
      logout();
      privyLogin();
    } else {
      privyLogin();
    }
  }, [privyLogin, privy, logout]);

  // const validateToken = useCallback(() => {
  //   const existing = getAuthToken();
  //   if (existing && isTokenValid(existing)) {
  //     setToken(existing);
  //   } else {
  //     logout();
  //   }
  //   setIsLoading(false);
  // }, [logout]);

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
      const data = response.data as { token: string; refreshToken: string };
      setAuthToken(data.token, data.refreshToken);
      setToken(data.token);
    }
  }, [privy, logout]);

  useEffect(() => {
    console.log("privy.ready", privy.ready);
    console.log("privy.authenticated", privy.authenticated);

    if (!privy.ready) return; // wait for Privy to load

    const token = getAuthToken();
    if (token && isTokenValid(token) && privy.authenticated) {
      setIsAuthenticated(true);
      setIsLoading(false);
    } else {
      setIsAuthenticated(false);
      // logout();
    }
    // if ((!token || !isTokenValid(token)) && privy.authenticated) {
    //   console.log("logout");
    //   logout();
    // }
  }, [logout, privy.authenticated, privy.ready]);

  // useEffect(() => {
  //   if (!token && privy.ready && privy.authenticated) {
  //     handlePrivyLogin();
  //   }
  // }, [privy, token, handlePrivyLogin]);

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
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
