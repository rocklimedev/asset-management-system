import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { BACKEND } from "../../lib/api";

// ============================================================
// TYPES
// ============================================================

export interface UserRole {
  id: string;
  name: string;
  description?: string | null;
}

export interface User {
  id: string;

  name: string;
  email: string;

  employeeId?: string | null;

  roleId: string;

  role?: UserRole;

  status: "ACTIVE" | "DISABLED";

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

// ============================================================
// CREATE USER
// ============================================================

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;

  roleId: string;

  employeeId?: string;
}

// ============================================================
// UPDATE USER
// ============================================================

export interface UpdateUserRequest {
  id: string;

  name?: string;
  email?: string;
  password?: string;

  employeeId?: string | null;
}

// ============================================================
// UPDATE USER STATUS
// ============================================================

export interface SetUserStatusRequest {
  id: string;
  status: "ACTIVE" | "DISABLED";
}

// ============================================================
// CHANGE USER ROLE
// ============================================================

export interface ChangeUserRoleRequest {
  id: string;
  roleId: string;
}

// ============================================================
// DELETE USER
// ============================================================

export interface DeleteUserResponse {
  success: boolean;
  message: string;
  id: string;
}

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
    // UPDATE USER
    // PATCH /users/:id
    // ============================================================

    updateUser: builder.mutation<UserResponse, UpdateUserRequest>({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body,
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
    // DELETE USER
    // DELETE /users/:id
    // ============================================================

    deleteUser: builder.mutation<DeleteUserResponse, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
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
  useUpdateUserMutation,
  useDeleteUserMutation,
  useSetUserStatusMutation,
  useChangeUserRoleMutation,
} = usersApi;

export default usersApi;
