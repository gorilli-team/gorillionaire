import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from "../const/Vars";

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

export const setAuthToken = (
  token: string,
  refreshToken?: string | undefined
) => {
  if (typeof window !== "undefined") {
    // Store in localStorage for client-side access
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    // Store in cookie for server-side access
    Cookies.set(TOKEN_KEY, token, {
      expires: 1,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    if (refreshToken)
      Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
        expires: 1,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
};

export const isTokenValid = (token: string): boolean => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp ? decoded.exp > currentTime : false;
  } catch {
    return false;
  }
};

export const getUserFromToken = (token: string): User | null => {
  try {
    const decoded = jwtDecode(token);
    return decoded as User;
  } catch {
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
};


