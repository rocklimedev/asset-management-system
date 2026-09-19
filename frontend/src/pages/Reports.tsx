import { useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  Download,
  FileSpreadsheet,
  Gauge,
  IndianRupee,
  Printer,
  Wrench,
} from "lucide-react";

import { StatCard } from "../components/dashboard/StatCard";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
import {
  ChartFrame,
  ChartLegend,
  ChartTooltip,
} from "../components/reports/ChartFrame";
import { toast } from "../components/ui/toast";
import { cn } from "@/lib/utils";

import {
  AGEING_BUCKETS,
  AUDIT_TRAIL,
  CATEGORY_BREAKDOWN,
  DEPARTMENT_ALLOCATION,
  DEPARTMENT_OPTIONS,
  DEPRECIATION_TREND,
  KPI_SUMMARY,
  LICENCE_RENEWALS,
  RANGE_LABELS,
  UTILISATION_TREND,
  daysUntil,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  type AuditAction,
  type ReportRange,
} from "../services/mock/reports.mock";

// ============================================================
// CONSTANTS
// ============================================================

const CHART = {
  1: "hsl(var(--chart-1))",
  2: "hsl(var(--chart-2))",
  3: "hsl(var(--chart-3))",
  4: "hsl(var(--chart-4))",
  5: "hsl(var(--chart-5))",
  6: "hsl(var(--chart-6))",
  grid: "hsl(var(--chart-grid))",
  axis: "hsl(var(--chart-axis))",
} as const;

const AXIS_PROPS = {
  stroke: CHART.axis,
  tickLine: false,
  axisLine: false,
  fontSize: 11,
} as const;

const ACTION_TONE: Record<
  AuditAction,
  "brand" | "ok" | "warn" | "danger" | "neutral" | "info"
> = {
  CREATED: "info",
  ASSIGNED: "ok",
  TRANSFERRED: "brand",
  RETURNED: "neutral",
  REPAIR: "warn",
  RETIRED: "danger",
};

const ACTION_LABEL: Record<AuditAction, string> = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  TRANSFERRED: "Transferred",
  RETURNED: "Returned",
  REPAIR: "In repair",
  RETIRED: "Retired",
};

const TABS = [
  { value: "utilisation", label: "Utilisation" },
  { value: "allocation", label: "Allocation" },
  { value: "lifecycle", label: "Lifecycle" },
  { value: "value", label: "Value" },
  { value: "audit", label: "Audit trail" },
];

// ============================================================
// PAGE
// ============================================================

