
import { useState } from "react";
import {
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import {
  useGetUsersQuery,
} from "../services/api/users.api";

import {
  useGetRolesQuery,
} from "../services/api/role.api";

import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

// ============================================================
// TYPES
// ============================================================

type Tab = "users" | "roles";

// ============================================================
// COMPONENT
// ============================================================

export default function UsersRoles() {
  const [activeTab, setActiveTab] =
    useState<Tab>("users");

  // ==========================================================
  // USERS
  // ==========================================================

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetUsersQuery();

  // ==========================================================
  // ROLES
  // ==========================================================

  const {
    data: rolesData,
    isLoading: rolesLoading,
    isError: rolesError,
  } = useGetRolesQuery();

  // ==========================================================
  // NORMALIZE USERS RESPONSE
  // ==========================================================

  const users = Array.isArray(usersData)
    ? usersData
    : usersData?.data ?? [];

  // ==========================================================
  // NORMALIZE ROLES RESPONSE
  // ==========================================================

  const roles = Array.isArray(rolesData)
    ? rolesData
    : rolesData?.data ?? [];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Users & Roles
          </h1>

          <p className="text-sm text-slate-500">
            Manage who can access the IT Management system.
          </p>
        </div>

        {activeTab === "users" && (
          <Button className="w-fit">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* ======================================================
          TABS + CONTENT
      ====================================================== */}

      <Card className="overflow-hidden">
        {/* ====================================================
            TAB NAVIGATION
        ==================================================== */}

        <div className="border-b border-slate-200 bg-white px-5">
          <div className="flex gap-6">
            {/* USERS TAB */}

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "users"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Users className="h-4 w-4" />
              Users
            </button>

            {/* ROLES TAB */}

            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "roles"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Roles & Permissions
            </button>
          </div>
        </div>

        {/* ====================================================
            USERS TAB
        ==================================================== */}

        {activeTab === "users" && (
          <div>
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Application Users
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Manage users who have access to the application.
              </p>
            </div>

            {/* LOADING */}

            {usersLoading && (
              <div className="p-5 text-sm text-slate-500">
                Loading users...
              </div>
            )}

            {/* ERROR */}

            {usersError && !usersLoading && (
              <div className="p-5">
                <EmptyState
                  title="Unable to load users"
                  description="There was a problem loading application users."
                />
              </div>
            )}

            {/* EMPTY */}

            {!usersLoading &&
              !usersError &&
              users.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    title="No users yet"
                    description="Invite your IT team to give them access."
                  />
                </div>
              )}

            {/* USERS TABLE */}

            {!usersLoading &&
              !usersError &&
              users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">
                          Name
                        </th>

                        <th className="px-5 py-2.5 font-medium">
                          Email
                        </th>

                        <th className="px-5 py-2.5 font-medium">
                          Role
                        </th>

                        <th className="px-5 py-2.5 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50"
                        >
                          {/* NAME */}

                          <td className="px-5 py-2.5 font-medium text-slate-800">
                            {user.name ||
                              `${user.firstName ?? ""} ${
                                user.lastName ?? ""
                              }`.trim() ||
                              "Unnamed User"}
                          </td>

                          {/* EMAIL */}

                          <td className="px-5 py-2.5 text-slate-500">
                            {user.email || "—"}
                          </td>

                          {/* ROLE */}

                          <td className="px-5 py-2.5">
                            <Badge tone="brand">
                              {typeof user.role === "string"
                                ? user.role
                                : "No Role"}
                            </Badge>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-2.5">
                            <Badge
                              tone={
                                user.status === "ACTIVE"
                                  ? undefined
                                  : "danger"
                              }
                            >
                              {user.status === "ACTIVE"
                                ? "Active"
                                : user.status || "Disabled"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {/* ====================================================
            ROLES TAB
        ==================================================== */}

        {activeTab === "roles" && (
          <div className="p-5">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Roles & Permissions
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Manage application roles and their assigned
                permissions.
              </p>
            </div>

            {/* LOADING */}

            {rolesLoading && (
              <div className="text-sm text-slate-500">
                Loading roles...
              </div>
            )}

            {/* ERROR */}

            {rolesError && !rolesLoading && (
              <EmptyState
                title="Unable to load roles"
                description="There was a problem loading application roles."
              />
            )}

            {/* EMPTY */}

            {!rolesLoading &&
              !rolesError &&
              roles.length === 0 && (
                <EmptyState
                  title="No roles found"
                  description="Create roles and assign permissions to control access."
                />
              )}

            {/* ROLES */}

            {!rolesLoading &&
              !rolesError &&
              roles.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {roles.map((role) => {
                    const permissions =
                      role.permissions ?? [];

                    return (
                      <Card
                        key={role.id}
                        className="p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {role.name}
                            </p>

                            {role.description && (
                              <p className="mt-1 text-xs text-slate-500">
                                {role.description}
                              </p>
                            )}
                          </div>

                          <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
                        </div>

                        <p className="mb-3 text-xs text-slate-500">
                          {permissions.length}{" "}
                          {permissions.length === 1
                            ? "permission"
                            : "permissions"}{" "}
                          granted
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          
                          {permissions.length > 6 && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                              +
                              {permissions.length -
                                6}{" "}
                              more
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
          </div>
        )}
      </Card>
    </div>
  );
}
