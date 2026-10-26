import { KeyRound, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { OverlayRoot } from '@/components/ui/overlay-root';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { apiErrorMessage } from '@/types/systems';

import {
  useDeleteSoftwareLicenseMutation,
  useGetSoftwareInstallationsQuery,
  useGetSoftwareLicensesQuery,
  useRemoveSoftwareInstallationMutation,
  type SoftwareLicenseRecord,
  type SoftwareRecord,
} from '../../services/api/software.api';
import { SoftwareLicenseModal } from '../asset-manager/SoftwareLicenseModal';
import { ExpiryBadge, UsageBadge, fmtDate, licensingLabel } from './software-ui';

// ============================================================
// SOFTWARE DETAIL DRAWER
// Order matters: licences first (what people come here for),
// then where it is installed, then the technical details.
// ============================================================

interface Props {
  software: SoftwareRecord;
  onClose: () => void;
  onEdit: (software: SoftwareRecord) => void;
}

export function SoftwareDetailDrawer({ software, onClose, onEdit }: Props) {
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<SoftwareLicenseRecord | null>(null);

  const { data: licenses = [], isFetching: loadingLicenses } = useGetSoftwareLicensesQuery({
    assetId: software.assetId,
  });

  const { data: installations = [], isFetching: loadingInstalls } =
    useGetSoftwareInstallationsQuery({
      softwareAssetId: software.assetId,
      status: 'ACTIVE',
    });

  const [removeInstallation, removeState] = useRemoveSoftwareInstallationMutation();
  const [deleteLicense, deleteLicenseState] = useDeleteSoftwareLicenseMutation();

  const busy = removeState.isLoading || deleteLicenseState.isLoading;
  const confirm = useConfirm();
  const name = software.asset?.name ?? 'this software';

  async function handleRemoveInstallation(id: string, systemName: string) {
    const confirmed = await confirm({
      title: `Remove ${name} from ${systemName}?`,
      description: `The installation on ${systemName} will be marked as removed.`,
      confirmLabel: 'Remove installation',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await removeInstallation({
        id,
        notes: 'Removed from software catalog',
      }).unwrap();
      toast.add({ title: 'Installation removed', type: 'success' });
    } catch (error) {
      toast.add({
        title: 'Could not remove installation',
        description: apiErrorMessage(error),
        type: 'error',
      });
    }
  }

  async function handleDeleteLicense(license: SoftwareLicenseRecord) {
    const confirmed = await confirm({
      title: 'Delete this license?',
      description: `The ${license.vendor} · ${license.licenseType} license will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete license',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteLicense(license.id).unwrap();
      toast.add({ title: 'License deleted', type: 'success' });
    } catch (error) {
      toast.add({
        title: 'Could not delete license',
        description: apiErrorMessage(error),
        type: 'error',
      });
    }
  }

  const details: [string, string | null | undefined][] = [
    ['Publisher', software.publisher ?? software.asset?.manufacturer],
    ['Version', software.version],
    ['Edition', software.edition],
    ['Part of', software.parentSoftware?.name],
    ['Asset tag', software.asset?.assetTag],
    ['Vendor support', software.warrantyApplicable ? 'Yes' : 'No'],
  ];

  return (
    <OverlayRoot className="fixed inset-0 z-50" onClose={onClose} label="Software details">
      <button
        type="button"
        aria-label="Close software details"
        className="absolute inset-0 cursor-default bg-scrim"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-card shadow-overlay">
        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card p-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">
              {software.asset?.name ?? 'Unnamed software'}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <UsageBadge usage={software.usage} />
              <span className="text-xs text-muted-foreground">
                {licensingLabel(software.subscriptionType)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit(software)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* LICENSES */}
        <section className="border-b border-border p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-medium text-foreground">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Licenses ({licenses.length})
            </h3>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                setEditingLicense(null);
                setLicenseModalOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              Add license
            </Button>
          </div>

          {loadingLicenses ? (
            <p className="text-xs text-muted-foreground">Loading licenses…</p>
          ) : null}

          <div className="space-y-2">
            {licenses.map((license) => {
              const totalSeats = Math.max(Number(license.totalSeats ?? 0), 1);
              const assignedSeats = Number(license.assignedSeats ?? 0);
              const percent = Math.min(100, Math.round((assignedSeats / totalSeats) * 100));

              return (
                <div key={license.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        <span className="truncate">
                          {license.vendor} · {license.licenseType}
                        </span>
                        <ExpiryBadge expiryDate={license.expiryDate} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {license.licenseReference || 'No key or reference'} · Expires{' '}
                        {fmtDate(license.expiryDate)}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label="Edit license"
                        onClick={() => {
                          setEditingLicense(license);
                          setLicenseModalOpen(true);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label="Delete license"
                        onClick={() => handleDeleteLicense(license)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {assignedSeats} of {totalSeats} seats used
                      </span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-1.5 rounded-full ${
                          percent >= 100 ? 'bg-destructive-strong' : 'bg-primary'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {!loadingLicenses && licenses.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No licenses yet. Add one to track seats and expiry.
              </p>
            ) : null}
          </div>
        </section>

        {/* INSTALLATIONS */}
        <section className="border-b border-border p-5">
          <h3 className="mb-3 flex items-center gap-2 font-medium text-foreground">
            <Package className="h-4 w-4" aria-hidden="true" />
            Installed on ({installations.length})
          </h3>

          {loadingInstalls ? (
            <p className="text-xs text-muted-foreground">Loading installations…</p>
          ) : null}

          <div className="space-y-2">
            {installations.map((install) => {
              const systemName = install.system?.name ?? install.systemId ?? 'Unknown system';
              return (
                <div
                  key={install.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="mr-auto min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{systemName}</p>
                    <p className="text-xs text-muted-foreground">
                      {install.system?.employee?.name ?? 'No employee'} ·{' '}
                      {install.version ? `v${install.version} · ` : ''}
                      {install.license ? `${install.license.vendor} license` : 'No license'} ·{' '}
                      {fmtDate(install.installedAt)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleRemoveInstallation(install.id, systemName)}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}

            {!loadingInstalls && installations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Not installed anywhere yet. Install it from a computer&apos;s detail page.
              </p>
            ) : null}
          </div>
        </section>

        {/* DETAILS */}
        <section className="p-5">
          <h3 className="mb-3 font-medium text-foreground">Details</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 break-words font-medium text-foreground">{value || '—'}</dd>
              </div>
            ))}
            {software.notes ? (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{software.notes}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </aside>

      <SoftwareLicenseModal
        open={licenseModalOpen}
        assetId={software.assetId}
        license={editingLicense}
        defaultVendor={software.publisher}
        onClose={() => {
          setLicenseModalOpen(false);
          setEditingLicense(null);
        }}
      />
    </OverlayRoot>
  );
}

export default SoftwareDetailDrawer;
