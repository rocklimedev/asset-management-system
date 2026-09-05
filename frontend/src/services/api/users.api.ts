import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

// ============================================================
// TYPES
// ============================================================

export interface User {
  id: string;

  name?: string;
  firstName?: string;
  lastName?: string;

  email?: string;
  phone?: string;

  employeeId?: string;

  role?: string;
  roleId?: string;

  organisationId?: string;

  status?: string;
  is_active?: boolean;
  is_email_verified?: boolean;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface UsersResponse {
  data?: User[];
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;

  [key: string]: unknown;
}

export interface UserResponse {
  data?: User;
  message?: string;

  [key: string]: unknown;
}

export interface CreateUserRequest {
  name?: string;
  firstName?: string;
  lastName?: string;

  email: string;
  phone?: string;

  employeeId?: string;

  roleId?: string;
  organisationId?: string;

  password?: string;

  status?: string;

  [key: string]: unknown;
}

export interface SetUserStatusRequest {
  id: string;
  status: string;
}

export interface ChangeUserRoleRequest {
  id: string;
  roleId: string;
}

// ============================================================
// CONFIG
// ============================================================

const BACKEND = "http://localhost:4000/api";

// ============================================================
// USERS API
// ============================================================

export const usersApi = createApi({
  reducerPath: "usersApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;

      const token = localStorage.getItem("accessToken");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      headers.set("Content-Type", "application/json");

      return headers;
    },
  }),

  tagTypes: ["User"],

  endpoints: (builder) => ({
    // ============================================================
    // GET ALL USERS
    // GET /users
    // ============================================================

    getUsers: builder.query<User[] | UsersResponse, void>({
      query: () => ({
        url: "/users",
        method: "GET",
      }),

      providesTags: (result) => {
        const users: User[] = Array.isArray(result)
          ? result
          : result?.data || [];

        return [
          ...users.map(({ id }) => ({
            type: "User" as const,
            id,
          })),

          {
            type: "User" as const,
            id: "LIST",
          },
        ];
      },
    }),

    // ============================================================
    // CREATE USER
    // POST /users
    // ============================================================

    createUser: builder.mutation<UserResponse, CreateUserRequest>({
      query: (body) => ({
        url: "/users",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "User",
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // UPDATE USER STATUS
    // PATCH /users/:id/status
    // ============================================================

    setUserStatus: builder.mutation<UserResponse, SetUserStatusRequest>({
      query: ({ id, status }) => ({
        url: `/users/${id}/status`,
        method: "PATCH",

        body: {
          status,
        },
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "User" as const,
          id,
        },

        {
          type: "User" as const,
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // CHANGE USER ROLE
    // PATCH /users/:id/role
    // ============================================================

    changeUserRole: builder.mutation<UserResponse, ChangeUserRoleRequest>({
      query: ({ id, roleId }) => ({
        url: `/users/${id}/role`,
        method: "PATCH",

        body: {
          roleId,
        },
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "User" as const,
          id,
        },

        {
          type: "User" as const,
          id: "LIST",
        },
      ],
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useSetUserStatusMutation,
  useChangeUserRoleMutation,
} = usersApi;

export default usersApi;
