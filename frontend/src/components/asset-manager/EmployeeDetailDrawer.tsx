import React from "react";
import dayjs from "dayjs";

import {
  Calendar,
  IdCard,
  Laptop,
  Mail,
  Pencil,
  Phone,
  User,
  Users,
} from "lucide-react";

import type {
  Employee,
  EmployeeStatus,
} from "../../services/api/employees.api";

import { Button } from "../ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface EmployeeDetailDrawerProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
}

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

const StatusBadge = ({ status }: { status?: EmployeeStatus }) => {
  return (
    <Badge variant="outline" className={getStatusClass(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
};

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

            <DetailSection title="Organisation">
              <DetailGrid>
                <DetailItem
                  icon={Users}
                  label="Organisation"
                  value={
                    (employee.organisation as { name?: string } | undefined)
                      ?.name || employee.organisationId
                  }
                />
              </DetailGrid>
            </DetailSection>

            {employee.department && (
              <DetailSection title="Department">
                <DetailGrid>
                  <DetailItem
                    icon={Users}
                    label="Department"
                    value={employee.department.name}
                  />
                </DetailGrid>
              </DetailSection>
            )}

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

export default EmployeeDetailDrawer;
