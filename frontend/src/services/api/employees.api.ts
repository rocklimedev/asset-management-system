import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import type { AssetAssignment, SystemRecord } from "./asset.api";
import { BACKEND } from "../../lib/api";

// ============================================================
// ENUMS
// ============================================================

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE" | "EXITED";

// ============================================================
// TYPES
// ============================================================

export interface EmployeeOrganisation {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface EmployeeDepartment {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface EmployeeLocation {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface EmployeeManager {
  id: string;
  name?: string;
  employeeCode?: string;
  [key: string]: unknown;
}

export interface Employee {
  id: string;

  employeeCode: string;
  name: string;

  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;

  // ============================================================
  // ORGANISATION
  // ============================================================

  organisationId?: string | null;
  organisation?: EmployeeOrganisation | null;

  // ============================================================
  // DEPARTMENT
  // ============================================================

  departmentId?: string | null;
  department?: EmployeeDepartment | null;

  designation?: string | null;

  // ============================================================
  // MANAGER
  // ============================================================

  managerId?: string | null;
  manager?: EmployeeManager | null;
  reports?: Employee[];

  // ============================================================
  // LOCATION
  // ============================================================

  locationId?: string | null;
  location?: EmployeeLocation | null;

  status: EmployeeStatus;

  joiningDate?: string | null;

  // ============================================================
  // ASSET ASSIGNMENTS
  // ============================================================

