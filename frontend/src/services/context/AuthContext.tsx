import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

import { useLoginMutation } from "../api/auth.api";

// ============================================================
// TYPES
// ============================================================

export interface AuthUser {
  id: string;
  name: string;
  email: string;

  role?: string;
  roleId?: string;
  employeeId?: string;

  is_active?: boolean;
  is_email_verified?: boolean;

  [key: string]: unknown;
}

export interface LoginResponse {
  accessToken: string;
  user?: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;

  isAuthenticated: boolean;
  loading: boolean;

  login: (email: string, password: string) => Promise<LoginResponse>;

  logout: () => void;

  refreshAuth: () => void;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// JWT HELPERS
// ============================================================

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      // Not a JWT.
      // Let the backend decide whether it is valid.
      return false;
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as {
      exp?: number;
    };

    if (!payload.exp) {
      return false;
    }

    // exp is Unix timestamp in seconds.
    return payload.exp * 1000 <= Date.now();
  } catch {
    // If the token cannot be decoded, don't crash the app.
    // The API will ultimately reject it with 401.
    return false;
  }
}

// ============================================================
// CLEAR STORED AUTH
// ============================================================

function clearStoredAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // ==========================================================
  // RTK QUERY LOGIN
  // ==========================================================

  const [loginMutation, { isLoading: loginLoading }] = useLoginMutation();

  // ==========================================================
  // LOAD AUTH DATA
  // ==========================================================

  const loadAuth = useCallback(() => {
    try {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      // ------------------------------------------------------
      // NO TOKEN
      // ------------------------------------------------------

      if (!token) {
        setAccessToken(null);
        setUser(null);
        return;
      }

      // ------------------------------------------------------
      // TOKEN EXPIRED
      // ------------------------------------------------------

      if (isTokenExpired(token)) {
        clearStoredAuth();

        setAccessToken(null);
        setUser(null);

        return;
      }

      // ------------------------------------------------------
      // VALID TOKEN
      // ------------------------------------------------------

      setAccessToken(token);

      // ------------------------------------------------------
      // USER
      // ------------------------------------------------------

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as AuthUser;

          setUser(parsedUser);
        } catch {
          localStorage.removeItem("user");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      clearStoredAuth();

      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL AUTH CHECK
  // ==========================================================

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  // ==========================================================
  // GLOBAL 401 / AUTH EXPIRED EVENT
  // ==========================================================
  //
  // baseApi dispatches this event whenever the backend returns
  // HTTP 401.
  //
  // This allows the API layer to invalidate authentication
  // without importing React/AuthContext into the API layer.
  // ==========================================================

  useEffect(() => {
    const handleAuthExpired = () => {
      clearStoredAuth();

      flushSync(() => {
        setAccessToken(null);
        setUser(null);
      });
    };

    window.addEventListener("auth:expired", handleAuthExpired);

    return () => {
      window.removeEventListener("auth:expired", handleAuthExpired);
    };
  }, []);

  // ==========================================================
  // CROSS-TAB AUTH CHANGE
  // ==========================================================
  //
  // If another browser tab logs out, this tab also logs out.
  // ==========================================================

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "accessToken" && event.newValue === null) {
        flushSync(() => {
          setAccessToken(null);
          setUser(null);
        });
      }

      if (event.key === "user" && event.newValue === null) {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      try {
        const response = await loginMutation({
          email,
          password,
        }).unwrap();

        // ----------------------------------------------------
        // SUPPORT MULTIPLE TOKEN FORMATS
        // ----------------------------------------------------

        const token =
          response.accessToken || response.access_token || response.token;

        if (!token) {
          throw new Error("Authentication token was not returned.");
        }

        const loggedInUser = response.user;

        // ----------------------------------------------------
        // STORE TOKEN
        // ----------------------------------------------------

        localStorage.setItem("accessToken", token);

        // ----------------------------------------------------
        // STORE USER
        // ----------------------------------------------------

        if (loggedInUser) {
          localStorage.setItem("user", JSON.stringify(loggedInUser));
        } else {
          localStorage.removeItem("user");
        }

        // ----------------------------------------------------
        // UPDATE CONTEXT SYNCHRONOUSLY
        // ----------------------------------------------------

        flushSync(() => {
          setAccessToken(token);
          setUser(loggedInUser || null);
        });

        return {
          accessToken: token,
          user: loggedInUser,
        };
      } catch (error: unknown) {
        // ----------------------------------------------------
        // NORMALIZE RTK QUERY ERROR
        // ----------------------------------------------------

        if (typeof error === "object" && error !== null && "data" in error) {
          const rtkError = error as {
            data?: {
              message?: string;
            };
          };

          if (rtkError.data?.message) {
            throw new Error(rtkError.data.message);
          }
        }

        if (error instanceof Error) {
          throw error;
        }

        throw new Error("Login failed. Please try again.");
      }
    },
    [loginMutation],
  );

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = useCallback(() => {
    clearStoredAuth();

    flushSync(() => {
      setAccessToken(null);
      setUser(null);
    });

    // Notify other auth listeners/tabs.
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }, []);

  // ==========================================================
  // REFRESH AUTH
  // ==========================================================

  const refreshAuth = useCallback(() => {
    loadAuth();
  }, [loadAuth]);

  // ==========================================================
  // CONTEXT VALUE
  // ==========================================================

  const value: AuthContextType = {
    user,
    accessToken,

    isAuthenticated: Boolean(accessToken),

    loading: loading || loginLoading,

    login,
    logout,
    refreshAuth,
  };

  // ==========================================================
  // PROVIDER
  // ==========================================================

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
