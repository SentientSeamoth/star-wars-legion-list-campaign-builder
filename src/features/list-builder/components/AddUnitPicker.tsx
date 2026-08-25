import { useState } from "react";
import { Plus } from "lucide-react";
import type { Unit } from "../../../lib/types/manual_seed";

interface AddUnitPickerProps {
  units: Unit[];
  /** unit id -> total physical miniatures owned. `null` means the profile
   *  has no collection data recorded -- the "owned only" filter and the
   *  per-unit ownership hint both stay hidden in that case. */
  ownedCountByUnitId: Map<string, number> | null;
  onAdd: (unitId: string) => void;
  onCancel: () => void;
}

export default function AddUnitPicker({
  units,
  ownedCountByUnitId,
  onAdd,
  onCancel,
}: AddUnitPickerProps) {
  const [ownedOnly, setOwnedOnly] = useState(false);
  const filtered =
    ownedCountByUnitId != null && ownedOnly
      ? units.filter((u) => (ownedCountByUnitId.get(u.id) ?? 0) > 0)
      : units;
  const [selected, setSelected] = useState(filtered[0]?.id ?? "");
  const selectedStillValid = filtered.some((u) => u.id === selected);
  const currentSelection = selectedStillValid ? selected : filtered[0]?.id ?? "";

  if (units.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-2 border-t border-slate-800/60">
        No active units available for this faction/rank yet.
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800/60 pt-2 space-y-2">
      {ownedCountByUnitId != null && (
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(ev) => setOwnedOnly(ev.target.checked)}
            className="accent-slate-500"
          />
          Owned only
        </label>
      )}
      <div className="flex items-center gap-2">
        {filtered.length === 0 ? (
          <div className="flex-1 text-xs text-slate-500 italic py-1">
            No owned units available for this faction/rank.
          </div>
        ) : (
          <>
            <select
              value={currentSelection}
              onChange={(ev) => setSelected(ev.target.value)}
              className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
            >
              {filtered.map((u) => {
                const owned = ownedCountByUnitId?.get(u.id) ?? 0;
                return (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {ownedCountByUnitId != null
                      ? owned > 0
                        ? ` — owned: ${owned}`
                        : " — not owned"
                      : ""}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => currentSelection && onAdd(currentSelection)}
              className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          </>
        )}
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 px-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