  assignments?: AssetAssignment[];
  systems?: SystemRecord[];

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface GetEmployeesParams {
  search?: string;
  organisationId?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  page?: number;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

export interface EmployeesResponse {
  items?: Employee[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;

  [key: string]: unknown;
}

export type EmployeesApiResponse = Employee[] | EmployeesResponse;

export interface EmployeeResponse {
  data?: Employee;
  message?: string;

  [key: string]: unknown;
}

// ============================================================
// CREATE EMPLOYEE
// ============================================================

export interface CreateEmployeeRequest {
  employeeCode: string;
  name: string;

  email?: string;
  phone?: string;
  avatarUrl?: string;

  departmentId?: string;
  designation?: string;

  managerId?: string;
  locationId?: string;

  status?: EmployeeStatus;

  joiningDate?: string;

  organisationId?: string;

  [key: string]: unknown;
}

// ============================================================
// UPDATE EMPLOYEE
// ============================================================

export interface UpdateEmployeeRequest {
  id: string;

  employeeCode?: string;
  name?: string;

  email?: string;
  phone?: string;
  avatarUrl?: string;

  departmentId?: string;
  designation?: string;

  managerId?: string;
  locationId?: string;

  status?: EmployeeStatus;

  joiningDate?: string;

  organisationId?: string;

  [key: string]: unknown;
}
// ============================================================
// ORGANISATION TYPES
// ============================================================

export interface Organisation {
  id: string;
  name: string;

  description?: string | null;
  code?: string | null;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

export interface CreateOrganisationRequest {
  name: string;
  description?: string;
  code?: string;

  [key: string]: unknown;
}

export interface UpdateOrganisationRequest {
  id: string;

  name?: string;
  description?: string;
  code?: string;

  [key: string]: unknown;
}

export interface OrganisationResponse {
  data?: Organisation;
  message?: string;

  [key: string]: unknown;
}

export type OrganisationsApiResponse =
  | Organisation[]
  | {
      items?: Organisation[];
      total?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;

      [key: string]: unknown;
    };
// ============================================================
// EMPLOYEES API
// ============================================================

export const employeesApi = createApi({
  reducerPath: "employeesApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;

      // Keep this if your app stores the token in localStorage.
      const token = localStorage.getItem("accessToken");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      headers.set("Content-Type", "application/json");

      return headers;
    },
  }),

  tagTypes: ["Employee", "Organisation"],
  endpoints: (builder) => ({
    // ============================================================
    // GET ALL EMPLOYEES
    // GET /employees
    // ============================================================

    getEmployees: builder.query<
      EmployeesApiResponse,
      GetEmployeesParams | undefined
    >({
      query: ({
        search,
        organisationId,
        status,
        page,
      }: GetEmployeesParams = {}) => ({
        url: "/employees",
        method: "GET",

        params: {
          search: search || undefined,
          organisationId: organisationId || undefined,
          status: status || undefined,
          page: page || undefined,
        },
      }),

      providesTags: (result) => {
        const employees: Employee[] = Array.isArray(result)
          ? result
          : result?.items || [];

        return [
          ...employees.map(({ id }) => ({
            type: "Employee" as const,
            id,
          })),

          {
            type: "Employee" as const,
            id: "LIST",
          },
        ];
      },
    }),

    // ============================================================
    // GET SINGLE EMPLOYEE
    // GET /employees/:id
    // ============================================================

    getEmployee: builder.query<EmployeeResponse | Employee, string>({
      query: (id) => ({
        url: `/employees/${id}`,
        method: "GET",
      }),

      providesTags: (result, error, id) => [
        {
          type: "Employee" as const,
          id,
        },
      ],
    }),

    // ============================================================
    // CREATE EMPLOYEE
    // POST /employees
    // ============================================================

    createEmployee: builder.mutation<EmployeeResponse, CreateEmployeeRequest>({
      query: (body) => ({
        url: "/employees",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Employee",
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // UPDATE EMPLOYEE
    // PATCH /employees/:id
    // ============================================================

    updateEmployee: builder.mutation<EmployeeResponse, UpdateEmployeeRequest>({
      query: ({ id, ...body }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "Employee" as const,
          id,
        },

        {
          type: "Employee" as const,
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // REMOVE / EXIT EMPLOYEE
    // DELETE /employees/:id
    // ============================================================

    removeEmployee: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/employees/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
        {
          type: "Employee" as const,
          id,
        },

        {
          type: "Employee" as const,
          id: "LIST",
        },
      ],
    }),
    // ============================================================
    // GET ALL ORGANISATIONS
    // GET /organisations
    // ============================================================

    getOrganisations: builder.query<OrganisationsApiResponse, void>({
      query: () => ({
        url: "/organisations",
        method: "GET",
      }),

      providesTags: (result) => {
        const organisations: Organisation[] = Array.isArray(result)
          ? result
          : result?.items || [];

        return [
          ...organisations.map(({ id }) => ({
            type: "Organisation" as const,
            id,
          })),

          {
            type: "Organisation" as const,
            id: "LIST",
          },
        ];
      },
    }),

    // ============================================================
    // GET SINGLE ORGANISATION
    // GET /organisations/:id
    // ============================================================

    getOrganisation: builder.query<OrganisationResponse | Organisation, string>(
      {
        query: (id) => ({
          url: `/organisations/${id}`,
          method: "GET",
        }),

        providesTags: (result, error, id) => [
          {
            type: "Organisation" as const,
            id,
          },
        ],
      },
    ),

    // ============================================================
    // CREATE ORGANISATION
    // POST /organisations
    // ============================================================

    createOrganisation: builder.mutation<
      OrganisationResponse,
      CreateOrganisationRequest
    >({
      query: (body) => ({
        url: "/organisations",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Organisation",
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // UPDATE ORGANISATION
    // PATCH /organisations/:id
    // ============================================================

    updateOrganisation: builder.mutation<
      OrganisationResponse,
      UpdateOrganisationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/organisations/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "Organisation",
          id,
        },

        {
          type: "Organisation",
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // DELETE ORGANISATION
    // DELETE /organisations/:id
    // ============================================================

    removeOrganisation: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/organisations/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
        {
          type: "Organisation",
          id,
        },

        {
          type: "Organisation",
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
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useRemoveEmployeeMutation,

  useGetOrganisationsQuery,
  useGetOrganisationQuery,
  useCreateOrganisationMutation,
  useUpdateOrganisationMutation,
  useRemoveOrganisationMutation,
} = employeesApi;
export default employeesApi;
