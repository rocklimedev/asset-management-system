import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BACKEND } from '../../lib/api';

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

export interface LoginApiResponse {
  accessToken?: string;
  access_token?: string;
  token?: string;

  user?: AuthUser;

  message?: string;

  [key: string]: unknown;
}

// ============================================================
// AUTH API
// ============================================================

export const authApi = createApi({
  reducerPath: 'authApi',

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');

      const token = localStorage.getItem('accessToken');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: ['Auth', 'Profile'],

  endpoints: (builder) => ({
    updateProfile: builder.mutation<{ id: string; name: string; email: string }, { name: string; email: string }>({
      query: (body) => ({ url: '/auth/profile', method: 'PATCH', body }),
    }),
    resetPassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    // ============================================================
    // LOGIN
    // POST /auth/login
    // ============================================================

    login: builder.mutation<LoginApiResponse, LoginRequest>({
      query: ({ email, password }) => ({
        url: '/auth/login',
        method: 'POST',
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

export const { useLoginMutation, useResetPasswordMutation, useUpdateProfileMutation } = authApi;

export default authApi;
