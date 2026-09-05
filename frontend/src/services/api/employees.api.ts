import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

// ============================================================
// TYPES
// ============================================================

export interface Employee {
  id: string;

  name?: string;
  firstName?: string;
  lastName?: string;

  email?: string;
  phone?: string;

  employeeId?: string;

  departmentId?: string;
  department?: {
    id: string;
    name?: string;
  };

  roleId?: string;
  role?: {
    id: string;
    name?: string;
  };

  status?: string;

  organisationId?: string;

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
  status?: string;
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
  name?: string;
  firstName?: string;
  lastName?: string;

  email?: string;
  phone?: string;

  employeeId?: string;

  departmentId?: string;
  roleId?: string;

  status?: string;

  organisationId?: string;

  [key: string]: unknown;
}

// ============================================================
// UPDATE EMPLOYEE
// ============================================================

export interface UpdateEmployeeRequest {
  id: string;

  name?: string;
  firstName?: string;
  lastName?: string;

  email?: string;
  phone?: string;

  employeeId?: string;

  departmentId?: string;
  roleId?: string;

  status?: string;

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
    // GET /organisations/employees
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
    // GET /organisations/employees/:id
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
    // POST /organisations/employees
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
    // PATCH /organisations/employees/:id
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
    // DELETE /organisations/employees/:id
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
