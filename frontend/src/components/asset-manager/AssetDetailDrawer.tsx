import { X, Clock, ArrowRightLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAssetHistory } from '../../lib/hooks';
import { StatusBadge } from '../ui/Badge';
import type { Asset } from '../../types';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-800">{value ?? '—'}</p>
    </div>
  );
}

export function AssetDetailDrawer({ asset, onClose, onTransfer }: { asset: Asset | null; onClose: () => void; onTransfer: (asset: Asset) => void }) {
  const { data: history } = useAssetHistory(asset?.id ?? null);
  if (!asset) return null;

  const currentAssignee = asset.assignments?.[0]?.employee;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{asset.name}</h2>
            <p className="text-xs text-slate-500 tabular-nums">{asset.assetTag}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          <div className="flex items-center gap-2">
            <StatusBadge status={asset.status} />
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">{asset.condition.charAt(0) + asset.condition.slice(1).toLowerCase()} condition</span>
          </div>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Asset information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" value={asset.category?.name} />
              <Field label="Manufacturer" value={asset.manufacturer} />
              <Field label="Model" value={asset.model} />
              <Field label="Serial number" value={asset.serialNumber} />
              <Field label="Purchase date" value={asset.purchaseDate && new Date(asset.purchaseDate).toLocaleDateString()} />
              <Field label="Warranty expiry" value={asset.warrantyExpiry && new Date(asset.warrantyExpiry).toLocaleDateString()} />
              <Field label="Location" value={asset.location?.name} />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Assignment</h3>
            {currentAssignee ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{currentAssignee.name}</p>
                  <p className="text-xs text-slate-500">Assigned {new Date(asset.assignments![0].assignedAt).toLocaleDateString()}</p>
                </div>
                {asset.status === 'ASSIGNED' && (
                  <button
                    onClick={() => onTransfer(asset)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">This asset is not currently assigned to anyone.</p>
            )}
          </section>

          {asset.license && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Software license</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Vendor" value={asset.license.vendor} />
                <Field label="Type" value={asset.license.licenseType} />
                <Field label="Seats" value={`${asset.license.assignedSeats} / ${asset.license.totalSeats}`} />
                <Field label="Expires" value={asset.license.expiryDate && new Date(asset.license.expiryDate).toLocaleDateString()} />
              </div>
              <p className="mt-2 text-xs text-slate-400">License reference hidden — visible to roles with license view permission.</p>
            </section>
          )}

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Clock className="h-3.5 w-3.5" /> Asset history
            </h3>
            <ol className="space-y-3 border-l border-slate-200 pl-4">
              {history?.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand-500" />
                  <p className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-slate-800">
                    {h.action === 'TRANSFERRED' ? `Transferred from ${h.fromValue} to ${h.toValue}` :
                     h.action === 'ASSIGNED' ? `Assigned to ${h.toValue}` :
                     h.action === 'STATUS_CHANGED' ? `Status changed from ${h.fromValue} to ${h.toValue}` :
                     h.action === 'CREATED' ? 'Asset added to inventory' :
                     h.action === 'RETURNED' ? 'Returned to inventory' : h.action}
                  </p>
                  <p className="text-xs text-slate-400">by {h.performedBy}</p>
                </li>
              ))}
              {(!history || history.length === 0) && <p className="text-sm text-slate-400">No history yet.</p>}
            </ol>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
