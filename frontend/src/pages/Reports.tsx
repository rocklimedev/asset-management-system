import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Filter,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";

import {
  useGetAssetReportQuery,
  useGetInventoryReportQuery,
  useGetAssignedReportQuery,
  useGetDamagedReportQuery,
  useGetReportByStatusQuery,
  type ReportFilters,
} from "../services/api/reports.api";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

type ReportTab = "assets" | "inventory" | "assigned" | "damaged" | "status";

interface FilterState {
  organisationId: string;
  kind: string;
  categoryId: string;

  from: string;
  to: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const EMPTY_FILTERS: FilterState = {
  organisationId: "",
  kind: "",
  categoryId: "",

  from: "",
  to: "",
};

const TABS = [
  {
    value: "assets" as const,
    label: "Assets",
    icon: Boxes,
  },
  {
    value: "inventory" as const,
    label: "Inventory",
    icon: PackageCheck,
  },
  {
    value: "assigned" as const,
    label: "Assigned",
    icon: Users,
  },
  {
    value: "damaged" as const,
    label: "Damaged & Repair",
    icon: Wrench,
  },
  {
    value: "status" as const,
    label: "By Status",
    icon: ClipboardList,
  },
];

// ============================================================
// HELPERS
// ============================================================

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN").format(Number(value ?? 0));
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusTone(
  status: string,
): "brand" | "ok" | "warn" | "danger" | "neutral" | "info" {
  const normalized = status.toUpperCase();

  if (
    normalized.includes("ACTIVE") ||
    normalized.includes("AVAILABLE") ||
    normalized.includes("GOOD")
  ) {
    return "ok";
  }

  if (normalized.includes("ASSIGNED") || normalized.includes("ISSUED")) {
    return "brand";
  }

  if (
    normalized.includes("REPAIR") ||
    normalized.includes("PENDING") ||
    normalized.includes("MAINTENANCE")
  ) {
    return "warn";
  }

  if (
    normalized.includes("DAMAGED") ||
    normalized.includes("RETIRED") ||
    normalized.includes("LOST") ||
    normalized.includes("DISPOSED")
  ) {
    return "danger";
  }

  return "neutral";
}

// ============================================================
// SMALL COMPONENTS
// ============================================================

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "ok" | "warn" | "danger" | "info";
  description?: string;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  description,
}: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tone === "brand" && "bg-primary/10 text-primary",
            tone === "ok" && "bg-success-muted text-success-strong",
            tone === "warn" && "bg-warning-muted text-warning-strong",
            tone === "danger" && "bg-destructive-muted text-destructive-strong",
            tone === "info" && "bg-info-muted text-info-strong",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading report...
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-card p-6 text-center">
      <ShieldAlert className="h-8 w-8 text-destructive" />

      <h3 className="mt-3 text-sm font-semibold text-foreground">
        Failed to load report
      </h3>

      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Something went wrong while loading the report. Please try again.
      </p>

      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw />
          Retry
        </Button>
      )}
    </div>
  );
}

