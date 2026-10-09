import { Fragment, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Boxes,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Monitor,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";

import {
  downloadReport,
  useGetAssetReportQuery,
  useGetInventoryReportQuery,
  useGetAssignedReportQuery,
  useGetDamagedReportQuery,
  useGetReportByStatusQuery,
  useGetSystemsReportQuery,
  type ReportFilters,
  type ReportType,
} from "../services/api/reports.api";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

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

type ReportTab =
  | "assets"
  | "inventory"
  | "assigned"
  | "damaged"
  | "status"
  | "systems";

interface FilterState {
  organisationId: string;
  kind: string;
  categoryId: string;
  locationId: string;
  from: string;
  to: string;
}

/**
 * Unassigned inventory response (GET reports/inventory).
 * Only items that are NOT assigned are returned, grouped by category.
 */
interface InventoryRowData {
  asset: string;
  unitCode: string;
  serialNumber: string;
  quantity: number;
}

interface InventoryCategoryData {
  name: string;
  total: number;
  rows: InventoryRowData[];
}

interface InventoryReportData {
  generatedAt: string;
  totalUnassigned: number;
  totalCategories: number;
  categories: InventoryCategoryData[];
}

/**
 * System IT data response (GET reports/systems).
 * `fields` = specs, `assignedItems` = items assigned to the system.
 */
interface SystemFieldData {
  label: string;
  value: string;
}

interface SystemAssignedItemData {
  category: string;
  name: string;
}

interface SystemItemData {
  id: string;
  company: string;
  nameLabel: string;
  name: string;
  holder: string;
  fields: SystemFieldData[];
  assignedItems: SystemAssignedItemData[];
}

interface SystemsReportData {
  generatedAt: string;
  totalSystems: number;
  byCompany: Record<string, number>;
  items: SystemItemData[];
}

// ============================================================
// CONSTANTS
// ============================================================

const EMPTY_FILTERS: FilterState = {
  organisationId: "",
  kind: "",
  categoryId: "",
  locationId: "",
  from: "",
  to: "",
};

const TABS = [
  {
    value: "assets" as const,
    label: "Assets",
    icon: Boxes,
    reportType: "assets" as ReportType,
  },
  {
    value: "inventory" as const,
    label: "Inventory",
    icon: PackageCheck,
    reportType: "inventory" as ReportType,
  },
  {
    value: "assigned" as const,
    label: "Assigned",
    icon: Users,
    reportType: "assigned" as ReportType,
  },
  {
    value: "damaged" as const,
    label: "Damaged & Repair",
    icon: Wrench,
    reportType: "damaged" as ReportType,
  },
  {
    value: "status" as const,
    label: "By Status",
    icon: ClipboardList,
    reportType: "by-status" as ReportType,
  },
  {
    value: "systems" as const,
    label: "Systems",
    icon: Monitor,
    reportType: "systems" as ReportType,
  },
];

// ============================================================
// HELPERS
// ============================================================

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN").format(Number(value ?? 0));
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
    normalized.includes("GOOD") ||
    normalized.includes("HEALTHY")
  ) {
    return "ok";
  }

  if (normalized.includes("ASSIGNED") || normalized.includes("ISSUED")) {
    return "brand";
  }

  if (
    normalized.includes("REPAIR") ||
    normalized.includes("PENDING") ||
    normalized.includes("MAINTENANCE") ||
    normalized.includes("LOW")
  ) {
    return "warn";
  }

  if (
    normalized.includes("DAMAGED") ||
    normalized.includes("RETIRED") ||
    normalized.includes("LOST") ||
    normalized.includes("DISPOSED") ||
    normalized.includes("REJECTED")
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
            Narrow reports using organisation, asset, location and date filters.
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
          <Label htmlFor="locationId">Location ID</Label>

          <Input
            id="locationId"
            value={filters.locationId}
            onChange={(event) => onChange("locationId", event.target.value)}
            placeholder="Location UUID"
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
// REPORT ACTIONS
// ============================================================

interface ReportActionsProps {
  reportType: ReportType;
  filters: ReportFilters;
}

function ReportActions({ reportType, filters }: ReportActionsProps) {
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  const [error, setError] = useState("");

  const handleDownload = async (format: "pdf" | "excel") => {
    try {
      setError("");
      setDownloading(format);

      await downloadReport(reportType, format, filters);
    } catch (downloadError) {
      console.error(downloadError);

      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download report.",
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}

      <Button
        variant="outline"
        size="sm"
        disabled={downloading !== null}
        onClick={() => handleDownload("pdf")}
      >
        {downloading === "pdf" ? (
          <RefreshCw className="animate-spin" />
        ) : (
          <FileText />
        )}
        PDF
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={downloading !== null}
        onClick={() => handleDownload("excel")}
      >
        {downloading === "excel" ? (
          <RefreshCw className="animate-spin" />
        ) : (
          <FileSpreadsheet />
        )}
        Excel
      </Button>
    </div>
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
            <TableHead>Condition</TableHead>
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

              <TableCell>
                {asset.condition ? (
                  <Badge tone={statusTone(asset.condition)}>
                    {asset.condition}
                  </Badge>
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
// INVENTORY REPORT (unassigned only, by category)
// ============================================================

function InventoryReportView({ filters }: { filters: ReportFilters }) {
  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetInventoryReportQuery(filters);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const data = response as InventoryReportData | undefined;
  const categories = data?.categories ?? [];

  if (!categories.length) {
    return (
      <EmptyState
        title="No unassigned assets"
        description="Every asset matching the selected filters is currently assigned."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Unassigned Items"
          value={formatNumber(data?.totalUnassigned)}
          icon={PackageCheck}
          tone="ok"
          description="Available units and free stock"
        />

        <SummaryCard
          label="Categories"
          value={formatNumber(data?.totalCategories)}
          icon={ClipboardList}
          tone="info"
        />
      </div>

      <ReportTable
        loading={isFetching}
        title="Unassigned by Category"
        description="Number of unassigned items in each category."
      >
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Unassigned</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.name}>
              <TableCell>{category.name}</TableCell>

              <TableCell className="text-right font-medium">
                {formatNumber(category.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </ReportTable>

      <ReportTable
        loading={false}
        title="Unassigned Items"
        description="Exactly what is not assigned, grouped by category."
      >
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Unit Code</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {categories.map((category) => (
            <Fragment key={category.name}>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableCell
                  colSpan={3}
                  className="font-semibold text-foreground"
                >
                  {category.name}
                </TableCell>

                <TableCell className="text-right font-semibold">
                  {formatNumber(category.total)}
                </TableCell>
              </TableRow>

              {category.rows.map((row, index) => (
                <TableRow key={`${category.name}-${index}`}>
                  <TableCell>{row.asset || "—"}</TableCell>

                  <TableCell className="text-muted-foreground">
                    {row.unitCode || "—"}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {row.serialNumber || "—"}
                  </TableCell>

                  <TableCell className="text-right">
                    {formatNumber(row.quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
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
            <TableHead>Location</TableHead>
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

              <TableCell>{item.location ?? "—"}</TableCell>

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
// SYSTEMS REPORT (System IT Data)
//
// Same cards as the exported PDF / Excel: company marker on top,
// then PC name, holder name and specs, followed by a separate
// "Assigned Items" section listing what is assigned to the system.
// ============================================================

function SystemsReportView({ filters }: { filters: ReportFilters }) {
  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetSystemsReportQuery(filters);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  const data = response as SystemsReportData | undefined;
  const items = data?.items ?? [];

  if (!items.length) {
    return (
      <EmptyState
        title="No systems found"
        description="No systems match the selected organisation filter."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Total Systems"
          value={formatNumber(data?.totalSystems)}
          icon={Monitor}
          tone="brand"
          description="Only the organisation filter applies"
        />

        {Object.entries(data?.byCompany ?? {}).map(([company, count]) => (
          <SummaryCard
            key={company}
            label={company}
            value={formatNumber(count)}
            icon={Users}
            tone="info"
          />
        ))}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
          isFetching && "opacity-70",
        )}
      >
        {items.map((item) => {
          const specRows = [
            { label: item.nameLabel, value: item.name, bold: true },
            { label: "HOLDER NAME", value: item.holder, bold: true },
            ...item.fields.map((field) => ({ ...field, bold: false })),
          ];

          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              <header className="bg-primary px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground">
                {item.company}
              </header>

              <dl className="divide-y divide-border text-sm">
                {specRows.map((row, index) => (
                  <div
                    key={`${row.label}-${index}`}
                    className="grid grid-cols-[2fr_3fr] items-center gap-3 px-4 py-2"
                  >
                    <dt
                      className={cn(
                        "text-muted-foreground",
                        row.bold && "font-semibold text-foreground",
                      )}
                    >
                      {row.label}
                    </dt>

                    <dd
                      className={cn(
                        "break-words text-foreground",
                        row.bold && "font-semibold",
                      )}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {item.assignedItems.length > 0 && (
                <section>
                  <h3 className="bg-success-muted px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-success-strong">
                    Assigned Items
                  </h3>

                  <dl className="divide-y divide-border text-sm">
                    {item.assignedItems.map((entry, index) => (
                      <div
                        key={`${entry.category}-${index}`}
                        className="grid grid-cols-[2fr_3fr] items-center gap-3 px-4 py-2"
                      >
                        <dt className="text-muted-foreground">
                          {entry.category}
                        </dt>

                        <dd className="break-words text-foreground">
                          {entry.name}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </article>
          );
        })}
      </div>
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

  const [refreshKey, setRefreshKey] = useState(0);

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

    if (filters.locationId.trim()) {
      nextFilters.locationId = filters.locationId.trim();
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

  const handleRefresh = () => {
    setRefreshKey((previous) => previous + 1);
  };

  const activeTabConfig = TABS.find((tab) => tab.value === activeTab);

  const activeLabel = activeTabConfig?.label ?? "Reports";

  const activeReportType = activeTabConfig?.reportType ?? "assets";

  return (
    <div
      key={refreshKey}
      className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Reports
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Asset, inventory, assignment, damage, status and system IT data
            reports from live system data.
          </p>
        </div>

        <ReportActions reportType={activeReportType} filters={appliedFilters} />
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
            INVENTORY (unassigned only)
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

        {/* ====================================================
            SYSTEMS (IT DATA)
        ==================================================== */}

        <Tabs.Content value="systems" className="outline-none">
          <SystemsReportView filters={appliedFilters} />
        </Tabs.Content>
      </Tabs.Root>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing live {activeLabel.toLowerCase()} data from the reports API.
        </p>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw />
            Refresh
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              downloadReport(activeReportType, "pdf", appliedFilters)
            }
          >
            <Download />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
