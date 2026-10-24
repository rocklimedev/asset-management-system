import { useGetAssetCategoriesQuery } from "../../services/api/asset.api";

type Props = { value: string; onChange: (value: string) => void; organisationId?: string | null; disabled?: boolean };

export function ComputerCategorySelect({ value, onChange, organisationId, disabled }: Props) {
  const { data: categories = [], isLoading, isError } = useGetAssetCategoriesQuery({ isActive: true });
  const options = categories.filter(category => category.type === "HARDWARE" &&
    ["desktop pc", "laptop"].includes(category.name.trim().toLowerCase()) &&
    (!category.organisationId || category.organisationId === organisationId || category.id === value));
  return <div className="space-y-1">
    <label htmlFor="computer-category" className="text-sm font-medium">Computer category (PC/Desktop / Laptop)</label>
    <select id="computer-category" required value={value} disabled={disabled || isLoading || isError}
      onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
      <option value="">{isLoading ? "Loading categories…" : "Select PC/Desktop or Laptop category"}</option>
      {options.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select>
    <p className="text-xs text-muted-foreground">Only Desktop PC and Laptop asset categories are available here. Categories can be added in the asset form.</p>
    {isError && <p className="text-xs text-destructive">Could not load asset categories. Close and reopen to retry.</p>}
    {!isLoading && !isError && !options.length && <p className="text-xs text-destructive">Add a PC/Desktop or Laptop hardware category before creating a computer.</p>}
  </div>;
}
