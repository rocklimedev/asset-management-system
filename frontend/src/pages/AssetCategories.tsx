import { useState, type FormEvent } from 'react';
import { Plus, Search, Tags } from 'lucide-react';
import {
  useGetAssetCategoriesQuery,
  useCreateAssetCategoryMutation,
  useUpdateAssetCategoryMutation,
  useDeleteAssetCategoryMutation,
  type AssetCategory,
  type AssetKind,
} from '../services/api/asset.api';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { RowActions } from '../components/ui/row-actions';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { useConfirm } from '../components/ui/confirm-dialog';
import { toast } from '../components/ui/toast';
import { apiErrorMessage } from '../types/systems';

const selectClass = 'h-10 rounded-md border border-input bg-background px-3 text-sm';

export default function AssetCategories() {
  const {
    data: categories = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetAssetCategoriesQuery();
  const [createCategory, createState] = useCreateAssetCategoryMutation();
  const [updateCategory, updateState] = useUpdateAssetCategoryMutation();
  const [deleteCategory, deleteState] = useDeleteAssetCategoryMutation();
  const confirm = useConfirm();
  const busy = createState.isLoading || updateState.isLoading || deleteState.isLoading;
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AssetKind>('HARDWARE');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');

  const rows = categories.filter(
    (category) =>
      (!typeFilter || category.type === typeFilter) &&
      (!statusFilter || (category.isActive !== false) === (statusFilter === 'active')) &&
      `${category.name} ${category.description ?? ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  function edit(category: AssetCategory | null) {
    setEditing(category);
    setName(category?.name ?? '');
    setDescription(category?.description ?? '');
    setType(category?.type ?? 'HARDWARE');
    setActive(category?.isActive !== false);
    setFormError('');
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setFormError('');
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      isActive: active,
    };
    try {
      if (editing) await updateCategory({ id: editing.id, body }).unwrap();
      else await createCategory(body).unwrap();
      setOpen(false);
      toast.add({ title: editing ? 'Category updated' : 'Category created', type: 'success' });
    } catch (error) {
      setFormError(apiErrorMessage(error));
    }
  }

  async function changeStatus(category: AssetCategory) {
    try {
      await updateCategory({
        id: category.id,
        body: { isActive: category.isActive === false },
      }).unwrap();
      toast.add({
        title: category.isActive === false ? 'Category activated' : 'Category deactivated',
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Could not update category',
        description: apiErrorMessage(error),
        type: 'error',
      });
    }
  }

  async function remove(category: AssetCategory) {
    if (
      !(await confirm({
        title: `Delete ${category.name}?`,
        description:
          'Categories used by assets cannot be deleted. You can deactivate them instead.',
        confirmLabel: 'Delete category',
        tone: 'danger',
      }))
    )
      return;
    try {
      await deleteCategory(category.id).unwrap();
      toast.add({ title: 'Category deleted', type: 'success' });
    } catch (error) {
      toast.add({
        title: 'Could not delete category',
        description: apiErrorMessage(error),
        type: 'error',
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Asset Categories"
        description="Manage the categories used to organise hardware and software assets."
        actions={
          <Button onClick={() => edit(null)} disabled={busy}>
            <Plus aria-hidden="true" />
            Add category
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search
            className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            aria-label="Search categories"
            placeholder="Search categories"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          aria-label="Filter by type"
          className={selectClass}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="">All types</option>
          <option value="HARDWARE">Hardware</option>
          <option value="SOFTWARE">Software</option>
        </select>
        <select
          aria-label="Filter by status"
          className={selectClass}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      {isLoading ? (
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Loading categories…
        </p>
      ) : isError ? (
        <EmptyState
          title="Could not load categories"
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : !rows.length ? (
        <EmptyState
          icon={Tags}
          title="No categories found"
          description={
            categories.length
              ? 'Try another search or filter.'
              : 'Add your first hardware or software category.'
          }
        />
      ) : (
        <div
          className={`overflow-x-auto rounded-xl border border-border bg-card ${isFetching ? 'opacity-70' : ''}`}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {['Category', 'Type', 'Status', 'Actions'].map((title) => (
                  <th key={title} className="px-4 py-3 font-medium">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((category) => (
                <tr key={category.id} className="border-b border-border last:border-0">
                  <td className="min-w-48 px-4 py-3">
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="mt-1 max-w-md whitespace-normal break-words text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {category.type === 'HARDWARE' ? 'Hardware' : 'Software'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={category.isActive === false ? 'neutral' : 'ok'}>
                      {category.isActive === false ? 'Inactive' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      recordName={category.name}
                      primary={{ label: 'Edit', onClick: () => edit(category), disabled: busy }}
                      items={[
                        {
                          label: category.isActive === false ? 'Activate' : 'Deactivate',
                          disabled: busy,
                          onSelect: () => changeStatus(category),
                        },
                        {
                          label: 'Delete',
                          disabled: busy,
                          destructive: true,
                          separatorBefore: true,
                          onSelect: () => remove(category),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && !isError && (
        <p className="text-xs text-muted-foreground">
          {rows.length} of {categories.length} categories
        </p>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogDescription>
              Set the name, type and availability of this asset category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                autoFocus
                required
                maxLength={255}
                value={name}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description (optional)</Label>
              <Textarea
                id="category-description"
                value={description}
                disabled={busy}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-type">Type</Label>
              <select
                id="category-type"
                className={`${selectClass} w-full`}
                value={type}
                disabled={busy}
                onChange={(event) => setType(event.target.value as AssetKind)}
              >
                <option value="HARDWARE">Hardware</option>
                <option value="SOFTWARE">Software</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                disabled={busy}
                onChange={(event) => setActive(event.target.checked)}
              />
              Active
            </label>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={busy || !name.trim()}>
                Save category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
