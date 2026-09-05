import {
  Boxes, CheckCircle2, PackageOpen, Users, Laptop, AppWindow, Wrench, ShieldAlert,
} from 'lucide-react';
import { useGetDashboardQuery } from '../services/api/dashboard.api';
import { StatCard } from '../components/dashboard/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-brand-500', AVAILABLE: 'bg-emerald-500', REPAIR: 'bg-amber-500',
  RETIRED: 'bg-slate-400', LOST: 'bg-rose-500', DAMAGED: 'bg-rose-400', DISPOSED: 'bg-slate-300',
};

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${max ? (count / max) * 100 : 0}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500">{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useGetDashboardQuery();

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          Couldn't load dashboard data.{' '}
          <button onClick={() => refetch()} className="font-medium underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { cards, assetDistribution, hardwareBreakdown, softwareBreakdown, recentActivity, upcoming } = data;
  const maxHw = Math.max(...hardwareBreakdown.map((h) => h.count), 1);
  const maxSw = Math.max(...softwareBreakdown.map((s) => s.count), 1);
  const totalForDistribution = assetDistribution.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your IT environment.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Assets" value={cards.totalAssets} icon={Boxes} />
        <StatCard label="Assigned" value={cards.assignedAssets} icon={CheckCircle2} />
        <StatCard label="Unassigned" value={cards.unassignedAssets} icon={PackageOpen} />
        <StatCard label="Employees" value={cards.employees} icon={Users} />
        <StatCard label="Hardware" value={cards.hardware} icon={Laptop} />
        <StatCard label="Software" value={cards.software} icon={AppWindow} />
        <StatCard label="Under Repair" value={cards.underRepair} icon={Wrench} tone="warn" />
        <StatCard label="Expiring Licenses" value={cards.expiringLicenses} icon={ShieldAlert} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Asset Distribution</h2>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {assetDistribution.map((d) => (
              <div key={d.status} className={STATUS_COLORS[d.status]} style={{ width: `${(d.count / totalForDistribution) * 100}%` }} title={`${d.status}: ${d.count}`} />
            ))}
          </div>
          <div className="space-y-2">
            {assetDistribution.map((d) => (
              <div key={d.status} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[d.status]}`} />
                  {d.status.charAt(0) + d.status.slice(1).toLowerCase()}
                </span>
                <span className="font-medium tabular-nums text-slate-800">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Hardware Breakdown</h2>
          <div className="space-y-2.5">
            {hardwareBreakdown.map((h) => <BarRow key={h.category} label={h.category} count={h.count} max={maxHw} />)}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Software Breakdown</h2>
          <div className="space-y-2.5">
            {softwareBreakdown.map((s) => <BarRow key={s.category} label={s.category} count={s.count} max={maxSw} />)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent Activity</h2>
          <ul className="space-y-3">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <div className="min-w-0">
                  <p className="text-slate-700">
                    {a.action === 'TRANSFERRED' ? <><b className="font-medium">{a.assetName}</b> transferred from {a.fromValue} to {a.toValue}</> :
                     a.action === 'ASSIGNED' ? <><b className="font-medium">{a.assetName}</b> assigned to {a.toValue}</> :
                     a.action === 'CREATED' ? <>New asset added: <b className="font-medium">{a.assetName}</b></> :
                     a.action === 'STATUS_CHANGED' ? <><b className="font-medium">{a.assetName}</b> status changed to {a.toValue}</> :
                     <><b className="font-medium">{a.assetName}</b> {a.action.toLowerCase()}</>}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()} · {a.performedBy}</p>
                </div>
              </li>
            ))}
            {recentActivity.length === 0 && <p className="text-sm text-slate-400">No recent activity yet.</p>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Upcoming</h2>
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">License expirations</p>
            <div className="space-y-2">
              {upcoming.licenseExpirations.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{l.assetName}</span>
                  <Badge tone={l.urgency === 'red' ? 'danger' : 'warn'}>{new Date(l.expiryDate).toLocaleDateString()}</Badge>
                </div>
              ))}
              {upcoming.licenseExpirations.length === 0 && <p className="text-sm text-slate-400">Nothing expiring soon.</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Warranty expirations</p>
            <div className="space-y-2">
              {upcoming.warrantyExpirations.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{w.assetName} <span className="text-slate-400 tabular-nums">({w.assetTag})</span></span>
                  <Badge tone={w.urgency === 'red' ? 'danger' : 'warn'}>{new Date(w.warrantyExpiry).toLocaleDateString()}</Badge>
                </div>
              ))}
              {upcoming.warrantyExpirations.length === 0 && <p className="text-sm text-slate-400">Nothing expiring soon.</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}