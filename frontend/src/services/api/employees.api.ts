import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import type { AssetAssignment } from "./asset.api";

// ============================================================
// ENUMS
// ============================================================

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE" | "EXITED";

// ============================================================
// TYPES
// ============================================================

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

  organisationId?: string | null;

  departmentId?: string | null;
  department?: EmployeeDepartment;

  designation?: string | null;

  managerId?: string | null;
  manager?: EmployeeManager;
  reports?: Employee[];

  locationId?: string | null;
  location?: EmployeeLocation;

  status: EmployeeStatus;

  joiningDate?: string | null;

  assignments?: AssetAssignment[];

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface GetEmployeesParams {
  search?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  page?: number;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

export interface EmployeesResponse {
  data?: Employee[];
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
// CONFIG
// ============================================================

const BACKEND = "http://localhost:4000/api";

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

  tagTypes: ["Employee"],

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
        departmentId,
        status,
        page,
      }: GetEmployeesParams = {}) => ({
        url: "/employees",
        method: "GET",

        params: {
          search: search || undefined,
          departmentId: departmentId || undefined,
          status: status || undefined,
          page: page || undefined,
        },
      }),

      providesTags: (result) => {
        const employees: Employee[] = Array.isArray(result)
          ? result
          : result?.data || [];

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
} = employeesApi;

export default employeesApi;