export default function Reports() {
  const [range, setRange] = useState<ReportRange>("6m");
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]);
  const [action, setAction] = useState<"ALL" | AuditAction>("ALL");

  const kpi = KPI_SUMMARY[range];
  const trend = UTILISATION_TREND[range];

  // ==========================================================
  // FILTERS
  // These narrow the mock data the same way the API filters
  // will once this page is wired up.
  // ==========================================================

  const allocation = useMemo(
    () =>
      department === DEPARTMENT_OPTIONS[0]
        ? DEPARTMENT_ALLOCATION
        : DEPARTMENT_ALLOCATION.filter(
            (item) => item.department === department,
          ),
    [department],
  );

  const auditRows = useMemo(
    () =>
      action === "ALL"
        ? AUDIT_TRAIL
        : AUDIT_TRAIL.filter((entry) => entry.action === action),
    [action],
  );

  const totalAllocated = allocation.reduce(
    (sum, item) => sum + item.hardware + item.software,
    0,
  );

  // ==========================================================
  // EXPORT STUBS
  // Replace with the real export endpoints when available.
  // ==========================================================

  const handleExport = (format: "CSV" | "XLSX" | "PDF") => {
    toast.add({
      type: "info",
      title: `${format} export queued`,
      description: `${RANGE_LABELS[range]} · ${department}. Hook this up to the reporting endpoint.`,
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Reports
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Utilisation, allocation, lifecycle and value across the asset
            estate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={range}
            onValueChange={(value) => setRange(value as ReportRange)}
          >
            <SelectTrigger className="w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {(Object.keys(RANGE_LABELS) as ReportRange[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {RANGE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[12rem]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {DEPARTMENT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleExport("CSV")}>
              <Download />
              CSV
            </Button>

            <Button variant="outline" onClick={() => handleExport("XLSX")}>
              <FileSpreadsheet />
              Excel
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Print report"
              onClick={() => handleExport("PDF")}
            >
              <Printer />
            </Button>
          </div>
        </div>
      </div>

      {/* ======================================================
          KPI ROW
      ====================================================== */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total assets"
          value={formatNumber(kpi.totalAssets)}
          icon={Boxes}
          tone="brand"
          delta={kpi.deltaTotalAssets}
          hint={RANGE_LABELS[range]}
        />

        <StatCard
          label="Utilisation"
          value={`${kpi.utilisationRate}%`}
          icon={Gauge}
          tone="ok"
          delta={kpi.deltaUtilisation}
          hint={`${formatNumber(kpi.assignedAssets)} assigned`}
        />

        <StatCard
          label="Unassigned"
          value={formatNumber(kpi.unassignedAssets)}
          icon={Boxes}
          tone="info"
          hint="Available in pool"
        />

        <StatCard
          label="Under repair"
          value={formatNumber(kpi.underRepair)}
          icon={Wrench}
          tone="warn"
          hint={`${kpi.retiredThisPeriod} retired this period`}
        />

        <StatCard
          label="Book value"
          value={formatCurrency(kpi.bookValue, true)}
          icon={IndianRupee}
          tone="danger"
          delta={kpi.deltaBookValue}
          hint="Net of depreciation"
        />
      </div>

      {/* ======================================================
          TABS
      ====================================================== */}

      <Tabs.Root defaultValue="utilisation" className="space-y-4">
        <Tabs.List className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              )}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* ==================================================
            UTILISATION
        ================================================== */}

        <Tabs.Content value="utilisation" className="space-y-4 outline-none">
          <ChartFrame
            title="Assigned vs. available"
            description={`Asset state across ${RANGE_LABELS[range].toLowerCase()}, with utilisation overlaid.`}
            height={320}
            actions={
              <ChartLegend
                items={[
                  { label: "Assigned", color: CHART[1] },
                  { label: "Available", color: CHART[2] },
                  { label: "In repair", color: CHART[3] },
                  { label: "Utilisation %", color: CHART[4] },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trend}
                margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke={CHART.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis dataKey="period" {...AXIS_PROPS} />
                <YAxis yAxisId="left" {...AXIS_PROPS} width={44} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  unit="%"
                  {...AXIS_PROPS}
                  width={44}
                />

                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={<ChartTooltip />}
                />

                <Bar
                  yAxisId="left"
                  dataKey="assigned"
                  name="Assigned"
                  stackId="state"
                  fill={CHART[1]}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="available"
                  name="Available"
                  stackId="state"
                  fill={CHART[2]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="repair"
                  name="In repair"
                  stackId="state"
                  fill={CHART[3]}
                  radius={[4, 4, 0, 0]}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="utilisation"
                  name="Utilisation %"
                  stroke={CHART[4]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART[4], strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Assets by category"
              description="Count of tracked units per hardware category."
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={CATEGORY_BREAKDOWN}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 0, left: 8 }}
                >
                  <CartesianGrid
                    stroke={CHART.grid}
                    strokeDasharray="3 3"
                    horizontal={false}
                  />

                  <XAxis type="number" {...AXIS_PROPS} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={104}
                    {...AXIS_PROPS}
                  />

                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={
                      <ChartTooltip
                        formatter={(value) => formatNumber(Number(value))}
                      />
                    }
                  />

                  <Bar
                    dataKey="count"
                    name="Units"
                    fill={CHART[1]}
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>

            <ChartFrame
              title="Value by category"
              description="Net book value carried by each category."
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CATEGORY_BREAKDOWN}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={54}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {CATEGORY_BREAKDOWN.map((_, index) => (
                      <Cell
                        key={index}
                        fill={CHART[((index % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </Tabs.Content>

        {/* ==================================================
            ALLOCATION
        ================================================== */}

        <Tabs.Content value="allocation" className="space-y-4 outline-none">
          <ChartFrame
            title="Allocation by department"
            description={`${formatNumber(totalAllocated)} assignments across ${allocation.length} department${allocation.length === 1 ? "" : "s"}.`}
            height={320}
            actions={
              <ChartLegend
                items={[
                  { label: "Hardware", color: CHART[1] },
                  { label: "Software", color: CHART[2] },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={allocation}
                margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke={CHART.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis dataKey="department" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={44} />

                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={
                    <ChartTooltip
                      formatter={(value) => formatNumber(Number(value))}
                    />
                  }
                />

                <Bar
                  dataKey="hardware"
                  name="Hardware"
                  fill={CHART[1]}
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                />
                <Bar
                  dataKey="software"
                  name="Software"
                  fill={CHART[2]}
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Department register
              </h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Assets per head, by cost centre.
              </p>
            </header>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Cost centre</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Hardware</TableHead>
                  <TableHead className="text-right">Software</TableHead>
                  <TableHead className="text-right">Per head</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {allocation.map((item) => {
                  const perHead =
                    (item.hardware + item.software) / item.headcount;

                  return (
                    <TableRow key={item.department}>
                      <TableCell className="font-medium">
                        {item.department}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {item.costCentre}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatNumber(item.headcount)}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatNumber(item.hardware)}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatNumber(item.software)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge tone={perHead > 3 ? "warn" : "neutral"}>
                          {perHead.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </Tabs.Content>

        {/* ==================================================
            LIFECYCLE
        ================================================== */}

        <Tabs.Content value="lifecycle" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <ChartFrame
              title="Asset ageing"
              description="Units grouped by time since purchase."
              className="lg:col-span-3"
              height={300}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={AGEING_BUCKETS}
                  margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis dataKey="bucket" {...AXIS_PROPS} />
                  <YAxis {...AXIS_PROPS} width={44} />

                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={
                      <ChartTooltip
                        formatter={(value) => formatNumber(Number(value))}
                      />
                    }
                  />

                  <Bar dataKey="count" name="Units" radius={[4, 4, 0, 0]}>
                    {AGEING_BUCKETS.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index >= 3 ? CHART[3] : CHART[1]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>

            <section className="flex flex-col rounded-xl border border-border bg-card shadow-card lg:col-span-2">
              <header className="border-b border-border px-5 py-4">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Refresh exposure
                </h2>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  Assets past the three-year refresh threshold.
                </p>
              </header>

              <div className="flex-1 space-y-3 px-5 py-4">
                {AGEING_BUCKETS.map((bucket, index) => {
                  const total = AGEING_BUCKETS.reduce(
                    (sum, item) => sum + item.count,
                    0,
                  );
                  const share = (bucket.count / total) * 100;
                  const overdue = index >= 3;

                  return (
                    <div key={bucket.bucket}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {bucket.bucket}
                        </span>

                        <span className="font-medium tabular-nums text-foreground">
                          {formatNumber(bucket.count)}
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {share.toFixed(0)}%
                          </span>
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            overdue ? "bg-warning" : "bg-primary",
                          )}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2.5 rounded-b-xl border-t border-warning-border bg-warning-muted px-5 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" />

                <p className="text-sm text-warning-strong">
                  <span className="font-semibold">278 assets</span> are past
                  three years and due for refresh assessment.
                </p>
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Licence renewals
              </h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Upcoming software renewals and seat utilisation.
              </p>
            </header>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Seats used</TableHead>
                  <TableHead className="text-right">Annual cost</TableHead>
                  <TableHead>Renews</TableHead>
                  <TableHead className="text-right">Days left</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {LICENCE_RENEWALS.map((licence) => {
                  const left = daysUntil(licence.renewalDate);
                  const utilisation = Math.round(
                    (licence.seatsUsed / licence.seats) * 100,
                  );

                  return (
                    <TableRow key={licence.id}>
                      <TableCell className="font-medium">
                        {licence.product}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {licence.vendor}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatNumber(licence.seatsUsed)} /{" "}
                        {formatNumber(licence.seats)}
                        <span
                          className={cn(
                            "ml-2 text-xs",
                            utilisation >= 90
                              ? "text-destructive-strong"
                              : "text-muted-foreground",
                          )}
                        >
                          {utilisation}%
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        {formatCurrency(licence.annualCost, true)}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {formatDate(licence.renewalDate)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge
                          tone={
                            left <= 30 ? "danger" : left <= 60 ? "warn" : "ok"
                          }
                        >
                          {left}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </Tabs.Content>

        {/* ==================================================
            VALUE
        ================================================== */}

        <Tabs.Content value="value" className="space-y-4 outline-none">
          <ChartFrame
            title="Purchase value vs. book value"
            description="Accumulated depreciation across the last twelve months."
            height={340}
            actions={
              <ChartLegend
                items={[
                  { label: "Purchase value", color: CHART[2] },
                  { label: "Book value", color: CHART[1] },
                  { label: "Accumulated depreciation", color: CHART[3] },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={DEPRECIATION_TREND}
                margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
              >
                <CartesianGrid
                  stroke={CHART.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis dataKey="period" {...AXIS_PROPS} />
                <YAxis
                  {...AXIS_PROPS}
                  width={56}
                  tickFormatter={(value) => formatCurrency(Number(value), true)}
                />

                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={
                    <ChartTooltip
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />

                <Bar
                  dataKey="depreciation"
                  name="Accumulated depreciation"
                  fill={CHART[3]}
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />

                <Line
                  type="monotone"
                  dataKey="purchaseValue"
                  name="Purchase value"
                  stroke={CHART[2]}
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="bookValue"
                  name="Book value"
                  stroke={CHART[1]}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Value by category
              </h2>

              <p className="mt-0.5 text-sm text-muted-foreground">
                Net book value and average unit value.
              </p>
            </header>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Book value</TableHead>
                  <TableHead className="text-right">Avg. per unit</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {CATEGORY_BREAKDOWN.map((item) => {
                  const totalValue = CATEGORY_BREAKDOWN.reduce(
                    (sum, entry) => sum + entry.value,
                    0,
                  );

                  return (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">
                        {item.category}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatNumber(item.count)}
                      </TableCell>

                      <TableCell className="text-right">
                        {formatCurrency(item.value)}
                      </TableCell>

                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(Math.round(item.value / item.count))}
                      </TableCell>

                      <TableCell className="text-right">
                        {((item.value / totalValue) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </Tabs.Content>

        {/* ==================================================
            AUDIT TRAIL
        ================================================== */}

        <Tabs.Content value="audit" className="outline-none">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Audit trail
                </h2>

                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatNumber(auditRows.length)} movement
                  {auditRows.length === 1 ? "" : "s"} recorded.
                </p>
              </div>

              <Select
                value={action}
                onValueChange={(value) =>
                  setAction(value as "ALL" | AuditAction)
                }
              >
                <SelectTrigger className="w-[11rem]" size="sm">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ALL">All actions</SelectItem>

                  {(Object.keys(ACTION_LABEL) as AuditAction[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {ACTION_LABEL[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </header>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {auditRows.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(entry.timestamp)}
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-foreground">
                        {entry.assetName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.assetTag}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge tone={ACTION_TONE[entry.action]}>
                        {ACTION_LABEL[entry.action]}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {entry.from ?? "—"}
                    </TableCell>

                    <TableCell
                      className={
                        entry.to ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      {entry.to ?? "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {entry.actor}
                    </TableCell>

                    <TableCell className="max-w-[18rem] truncate text-muted-foreground">
                      {entry.note}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </Tabs.Content>
      </Tabs.Root>

      <p className="text-xs text-muted-foreground">
        Figures on this page are mock data from{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-2xs">
          src/services/mock/reports.mock.ts
        </code>
        . Swap those exports for API queries to go live.
      </p>
    </div>
  );
}
