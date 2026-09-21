import React, { useState } from "react";
import dayjs from "dayjs";

import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  User,
  Mail,
  Phone,
  Users,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useRemoveEmployeeMutation,
} from "../services/api/employees.api";

import type {
  Employee,
  EmployeeStatus,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "../services/api/employees.api";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import EmployeeDetailDrawer from "../components/asset-manager/EmployeeDetailDrawer";

import EmployeeFormModal, {
  type EmployeeFormValues,
  STATUS_OPTIONS,
  getEmptyEmployeeForm,
} from "../components/asset-manager/EmployeeFormModal";

// ============================================================
// HELPERS
// ============================================================

const getStatusLabel = (status?: EmployeeStatus) => {
  switch (status) {
    case "ACTIVE":
      return "Active";

    case "ON_LEAVE":
      return "On Leave";

    case "INACTIVE":
      return "Inactive";

    case "EXITED":
      return "Exited";

    default:
      return "Unknown";
  }
};

const getStatusClass = (status?: EmployeeStatus) => {
  switch (status) {
    case "ACTIVE":
      return "border-success-border bg-success-muted text-success-strong";

    case "ON_LEAVE":
      return "border-warning-border bg-warning-muted text-warning-strong";

    case "INACTIVE":
      return "border-border bg-muted text-muted-foreground";

    case "EXITED":
      return "border-destructive-border bg-destructive-muted text-destructive-strong";

    default:
      return "border-border bg-muted text-muted-foreground";
  }
};

const getInitials = (employee?: Employee | null) => {
  if (!employee?.name) {
    return "?";
  }

  return employee.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const normalizeEmployees = (
  response:
    | Employee[]
    | {
        items?: Employee[];
        total?: number;
        page?: number;
        pageSize?: number;
        totalPages?: number;
      }
    | undefined,
) => {
  if (!response) {
    return {
      items: [] as Employee[],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
  }

  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
      page: 1,
      pageSize: response.length || 10,
      totalPages: 1,
    };
  }

  return {
    items: response.items || [],
    total: response.total || 0,
    page: response.page || 1,
    pageSize: response.pageSize || 10,
    totalPages: response.totalPages || 1,
  };
};

// ============================================================
// STATUS BADGE
// ============================================================

const StatusBadge = ({ status }: { status?: EmployeeStatus }) => {
  return (
    <Badge variant="outline" className={getStatusClass(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
};

// ============================================================
// SUMMARY CARD
// ============================================================

const SummaryCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) => {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{label}</p>

          <p className="font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const EmployeeList: React.FC = () => {
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<EmployeeStatus | undefined>();

  const [departmentId, setDepartmentId] = useState<string | undefined>();

  const [page, setPage] = useState(1);

  const [form, setForm] = useState<EmployeeFormValues>(getEmptyEmployeeForm());

  const [modalOpen, setModalOpen] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ============================================================
  // API
  // ============================================================

  const { data, isLoading, isFetching, isError, refetch } =
    useGetEmployeesQuery({
      search: search || undefined,
      departmentId,
      status,
      page,
    });

  const [createEmployee, { isLoading: isCreating }] =
    useCreateEmployeeMutation();

  const [updateEmployee, { isLoading: isUpdating }] =
    useUpdateEmployeeMutation();

  const [removeEmployee, { isLoading: isDeleting }] =
    useRemoveEmployeeMutation();

  const {
    items: employees,
    total,
    page: responsePage,
    pageSize,
    totalPages,
  } = normalizeEmployees(data);

  // ============================================================
  // DERIVED DATA
  // ============================================================

  const activeCount = employees.filter(
    (employee) => employee.status === "ACTIVE",
  ).length;

  const leaveCount = employees.filter(
    (employee) => employee.status === "ON_LEAVE",
  ).length;

  const departmentOptions = React.useMemo(() => {
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
  // FORM
  // ============================================================

  const updateForm = (field: keyof EmployeeFormValues, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(getEmptyEmployeeForm());
    setModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);

    setForm({
      employeeCode: employee.employeeCode || "",
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      departmentId: employee.departmentId || "",
      status: employee.status || "ACTIVE",
      joiningDate: employee.joiningDate
        ? dayjs(employee.joiningDate).format("YYYY-MM-DD")
        : "",
      organisationId: employee.organisationId || "",
    });

    setDrawerOpen(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isCreating || isUpdating) {
      return;
    }

    setModalOpen(false);
    setEditingEmployee(null);
    setForm(getEmptyEmployeeForm());
  };

  // ============================================================
  // CREATE / UPDATE
  // ============================================================

  const handleSubmit = async () => {
    if (!form.employeeCode.trim()) {
      return;
    }

    if (!form.name.trim()) {
      return;
    }

    const payload: CreateEmployeeRequest = {
      employeeCode: form.employeeCode.trim(),
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      departmentId: form.departmentId || undefined,
      status: form.status,
      joiningDate: form.joiningDate || undefined,
      organisationId: form.organisationId || undefined,
    };

    try {
      if (editingEmployee) {
        const updatePayload: UpdateEmployeeRequest = {
          id: editingEmployee.id,
          ...payload,
        };

        await updateEmployee(updatePayload).unwrap();
      } else {
        await createEmployee(payload).unwrap();
      }

      closeModal();
      await refetch();
    } catch (error) {
      console.error("Failed to save employee", error);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (employee: Employee) => {
    const confirmed = window.confirm(`Remove employee "${employee.name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await removeEmployee(employee.id).unwrap();

      if (selectedEmployee?.id === employee.id) {
        setSelectedEmployee(null);
        setDrawerOpen(false);
      }

      await refetch();
    } catch (error) {
      console.error("Failed to remove employee", error);
    }
  };

  // ============================================================
  // FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("");
    setStatus(undefined);
    setDepartmentId(undefined);
    setPage(1);
  };

  const hasFilters =
    Boolean(search) || Boolean(status) || Boolean(departmentId);

  // ============================================================
  // DETAILS
  // ============================================================

  const openDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDrawerOpen(true);
  };

  // ============================================================
  // PAGINATION
  // ============================================================

  const currentPage = responsePage || page;

  const canPrevious = currentPage > 1;

  const canNext = currentPage < totalPages;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage employees, reporting structure, assignments and employee
            records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard icon={Users} label="Total Employees" value={total} />

        <SummaryCard icon={User} label="Active Employees" value={activeCount} />

        <SummaryCard icon={Calendar} label="On Leave" value={leaveCount} />
      </div>

      {/* TABLE */}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle className="text-base">Employee Directory</CardTitle>

            <div className="flex flex-wrap gap-2">
              {/* SEARCH */}

              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search employees..."
                  className="pl-9"
                />
              </div>

              {/* STATUS */}

              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as EmployeeStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* DEPARTMENT */}

              <Select
                value={departmentId}
                onValueChange={(value) => {
                  setDepartmentId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>

                <SelectContent>
                  {departmentOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                  <span>Failed to load employees.</span>

                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Employee</TableHead>

                      <TableHead>Organisation</TableHead>

                      <TableHead>Contact</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead className="w-[130px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading || isFetching ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" />

                          <span className="text-sm text-muted-foreground">
                            Loading employees...
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center">
                          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                          <p className="font-medium">No employees found</p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Try changing your filters or add a new employee.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee) => (
                        <TableRow key={employee.id} className="group">
                          {/* EMPLOYEE */}

                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage
                                  src={employee.avatarUrl || undefined}
                                />

                                <AvatarFallback>
                                  {getInitials(employee)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <p className="font-medium">{employee.name}</p>

                                <p className="text-xs text-muted-foreground">
                                  {employee.employeeCode}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* ORGANISATION */}

                          <TableCell>
                            <div className="space-y-1">
                              {employee.organisation?.name ||
                                employee.organisationId ||
                                "-"}
                            </div>
                          </TableCell>

                          {/* CONTACT */}

                          <TableCell>
                            <div className="space-y-1">
                              {employee.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />

                                  <span className="max-w-[180px] truncate">
                                    {employee.email}
                                  </span>
                                </div>
                              )}

                              {employee.phone && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5" />

                                  {employee.phone}
                                </div>
                              )}

                              {!employee.email && !employee.phone && (
                                <span className="text-sm text-muted-foreground">
                                  -
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* STATUS */}

                          <TableCell>
                            <StatusBadge status={employee.status} />
                          </TableCell>

                          {/* ACTIONS */}

                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetails(employee)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(employee)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(employee)}
                                disabled={isDeleting}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* PAGINATION */}

              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {total > 0
                    ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(
                        currentPage * pageSize,
                        total,
                      )} of ${total}`
                    : "0 employees"}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canPrevious}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>

                  <span className="px-2 text-sm text-muted-foreground">
                    {currentPage} / {Math.max(totalPages, 1)}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canNext}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ADD / EDIT EMPLOYEE */}

      <EmployeeFormModal
        open={modalOpen}
        value={form}
        employees={employees}
        editingEmployee={editingEmployee}
        isCreating={isCreating}
        isUpdating={isUpdating}
        onChange={updateForm}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {/* EMPLOYEE DETAILS */}

      <EmployeeDetailDrawer
        employee={selectedEmployee}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedEmployee(null);
        }}
        onEdit={openEdit}
      />
    </div>
  );
};

export default EmployeeList;
