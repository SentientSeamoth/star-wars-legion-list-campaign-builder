import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Unit, UserUnitOwnership } from "../../../lib/types/manual_seed";

interface UnitOwnershipTableProps {
  ownership: UserUnitOwnership[];
  unitsById: Map<string, Unit>;
  onAdjust: (unitId: string, delta: number, reason?: string) => void;
  onClear: (unitId: string) => void;
}

export default function UnitOwnershipTable({
  ownership,
  unitsById,
  onAdjust,
  onClear,
}: UnitOwnershipTableProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <h2
        className="text-sm font-semibold tracking-wide text-slate-100 mb-3"
        style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.04em" }}
      >
        UNIT OWNERSHIP
      </h2>
      {ownership.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-2">
          Own a product to see which units you have miniatures for.
        </div>
      ) : (
        <div className="space-y-2">
          {ownership.map((row) => (
            <UnitOwnershipRow
              key={row.unit_id}
              row={row}
              unit={unitsById.get(row.unit_id)}
              onAdjust={onAdjust}
              onClear={onClear}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnitOwnershipRow({
  row,
  unit,
  onAdjust,
  onClear,
}: {
  row: UserUnitOwnership;
  unit: Unit | undefined;
  onAdjust: (unitId: string, delta: number, reason?: string) => void;
  onClear: (unitId: string) => void;
}) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [delta, setDelta] = useState(-1);
  const [reason, setReason] = useState("");

  return (
    <div className="rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-200">{unit?.name ?? row.unit_id}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {row.from_products} from products
            {row.override_delta !== 0
              ? ` · ${row.override_delta > 0 ? "+" : ""}${row.override_delta} override`
              : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-semibold text-slate-100">{row.total_owned}</span>
          <button
            onClick={() => setShowAdjust((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-200 underline decoration-dotted"
          >
            adjust
          </button>
          {row.override_delta !== 0 && (
            <button
              onClick={() => onClear(row.unit_id)}
              className="text-slate-500 hover:text-amber-400 transition-colors"
              aria-label={`Clear override for ${unit?.name ?? row.unit_id}`}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
      {showAdjust && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2">
          <input
            type="number"
            value={delta}
            onChange={(ev) => setDelta(Number(ev.target.value) || 0)}
            className="w-16 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100 outline-none"
          />
          <input
            type="text"
            placeholder="reason (optional)"
            value={reason}
            onChange={(ev) => setReason(ev.target.value)}
            className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 outline-none"
          />
          <button
            onClick={() => {
              onAdjust(row.unit_id, delta, reason || undefined);
              setShowAdjust(false);
              setReason("");
            }}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
