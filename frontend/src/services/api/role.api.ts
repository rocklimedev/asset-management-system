import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { BACKEND } from '../../lib/api';

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
  key?: string;
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
  id?: string;
  permissionIds?: string[];
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
// ROLES API
// ============================================================

export const rolesApi = createApi({
  reducerPath: 'rolesApi',

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;

      const token = localStorage.getItem('accessToken');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      headers.set('Content-Type', 'application/json');

      return headers;
    },
  }),

  tagTypes: ['Role', 'Permission'],

  endpoints: (builder) => ({
    getRoleAccess: builder.query<{ roleId: string; permissions: string[] }, void>({
      query: () => '/roles/access',
      providesTags: ['Role'],
    }),
    createRole: builder.mutation<
      Role,
      { name: string; description: string; permissionIds: string[] }
    >({
      query: (body) => ({ url: '/roles', method: 'POST', body }),
      invalidatesTags: ['Role'],
    }),
    // ============================================================
    // GET ALL ROLES
    // GET /roles
    // ============================================================

    getRoles: builder.query<Role[] | RolesResponse, void>({
      transformResponse: (response: Role[] | RolesResponse) => {
        const rows = Array.isArray(response) ? response : response.data || [];
        return rows.map((role) => ({
          ...role,
          permissions: (role.permissions || []).map((value) => {
            const nested = value as unknown as { permission?: Permission };
            return nested.permission || value;
          }),
        }));
      },
      query: () => ({
        url: '/roles',
        method: 'GET',
      }),

      providesTags: (result) => {
        const roles: Role[] = Array.isArray(result) ? result : result?.data || [];

        return [
          ...roles.map(({ id }) => ({
            type: 'Role' as const,
            id,
          })),

          {
            type: 'Role' as const,
            id: 'LIST',
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
        url: '/roles/permissions',
        method: 'GET',
      }),

      providesTags: (result) => {
        const permissions: Permission[] = Array.isArray(result) ? result : result?.data || [];

        return [
          ...permissions.map(({ id }) => ({
            type: 'Permission' as const,
            id,
          })),

          {
            type: 'Permission' as const,
            id: 'LIST',
          },
        ];
      },
    }),

    // ============================================================
    // SET ROLE PERMISSIONS
    // PATCH /roles/:id/permissions
    // ============================================================

    setRolePermissions: builder.mutation<SetRolePermissionsResponse, SetRolePermissionsRequest>({
      query: ({ id, permissionIds }) => ({
        url: `/roles/${id}/permissions`,
        method: 'PATCH',

        body: {
          permissionIds,
        },
      }),

      invalidatesTags: ['Role'],
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const {
  useGetRoleAccessQuery,
  useCreateRoleMutation,
  useGetRolesQuery,
  useGetPermissionsQuery,
  useSetRolePermissionsMutation,
} = rolesApi;

export default rolesApi;
