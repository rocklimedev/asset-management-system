import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ============================================================
// TYPES
// ============================================================

export interface LoginRequest {
  email: string;
  password: string;
}

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
  access_token?: string;
  token?: string;

  user?: AuthUser;

  message?: string;

  [key: string]: unknown;
}

// ============================================================
// CONFIG
// ============================================================

const BACKEND = "http://localhost:4000/api";

// ============================================================
// AUTH API
// ============================================================

export const authApi = createApi({
  reducerPath: "authApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");

      const token = localStorage.getItem("accessToken");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: ["Auth", "Profile"],

  endpoints: (builder) => ({
    // ============================================================
    // LOGIN
    // POST /auth/login
    // ============================================================

    login: builder.mutation<LoginResponse, LoginRequest>({
      query: ({ email, password }) => ({
        url: "/auth/login",
        method: "POST",
        body: {
          email,
          password,
        },
      }),
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const { useLoginMutation } = authApi;

export default authApi;
