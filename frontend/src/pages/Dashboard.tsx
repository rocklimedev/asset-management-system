import {
  Boxes,
  CheckCircle2,
  PackageOpen,
  Users,
  Laptop,
  AppWindow,
  Wrench,
  ShieldAlert,
} from "lucide-react";

import { useGetAssetsQuery } from "../services/api/asset.api";
import { useGetEmployeesQuery } from "../services/api/employees.api";

import { StatCard } from "../components/dashboard/StatCard";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

import type { Asset, AssetStatus } from "../services/api/asset.api";

import type { Employee } from "../services/api/employees.api";

// ============================================================
// STATUS COLORS
// ============================================================

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: "bg-brand-500",
  AVAILABLE: "bg-success-muted0",
  REPAIR: "bg-warning-muted0",
  RETIRED: "bg-muted-foreground",
  LOST: "bg-destructive-muted0",
  DAMAGED: "bg-destructive",
  DISPOSED: "bg-border",
};

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
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
        {label}
      </span>

      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{
            width: `${max ? (count / max) * 100 : 0}%`,
          }}
        />
      </div>

      <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getEmployeeName(employee?: Employee | null): string {
  if (!employee) return "Unknown employee";

  return (
    employee.name ||
    employee.employeeCode ||
    employee.email ||
    "Unknown employee"
  );
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  // ----------------------------------------------------------
  // ASSETS
  // ----------------------------------------------------------

  const {
    data: assetsData,
    isLoading: assetsLoading,
    isError: assetsError,
    refetch: refetchAssets,
  } = useGetAssetsQuery({
    page: 1,
    pageSize: 1000,
  });

  // ----------------------------------------------------------
  // EMPLOYEES
  // ----------------------------------------------------------

  const {
    data: employeesData,
    isLoading: employeesLoading,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useGetEmployeesQuery({
    page: 1,
  });

  // ----------------------------------------------------------
  // NORMALIZE ASSETS
  // ----------------------------------------------------------

  const assets: Asset[] = assetsData?.items || [];

  // ----------------------------------------------------------
  // NORMALIZE EMPLOYEES
  // ----------------------------------------------------------

  const employees: Employee[] = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.items || [];

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  const isLoading = assetsLoading || employeesLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // ERROR
  // ----------------------------------------------------------

  if (assetsError || employeesError) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive-border bg-destructive-muted px-4 py-3 text-sm text-destructive-strong">
          Couldn't load dashboard data.{" "}
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
  // ASSET COUNTS
  // ==========================================================

  const totalAssets = assets.length;

  const assignedAssets = assets.filter(
    (asset) => asset.status === "ASSIGNED",
  ).length;

  const unassignedAssets = assets.filter(
    (asset) => asset.status === "AVAILABLE",
  ).length;

  const hardwareAssets = assets.filter((asset) => asset.kind === "HARDWARE");

  const softwareAssets = assets.filter((asset) => asset.kind === "SOFTWARE");

  const underRepair = assets.filter(
    (asset) => asset.status === "REPAIR",
  ).length;

  // ==========================================================
  // EXPIRING LICENSES
  // ==========================================================

  const today = new Date();

  const licenseExpiryLimit = new Date();
  licenseExpiryLimit.setDate(today.getDate() + 90);

  const licenseExpirations = softwareAssets
    .filter((asset) => {
      const expiryDate = asset.license?.expiryDate;

      if (!expiryDate) return false;

      const expiry = new Date(expiryDate);

      return expiry >= today && expiry <= licenseExpiryLimit;
    })
    .sort((a, b) => {
      const aDate = new Date(a.license?.expiryDate || "").getTime();

      const bDate = new Date(b.license?.expiryDate || "").getTime();

      return aDate - bDate;
    })
    .slice(0, 5);

  // ==========================================================
  // WARRANTY EXPIRATIONS
  // ==========================================================

  const warrantyExpiryLimit = new Date();
  warrantyExpiryLimit.setDate(today.getDate() + 90);

  const warrantyExpirations = assets
    .filter((asset) => {
      if (!asset.warrantyExpiry) return false;

      const expiry = new Date(asset.warrantyExpiry);

      return expiry >= today && expiry <= warrantyExpiryLimit;
    })
    .sort((a, b) => {
      const aDate = new Date(a.warrantyExpiry || "").getTime();

      const bDate = new Date(b.warrantyExpiry || "").getTime();

      return aDate - bDate;
    })
    .slice(0, 5);

  // ==========================================================
  // ASSET DISTRIBUTION
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

  const maxHw = Math.max(...hardwareBreakdown.map((item) => item.count), 1);

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

  const maxSw = Math.max(...softwareBreakdown.map((item) => item.count), 1);

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
    .slice(0, 8);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* HEADER */}

      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>

        <p className="text-sm text-muted-foreground">
          Overview of your IT environment.
        </p>
      </div>

      {/* ======================================================
          STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Assets" value={totalAssets} icon={Boxes} />

        <StatCard label="Assigned" value={assignedAssets} icon={CheckCircle2} />

        <StatCard
          label="Unassigned"
          value={unassignedAssets}
          icon={PackageOpen}
        />

        <StatCard label="Employees" value={employees.length} icon={Users} />

        <StatCard
          label="Hardware"
          value={hardwareAssets.length}
          icon={Laptop}
        />

        <StatCard
          label="Software"
          value={softwareAssets.length}
          icon={AppWindow}
        />

        <StatCard
          label="Under Repair"
          value={underRepair}
          icon={Wrench}
          tone="warn"
        />

        <StatCard
          label="Expiring Licenses"
          value={licenseExpirations.length}
          icon={ShieldAlert}
          tone="danger"
        />
      </div>

      {/* ======================================================
          DISTRIBUTION / BREAKDOWN
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ASSET DISTRIBUTION */}

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Asset Distribution
          </h2>

          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {assetDistribution.map((item) => (
              <div
                key={item.status}
                className={STATUS_COLORS[item.status] || "bg-border"}
                style={{
                  width: `${(item.count / totalForDistribution) * 100}%`,
                }}
                title={`${item.status}: ${item.count}`}
              />
            ))}
          </div>

          <div className="space-y-2">
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

        {/* HARDWARE */}

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Hardware Breakdown
          </h2>

          <div className="space-y-2.5">
            {hardwareBreakdown.map((item) => (
              <BarRow
                key={item.category}
                label={item.category}
                count={item.count}
                max={maxHw}
              />
            ))}

            {hardwareBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">No hardware assets yet.</p>
            )}
          </div>
        </Card>

        {/* SOFTWARE */}

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Software Breakdown
          </h2>

          <div className="space-y-2.5">
            {softwareBreakdown.map((item) => (
              <BarRow
                key={item.category}
                label={item.category}
                count={item.count}
                max={maxSw}
              />
            ))}

            {softwareBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">No software assets yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* ======================================================
          ACTIVITY / UPCOMING
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* RECENT ACTIVITY */}

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Recent Activity
          </h2>

          <ul className="space-y-3">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />

                <div className="min-w-0">
                  <p className="text-foreground">
                    {activity.action === "TRANSFERRED" ? (
                      <>
                        <b className="font-medium">{activity.assetName}</b>{" "}
                        transferred from {activity.fromValue || "unassigned"} to{" "}
                        {activity.toValue || "unassigned"}
                      </>
                    ) : activity.action === "ASSIGNED" ? (
                      <>
                        <b className="font-medium">{activity.assetName}</b>{" "}
                        assigned to {activity.toValue || "employee"}
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
                        {activity.action.toLowerCase().replace(/_/g, " ")}
                      </>
                    )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()} ·{" "}
                    {activity.performedBy}
                  </p>
                </div>
              </li>
            ))}

            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            )}
          </ul>
        </Card>

        {/* UPCOMING */}

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Upcoming
          </h2>

          {/* LICENSE */}

          <div className="mb-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              License expirations
            </p>

            <div className="space-y-2">
              {licenseExpirations.map((asset) => {
                const expiryDate = asset.license?.expiryDate;

                if (!expiryDate) return null;

                const daysLeft = Math.ceil(
                  (new Date(expiryDate).getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24),
                );

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-foreground">
                      {asset.name}
                    </span>

                    <Badge tone={daysLeft <= 30 ? "danger" : "warn"}>
                      {new Date(expiryDate).toLocaleDateString()}
                    </Badge>
                  </div>
                );
              })}

              {licenseExpirations.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing expiring soon.</p>
              )}
            </div>
          </div>

          {/* WARRANTY */}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Warranty expirations
            </p>

            <div className="space-y-2">
              {warrantyExpirations.map((asset) => {
                const expiryDate = asset.warrantyExpiry;

                if (!expiryDate) return null;

                const daysLeft = Math.ceil(
                  (new Date(expiryDate).getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24),
                );

                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-foreground">
                      {asset.name}

                      {asset.assetTag && (
                        <span className="text-muted-foreground tabular-nums">
                          {" "}
                          ({asset.assetTag})
                        </span>
                      )}
                    </span>

                    <Badge tone={daysLeft <= 30 ? "danger" : "warn"}>
                      {new Date(expiryDate).toLocaleDateString()}
                    </Badge>
                  </div>
                );
              })}

              {warrantyExpirations.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing expiring soon.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
