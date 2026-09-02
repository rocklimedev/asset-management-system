import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Laptop, Monitor, Keyboard, Mouse, Headphones, Smartphone, Tablet, Printer, Server, AppWindow, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import type { Asset } from '../../types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Laptop, Monitor, Keyboard, Mouse, Headset: Headphones, Mobile: Smartphone, Tablet, Printer, Server,
};

function iconFor(asset: Asset) {
  if (asset.kind === 'SOFTWARE') return AppWindow;
  return ICONS[asset.category?.name ?? ''] ?? Laptop;
}

export function AssetChip({
  asset, onOpenDetail, transferrable,
}: {
  asset: Asset;
  onOpenDetail: (asset: Asset) => void;
  transferrable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `asset-${asset.id}`,
    data: { asset },
    disabled: !transferrable,
  });
  const Icon = iconFor(asset);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={clsx(
        'group flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left transition-shadow',
        isDragging && 'opacity-40',
      )}
    >
      <button
        {...(transferrable ? { ...listeners, ...attributes } : {})}
        aria-label={transferrable ? `Drag ${asset.name} to transfer` : `${asset.name} cannot be transferred`}
        className={clsx('shrink-0 text-slate-300', transferrable ? 'cursor-grab touch-none hover:text-slate-500 active:cursor-grabbing' : 'cursor-not-allowed')}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <button onClick={() => onOpenDetail(asset)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-medium text-slate-800">{asset.name}</p>
        <p className="truncate text-[11px] text-slate-400 tabular-nums">{asset.assetTag}</p>
      </button>
    </div>
  );
}
