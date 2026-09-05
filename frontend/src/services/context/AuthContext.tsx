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

  login: (
    email: string,
    password: string,
  ) => Promise<LoginResponse>;

  logout: () => void;

  refreshAuth: () => void;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  // ============================================================
  // RTK QUERY LOGIN
  // ============================================================

  const [loginMutation, { isLoading: loginLoading }] =
    useLoginMutation();

  // ============================================================
  // LOAD AUTH DATA
  // ============================================================

  const loadAuth = useCallback(() => {
    try {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      // --------------------------------------------------------
      // TOKEN
      // --------------------------------------------------------

      if (token) {
        setAccessToken(token);
      } else {
        setAccessToken(null);
      }

      // --------------------------------------------------------
      // USER
      // --------------------------------------------------------

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          setUser(parsedUser);
        } catch {
          localStorage.removeItem("user");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // INITIAL AUTH CHECK
  // ============================================================

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  // ============================================================
  // LOGIN
  // ============================================================

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<LoginResponse> => {
      try {
        const response = await loginMutation({
          email,
          password,
        }).unwrap();

        // ------------------------------------------------------
        // SUPPORT MULTIPLE TOKEN RESPONSE FORMATS
        // ------------------------------------------------------

        const token =
          response.accessToken ||
          response.access_token ||
          response.token;

        if (!token) {
          throw new Error(
            "Authentication token was not returned.",
          );
        }

        const loggedInUser = response.user;

        // ------------------------------------------------------
        // STORE TOKEN
        // ------------------------------------------------------

        localStorage.setItem("accessToken", token);

        // ------------------------------------------------------
        // STORE USER
        // ------------------------------------------------------

        if (loggedInUser) {
          localStorage.setItem(
            "user",
            JSON.stringify(loggedInUser),
          );
        } else {
          localStorage.removeItem("user");
        }

        // ------------------------------------------------------
        // UPDATE CONTEXT — SYNCHRONOUSLY
        // ------------------------------------------------------
        // flushSync forces React to apply these updates and
        // re-render every consumer (including route guards in
        // App.tsx) BEFORE this function returns to the caller.
        // This closes the timing gap that was causing the
        // login -> dashboard -> login -> dashboard race.

        flushSync(() => {
          setAccessToken(token);
          setUser(loggedInUser || null);
        });

        return {
          accessToken: token,
          user: loggedInUser,
        };
      } catch (error: unknown) {
        // ------------------------------------------------------
        // NORMALIZE RTK QUERY ERROR
        // ------------------------------------------------------

        if (
          typeof error === "object" &&
          error !== null &&
          "data" in error
        ) {
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

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    // Same reasoning as login: flushSync so isAuthenticated flips
    // to false synchronously. No window.location.href here — the
    // RequireAuth guard in App.tsx will redirect to /login
    // reactively, in-app, without a full page reload.
    flushSync(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  // ============================================================
  // REFRESH AUTH
  // ============================================================

  const refreshAuth = useCallback(() => {
    loadAuth();
  }, [loadAuth]);

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value: AuthContextType = {
    user,
    accessToken,

    isAuthenticated: Boolean(accessToken),

    loading: loading || loginLoading,

    login,
    logout,
    refreshAuth,
  };

  // ============================================================
  // PROVIDER
  // ============================================================

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider",
    );
  }

  return context;
}