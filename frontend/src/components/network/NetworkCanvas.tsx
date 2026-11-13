import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Compass, Info, Maximize2, Minus, Plus } from 'lucide-react';
import type { ConnectionEnd, NetworkDocument, Position } from '../../types/network';
import { moveRack, withinArea } from './topology';
import { KIND_META, kindColor } from './network-ui';
import { Button } from '../ui/button';

export type Selection = { collection: 'areas' | 'racks' | 'devices' | 'ports' | 'connections'; id: string } | null;

type Collection = 'devices' | 'racks' | 'areas';
const MINI = { w: 184, h: 116 };
const clampZoom = (k: number) => Math.max(0.12, Math.min(4, k));

export function NetworkCanvas({
  document: d,
  onChange,
  selection,
  select,
  query,
  areaId,
  trace,
  fitKey,
  linking,
  onPort,
  showAreas,
  showLabels,
  grid,
  snap,
  compactRackConnections,
  dimensionMode,
  onDimension,
  onFit,
  overlay,
}: {
  document: NetworkDocument;
  onChange: (d: NetworkDocument) => void;
  selection: Selection;
  select: (s: Selection) => void;
  query: string;
  areaId: string;
  trace: string[];
  fitKey: number;
  linking: boolean;
  onPort: (end: ConnectionEnd) => void;
  showAreas: boolean;
  showLabels: boolean;
  grid: boolean;
  snap: boolean;
  compactRackConnections: boolean;
  dimensionMode: boolean;
  onDimension: (a: [number, number], b: [number, number]) => void;
  onFit: () => void;
  overlay?: ReactNode;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ w: 900, h: 600 });
  const [showMap, setShowMap] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const drag = useRef<{ id: string; collection: Collection; start: Position; original: NetworkDocument; moved: boolean } | null>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [dimStart, setDimStart] = useState<[number, number] | null>(null);

  useEffect(() => {
    setDimStart(null);
  }, [dimensionMode]);

  // Track the canvas size so zoom and the minimap stay accurate on resize.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () => {
      const b = el.getBoundingClientRect();
      setSize({ w: b.width, h: b.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const bounds = svg.current?.getBoundingClientRect();
    if (!bounds || !d.devices.length) return;
    const nodes = d.devices.filter((v) => withinArea(d, v.areaId, areaId));
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map((v) => v.x)) - 150, maxX = Math.max(...nodes.map((v) => v.x)) + 150;
    const minY = Math.min(...nodes.map((v) => v.y)) - 120, maxY = Math.max(...nodes.map((v) => v.y)) + 120;
    const k = Math.min(bounds.width / (maxX - minX), bounds.height / (maxY - minY), 1.2);
    setView({ x: bounds.width / 2 - ((minX + maxX) / 2) * k, y: bounds.height / 2 - ((minY + maxY) / 2) * k, k });
  }, [fitKey, areaId]);

  const world = (x: number, y: number): [number, number] => {
    const b = svg.current!.getBoundingClientRect();
    return [(x - b.left - view.x) / view.k, (y - b.top - view.y) / view.k];
  };

  function zoomBy(factor: number) {
    setView((v) => {
      const k = clampZoom(v.k * factor), cx = size.w / 2, cy = size.h / 2;
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });
  }

  const portsFor = (id: string) => d.ports.filter((p) => p.deviceId === id);
  const height = (id: string) => Math.max(60, 62 + Math.ceil(portsFor(id).length / 5) * 20);
  const anchor = (end: ConnectionEnd) => {
    const device = d.devices.find((v) => v.id === end.deviceId);
    if (!device) return { x: 0, y: 0 };
    const index = portsFor(device.id).findIndex((p) => p.id === end.portId);
    return index < 0 ? device : { x: device.x - 80 + (index % 5) * 40, y: device.y + 18 + Math.floor(index / 5) * 20 };
  };
  const occupied = new Set(d.connections.flatMap((c) => [c.source.portId, c.target.portId]));
  const matches = (id: string) => {
    const v = d.devices.find((v) => v.id === id);
    return (
      !!v &&
      withinArea(d, v.areaId, areaId) &&
      (!query ||
        [v.name, v.code, v.ip, v.mac, v.notes, d.areas.find((a) => a.id === v.areaId)?.name, d.racks.find((r) => r.id === v.rackId)?.name]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()))
    );
  };

  const start = (e: React.PointerEvent, collection: Collection, id: string) => {
    e.stopPropagation();
    if (dimensionMode) return;
    select({ collection, id });
    if (linking && collection === 'devices') {
      onPort({ deviceId: id, portId: null });
      return;
    }
    const [x, y] = world(e.clientX, e.clientY);
    drag.current = { id, collection, start: { x, y }, original: d, moved: false };
    svg.current!.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    const current = drag.current;
    if (current) {
      const [x, y] = world(e.clientX, e.clientY);
      let dx = x - current.start.x, dy = y - current.start.y;
      if (Math.hypot(dx, dy) < 2 && !current.moved) return;
      current.moved = true;
      if (snap) {
        dx = Math.round(dx / 25) * 25;
        dy = Math.round(dy / 25) * 25;
      }
      if (current.collection === 'racks') {
        onChange(moveRack(current.original, current.id, dx, dy, compactRackConnections));
        return;
      }
      const next = structuredClone(current.original), selected = current.original[current.collection].find((v) => v.id === current.id)!;
      if (current.collection === 'devices') {
        const v = next.devices.find((v) => v.id === current.id)!;
        v.x = selected.x + dx;
        v.y = selected.y + dy;
      }
      if (current.collection === 'areas') {
        const areas = new Set([current.id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const a of next.areas) if (a.parentId && areas.has(a.parentId) && !areas.has(a.id)) {
            areas.add(a.id);
            changed = true;
          }
        }
        for (const a of next.areas) if (areas.has(a.id)) {
          a.x += dx;
          a.y += dy;
        }
        for (const r of next.racks) if (areas.has(r.areaId)) {
          r.x += dx;
          r.y += dy;
        }
        for (const v of next.devices) if (areas.has(v.areaId)) {
          v.x += dx;
          v.y += dy;
        }
      }
      onChange(next);
    } else if (pan.current) {
      // React may run the updater after pointer-up clears the pan ref.
      const { vx, vy, x, y } = pan.current;
      const nextX = vx + e.clientX - x, nextY = vy + e.clientY - y;
      setView((v) => ({ ...v, x: nextX, y: nextY }));
    }
  };

  // Overview geometry: bounds of the network plus the current viewport.
  const xs = [...d.devices.map((v) => v.x), ...d.racks.map((r) => r.x), ...d.areas.map((a) => a.x)];
  const ys = [...d.devices.map((v) => v.y), ...d.racks.map((r) => r.y), ...d.areas.map((a) => a.y)];
  const vx0 = -view.x / view.k, vy0 = -view.y / view.k;
  const vx1 = (size.w - view.x) / view.k, vy1 = (size.h - view.y) / view.k;
  const minX = Math.min(vx0, ...xs) - 160, maxX = Math.max(vx1, ...xs) + 160;
  const minY = Math.min(vy0, ...ys) - 120, maxY = Math.max(vy1, ...ys) + 120;
  const spanX = maxX - minX, spanY = maxY - minY;
  const scale = Math.min(MINI.w / spanX, MINI.h / spanY);
  const offX = (MINI.w - spanX * scale) / 2, offY = (MINI.h - spanY * scale) / 2;
  const toMini = (x: number, y: number) => ({ x: (x - minX) * scale + offX, y: (y - minY) * scale + offY });

  const kinds = Object.keys(KIND_META) as (keyof typeof KIND_META)[];

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-xl border border-border bg-muted/30">
      <svg
        ref={svg}
        className="block h-full min-h-[520px] w-full touch-none"
        aria-label="Network topology canvas"
        role="img"
        onWheel={(e) => {
          e.preventDefault();
          const b = svg.current!.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
          setView((v) => {
            const k = clampZoom(v.k * Math.exp(-e.deltaY * 0.001));
            return { k, x: x - ((x - v.x) * k) / v.k, y: y - ((y - v.y) * k) / v.k };
          });
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          svg.current!.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={(e) => {
          if (dimensionMode && pan.current && Math.hypot(e.clientX - pan.current.x, e.clientY - pan.current.y) < 4) {
            const p = world(e.clientX, e.clientY);
            if (dimStart) {
              onDimension(dimStart, p);
              setDimStart(null);
            } else setDimStart(p);
          }
          drag.current = null;
          pan.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
          pan.current = null;
        }}
      >
        <defs>
          <pattern id="network-grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0V25" fill="none" stroke="currentColor" strokeOpacity=".12" />
          </pattern>
        </defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {grid && <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#network-grid)" />}

          {showAreas &&
            d.areas.map((a) => (
              <g key={a.id} transform={`translate(${a.x},${a.y})`} onPointerDown={(e) => start(e, 'areas', a.id)} className="cursor-move">
                <rect x={-105} y={-16} width={210} height={28} rx={6} fill="hsl(var(--card))" stroke={selection?.id === a.id ? '#f59e0b' : '#16a34a'} strokeDasharray="4 3" />
                <text textAnchor="middle" y={2} fontSize={10} fill="currentColor">{a.name.slice(0, 34)}</text>
                <title>Area: {a.name} · drag to move its contents</title>
              </g>
            ))}

          {d.racks.map((r) => {
            const children = d.devices.filter((v) => v.rackId === r.id);
            const left = Math.min(r.x - 114, ...children.map((v) => v.x - 114));
            const top = Math.min(r.y - 53, ...children.map((v) => v.y - 53));
            const right = Math.max(r.x + 114, ...children.map((v) => v.x + 114));
            const bottom = Math.max(r.y + 65, ...children.map((v) => v.y + height(v.id) - 40));
            const isSelected = selection?.id === r.id;
            return (
              <g key={r.id} opacity={!withinArea(d, r.areaId, areaId) ? 0.2 : 1} className="cursor-move" onPointerDown={(e) => start(e, 'racks', r.id)}>
                <title>{r.name} · drag to move equipment and connected devices</title>
                <rect x={left} y={top - 23} width={right - left} height={bottom - top + 33} rx={10} fill={isSelected ? 'hsl(var(--primary) / 0.04)' : 'none'} stroke={isSelected ? '#f59e0b' : '#94a3b8'} strokeDasharray="5 4" />
                <text x={left + 8} y={top - 8} fontSize={11} fill="currentColor" className="cursor-move" onPointerDown={(e) => start(e, 'racks', r.id)}>
                  {r.name.slice(0, 30)}
                </text>
              </g>
            );
          })}

          {d.connections.map((c) => {
            const a = anchor(c.source), b = anchor(c.target);
            const active = selection?.id === c.id || trace.includes(c.id);
            const color = active ? '#f59e0b' : c.kind === 'uplink' ? '#f97316' : c.kind === 'crosslink' ? '#2563eb' : '#94a3b8';
            const dimmed = query || areaId ? (matches(c.source.deviceId) || matches(c.target.deviceId) ? 1 : 0.1) : trace.length && !active ? 0.2 : 1;
            return (
              <g key={c.id} opacity={dimmed} onPointerDown={(e) => { e.stopPropagation(); select({ collection: 'connections', id: c.id }); }} className="cursor-pointer">
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={15} />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={color}
                  strokeWidth={active ? 4 : c.kind === 'uplink' ? 2.8 : 1.3}
                  strokeDasharray={c.verification === 'assumed' ? '7 5' : c.status === 'planned' ? '2 4' : undefined}
                />
                {(showLabels || active) && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 5} textAnchor="middle" fontSize={9} fill={color} stroke="hsl(var(--background))" strokeWidth={3} paintOrder="stroke">
                    {c.cableCode || c.kind}
                  </text>
                )}
                <title>{c.cableCode} · {c.kind} · {c.verification}</title>
              </g>
            );
          })}

          {d.devices.map((v) => {
            const ports = portsFor(v.id), h = height(v.id), isSelected = selection?.id === v.id, color = kindColor(v.kind);
            const cursor = linking ? 'cursor-crosshair' : 'cursor-move';
            if (!ports.length && !v.rackId)
              return (
                <g key={v.id} transform={`translate(${v.x},${v.y})`} opacity={matches(v.id) ? 1 : 0.12} onPointerDown={(e) => start(e, 'devices', v.id)} className={cursor}>
                  <rect x={-10} y={-9} width={20} height={18} rx={4} fill={color} stroke={isSelected ? '#f59e0b' : color} strokeWidth={isSelected ? 4 : 1} />
                  <text x={16} y={-2} fontSize={10} fill="currentColor" stroke="hsl(var(--background))" strokeWidth={3} paintOrder="stroke">{v.name.slice(0, 40)}</text>
                  <text x={16} y={11} fontSize={8} fill="currentColor" opacity={0.65}>{v.code} · {v.kind}</text>
                  <title>{v.name} · {d.areas.find((a) => a.id === v.areaId)?.name}</title>
                </g>
              );
            return (
              <g key={v.id} transform={`translate(${v.x},${v.y})`} opacity={matches(v.id) ? 1 : 0.12} onPointerDown={(e) => start(e, 'devices', v.id)} className={cursor}>
                <rect x={-100} y={-35} width={200} height={h} rx={8} fill="hsl(var(--card))" stroke={isSelected ? '#f59e0b' : color} strokeWidth={isSelected ? 3 : 1.5} />
                <rect x={-100} y={-35} width={200} height={6} rx={3} fill={color} />
                <text x={-90} y={-13} fontSize={11} fontWeight={600} fill="currentColor">{v.name.slice(0, 31)}</text>
                <text x={-90} y={2} fontSize={9} fill="currentColor" opacity={0.65}>
                  {v.code} · {v.kind}{v.ip ? ' · ' + v.ip : ''}
                </text>
                {ports.map((p, i) => {
                  const used = occupied.has(p.id), selectedPort = selection?.id === p.id;
                  return (
                    <g
                      key={p.id}
                      transform={`translate(${-96 + (i % 5) * 40},${10 + Math.floor(i / 5) * 20})`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (linking) onPort({ deviceId: v.id, portId: p.id });
                        else select({ collection: 'ports', id: p.id });
                      }}
                      className="cursor-pointer"
                    >
                      <rect width={34} height={16} rx={3} fill={used ? color : 'hsl(var(--muted))'} stroke={selectedPort ? '#f59e0b' : '#94a3b8'} strokeWidth={selectedPort ? 3 : 1} />
                      <text x={17} y={11} textAnchor="middle" fontSize={9} fill={used ? '#fff' : 'currentColor'}>{p.label.slice(0, 5)}</text>
                      <title>{p.label} · {used ? 'Connected' : 'Available'}{p.poe ? ' · PoE' : ''}</title>
                    </g>
                  );
                })}
                <title>{v.name} · {d.areas.find((a) => a.id === v.areaId)?.name}</title>
              </g>
            );
          })}

          {d.dims.map((dim) => (
            <g key={dim.uid}>
              <line x1={dim.a[0]} y1={dim.a[1]} x2={dim.b[0]} y2={dim.b[1]} stroke="#dc2626" strokeDasharray="4 3" />
              <text x={(dim.a[0] + dim.b[0]) / 2} y={(dim.a[1] + dim.b[1]) / 2 - 5} fontSize={12} fill="#dc2626">
                {(Math.hypot(dim.b[0] - dim.a[0], dim.b[1] - dim.a[1]) / d.settings.unitsPerMeter).toFixed(2)} m
              </text>
            </g>
          ))}
          {dimStart && <circle cx={dimStart[0]} cy={dimStart[1]} r={5} fill="#dc2626" />}
        </g>
      </svg>

      {/* Legend: explains colours and line styles without the user guessing */}
      {showLegend && (
        <div className="absolute left-3 top-3 w-56 rounded-lg border border-border bg-card p-3 text-xs shadow-card">
          <p className="mb-2 font-semibold text-foreground">Legend</p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-muted-foreground">
            {kinds.map((kind) => (
              <li key={kind} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: KIND_META[kind].color }} aria-hidden="true" />
                {KIND_META[kind].label}
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5 border-t border-border pt-2 text-muted-foreground">
            <LineSample color="#f97316" width={2.8} label="Uplink" />
            <LineSample color="#94a3b8" width={1.3} label="Access cable" />
            <LineSample color="#94a3b8" width={1.3} dash="7 5" label="Assumed, unverified" />
            <LineSample color="#94a3b8" width={1.3} dash="2 4" label="Planned" />
          </div>
          <p className="mt-3 border-t border-border pt-2 text-muted-foreground">
            Drag a device or rack to move it. Drag empty space to pan. Scroll to zoom.
          </p>
        </div>
      )}

      {overlay && <div className="absolute right-3 top-3 z-10">{overlay}</div>}

      {/* Floating view controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-card">
        <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
          <Minus />
        </Button>
        <span className="w-12 text-center text-xs font-medium tabular-nums text-muted-foreground" aria-live="polite">
          {Math.round(view.k * 100)}%
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
          <Plus />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Fit network to view" onClick={onFit}>
          <Maximize2 />
        </Button>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
        <Button variant={showLegend ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Toggle legend" aria-pressed={showLegend} onClick={() => setShowLegend((v) => !v)}>
          <Info />
        </Button>
        <Button variant={showMap ? 'secondary' : 'ghost'} size="icon-sm" aria-label="Toggle overview map" aria-pressed={showMap} onClick={() => setShowMap((v) => !v)}>
          <Compass />
        </Button>
      </div>

      {/* Overview minimap: click to jump the view */}
      {showMap && d.devices.length > 0 && (
        <div className="absolute bottom-3 right-3 rounded-lg border border-border bg-card p-2 shadow-card">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Overview</p>
          <svg
            width={MINI.w}
            height={MINI.h}
            viewBox={`0 0 ${MINI.w} ${MINI.h}`}
            className="block cursor-pointer rounded bg-muted/40"
            role="img"
            aria-label="Overview map. Click to move the view."
            onPointerDown={(e) => {
              const b = e.currentTarget.getBoundingClientRect();
              const wx = (e.clientX - b.left - offX) / scale + minX;
              const wy = (e.clientY - b.top - offY) / scale + minY;
              setView((v) => ({ ...v, x: size.w / 2 - wx * v.k, y: size.h / 2 - wy * v.k }));
            }}
          >
            {d.connections.map((c) => {
              const p1 = toMini(anchor(c.source).x, anchor(c.source).y), p2 = toMini(anchor(c.target).x, anchor(c.target).y);
              return <line key={c.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeOpacity={0.5} strokeWidth={0.6} />;
            })}
            {d.devices.map((v) => {
              const p = toMini(v.x, v.y);
              return <rect key={v.id} x={p.x - 2.5} y={p.y - 2} width={5} height={4} rx={1} fill={kindColor(v.kind)} />;
            })}
            <rect
              x={toMini(vx0, vy0).x}
              y={toMini(vx0, vy0).y}
              width={(vx1 - vx0) * scale}
              height={(vy1 - vy0) * scale}
              fill="hsl(var(--primary) / 0.08)"
              stroke="hsl(var(--primary))"
              strokeWidth={1}
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function LineSample({ color, width, dash, label }: { color: string; width: number; dash?: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="8" aria-hidden="true">
        <line x1="0" y1="4" x2="28" y2="4" stroke={color} strokeWidth={width} strokeDasharray={dash} />
      </svg>
      <span>{label}</span>
    </div>
  );
}
