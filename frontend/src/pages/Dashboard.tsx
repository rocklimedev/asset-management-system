import { useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Boxes,
  CheckCircle2,
  Clock3,
  Laptop,
  Plus,
  PackageOpen,
  ShieldAlert,
  Users,
  Wrench,
  ChevronRight,
  Search,
} from "lucide-react";

import { useGetAssetsQuery } from "../services/api/asset.api";
import { useGetEmployeesQuery } from "../services/api/employees.api";

import { StatCard } from "../components/dashboard/StatCard";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { PageHeader } from "../components/layout/PageHeader";
import { CreateAssetModal } from "../components/asset-manager/CreateAssetModal";
import { QuickAddAsset } from "../components/quick/QuickAddAsset";

// ============================================================
// TYPES
// ============================================================

import type { Asset, AssetStatus } from "../services/api/asset.api";
import type { Employee } from "../services/api/employees.api";

// ============================================================
// TASKS
// The first thing a new user sees: what they can do, in their
// own words. Each card goes straight to the place that does it.
// ============================================================

interface HomeTask {
  title: string;
  body: string;
  icon: LucideIcon;
  /** Routes to a page. Tasks without a route open the Add Asset form. */
  to?: string;
}

const HOME_TASKS: HomeTask[] = [
  {
    title: "Give equipment to someone",
    body: "Pick a person, then choose a laptop, phone or licence from stock.",
    icon: PackageOpen,
    to: "/asset-manager",
  },
  {
    title: "Build a computer",
    body: "Combine parts into one computer, then give the whole machine to someone.",
    icon: Wrench,
    to: "/asset-manager?view=computers",
  },
  {
    title: "Add new equipment",
    body: "Record something you have just bought so it can be given out.",
    icon: Plus,
  },
  {
    title: "Find an item",
    body: "Search every asset and see who has it, or whether it is in stock.",
    icon: Search,
    to: "/inventory",
  },
];

// ============================================================
// HOME TASKS COMPONENT
// Rendered on the first paint, before any statistics load, so a
// new user always has a clear next step.
// ============================================================

