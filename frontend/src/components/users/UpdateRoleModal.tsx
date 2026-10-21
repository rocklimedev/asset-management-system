import { OverlayRoot } from "@/components/ui/overlay-root";
import React, { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

import { useChangeUserRoleMutation, type User } from "@/services/api/users.api";

import { useGetRolesQuery } from "@/services/api/role.api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UpdateRoleModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

interface FormState {
  roleId: string;
}

const EMPTY_FORM: FormState = {
  roleId: "",
};

export default function UpdateRoleModal({
  open,
  user,
  onClose,
}: UpdateRoleModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();

  const [changeUserRole, { isLoading: isSaving }] = useChangeUserRoleMutation();

  const roles = Array.isArray(rolesData)
    ? rolesData
    : Array.isArray((rolesData as any)?.data)
      ? (rolesData as any).data
      : [];

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setError("");
      return;
    }

    if (user) {
      setForm({
        roleId: user.roleId ?? user.role?.id ?? "",
      });
      setError("");
    }
  }, [open, user]);

  if (!open || !user) {
    return null;
  }

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((previous) => ({
      ...previous,
      roleId: event.target.value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.roleId) {
      setError("Please select a role.");
      return;
    }

    if (form.roleId === user.roleId) {
      onClose();
      return;
    }

    setError("");

    try {
      await changeUserRole({
        id: user.id,
        roleId: form.roleId,
      }).unwrap();

      onClose();
    } catch (err: any) {
      setError(
        err?.data?.message || err?.message || "Failed to update user role.",
      );
    }
  };

  return (
    <OverlayRoot
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
      onClose={onClose}
      label="Update role"
      disableClose={isSaving}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-card shadow-overlay">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Update Role
              </h2>

              <p className="text-sm text-muted-foreground">
                Change the role assigned to this user
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {/* User */}
            <div className="rounded-lg border bg-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                User
              </p>

              <p className="mt-1 font-medium text-foreground">
                {user.name || "Unnamed User"}
              </p>

              {user.email && (
                <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
              )}
            </div>

            {/* Current Role */}
            <div>
              <Label>Current Role</Label>

              <Input
                value={user.role?.name || "No Role"}
                disabled
                className="mt-2 bg-muted"
              />
            </div>

            {/* New Role */}
            <div>
              <Label htmlFor="user-role">
                New Role <span className="text-destructive">*</span>
              </Label>

              <select
                id="user-role"
                value={form.roleId}
                onChange={handleRoleChange}
                disabled={rolesLoading || isSaving}
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {rolesLoading ? "Loading roles..." : "Select a role"}
                </option>

                {roles.map((role: any) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Role Description */}
            {form.roleId && (
              <div className="rounded-lg border border-primary-border bg-primary-muted p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selected Role
                </p>

                <p className="mt-1 font-medium text-primary">
                  {roles.find((role: any) => role.id === form.roleId)?.name ||
                    "Selected Role"}
                </p>

                {roles.find((role: any) => role.id === form.roleId)
                  ?.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      roles.find((role: any) => role.id === form.roleId)
                        ?.description
                    }
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-md border border-destructive-border bg-destructive-muted px-4 py-3 text-sm text-destructive-strong">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t bg-muted px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSaving || rolesLoading || !form.roleId}

            >
              {isSaving ? "Updating..." : "Update Role"}
            </Button>
          </div>
        </form>
      </div>
    </OverlayRoot>
  );
}
