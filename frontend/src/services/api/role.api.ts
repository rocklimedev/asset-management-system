import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

// ============================================================
// TYPES
// ============================================================

export interface Role {
  id: string;
  name?: string;
  display_name?: string;
  description?: string;

  permissions?: Permission[];

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

export interface Permission {
  id: string;
  name?: string;
  display_name?: string;
  description?: string;
  resource?: string;
  action?: string;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface RolesResponse {
  data?: Role[];
  message?: string;

  [key: string]: unknown;
}

export interface PermissionsResponse {
  data?: Permission[];
  message?: string;

  [key: string]: unknown;
}

export interface SetRolePermissionsResponse {
  data?: Role;
  message?: string;

  [key: string]: unknown;
}

// ============================================================
// MUTATION TYPES
// ============================================================

export interface SetRolePermissionsRequest {
  id: string;
  permissionIds: string[];
}

// ============================================================
// CONFIG
// ============================================================

const BACKEND = "http://localhost:4000/api";

// ============================================================
// ROLES API
// ============================================================

export const rolesApi = createApi({
  reducerPath: "rolesApi",

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

  tagTypes: ["Role", "Permission"],

  endpoints: (builder) => ({
    // ============================================================
    // GET ALL ROLES
    // GET /roles
    // ============================================================

    getRoles: builder.query<Role[] | RolesResponse, void>({
      query: () => ({
        url: "/roles",
        method: "GET",
      }),

      providesTags: (result) => {
        const roles: Role[] = Array.isArray(result)
          ? result
          : result?.data || [];

        return [
          ...roles.map(({ id }) => ({
            type: "Role" as const,
            id,
          })),

          {
            type: "Role" as const,
            id: "LIST",
          },
        ];
      },
    }),

    // ============================================================
    // GET ALL PERMISSIONS
    // GET /roles/permissions
    // ============================================================

    getPermissions: builder.query<Permission[] | PermissionsResponse, void>({
      query: () => ({
        url: "/roles/permissions",
        method: "GET",
      }),

      providesTags: (result) => {
        const permissions: Permission[] = Array.isArray(result)
          ? result
          : result?.data || [];

        return [
          ...permissions.map(({ id }) => ({
            type: "Permission" as const,
            id,
          })),

          {
            type: "Permission" as const,
            id: "LIST",
          },
        ];
      },
    }),

    // ============================================================
    // SET ROLE PERMISSIONS
    // PATCH /roles/:id/permissions
    // ============================================================

    setRolePermissions: builder.mutation<
      SetRolePermissionsResponse,
      SetRolePermissionsRequest
    >({
      query: ({ id, permissionIds }) => ({
        url: `/roles/${id}/permissions`,
        method: "PATCH",

        body: {
          permissionIds,
        },
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "Role" as const,
          id,
        },

        {
          type: "Role" as const,
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
  useGetRolesQuery,
  useGetPermissionsQuery,
  useSetRolePermissionsMutation,
} = rolesApi;

export default rolesApi;
