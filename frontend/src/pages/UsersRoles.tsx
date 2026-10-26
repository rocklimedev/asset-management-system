import { useEffect, useState } from 'react';
import { Pencil, ShieldCheck, Trash2, UserCheck, UserPlus, UserX, Users } from 'lucide-react';

import {
  useDeleteUserMutation,
  useGetUsersQuery,
  useSetUserStatusMutation,
} from '../services/api/users.api';

import { useGetRoleAccessQuery } from '../services/api/role.api';
import PermissionsWorkspace from '../components/users/PermissionsWorkspace';

import AddUserModal from '../components/users/AddUserModal';
import UpdateRoleModal from '../components/users/UpdateRoleModal';

import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/EmptyState';

import type { User } from '../services/api/users.api';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { RowActions } from '@/components/ui/row-actions';

// ============================================================
// TYPES
// ============================================================

type Tab = 'users' | 'roles';

// ============================================================
// COMPONENT
// ============================================================

export default function UsersRoles() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const {
    data: access,
    isLoading: accessLoading,
    isError: accessError,
  } = useGetRoleAccessQuery(undefined, { refetchOnMountOrArgChange: true, pollingInterval: 30000 });
  const canManageUsers = access?.permissions.includes('users.manage') ?? false;
  const canManageRoles = access?.permissions.includes('roles.manage') ?? false;
  useEffect(() => {
    if (access && !canManageUsers) setActiveTab('roles');
  }, [access, canManageUsers]);

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
  } = useGetUsersQuery(undefined, { skip: !canManageUsers });

  // ==========================================================
  // USER MUTATIONS
  // ==========================================================

  const [deleteUser, { isLoading: deletingUser }] = useDeleteUserMutation();

  const [setUserStatus, { isLoading: changingStatus }] = useSetUserStatusMutation();

  // ==========================================================
  // ROLES
  // ==========================================================

  // ==========================================================
  // NORMALIZE USERS RESPONSE
  // ==========================================================

  const users: User[] = Array.isArray(usersData) ? usersData : (usersData?.data ?? []);

  // ==========================================================
  // NORMALIZE ROLES RESPONSE
  // ==========================================================

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
    const confirmed = await confirm({
      title: `Delete ${user.name}?`,
      description: `${user.name}${
        user.email ? ` (${user.email})` : ''
      } will lose access and the account will be permanently deleted. This cannot be undone. To keep the account but block sign-in, choose Disable instead.`,
      confirmLabel: 'Delete user',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(user.id).unwrap();

      toast.add({
        title: 'User deleted',
        description: `${user.name} no longer has an account.`,
        type: 'success',
      });
    } catch (error: any) {
      toast.add({
        title: 'Could not delete user',
        description: error?.data?.message || error?.message || 'Please try again.',
        type: 'error',
      });
    }
  };

  // ============================================================
  // TOGGLE STATUS
  // ============================================================

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    const disabling = nextStatus === 'DISABLED';

    const confirmed = await confirm({
      title: disabling ? `Disable ${user.name}?` : `Enable ${user.name}?`,
      description: disabling
        ? `${user.name} will no longer be able to sign in. Their account is kept and you can enable it again at any time.`
        : `${user.name} will be able to sign in again.`,
      confirmLabel: disabling ? 'Disable user' : 'Enable user',
      tone: disabling ? 'danger' : 'default',
    });

    if (!confirmed) {
      return;
    }

    try {
      await setUserStatus({
        id: user.id,
        status: nextStatus,
      }).unwrap();

      toast.add({
        title: nextStatus === 'ACTIVE' ? 'User enabled' : 'User disabled',
        description:
          nextStatus === 'ACTIVE'
            ? `${user.name} can sign in again.`
            : `${user.name} can no longer sign in.`,
        type: 'success',
      });
    } catch (error: any) {
      toast.add({
        title: 'Could not update user',
        description: error?.data?.message || error?.message || 'Please try again.',
        type: 'error',
      });
    }
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  const userMutationLoading = deletingUser || changingStatus;

  // ============================================================
  // RENDER
  // ============================================================

  if (accessLoading) return <p className="p-6 text-sm text-muted-foreground">Loading access…</p>;
  if (accessError)
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        Unable to verify your permissions. Reload to try again.
      </p>
    );

  return (
    <>
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between">
          <PageHeader
            title="Users & Roles"
            description="Choose who can sign in to the system and what each person is allowed to do."
          />

          {activeTab === 'users' && canManageUsers && (
            <Button className="w-fit" onClick={handleCreateUser} disabled={userMutationLoading}>
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
                disabled={!canManageUsers}
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                Users
              </button>

              {/* ROLES TAB */}

              <button
                type="button"
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'roles'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
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

          {activeTab === 'users' && canManageUsers && (
            <div>
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">Application Users</h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Manage users who have access to the application.
                </p>
              </div>

              {/* LOADING */}

              {usersLoading && (
                <div className="p-5 text-sm text-muted-foreground">Loading users...</div>
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

                        <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/50">
                          {/* NAME */}

                          <td className="px-5 py-2.5 font-medium text-foreground">
                            {user.name || 'Unnamed User'}
                          </td>

                          {/* EMAIL */}

                          <td className="px-5 py-2.5 text-muted-foreground">{user.email || '—'}</td>

                          {/* ROLE */}

                          <td className="px-5 py-2.5">
                            <Badge tone="brand">{user.role?.name || 'No Role'}</Badge>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-2.5">
                            <Badge tone={user.status === 'ACTIVE' ? undefined : 'danger'}>
                              {user.status === 'ACTIVE'
                                ? 'Active'
                                : user.status === 'DISABLED'
                                  ? 'Disabled'
                                  : user.status || 'Disabled'}
                            </Badge>
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-2.5">
                            <RowActions
                              recordName={user.name || user.email || 'user'}
                              primary={{
                                label: 'Change role',
                                icon: ShieldCheck,
                                onClick: () => handleChangeRole(user),
                                disabled: userMutationLoading,
                              }}
                              items={[
                                {
                                  label: 'Edit user',
                                  icon: Pencil,
                                  disabled: userMutationLoading,
                                  onSelect: () => handleEditUser(user),
                                },
                                {
                                  label: user.status === 'ACTIVE' ? 'Disable user' : 'Enable user',
                                  icon: user.status === 'ACTIVE' ? UserX : UserCheck,
                                  disabled: userMutationLoading,
                                  onSelect: () => handleToggleStatus(user),
                                },
                                {
                                  label: 'Delete user',
                                  icon: Trash2,
                                  destructive: true,
                                  separatorBefore: true,
                                  disabled: userMutationLoading,
                                  onSelect: () => handleDeleteUser(user),
                                },
                              ]}
                            />
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

          {activeTab === 'roles' && <PermissionsWorkspace canManage={canManageRoles} />}
        </Card>
      </div>

      {/* ========================================================
          ADD / EDIT USER MODAL
      ======================================================== */}

      <AddUserModal open={userModalOpen} user={editingUser} onClose={handleCloseUserModal} />

      {/* ========================================================
          UPDATE ROLE MODAL
      ======================================================== */}

      <UpdateRoleModal open={roleModalOpen} user={roleEditingUser} onClose={handleCloseRoleModal} />
    </>
  );
}
