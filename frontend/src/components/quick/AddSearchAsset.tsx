import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useQuickCreateAssetMutation, type Asset, type AssetKind } from '../../services/api/asset.api';
import { Button } from '../ui/button';
import { toast } from '../ui/toast';

interface Props {
  name: string;
  kind?: AssetKind;
  categoryId?: string;
  categoryName?: string;
  organisationId?: string;
  locationId?: string;
  onAdded?: (asset: Asset) => void;
}

export function AddSearchAsset({ name, categoryName, onAdded, ...defaults }: Props) {
  const [createAsset, { isLoading }] = useQuickCreateAssetMutation();
  const busy = useRef(false);
  const trimmed = name.trim();

  async function add() {
    if (busy.current || !trimmed || trimmed.length > 150) return;
    busy.current = true;
    try {
      const asset = await createAsset({ name: trimmed, ...defaults }).unwrap();
      toast.add({ type: 'success', title: 'Added to Inventory', description: `${trimmed} is now in stock. Quantity: 1.` });
      onAdded?.(asset);
    } catch (error) {
      const message = (error as { data?: { message?: string | string[] } }).data?.message;
      toast.add({ type: 'error', title: "Couldn't add this asset", description:
        Array.isArray(message) ? message.join(' ') : message || 'Please try again.' });
    } finally {
      busy.current = false;
    }
  }

  if (!trimmed) return null;
  return (
    <div className="mt-3 space-y-2 text-center">
      <Button type="button" onClick={add} disabled={isLoading || trimmed.length > 150} className="max-w-full">
        <Plus className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate">{isLoading ? 'Adding…' : `Add “${trimmed}” to Inventory`}</span>
      </Button>
      <p className="text-xs text-muted-foreground">
        {trimmed.length > 150 ? 'Use a name of up to 150 characters.' :
          `Quantity 1 · ${categoryName || (defaults.kind === 'SOFTWARE' ? 'General Software' : 'General Hardware')} · Available · Good condition`}
      </p>
    </div>
  );
}
