import { useState } from "react";
import { Plus } from "lucide-react";
import type { Unit } from "../../../lib/types/manual_seed";

interface AddUnitPickerProps {
  units: Unit[];
  onAdd: (unitId: string) => void;
  onCancel: () => void;
}

export default function AddUnitPicker({ units, onAdd, onCancel }: AddUnitPickerProps) {
  const [selected, setSelected] = useState(units[0]?.id ?? "");

  if (units.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-2 border-t border-slate-800/60">
        No active units available for this faction/rank yet.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-slate-800/60 pt-2">
      <select
        value={selected}
        onChange={(ev) => setSelected(ev.target.value)}
        className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => selected && onAdd(selected)}
        className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
      >
        <Plus size={12} /> Add
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-slate-500 hover:text-slate-300 px-1"
      >
        Cancel
      </button>
    </div>
  );
}
