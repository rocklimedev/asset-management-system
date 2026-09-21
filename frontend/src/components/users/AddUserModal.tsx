import { useEffect, useState } from "react";
import { X, UserPlus, Save } from "lucide-react";

import {
  useCreateUserMutation,
  useUpdateUserMutation,
} from "../../services/api/users.api";

import { useGetRolesQuery } from "../../services/api/role.api";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

import type { CreateUserRequest, User } from "../../services/api/users.api";

// ============================================================
// TYPES
// ============================================================

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  employeeId: string;
  roleId: string;
}

// ============================================================
// DEFAULT FORM
// ============================================================

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  employeeId: "",
  roleId: "",
};

// ============================================================
// COMPONENT
// ============================================================

export default function AddUserModal({
  open,
  onClose,
  user,
}: AddUserModalProps) {
  const isEdit = Boolean(user);

  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] = useState<FormState>(emptyForm);

  const [error, setError] = useState("");

  // ==========================================================
  // API
  // ==========================================================

  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();

  const [createUser, { isLoading: creating }] = useCreateUserMutation();

  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();

  const submitting = creating || updating;

  // ==========================================================
  // NORMALIZE ROLES
  // ==========================================================

  const roles = Array.isArray(rolesData) ? rolesData : (rolesData?.data ?? []);

  // ==========================================================
  // INITIALIZE FORM
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");

    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        password: "",
        employeeId: user.employeeId || "",
        roleId: user.roleId || user.role?.id || "",
      });

      return;
    }

    setForm(emptyForm);
  }, [open, user]);

  // ==========================================================
  // HANDLE CHANGE
  // ==========================================================

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose = () => {
    if (submitting) {
      return;
    }

    setError("");
    setForm(emptyForm);

    onClose();
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!form.roleId) {
      setError("Please select a role.");
      return;
    }

    // Password is required only when creating
    if (!isEdit && !form.password) {
      setError("Password is required.");
      return;
    }

    if (form.password && form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      // ======================================================
      // CREATE
      // ======================================================

      if (!isEdit) {
        const payload: CreateUserRequest = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          roleId: form.roleId,
          employeeId: form.employeeId.trim() || undefined,
        };

        await createUser(payload).unwrap();

        onClose();
        return;
      }

      // ======================================================
      // UPDATE
      // ======================================================

      if (!user) {
        return;
      }

      await updateUser({
        id: user.id,
        name: form.name.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim() || null,

        // Do not send password when editing
        // unless the user actually entered one.
        ...(form.password.trim()
          ? {
              password: form.password.trim(),
            }
          : {}),
      }).unwrap();

      onClose();
    } catch (err: any) {
      setError(
        err?.data?.message ||
          err?.message ||
          `Failed to ${isEdit ? "update" : "create"} user.`,
      );
    }
  };

  // ==========================================================
  // DON'T RENDER
  // ==========================================================

  if (!open) {
    return null;
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* BACKDROP */}

      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* MODAL */}

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              {isEdit ? (
                <Save className="h-4 w-4 text-primary" />
              ) : (
                <UserPlus className="h-4 w-4 text-primary" />
              )}
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground">
                {isEdit ? "Edit User" : "Add User"}
              </h2>

              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Update the user's account details."
                  : "Create a new application user."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={submitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* ERROR */}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* NAME */}

          <div className="space-y-2">
            <Label htmlFor="user-name">Name</Label>

            <Input
              id="user-name"
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              placeholder="Enter full name"
              disabled={submitting}
              autoComplete="name"
            />
          </div>

          {/* EMAIL */}

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>

            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              placeholder="Enter email address"
              disabled={submitting}
              autoComplete="email"
            />
          </div>

          {/* PASSWORD */}

          <div className="space-y-2">
            <Label htmlFor="user-password">
              Password
              {isEdit && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (leave blank to keep current)
                </span>
              )}
            </Label>

            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              placeholder={isEdit ? "Enter new password" : "Enter password"}
              disabled={submitting}
              autoComplete={isEdit ? "new-password" : "new-password"}
            />

            <p className="text-xs text-muted-foreground">
              Minimum 8 characters.
            </p>
          </div>

          {/* EMPLOYEE */}

          <div className="space-y-2">
            <Label htmlFor="user-employee">
              Employee ID
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>

            <Input
              id="user-employee"
              value={form.employeeId}
              onChange={(event) =>
                handleChange("employeeId", event.target.value)
              }
              placeholder="Employee UUID"
              disabled={submitting}
            />
          </div>

          {/* ROLE */}

          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>

            <select
              id="user-role"
              value={form.roleId}
              onChange={(event) => handleChange("roleId", event.target.value)}
              disabled={submitting || rolesLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {rolesLoading ? "Loading roles..." : "Select role"}
              </option>

              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={submitting || rolesLoading || !roles.length}
            >
              {submitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
