import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const TABS = ['Organization', 'Asset Settings', 'Transfer Settings', 'Notifications', 'Security', 'Audit'] as const;

export default function Settings() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Organization');
  const [approvalRequired, setApprovalRequired] = useState(false);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Configure organization, asset, transfer, and security preferences.</p>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                tab === t ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <Card className="flex-1 p-6">
          {tab === 'Organization' && (
            <div className="max-w-md space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Company name</label>
                <Input defaultValue="Acme Corporation" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Timezone</label>
                <Select defaultValue="America/New_York">
                  <option value="America/New_York">Eastern Time (US)</option>
                  <option value="America/Los_Angeles">Pacific Time (US)</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Kolkata">India</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Currency</label>
                <Select defaultValue="USD">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </Select>
              </div>
              <Button>Save changes</Button>
            </div>
          )}

          {tab === 'Transfer Settings' && (
            <div className="max-w-md space-y-4">
              <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Require approval for transfers</p>
                  <p className="text-xs text-slate-500">When enabled, transfers create a pending request instead of completing immediately.</p>
                </div>
                <input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} className="h-4 w-4" />
              </label>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Default transfer reason list</label>
                <Input defaultValue="Employee transfer, Team reassignment, Manager request, Equipment upgrade" />
              </div>
              <Button>Save changes</Button>
            </div>
          )}

          {(tab === 'Asset Settings' || tab === 'Notifications' || tab === 'Security' || tab === 'Audit') && (
            <div className="max-w-md space-y-3 text-sm text-slate-500">
              <p>
                {tab === 'Asset Settings' && 'Manage asset categories, types, statuses, conditions, and locations here.'}
                {tab === 'Notifications' && 'Configure warranty alerts, license expiry alerts, and transfer notifications.'}
                {tab === 'Security' && 'Set password policies, session timeout, and two-factor authentication.'}
                {tab === 'Audit' && 'Configure how long audit log entries are retained.'}
              </p>
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-400">
                This section is scaffolded with the correct API surface (Setting model + PATCH /api/settings) but the form fields are a follow-up build item.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
