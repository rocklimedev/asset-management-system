import React, { useMemo, useState } from "react";
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
  Building2,
  MapPin,
  Users,
  Calendar,
  IdCard,
  Laptop,
  X,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
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

// shadcn
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

// ============================================================
// TYPES
// ============================================================

interface EmployeeFormValues {
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  departmentId: string;
  designation: string;
  managerId: string;
  locationId: string;
  status: EmployeeStatus;
  joiningDate: string;
  organisationId: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS: {
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
// EMPLOYEE FORM
// ============================================================

interface EmployeeFormProps {
  value: EmployeeFormValues;
  onChange: (field: keyof EmployeeFormValues, value: string) => void;
  employees: Employee[];
  editingEmployee?: Employee | null;
}

const EmployeeForm = ({
  value,
  onChange,
  employees,
  editingEmployee,
}: EmployeeFormProps) => {
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

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>();

    employees.forEach((employee) => {
      if (employee.location?.id) {
        map.set(
          employee.location.id,
          employee.location.name || employee.location.id,
        );
      }
    });

    return Array.from(map.entries());
  }, [employees]);

  const managerOptions = useMemo(() => {
    return employees.filter((employee) => employee.id !== editingEmployee?.id);
  }, [employees, editingEmployee]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Employee Code" required>
          <Input
            value={value.employeeCode}
            onChange={(e) => onChange("employeeCode", e.target.value)}
            placeholder="EMP-001"
          />
        </FormField>

        <FormField label="Employee Name" required>
          <Input
            value={value.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Enter employee name"
          />
        </FormField>

        <FormField label="Email">
          <Input
            type="email"
            value={value.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="employee@company.com"
          />
        </FormField>

        <FormField label="Phone">
          <Input
            value={value.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+91 XXXXX XXXXX"
          />
        </FormField>

        <FormField label="Designation">
          <Input
            value={value.designation}
            onChange={(e) => onChange("designation", e.target.value)}
            placeholder="Software Engineer"
          />
        </FormField>

        <FormField label="Status">
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

        <FormField label="Department">
          <Select
            value={value.departmentId || undefined}
            onValueChange={(selected) => onChange("departmentId", selected)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>

            <SelectContent>
              {departmentOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Location">
          <Select
            value={value.locationId || undefined}
            onValueChange={(selected) => onChange("locationId", selected)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>

            <SelectContent>
              {locationOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Manager">
          <Select
            value={value.managerId || undefined}
            onValueChange={(selected) => onChange("managerId", selected)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>

            <SelectContent>
              {managerOptions.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Joining Date">
          <Input
            type="date"
            value={value.joiningDate}
            onChange={(e) => onChange("joiningDate", e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Avatar URL">
        <Input
          value={value.avatarUrl}
          onChange={(e) => onChange("avatarUrl", e.target.value)}
          placeholder="https://..."
        />
      </FormField>
    </div>
  );
};

// ============================================================
// FORM FIELD
// ============================================================

const FormField = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {children}
    </div>
  );
};

// ============================================================
// EMPLOYEE DETAIL DRAWER
// ============================================================

interface EmployeeDetailDrawerProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
}

const EmployeeDetailDrawer = ({
  employee,
  open,
  onClose,
  onEdit,
}: EmployeeDetailDrawerProps) => {
  if (!employee) {
    return null;
  }

  const assignments = employee.assignments || [];

  const reports = employee.reports || [];

  return (
    <Drawer
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DrawerContent className="max-h-[95vh]">
        <div className="mx-auto w-full max-w-4xl overflow-y-auto">
          <DrawerHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={employee.avatarUrl || undefined} />

                  <AvatarFallback className="text-lg">
                    {getInitials(employee)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <DrawerTitle className="text-xl">{employee.name}</DrawerTitle>

                  <DrawerDescription>{employee.employeeCode}</DrawerDescription>

                  <div className="mt-2">
                    <StatusBadge status={employee.status} />
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(employee)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </DrawerHeader>

          <div className="space-y-6 px-6 pb-6">
            {/* SUMMARY */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryCard
                icon={Users}
                label="Reports"
                value={reports.length}
              />

              <SummaryCard
                icon={Laptop}
                label="Assets"
                value={assignments.length}
              />

              <SummaryCard
                icon={Calendar}
                label="Joined"
                value={
                  employee.joiningDate
                    ? dayjs(employee.joiningDate).format("DD MMM YYYY")
                    : "-"
                }
              />
            </div>

            {/* BASIC INFORMATION */}

            <DetailSection title="Basic Information">
              <DetailGrid>
                <DetailItem
                  icon={IdCard}
                  label="Employee Code"
                  value={employee.employeeCode}
                />

                <DetailItem icon={User} label="Name" value={employee.name} />

                <DetailItem icon={Mail} label="Email" value={employee.email} />

                <DetailItem icon={Phone} label="Phone" value={employee.phone} />

                <DetailItem
                  icon={BriefcaseBusiness}
                  label="Designation"
                  value={employee.designation}
                />

                <DetailItem
                  icon={Calendar}
                  label="Joining Date"
                  value={
                    employee.joiningDate
                      ? dayjs(employee.joiningDate).format("DD MMM YYYY")
                      : null
                  }
                />
              </DetailGrid>
            </DetailSection>

            {/* ORGANISATION */}

            <DetailSection title="Organisation">
              <DetailGrid>
                <DetailItem
                  icon={Building2}
                  label="Department"
                  value={employee.department?.name || employee.departmentId}
                />

                <DetailItem
                  icon={MapPin}
                  label="Location"
                  value={employee.location?.name || employee.locationId}
                />

                <DetailItem
                  icon={User}
                  label="Manager"
                  value={employee.manager?.name || employee.managerId}
                />

                <DetailItem
                  icon={Users}
                  label="Organisation"
                  value={employee.organisationId}
                />
              </DetailGrid>
            </DetailSection>

            {/* REPORTS */}

            {reports.length > 0 && (
              <DetailSection title="Reporting Employees">
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={report.avatarUrl || undefined} />

                        <AvatarFallback>{getInitials(report)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="font-medium">{report.name}</p>

                        <p className="text-sm text-muted-foreground">
                          {report.employeeCode}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* ASSETS */}

            {assignments.length > 0 && (
              <DetailSection title="Assigned Assets">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>

                        <TableHead>Asset Tag</TableHead>

                        <TableHead>Assigned</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {assignments.map((assignment: any, index) => (
                        <TableRow key={assignment.id || index}>
                          <TableCell>
                            {assignment.asset?.name ||
                              assignment.asset?.assetTag ||
                              assignment.assetId ||
                              "-"}
                          </TableCell>

                          <TableCell>
                            {assignment.asset?.assetTag ||
                              assignment.assetTag ||
                              "-"}
                          </TableCell>

                          <TableCell>
                            {assignment.assignedAt
                              ? dayjs(assignment.assignedAt).format(
                                  "DD MMM YYYY",
                                )
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DetailSection>
            )}

            {/* RECORD */}

            <DetailSection title="Record Information">
              <DetailGrid>
                <DetailItem
                  icon={Calendar}
                  label="Created"
                  value={
                    employee.createdAt
                      ? dayjs(employee.createdAt).format("DD MMM YYYY, hh:mm A")
                      : null
                  }
                />

                <DetailItem
                  icon={Calendar}
                  label="Updated"
                  value={
                    employee.updatedAt
                      ? dayjs(employee.updatedAt).format("DD MMM YYYY, hh:mm A")
                      : null
                  }
                />

                <DetailItem
                  icon={IdCard}
                  label="Employee ID"
                  value={employee.id}
                />
              </DetailGrid>
            </DetailSection>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>

            <Button onClick={() => onEdit(employee)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Employee
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// ============================================================
// DETAIL HELPERS
// ============================================================

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>

      {children}
    </section>
  );
};

const DetailGrid = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
      {children}
    </div>
  );
};

const DetailItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
}) => {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>

        <p className="truncate text-sm font-medium">{value || "-"}</p>
      </div>
    </div>
  );
};

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
// EMPTY FORM
// ============================================================

const getEmptyForm = (): EmployeeFormValues => ({
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  avatarUrl: "",
  departmentId: "",
  designation: "",
  managerId: "",
  locationId: "",
  status: "ACTIVE",
  joiningDate: "",
  organisationId: "",
});

// ============================================================
// MAIN COMPONENT
// ============================================================

const EmployeeList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | undefined>();

  const [departmentId, setDepartmentId] = useState<string | undefined>();

  const [page, setPage] = useState(1);

  const [form, setForm] = useState<EmployeeFormValues>(getEmptyForm());

  const [modalOpen, setModalOpen] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

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

    setForm(getEmptyForm());

    setModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);

    setForm({
      employeeCode: employee.employeeCode || "",
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      avatarUrl: employee.avatarUrl || "",
      departmentId: employee.departmentId || "",
      designation: employee.designation || "",
      managerId: employee.managerId || "",
      locationId: employee.locationId || "",
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
    setForm(getEmptyForm());
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

      avatarUrl: form.avatarUrl.trim() || undefined,

      departmentId: form.departmentId || undefined,

      designation: form.designation.trim() || undefined,

      managerId: form.managerId || undefined,

      locationId: form.locationId || undefined,

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

      {/* TABLE CARD */}

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
                        <TableCell colSpan={9} className="h-32 text-center">
                          <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" />

                          <span className="text-sm text-muted-foreground">
                            Loading employees...
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-40 text-center">
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

      {/* CREATE / EDIT MODAL */}

      <Dialog
        open={modalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            closeModal();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>

            <DialogDescription>
              {editingEmployee
                ? "Update the employee information below."
                : "Create a new employee record."}
            </DialogDescription>
          </DialogHeader>

          <EmployeeForm
            value={form}
            onChange={updateForm}
            employees={employees}
            editingEmployee={editingEmployee}
          />

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={isCreating || isUpdating}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={
                isCreating ||
                isUpdating ||
                !form.employeeCode.trim() ||
                !form.name.trim()
              }
            >
              {isCreating || isUpdating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : editingEmployee ? (
                <Pencil className="mr-2 h-4 w-4" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}

              {editingEmployee ? "Update Employee" : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DRAWER */}

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