function HomeTasks({ onAddAsset }: { onAddAsset: () => void }) {
  return (
    <section aria-labelledby="home-tasks-heading" className="mb-6">
      <h2 id="home-tasks-heading" className="text-sm font-semibold text-foreground">
        What would you like to do?
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {HOME_TASKS.map((task) => {
          const Icon = task.icon;

          const content = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {task.title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {task.body}
                </span>
              </span>

              <ChevronRight
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          );

          const className =
            "group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-raised transition-colors hover:border-primary-border focus-visible:ring-2 focus-visible:ring-ring outline-none";

          return task.to ? (
            <Link key={task.title} to={task.to} className={className}>
              {content}
            </Link>
          ) : (
            <button key={task.title} type="button" onClick={onAddAsset} className={className}>
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// STATUS COLORS
// ============================================================

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-brand-500",
  AVAILABLE: "bg-success",
  REPAIR: "bg-warning",
  RETIRED: "bg-muted-foreground",
  LOST: "bg-destructive",
  DAMAGED: "bg-destructive",
  DISPOSED: "bg-border",
};

// ============================================================
// HELPERS
// ============================================================

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAction(action: string): string {
  return action.toLowerCase().replace(/_/g, " ");
}

function getEmployeeName(employee?: Employee | null): string {
  if (!employee) return "Unknown employee";

  return (
    employee.name ||
    employee.employeeCode ||
    employee.email ||
    "Unknown employee"
  );
}

function getDaysUntil(dateValue: string | Date, from: Date): number {
  const target = new Date(dateValue);

  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================
// BAR ROW
// ============================================================

function BarRow({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const percentage = max ? Math.min((count / max) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
        {label}
      </span>

      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
        {count}
      </span>
    </div>
  );
}

// ============================================================
// PERCENTAGE BAR
// ============================================================

function PercentageBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>

        <span className="font-medium tabular-nums text-foreground">
          {value.toFixed(0)}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{
            width: `${Math.min(Math.max(value, 0), 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// REPORTS
// ============================================================

export default function Dashboard() {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  // The full asset form, opened from the quick wizard for advanced fields.
  const [isFullAssetOpen, setIsFullAssetOpen] = useState(false);

  // ==========================================================
  // API
  // ==========================================================

  const {
    data: assetsData,
    isLoading: assetsLoading,
    isError: assetsError,
    refetch: refetchAssets,
  } = useGetAssetsQuery({
    page: 1,
    pageSize: 1000,
  });

  const {
    data: employeesData,
    isLoading: employeesLoading,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useGetEmployeesQuery({
    page: 1,
  });

  // ==========================================================
  // NORMALIZE DATA
  // ==========================================================

  const assets: Asset[] = assetsData?.items || [];

  const employees: Employee[] = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.items || [];

  const isLoading = assetsLoading || employeesLoading;

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />

          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
        </div>

        <HomeTasks onAddAsset={() => setIsAddAssetOpen(true)} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (assetsError || employeesError) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive-border bg-destructive-muted px-4 py-3 text-sm text-destructive-strong">
          Couldn&apos;t load report data.{" "}
          <button
            onClick={() => {
              refetchAssets();
              refetchEmployees();
            }}
            className="font-medium underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // CURRENT DATE
  // ==========================================================

  const today = new Date();

  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setDate(today.getDate() + 90);

  // ==========================================================
  // BASIC COUNTS
  // ==========================================================

  const totalAssets = assets.length;

  const assignedAssets = assets.filter(
    (asset) => asset.status === "ASSIGNED",
  ).length;

  const availableAssets = assets.filter(
    (asset) => asset.status === "AVAILABLE",
  ).length;

  const hardwareAssets = assets.filter((asset) => asset.kind === "HARDWARE");

  const softwareAssets = assets.filter((asset) => asset.kind === "SOFTWARE");

  const underRepair = assets.filter(
    (asset) => asset.status === "REPAIR",
  ).length;

  const damagedAssets = assets.filter(
    (asset) => asset.status === "DAMAGED",
  ).length;

  const lostAssets = assets.filter((asset) => asset.status === "LOST").length;

  const retiredAssets = assets.filter(
    (asset) => asset.status === "RETIRED",
  ).length;

  // ==========================================================
  // ASSIGNMENT ANALYTICS
  // ==========================================================

  const assignmentRate =
    totalAssets > 0 ? (assignedAssets / totalAssets) * 100 : 0;

  const availabilityRate =
    totalAssets > 0 ? (availableAssets / totalAssets) * 100 : 0;

  // ==========================================================
  // MAINTENANCE ANALYTICS
  // ==========================================================

  const maintenanceAssets = assets.filter(
    (asset) => asset.status === "REPAIR" || asset.status === "DAMAGED",
  ).length;

  const maintenanceRate =
    totalAssets > 0 ? (maintenanceAssets / totalAssets) * 100 : 0;

  // ==========================================================
  // LICENSE EXPIRATIONS
  // ==========================================================

  const licenseExpirations = softwareAssets
    .filter((asset) => {
      const expiryDate = asset.license?.expiryDate;

      if (!expiryDate) return false;

      const expiry = new Date(expiryDate);

      return expiry >= today && expiry <= ninetyDaysFromNow;
    })
    .sort((a, b) => {
      const aDate = new Date(a.license?.expiryDate || "").getTime();
      const bDate = new Date(b.license?.expiryDate || "").getTime();

      return aDate - bDate;
    });

  // ==========================================================
  // WARRANTY EXPIRATIONS
  // ==========================================================

  const warrantyExpirations = assets
    .filter((asset) => {
      if (!asset.warrantyExpiry) return false;

      const expiry = new Date(asset.warrantyExpiry);

      return expiry >= today && expiry <= ninetyDaysFromNow;
    })
    .sort((a, b) => {
      const aDate = new Date(a.warrantyExpiry || "").getTime();
      const bDate = new Date(b.warrantyExpiry || "").getTime();

      return aDate - bDate;
    });

  // ==========================================================
  // EXPIRY COUNTS
  // ==========================================================

  const licensesExpiring30Days = licenseExpirations.filter((asset) => {
    const expiryDate = asset.license?.expiryDate;

    if (!expiryDate) return false;

    const expiry = new Date(expiryDate);

    return expiry >= today && expiry <= thirtyDaysFromNow;
  }).length;

  const warrantiesExpiring30Days = warrantyExpirations.filter((asset) => {
    if (!asset.warrantyExpiry) return false;

    const expiry = new Date(asset.warrantyExpiry);

    return expiry >= today && expiry <= thirtyDaysFromNow;
  }).length;

  // ==========================================================
  // ASSET STATUS DISTRIBUTION
  // ==========================================================

  const statusOrder: AssetStatus[] = [
    "ASSIGNED",
    "AVAILABLE",
    "REPAIR",
    "RETIRED",
    "LOST",
    "DAMAGED",
    "DISPOSED",
  ];

  const assetDistribution = statusOrder
    .map((status) => ({
      status,
      count: assets.filter((asset) => asset.status === status).length,
    }))
    .filter((item) => item.count > 0);

  const totalForDistribution =
    assetDistribution.reduce((sum, item) => sum + item.count, 0) || 1;

  // ==========================================================
  // HARDWARE BREAKDOWN
  // ==========================================================

  const hardwareMap = new Map<string, number>();

  hardwareAssets.forEach((asset) => {
    const category = asset.category?.name || "Uncategorized";

    hardwareMap.set(category, (hardwareMap.get(category) || 0) + 1);
  });

  const hardwareBreakdown = Array.from(hardwareMap.entries())
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const maxHardware = Math.max(
    ...hardwareBreakdown.map((item) => item.count),
    1,
  );

  // ==========================================================
  // SOFTWARE BREAKDOWN
  // ==========================================================

  const softwareMap = new Map<string, number>();

  softwareAssets.forEach((asset) => {
    const category = asset.category?.name || "Uncategorized";

    softwareMap.set(category, (softwareMap.get(category) || 0) + 1);
  });

  const softwareBreakdown = Array.from(softwareMap.entries())
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const maxSoftware = Math.max(
    ...softwareBreakdown.map((item) => item.count),
    1,
  );

  // ==========================================================
  // EMPLOYEE ASSIGNMENT ANALYTICS
  // ==========================================================

  const employeeAssignmentMap = new Map<string, number>();

  assets
    .filter((asset) => asset.status === "ASSIGNED")
    .forEach((asset) => {
      const employee = asset.assignments?.find(
        (assignment) => assignment.status === "ACTIVE",
      )?.employee;

      const employeeName =
        employee
          ? getEmployeeName(employee as Employee)
          : "Unknown employee";

      employeeAssignmentMap.set(
        employeeName,
        (employeeAssignmentMap.get(employeeName) || 0) + 1,
      );
    });

  const employeeAssignments = Array.from(employeeAssignmentMap.entries())
    .map(([employee, count]) => ({
      employee,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxEmployeeAssignments = Math.max(
    ...employeeAssignments.map((item) => item.count),
    1,
  );

  // ==========================================================
  // RECENT ACTIVITY
  // ==========================================================

  const recentActivity = assets
    .flatMap((asset) =>
      (asset.history || []).map((history) => ({
        ...history,
        assetName: asset.name,
        assetTag: asset.assetTag,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  // ==========================================================
  // ACTIVITY SUMMARY
  // ==========================================================

  const totalHistoryEntries = assets.reduce(
    (total, asset) => total + (asset.history?.length || 0),
    0,
  );

  const assetsWithHistory = assets.filter(
    (asset) => (asset.history?.length || 0) > 0,
  ).length;

  // ==========================================================
  // OPERATIONAL ALERTS
  // ==========================================================

  const operationalAlerts = [
    {
      label: "Licenses expiring within 30 days",
      to: "/software",
      count: licensesExpiring30Days,
      tone: licensesExpiring30Days > 0 ? "danger" : "neutral",
    },
    {
      label: "Warranties expiring within 30 days",
      to: "/inventory",
      count: warrantiesExpiring30Days,
      tone: warrantiesExpiring30Days > 0 ? "warn" : "neutral",
    },
    {
      label: "Assets under repair",
      to: "/inventory?status=REPAIR",
      count: underRepair,
      tone: underRepair > 0 ? "warn" : "neutral",
    },
    {
      label: "Damaged assets",
      to: "/inventory?status=DAMAGED",
      count: damagedAssets,
      tone: damagedAssets > 0 ? "danger" : "neutral",
    },
    {
      label: "Lost assets",
      to: "/inventory?status=LOST",
      count: lostAssets,
      tone: lostAssets > 0 ? "danger" : "neutral",
    },
  ] as const;

  const attentionItems = operationalAlerts.filter((item) => item.count > 0);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <PageHeader
        title="Dashboard"
        description="An overview of your assets and what needs attention."
        actions={
          <Button onClick={() => setIsAddAssetOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Asset
          </Button>
        }
      />


      <HomeTasks onAddAsset={() => setIsAddAssetOpen(true)} />

      {/* ======================================================
          NEEDS ATTENTION
          Only items that actually need action; each opens the
          matching list.
      ====================================================== */}

      <Card className="p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Needs attention
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Select an item to see the assets or licenses involved.
          </p>
        </div>

        {attentionItems.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-success-muted px-3 py-3 text-sm text-success-strong">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Nothing needs attention right now.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {attentionItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className="flex items-center justify-between gap-3 px-3 py-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 truncate text-foreground">
                    {item.label}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone={item.tone}>{item.count}</Badge>

                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Assets"
          value={totalAssets}
          icon={Boxes}
          to="/inventory"
        />

        <StatCard
          label="Assigned"
          value={assignedAssets}
          icon={CheckCircle2}
          to="/inventory?status=ASSIGNED"
        />

        <StatCard
          label="Available"
          value={availableAssets}
          icon={PackageOpen}
          to="/inventory?status=AVAILABLE"
        />

        <StatCard
          label="Employees"
          value={employees.length}
          icon={Users}
          to="/employees"
        />

        <StatCard
          label="Hardware"
          value={hardwareAssets.length}
          icon={Laptop}
          to="/inventory?kind=HARDWARE"
        />

        <StatCard
          label="Software"
          value={softwareAssets.length}
          icon={AppWindow}
          to="/software"
        />

        <StatCard
          label="Under Repair"
          value={underRepair}
          icon={Wrench}
          tone="warn"
          to="/inventory?status=REPAIR"
        />

        <StatCard
          label="Expiring Licenses"
          value={licenseExpirations.length}
          icon={ShieldAlert}
          tone="danger"
          to="/software"
        />
      </div>

      {/* ======================================================
          ASSET STATUS ANALYTICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* STATUS DISTRIBUTION */}

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Asset Distribution
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Current status across all tracked assets.
              </p>
            </div>

            <Boxes className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mb-5 flex h-3 overflow-hidden rounded-full">
            {assetDistribution.map((item) => (
              <div
                key={item.status}
                className={STATUS_COLORS[item.status] || "bg-border"}
                style={{
                  width: `${(item.count / totalForDistribution) * 100}%`,
                }}
                title={`${formatStatus(item.status)}: ${item.count}`}
              />
            ))}
          </div>

          <div className="space-y-2.5">
            {assetDistribution.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      STATUS_COLORS[item.status] || "bg-border"
                    }`}
                  />

                  {formatStatus(item.status)}
                </span>

                <span className="font-medium tabular-nums text-foreground">
                  {item.count}
                </span>
              </div>
            ))}

            {assetDistribution.length === 0 && (
              <p className="text-sm text-muted-foreground">No assets yet.</p>
            )}
          </div>
        </Card>

        {/* ASSIGNMENT */}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Assignment Overview
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Coverage of assigned and available assets.
              </p>
            </div>

            <Users className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-2xl font-semibold text-foreground">
                {assignmentRate.toFixed(0)}%
              </span>

              <span className="text-xs text-muted-foreground">
                assignment rate
              </span>
            </div>

            <PercentageBar
              value={assignmentRate}
              label={`${assignedAssets} of ${totalAssets} assets assigned`}
            />
          </div>

          <div className="space-y-4">
            <PercentageBar
              value={availabilityRate}
              label={`${availableAssets} available assets`}
            />

            <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">Available assets</span>

              <span className="font-medium tabular-nums text-foreground">
                {availableAssets}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assigned assets</span>

              <span className="font-medium tabular-nums text-foreground">
                {assignedAssets}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total employees</span>

              <span className="font-medium tabular-nums text-foreground">
                {employees.length}
              </span>
            </div>
          </div>
        </Card>

        {/* MAINTENANCE */}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Maintenance
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Assets requiring operational attention.
              </p>
            </div>

            <Wrench className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-2xl font-semibold text-foreground">
                {maintenanceAssets}
              </span>

              <span className="text-xs text-muted-foreground">
                affected assets
              </span>
            </div>

            <PercentageBar
              value={maintenanceRate}
              label={`${maintenanceRate.toFixed(1)}% of total assets`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-warning" />
                Under repair
              </span>

              <span className="font-medium tabular-nums text-foreground">
                {underRepair}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Damaged
              </span>

              <span className="font-medium tabular-nums text-foreground">
                {damagedAssets}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Lost
              </span>

              <span className="font-medium tabular-nums text-foreground">
                {lostAssets}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Retired</span>

              <span className="font-medium tabular-nums text-foreground">
                {retiredAssets}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ======================================================
          CATEGORY ANALYTICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* HARDWARE */}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Hardware by Category
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Distribution of hardware assets.
              </p>
            </div>

            <Laptop className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {hardwareBreakdown.map((item) => (
              <BarRow
                key={item.category}
                label={item.category}
                count={item.count}
                max={maxHardware}
              />
            ))}

            {hardwareBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hardware assets yet.
              </p>
            )}
          </div>
        </Card>

        {/* SOFTWARE */}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Software by Category
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Distribution of software assets.
              </p>
            </div>

            <AppWindow className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {softwareBreakdown.map((item) => (
              <BarRow
                key={item.category}
                label={item.category}
                count={item.count}
                max={maxSoftware}
              />
            ))}

            {softwareBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No software assets yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ======================================================
          ASSIGNMENT ANALYTICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* EMPLOYEE ASSIGNMENTS */}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Asset Assignments
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Employees with assigned assets.
              </p>
            </div>

            <Users className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {employeeAssignments.map((item) => (
              <BarRow
                key={item.employee}
                label={item.employee}
                count={item.count}
                max={maxEmployeeAssignments}
              />
            ))}

            {employeeAssignments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No assigned assets yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ======================================================
          ACTIVITY SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Activity Records</p>

              <p className="mt-1 text-2xl font-semibold text-foreground">
                {totalHistoryEntries}
              </p>
            </div>

            <Clock3 className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Total asset history records currently available.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                Assets With Activity
              </p>

              <p className="mt-1 text-2xl font-semibold text-foreground">
                {assetsWithHistory}
              </p>
            </div>

            <Boxes className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Assets containing at least one recorded history entry.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Activity Coverage</p>

              <p className="mt-1 text-2xl font-semibold text-foreground">
                {totalAssets > 0
                  ? ((assetsWithHistory / totalAssets) * 100).toFixed(0)
                  : 0}
                %
              </p>
            </div>

            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Percentage of assets with recorded history.
          </p>
        </Card>
      </div>

      {/* ======================================================
          RECENT ACTIVITY / UPCOMING
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* RECENT ACTIVITY */}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent Activity
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Latest changes recorded against assets.
              </p>
            </div>

            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </div>

          <ul className="space-y-4">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {activity.action === "TRANSFERRED" ? (
                      <>
                        <b className="font-medium">{activity.assetName}</b>{" "}
                        transferred from {activity.fromValue} to{" "}
                        {activity.toValue}
                      </>
                    ) : activity.action === "ASSIGNED" ? (
                      <>
                        <b className="font-medium">{activity.assetName}</b>{" "}
                        assigned to {activity.toValue}
                      </>
                    ) : activity.action === "CREATED" ? (
                      <>
                        New asset added:{" "}
                        <b className="font-medium">{activity.assetName}</b>
                      </>
                    ) : activity.action === "STATUS_CHANGED" ? (
                      <>
                        <b className="font-medium">{activity.assetName}</b>{" "}
                        status changed to {activity.toValue}
                      </>
                    ) : (
                      <>
                        <b className="font-medium">{activity.assetName}</b>{" "}
                        {formatAction(activity.action)}
                      </>
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()} ·{" "}
                    {activity.performedBy}
                  </p>
                </div>
              </li>
            ))}

            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recent activity yet.
              </p>
            )}
          </ul>
        </Card>

        {/* UPCOMING */}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Upcoming
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Licenses and warranties expiring in the next 90 days.
              </p>
            </div>

            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* LICENSES */}

          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                License expirations
              </p>

              <span className="text-xs tabular-nums text-muted-foreground">
                {licenseExpirations.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {licenseExpirations.slice(0, 5).map((asset) => {
                const expiryDate = asset.license?.expiryDate;

                if (!expiryDate) return null;

                const daysLeft = getDaysUntil(expiryDate, today);

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{asset.name}</p>

                      {asset.assetTag && (
                        <p className="text-xs text-muted-foreground">
                          {asset.assetTag}
                        </p>
                      )}
                    </div>

                    <Badge tone={daysLeft <= 30 ? "danger" : "warn"}>
                      {daysLeft <= 0 ? "Today" : `${daysLeft}d`}
                    </Badge>
                  </div>
                );
              })}

              {licenseExpirations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing expiring soon.
                </p>
              )}
            </div>
          </div>

          {/* WARRANTIES */}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Warranty expirations
              </p>

              <span className="text-xs tabular-nums text-muted-foreground">
                {warrantyExpirations.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {warrantyExpirations.slice(0, 5).map((asset) => {
                const expiryDate = asset.warrantyExpiry;

                if (!expiryDate) return null;

                const daysLeft = getDaysUntil(expiryDate, today);

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{asset.name}</p>

                      {asset.assetTag && (
                        <p className="text-xs text-muted-foreground">
                          {asset.assetTag}
                        </p>
                      )}
                    </div>

                    <Badge tone={daysLeft <= 30 ? "danger" : "warn"}>
                      {daysLeft <= 0 ? "Today" : `${daysLeft}d`}
                    </Badge>
                  </div>
                );
              })}

              {warrantyExpirations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing expiring soon.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <QuickAddAsset
        open={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        onOpenFullForm={() => {
          setIsAddAssetOpen(false);
          setIsFullAssetOpen(true);
        }}
      />

      <CreateAssetModal
        open={isFullAssetOpen}
        onClose={() => setIsFullAssetOpen(false)}
        asset={null}
        locations={[]}
        vendors={[]}
      />
    </div>
  );
}
