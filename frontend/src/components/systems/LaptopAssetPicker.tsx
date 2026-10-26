import { useState } from 'react';
import {
  useGetAssetCategoriesQuery,
  useGetAssetPoolQuery,
  useGetAssetUnitsByAssetQuery,
} from '../../services/api/asset.api';
import type { SystemRecord } from '../../services/api/asset.api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export type LaptopSelection = { assetId: string; assetUnitId: string } | null;
type Props = {
  categoryId: string;
  value: LaptopSelection;
  onChange: (value: LaptopSelection) => void;
  system?: SystemRecord | null;
  disabled?: boolean;
};

export function LaptopAssetPicker({ categoryId, value, onChange, system, disabled }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data: categories = [] } = useGetAssetCategoriesQuery({ isActive: true });
  const isLaptop = categories.some(
    (category) => category.id === categoryId && category.name.trim().toLowerCase() === 'laptop',
  );
  const linked =
    system?.assignments?.filter(
      (assignment) => assignment.status === 'ACTIVE' && assignment.asset?.categoryId === categoryId,
    ) ?? [];
  const {
    currentData: pool,
    isFetching,
    isError,
  } = useGetAssetPoolQuery(
    { categoryId, kind: 'HARDWARE', search, page, pageSize: 20 },
    { skip: !isLaptop || linked.length > 0 },
  );
  const {
    currentData: units,
    isFetching: loadingUnits,
    isError: unitsError,
  } = useGetAssetUnitsByAssetQuery(value?.assetId ?? '', { skip: !value?.assetId });
  if (!isLaptop) return null;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <label htmlFor="computer-laptop" className="text-sm font-medium">
        Assign a laptop to this computer
      </label>
      <p className="text-xs text-muted-foreground">
        The laptop stays with this computer and its assigned employee. You can also assign it later.
      </p>
      {linked.length ? (
        <p className="text-sm">
          Already linked:{' '}
          {linked
            .map(
              (assignment) =>
                assignment.asset?.name +
                (assignment.assetUnit?.unitCode ? ' · ' + assignment.assetUnit.unitCode : ''),
            )
            .join(', ')}
        </p>
      ) : (
        <>
          <Input
            aria-label="Search available laptops"
            placeholder="Search available laptops"
            value={search}
            disabled={disabled}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            id="computer-laptop"
            value={value?.assetId ?? ''}
            disabled={disabled || isFetching || isError}
            onChange={(event) =>
              onChange(event.target.value ? { assetId: event.target.value, assetUnitId: '' } : null)
            }
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Assign later</option>
            {value && !pool?.items.some((asset) => asset.id === value.assetId) && (
              <option value={value.assetId}>Selected laptop</option>
            )}
            {pool?.items.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
                {asset.assetTag ? ' · ' + asset.assetTag : ''} · {asset.quantityAvailable} available
              </option>
            ))}
          </select>
          {isFetching && (
            <p className="text-xs text-muted-foreground">Loading available laptops…</p>
          )}
          {isError && (
            <p className="text-xs text-destructive">
              Could not load laptops. Reopen the form to retry.
            </p>
          )}
          {!isFetching && !isError && !pool?.items.length && (
            <p className="text-xs text-muted-foreground">
              No available laptops found. Add laptop stock in Assets or assign one later.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isFetching || page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isFetching || !pool || page >= pool.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
          {value && (
            <div>
              <label htmlFor="computer-laptop-unit" className="text-sm font-medium">
                Laptop unit
              </label>
              <select
                id="computer-laptop-unit"
                required
                value={value.assetUnitId}
                disabled={disabled || loadingUnits || unitsError}
                onChange={(event) => onChange({ ...value, assetUnitId: event.target.value })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select the physical laptop</option>
                {units
                  ?.filter((unit) => unit.status === 'AVAILABLE')
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unitCode ?? unit.id}
                      {unit.serialNumber ? ' · ' + unit.serialNumber : ''}
                      {unit.deviceId ? ' · ' + unit.deviceId : ''}
                    </option>
                  ))}
              </select>
              {unitsError && (
                <p className="text-xs text-destructive">
                  Could not load laptop units. Select the laptop again to retry.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
