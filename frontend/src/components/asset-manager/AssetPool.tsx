import { useEffect, useState } from 'react';
import { Package, Search } from 'lucide-react';

import {
  useGetAssetPoolQuery,
  useGetAssetCategoriesQuery,
  useAssignAssetMutation,
} from '../../services/api/asset.api';

import { toast } from '../ui/toast';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { EmptyState, SkeletonCard } from '../ui/EmptyState';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { Employee } from '../../services/api/employees.api';
import type { AssetPoolItem, SystemRecord } from '../../services/api/asset.api';

// ============================================================
// TYPES
// ============================================================

interface AssetPoolProps {
  open: boolean;
  employee?: Employee | null;
  system?: SystemRecord | null;
  onClose: () => void;
}

interface TransferError {
  data?: {
    message?: string;
    error?: string;
  };
  message?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;

  const apiError = error as TransferError;

  return apiError.data?.message || apiError.data?.error || apiError.message || fallback;
}

// ============================================================
// COMPONENT
// ============================================================

export function AssetPool({ open, employee, system, onClose }: AssetPoolProps) {
  const [categoryId, setCategoryId] = useState('');
  const { data: categories = [] } = useGetAssetCategoriesQuery({ isActive: true }, { skip: !open });
  useEffect(() => {
    if (open) {
      setCategoryId(system?.categoryId ?? '');
      setKind(system?.categoryId ? 'HARDWARE' : '');
      setPage(1);
      setPicked(null);
    }
  }, [open, system?.id, system?.categoryId]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<'' | 'HARDWARE' | 'SOFTWARE'>('');
  // The item chosen in step 1, waiting for confirmation in step 2.
  const [picked, setPicked] = useState<AssetPoolItem | null>(null);

  // Start every opening fresh, so a stale choice never gets confirmed.
  useEffect(() => {
    if (!open) setPicked(null);
  }, [open]);

  const { data, isLoading, isFetching, isError, refetch } = useGetAssetPoolQuery(
    {
      search: search || undefined,
      categoryId: categoryId || undefined,
      kind: kind || undefined,
      pageSize: 20,
      page,
    },
    {
      skip: !open,
    },
  );

  const [assignAsset, { isLoading: isAssigning }] = useAssignAssetMutation();

  const items = data?.items ?? [];
  const recipient = system?.name ?? employee?.name ?? 'this person';

  // ============================================================
  // ASSIGN
  // ============================================================

  async function handleAssign(asset: AssetPoolItem) {
    if (!employee && !system) return;

    try {
      await assignAsset({
        id: asset.id,
        ...(system ? { systemId: system.id } : { employeeId: employee!.id }),
      }).unwrap();

      toast.add({
        title: 'Equipment given',
        description: `${asset.name} is now with ${recipient}.`,
        type: 'success',
      });

      onClose();
    } catch (error) {
      toast.add({
        title: "Couldn't give this item",
        description: getErrorMessage(error, 'Nothing was changed. Please try again.'),
        type: 'error',
      });
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="
          flex
          max-h-[80vh]
          w-full
          max-w-2xl
          flex-col
          gap-0
          overflow-hidden
          border
          border-border
          bg-background
          p-0
          shadow-lg
          backdrop-blur-none
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <DialogHeader className="border-b border-border bg-background px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Package className="h-4 w-4 text-muted-foreground" />
            {system
              ? `Add to ${system.name}`
              : employee
                ? `Give equipment to ${employee.name}`
                : 'Give equipment'}
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground">
            {system
              ? `Pick an item from stock to add to ${system.name}.`
              : employee
                ? 'These items are in stock. Choose one, then confirm.'
                : 'Choose an item from stock.'}
          </DialogDescription>
        </DialogHeader>

        {/* ==================================================
            FILTERS
        ================================================== */}

        <div className="flex flex-col gap-2 border-b border-border bg-background px-6 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => (setPage(1), setSearch(event.target.value))}
              placeholder="Search by name or asset tag"
              className="
                h-10
                border-border
                bg-background
                pl-9
                text-foreground
                shadow-none
                focus-visible:ring-2
                focus-visible:ring-ring
              "
              autoFocus
            />
          </div>

          <select
            value={kind}
            onChange={(event) => (
              setPage(1),
              setCategoryId(''),
              setKind(event.target.value as typeof kind)
            )}
            className="
              h-10
              w-full
              rounded-md
              border
              border-border
              bg-background
              px-3
              text-sm
              text-foreground
              outline-none
              transition-colors
              focus:ring-2
              focus:ring-ring
              sm:w-40
            "
          >
            <option value="">All types</option>
            <option value="HARDWARE">Hardware</option>
            <option value="SOFTWARE">Software</option>
          </select>
          <select
            aria-label="Asset category"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All asset categories</option>
            {categories
              .filter((category) => !kind || category.type === kind)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </div>

        {/* ==================================================
            LIST
        ================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nothing in stock"
              description="Nothing matches this search. Try a different word, or add new equipment from All Assets."
            />
          ) : (
            <ul
              className={[
                'divide-y',
                'divide-border',
                isFetching ? 'opacity-70 transition-opacity' : '',
              ].join(' ')}
            >
              {items.map((asset) => (
                <li
                  key={asset.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                    py-3
                  "
                >
                  {/* ==================================================
                      ASSET
                  ================================================== */}

                  <div className="flex min-w-0 items-center gap-3">
                    {asset.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt=""
                        className="
                          h-10
                          w-10
                          shrink-0
                          rounded-md
                          border
                          border-border
                          bg-muted
                          object-cover
                        "
                      />
                    ) : (
                      <div
                        className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          border
                          border-border
                          bg-muted
                          text-muted-foreground
                        "
                      >
                        <Package className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>

                      <p className="truncate text-xs text-muted-foreground">
                        {asset.assetTag || 'No tag'}

                        {asset.serialNumber ? ` · ${asset.serialNumber}` : ''}

                        {asset.quantityAvailable > 1
                          ? ` · ${asset.quantityAvailable} available`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {/* ==================================================
                      ASSIGN
                  ================================================== */}

                  <Button
                    type="button"
                    size="sm"
                    disabled={isAssigning}
                    onClick={() => setPicked(asset)}
                    className="shrink-0 shadow-none"
                  >
                    Choose
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isError && (
          <div role="alert" className="p-4 text-sm">
            Could not load assets.{' '}
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          </div>
        )}
        {/* ==================================================
            CONFIRM — step 2. Names the item and the recipient so
            nobody gives the wrong thing to the wrong person.
        ================================================== */}

        {picked && (
          <div
            role="region"
            aria-label="Confirm"
            className="flex flex-col gap-3 border-t border-primary-border bg-primary-muted px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-foreground">
              {system ? 'Add' : 'Give'} <span className="font-semibold">{picked.name}</span> to{' '}
              <span className="font-semibold">{recipient}</span>?
              <span className="mt-0.5 block text-xs text-muted-foreground">
                It will appear under {system ? 'this computer' : 'their equipment'} straight away.
              </span>
            </p>

            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAssigning}
                onClick={() => setPicked(null)}
              >
                Go back
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isAssigning}
                onClick={() => handleAssign(picked)}
              >
                {isAssigning ? 'Giving…' : 'Yes, give it'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t px-6 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {Math.max(data?.totalPages ?? 1, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (data?.totalPages ?? 1) || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssetPool;
