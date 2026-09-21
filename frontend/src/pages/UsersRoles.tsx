import { useState } from "react";
import { Pencil, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";

import {
  useDeleteUserMutation,
  useGetUsersQuery,
  useSetUserStatusMutation,
} from "../services/api/users.api";

import { useGetRolesQuery } from "../services/api/role.api";

import AddUserModal from "../components/users/AddUserModal";
import UpdateRoleModal from "../components/users/UpdateRoleModal";

import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/EmptyState";

import type { User } from "../services/api/users.api";

// ============================================================
// TYPES
// ============================================================

type Tab = "users" | "roles";

// ============================================================
// COMPONENT
// ============================================================

export default function UsersRoles() {
  const [activeTab, setActiveTab] = useState<Tab>("users");

  // ==========================================================
  // USER MODALS
  // ==========================================================

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleEditingUser, setRoleEditingUser] = useState<User | null>(null);

  // ==========================================================
  // USERS
  // ==========================================================

  const {
    data: usersData,
    isLoading: usersLoading,
    isError: usersError,
  } = useGetUsersQuery();

  // ==========================================================
  // USER MUTATIONS
  // ==========================================================

  const [deleteUser, { isLoading: deletingUser }] = useDeleteUserMutation();

  const [setUserStatus, { isLoading: changingStatus }] =
    useSetUserStatusMutation();

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

  const users: User[] = Array.isArray(usersData)
    ? usersData
    : (usersData?.data ?? []);

  // ==========================================================
  // NORMALIZE ROLES RESPONSE
  // ==========================================================

  const roles = Array.isArray(rolesData) ? rolesData : (rolesData?.data ?? []);

  // ==========================================================
  // OPEN CREATE USER MODAL
  // ==========================================================

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  // ============================================================
  // OPEN EDIT USER MODAL
  // ============================================================

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  // ============================================================
  // CLOSE USER MODAL
  // ============================================================

  const handleCloseUserModal = () => {
    setUserModalOpen(false);
    setEditingUser(null);
  };

  // ============================================================
  // OPEN ROLE MODAL
  // ============================================================

  const handleChangeRole = (user: User) => {
    setRoleEditingUser(user);
    setRoleModalOpen(true);
  };

  // ============================================================
  // CLOSE ROLE MODAL
  // ============================================================

  const handleCloseRoleModal = () => {
    setRoleModalOpen(false);
    setRoleEditingUser(null);
  };

  // ============================================================
  // DELETE USER
  // ============================================================

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${user.name}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(user.id).unwrap();

      window.alert("User deleted successfully.");
    } catch (error: any) {
      window.alert(
        error?.data?.message || error?.message || "Failed to delete user.",
      );
    }
  };

  // ============================================================
  // TOGGLE STATUS
  // ============================================================

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

    const action = nextStatus === "ACTIVE" ? "enable" : "disable";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${user.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await setUserStatus({
        id: user.id,
        status: nextStatus,
      }).unwrap();

      window.alert(`User ${action}d successfully.`);
    } catch (error: any) {
      window.alert(
        error?.data?.message ||
          error?.message ||
          "Failed to update user status.",
      );
    }
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  const userMutationLoading = deletingUser || changingStatus;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Users & Roles
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage who can access the IT Management system.
            </p>
          </div>

          {activeTab === "users" && (
            <Button
              className="w-fit"
              onClick={handleCreateUser}
              disabled={userMutationLoading}
            >
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

          <div className="border-b border-border bg-card px-5">
            <div className="flex gap-6">
              {/* USERS TAB */}

              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "users"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
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
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
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
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Application Users
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Manage users who have access to the application.
                </p>
              </div>

              {/* LOADING */}

              {usersLoading && (
                <div className="p-5 text-sm text-muted-foreground">
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

              {!usersLoading && !usersError && users.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    title="No users yet"
                    description="Add users to give them access to the application."
                  />
                </div>
              )}

              {/* USERS TABLE */}

              {!usersLoading && !usersError && users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-5 py-2.5 font-medium">Name</th>

                        <th className="px-5 py-2.5 font-medium">Email</th>

                        <th className="px-5 py-2.5 font-medium">Role</th>

                        <th className="px-5 py-2.5 font-medium">Status</th>

                        <th className="px-5 py-2.5 text-right font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/50">
                          {/* NAME */}

                          <td className="px-5 py-2.5 font-medium text-foreground">
                            {user.name || "Unnamed User"}
                          </td>

                          {/* EMAIL */}

                          <td className="px-5 py-2.5 text-muted-foreground">
                            {user.email || "—"}
                          </td>

                          {/* ROLE */}

                          <td className="px-5 py-2.5">
                            <Badge tone="brand">
                              {user.role?.name || "No Role"}
                            </Badge>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              disabled={userMutationLoading}
                              title={
                                user.status === "ACTIVE"
                                  ? "Click to disable"
                                  : "Click to enable"
                              }
                            >
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
                            </button>
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              {/* EDIT USER */}

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Edit user"
                                disabled={userMutationLoading}
                                onClick={() => handleEditUser(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              {/* CHANGE ROLE */}

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Change role"
                                disabled={userMutationLoading}
                                onClick={() => handleChangeRole(user)}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>

                              {/* DELETE */}

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Delete user"
                                disabled={userMutationLoading}
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
                <h2 className="text-sm font-semibold text-foreground">
                  Roles & Permissions
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Manage application roles and their assigned permissions.
                </p>
              </div>

              {/* LOADING */}

              {rolesLoading && (
                <div className="text-sm text-muted-foreground">
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

              {!rolesLoading && !rolesError && roles.length === 0 && (
                <EmptyState
                  title="No roles found"
                  description="Create roles and assign permissions to control access."
                />
              )}

              {/* ROLES */}

              {!rolesLoading && !rolesError && roles.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {roles.map((role) => {
                    const permissions = role.permissions ?? [];

                    return (
                      <Card key={role.id} className="p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {role.name}
                            </p>

                            {role.description && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {role.description}
                              </p>
                            )}
                          </div>

                          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>

                        <p className="mb-3 text-xs text-muted-foreground">
                          {permissions.length}{" "}
                          {permissions.length === 1
                            ? "permission"
                            : "permissions"}{" "}
                          granted
                        </p>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ========================================================
          ADD / EDIT USER MODAL
      ======================================================== */}

      <AddUserModal
        open={userModalOpen}
        user={editingUser}
        onClose={handleCloseUserModal}
      />

      {/* ========================================================
          UPDATE ROLE MODAL
      ======================================================== */}

      <UpdateRoleModal
        open={roleModalOpen}
        user={roleEditingUser}
        onClose={handleCloseRoleModal}
      />
    </>
  );
}
