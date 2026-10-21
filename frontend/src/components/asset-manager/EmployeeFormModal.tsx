import React, { useEffect, useId, useMemo, useState } from "react";

import { Pencil, Plus, RefreshCw } from "lucide-react";

import type {
  Employee,
  EmployeeStatus,
} from "../../services/api/employees.api";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";

export interface EmployeeFormValues {
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  status: EmployeeStatus;
  joiningDate: string;
  organisationId: string;
}

export const STATUS_OPTIONS: {
  label: string;
  value: EmployeeStatus;
}[] = [
  {
    label: "Active",
    value: "ACTIVE",
  },
  {
    label: "On Leave",
    value: "ON_LEAVE",
  },
  {
    label: "Inactive",
    value: "INACTIVE",
  },
  {
    label: "Exited",
    value: "EXITED",
  },
];

export const getEmptyEmployeeForm = (): EmployeeFormValues => ({
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  departmentId: "",
  status: "ACTIVE",
  joiningDate: "",
  organisationId: "",
});

interface EmployeeFormModalProps {
  open: boolean;
  value: EmployeeFormValues;
  employees: Employee[];
  editingEmployee: Employee | null;
  isCreating: boolean;
  isUpdating: boolean;
  onChange: (field: keyof EmployeeFormValues, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

interface OrganisationOption {
  id: string;
  name: string;
}

const FormField = ({
  label,
  required,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  /** Id of the input, so the label is announced and clickable. */
  htmlFor?: string;
  /** Validation message shown directly under the field. */
  error?: string;
  /** Short guidance shown under the field when there is no error. */
  hint?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children}

      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs text-destructive-strong"
        >
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
};

const EmployeeFormModal = ({
  open,
  value,
  employees,
  editingEmployee,
  isCreating,
  isUpdating,
  onChange,
  onClose,
  onSubmit,
}: EmployeeFormModalProps) => {
  // ============================================================
  // VALIDATION
  // Errors only appear after the first save attempt, next to the
  // field that needs fixing.
  // ============================================================

  const formId = useId();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) setAttempted(false);
  }, [open]);

  const codeError =
    attempted && !value.employeeCode.trim()
      ? "Enter the employee code, for example EMP-001."
      : undefined;

  const nameError =
    attempted && !value.name.trim() ? "Enter the employee's full name." : undefined;

  const handleSave = () => {
    setAttempted(true);

    if (!value.employeeCode.trim() || !value.name.trim()) return;

    onSubmit();
  };

  // ============================================================
  // DEPARTMENT OPTIONS
  // ============================================================

  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();

    employees.forEach((employee) => {
      if (employee.department?.id) {
        map.set(
          employee.department.id,
          employee.department.name || employee.department.id,
        );
      }
    });

    return Array.from(map.entries());
  }, [employees]);

  // ============================================================
  // ORGANISATION OPTIONS
  // ============================================================

  const organisationOptions = useMemo<OrganisationOption[]>(() => {
    const map = new Map<string, string>();

    employees.forEach((employee) => {
      const organisation = employee.organisation as
        | {
            id?: string;
            name?: string;
          }
        | undefined;

      if (organisation?.id) {
        map.set(organisation.id, organisation.name || organisation.id);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [employees]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>
            {editingEmployee ? "Edit employee" : "Add employee"}
          </DialogTitle>

          <DialogDescription>
            {editingEmployee
              ? "Update the employee information below."
              : "Add the code and name first. Everything else is optional and can be added later."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* EMPLOYEE CODE */}

            <FormField
              label="Employee code"
              required
              htmlFor={`${formId}-code`}
              error={codeError}
            >
              <Input
                id={`${formId}-code`}
                aria-invalid={!!codeError}
                aria-describedby={codeError ? `${formId}-code-error` : undefined}
                value={value.employeeCode}
                onChange={(event) =>
                  onChange("employeeCode", event.target.value)
                }
                placeholder="EMP-001"
              />
            </FormField>

            {/* EMPLOYEE NAME */}

            <FormField
              label="Full name"
              required
              htmlFor={`${formId}-name`}
              error={nameError}
            >
              <Input
                id={`${formId}-name`}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? `${formId}-name-error` : undefined}
                value={value.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Enter employee name"
              />
            </FormField>

            {/* EMAIL */}

            <FormField label="Email">
              <Input
                type="email"
                value={value.email}
                onChange={(event) => onChange("email", event.target.value)}
                placeholder="employee@company.com"
              />
            </FormField>

            {/* PHONE */}

            <FormField label="Phone">
              <Input
                value={value.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </FormField>

            {/* ORGANISATION */}

            <FormField label="Organisation">
              <Select
                value={value.organisationId || undefined}
                onValueChange={(selected) =>
                  onChange("organisationId", selected)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>

                <SelectContent>
                  {organisationOptions.length > 0 ? (
                    organisationOptions.map((organisation) => (
                      <SelectItem key={organisation.id} value={organisation.id}>
                        {organisation.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_organisations__" disabled>
                      No organisations available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FormField>

            {/* DEPARTMENT */}

            <FormField label="Department">
              <Select
                value={value.departmentId || undefined}
                onValueChange={(selected) => onChange("departmentId", selected)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>

                <SelectContent>
                  {departmentOptions.length > 0 ? (
                    departmentOptions.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_departments__" disabled>
                      No departments available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FormField>

            {/* STATUS */}

            <FormField
              label="Status"
              hint={
                value.status === "EXITED" ? (
                  <span className="text-warning-strong">
                    Saving as Exited returns every asset and computer assigned
                    to this person to stock.
                  </span>
                ) : undefined
              }
            >
              <Select
                value={value.status}
                onValueChange={(selected) => onChange("status", selected)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>

                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* JOINING DATE */}

            <FormField label="Joining date">
              <Input
                type="date"
                value={value.joiningDate}
                onChange={(event) =>
                  onChange("joiningDate", event.target.value)
                }
              />
            </FormField>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating || isUpdating}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : editingEmployee ? (
              <Pencil className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}

            {isCreating || isUpdating
              ? "Saving…"
              : editingEmployee
                ? "Save changes"
                : "Add employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormModal;