function EmptyState({
  title = "No records found",
  description = "No records match the selected filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
      <Search className="h-8 w-8 text-muted-foreground" />

      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>

      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================================
// FILTER BAR
// ============================================================

interface ReportFiltersProps {
  filters: FilterState;
  onChange: (key: keyof FilterState, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  isLoading: boolean;
}

function ReportFiltersBar({
  filters,
  onChange,
  onApply,
  onReset,
  isLoading,
}: ReportFiltersProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />

            <h2 className="text-[15px] font-semibold text-foreground">
              Report Filters
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Narrow the report using organisation, asset and date filters.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isLoading}
        >
          <RotateCcw />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-2">
          <Label htmlFor="organisationId">Organisation ID</Label>

          <Input
            id="organisationId"
            value={filters.organisationId}
            onChange={(event) => onChange("organisationId", event.target.value)}
            placeholder="Organisation UUID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kind">Asset Kind</Label>

          <Input
            id="kind"
            value={filters.kind}
            onChange={(event) => onChange("kind", event.target.value)}
            placeholder="e.g. LAPTOP"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">Category ID</Label>

          <Input
            id="categoryId"
            value={filters.categoryId}
            onChange={(event) => onChange("categoryId", event.target.value)}
            placeholder="Category UUID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="from">From</Label>

          <Input
            id="from"
            type="date"
            value={filters.from}
            onChange={(event) => onChange("from", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="to">To</Label>

          <Input
            id="to"
            type="date"
            value={filters.to}
            onChange={(event) => onChange("to", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onApply} disabled={isLoading}>
          {isLoading ? <RefreshCw className="animate-spin" /> : <Search />}
          Apply Filters
        </Button>
      </div>
    </section>
  );
}

// ============================================================
// ASSET REPORT
// ============================================================

function AssetReportView({ filters }: { filters: ReportFilters }) {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetAssetReportQuery(filters);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const items = data?.items ?? [];

  if (!items.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Assets"
          value={formatNumber(data?.totalAssets)}
          icon={Boxes}
          tone="brand"
        />

        <SummaryCard
          label="Total Value"
          value={formatCurrency(data?.totalValue)}
          icon={ClipboardList}
          tone="ok"
        />

        <SummaryCard
          label="Asset Types"
          value={formatNumber(Object.keys(data?.byKind ?? {}).length)}
          icon={PackageCheck}
          tone="info"
        />
      </div>

      <ReportTable
        loading={isFetching}
        title="Asset Register"
        description={`${formatNumber(items.length)} asset records returned.`}
      >
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Category</TableHead>

            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell>{asset.name ?? "—"}</TableCell>

              <TableCell>{asset.kind ?? "—"}</TableCell>

              <TableCell>{asset.category?.name ?? "—"}</TableCell>

              <TableCell>
                {asset.status ? (
                  <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ReportTable>
    </div>
  );
}

// ============================================================
// INVENTORY REPORT
// ============================================================

function InventoryReportView({ filters }: { filters: ReportFilters }) {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetInventoryReportQuery(filters);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const items = data?.items ?? [];

  if (!items.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          label="SKUs"
          value={formatNumber(data?.totalSkus)}
          icon={Boxes}
        />

        <SummaryCard
          label="Total Quantity"
          value={formatNumber(data?.totalQuantity)}
          icon={PackageCheck}
          tone="info"
        />

        <SummaryCard
          label="Assigned"
          value={formatNumber(data?.totalAssigned)}
          icon={Users}
          tone="brand"
        />

        <SummaryCard
          label="Available"
          value={formatNumber(data?.totalAvailable)}
          icon={CheckCircle2}
          tone="ok"
        />

        <SummaryCard
          label="Low Stock"
          value={formatNumber(data?.lowStockCount)}
          icon={AlertTriangle}
          tone="warn"
        />
      </div>

      <ReportTable
        loading={isFetching}
        title="Inventory Levels"
        description="Current quantity, assigned quantity and available stock."
      >
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Assigned</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name ?? "—"}</TableCell>

              <TableCell>{item.category ?? "—"}</TableCell>

              <TableCell className="text-right">
                {formatNumber(item.quantity)}
              </TableCell>

              <TableCell className="text-right">
                {formatNumber(item.quantityAssigned)}
              </TableCell>

              <TableCell className="text-right font-medium">
                {formatNumber(item.quantityAvailable)}
              </TableCell>

              <TableCell>
                {item.belowReorderLevel ? (
                  <Badge tone="warn">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Low stock
                  </Badge>
                ) : (
                  <Badge tone="ok">Healthy</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ReportTable>
    </div>
  );
}

// ============================================================
// ASSIGNED REPORT
// ============================================================

function AssignedReportView({ filters }: { filters: ReportFilters }) {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetAssignedReportQuery(filters);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const items = data?.items ?? [];

  if (!items.length) {
    return (
      <EmptyState
        title="No assigned assets"
        description="No currently assigned assets match the selected filters."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SummaryCard
        label="Currently Assigned"
        value={formatNumber(data?.totalAssigned)}
        icon={Users}
        tone="brand"
        description="Active asset assignments"
      />

      <ReportTable
        loading={isFetching}
        title="Assigned Assets"
        description="Assets currently assigned to employees."
      >
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Assigned At</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name ?? "—"}</TableCell>

              <TableCell>{item.category ?? "—"}</TableCell>

              <TableCell>{item.assignedTo ?? "—"}</TableCell>

              <TableCell className="text-muted-foreground">
                {formatDate(item.assignedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ReportTable>
    </div>
  );
}

// ============================================================
// DAMAGED REPORT
// ============================================================

function DamagedReportView({ filters }: { filters: ReportFilters }) {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetDamagedReportQuery(filters);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const items = data?.items ?? [];

  if (!items.length) {
    return (
      <EmptyState
        title="No damaged assets"
        description="No damaged, repair or poor-condition assets match the selected filters."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SummaryCard
        label="Damaged / Repair"
        value={formatNumber(data?.totalDamaged)}
        icon={Wrench}
        tone="danger"
        description="Assets requiring attention"
      />

      <ReportTable
        loading={isFetching}
        title="Damaged & Repair Register"
        description="Assets marked as damaged, under repair or poor condition."
      >
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Condition</TableHead>

            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name ?? "—"}</TableCell>

              <TableCell>
                {item.status ? (
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>

              <TableCell>
                {item.condition ? (
                  <Badge tone={statusTone(item.condition)}>
                    {item.condition}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>

              <TableCell className="max-w-[300px] truncate text-muted-foreground">
                {item.notes ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ReportTable>
    </div>
  );
}

// ============================================================
// STATUS REPORT
// ============================================================

function StatusReportView({ filters }: { filters: ReportFilters }) {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetReportByStatusQuery(filters);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const breakdown = data?.breakdown ?? [];

  if (!breakdown.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <SummaryCard
        label="Total Assets"
        value={formatNumber(data?.total)}
        icon={ClipboardList}
        tone="brand"
        description="Across all asset statuses"
      />

      <ReportTable
        loading={isFetching}
        title="Asset Status Breakdown"
        description="Current count of assets grouped by status."
      >
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Count</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {breakdown.map((item) => {
            const percentage =
              data?.total && data.total > 0
                ? (item.count / data.total) * 100
                : 0;

            return (
              <TableRow key={item.status}>
                <TableCell>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </TableCell>

                <TableCell className="text-right font-medium">
                  {formatNumber(item.count)}
                </TableCell>

                <TableCell className="text-right text-muted-foreground">
                  {percentage.toFixed(1)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </ReportTable>
    </div>
  );
}

// ============================================================
// TABLE WRAPPER
// ============================================================

function ReportTable({
  title,
  description,
  loading,
  children,
}: {
  title: string;
  description: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {loading && (
        <div className="absolute right-4 top-4 z-10">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}

      <header className="border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>

        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </header>

      <div className="overflow-x-auto">
        <Table>{children}</Table>
      </div>
    </section>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>("assets");

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({});

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    const nextFilters: ReportFilters = {};

    if (filters.organisationId.trim()) {
      nextFilters.organisationId = filters.organisationId.trim();
    }

    if (filters.kind.trim()) {
      nextFilters.kind = filters.kind.trim();
    }

    if (filters.categoryId.trim()) {
      nextFilters.categoryId = filters.categoryId.trim();
    }

    if (filters.from) {
      nextFilters.from = filters.from;
    }

    if (filters.to) {
      nextFilters.to = filters.to;
    }

    setAppliedFilters(nextFilters);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters({});
  };

  const activeLabel =
    TABS.find((tab) => tab.value === activeTab)?.label ?? "Reports";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Reports
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Asset, inventory, assignment, damage and status reports from live
          system data.
        </p>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <ReportFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        isLoading={false}
      />

      {/* ======================================================
          REPORT TABS
      ====================================================== */}

      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ReportTab)}
        className="space-y-5"
      >
        <Tabs.List className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;

            return (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {/* ====================================================
            ASSETS
        ==================================================== */}

        <Tabs.Content value="assets" className="outline-none">
          <AssetReportView filters={appliedFilters} />
        </Tabs.Content>

        {/* ====================================================
            INVENTORY
        ==================================================== */}

        <Tabs.Content value="inventory" className="outline-none">
          <InventoryReportView filters={appliedFilters} />
        </Tabs.Content>

        {/* ====================================================
            ASSIGNED
        ==================================================== */}

        <Tabs.Content value="assigned" className="outline-none">
          <AssignedReportView filters={appliedFilters} />
        </Tabs.Content>

        {/* ====================================================
            DAMAGED
        ==================================================== */}

        <Tabs.Content value="damaged" className="outline-none">
          <DamagedReportView filters={appliedFilters} />
        </Tabs.Content>

        {/* ====================================================
            STATUS
        ==================================================== */}

        <Tabs.Content value="status" className="outline-none">
          <StatusReportView filters={appliedFilters} />
        </Tabs.Content>
      </Tabs.Root>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Showing live {activeLabel.toLowerCase()} data from the reports API.
        </p>

        <Button variant="ghost" size="sm" onClick={handleApplyFilters}>
          <RefreshCw />
          Refresh
        </Button>
      </div>
    </div>
  );
}
