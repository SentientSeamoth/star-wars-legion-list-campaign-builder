import { useState } from "react";
import { Plus } from "lucide-react";
import type { Expansion } from "../../../lib/types/manual_seed";

interface ExpansionCatalogProps {
  expansions: Expansion[];
  ownedIds: Set<string>;
  onAdd: (expansionId: string, quantity: number) => void;
}

export default function ExpansionCatalog({ expansions, ownedIds, onAdd }: ExpansionCatalogProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <h2
        className="text-sm font-semibold tracking-wide text-slate-100 mb-3"
        style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.04em" }}
      >
        PRODUCT CATALOG
      </h2>
      {expansions.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-2">No products in the reference library yet.</div>
      ) : (
        <div className="space-y-2">
          {expansions.map((expansion) => (
            <ExpansionRow
              key={expansion.id}
              expansion={expansion}
              owned={ownedIds.has(expansion.id)}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpansionRow({
  expansion,
  owned,
  onAdd,
}: {
  expansion: Expansion;
  owned: boolean;
  onAdd: (expansionId: string, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2">
      <div>
        <div className="text-sm text-slate-200">{expansion.name}</div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          {expansion.product_type}
          {owned ? " · owned" : ""}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(ev) => setQuantity(Math.max(1, Number(ev.target.value) || 1))}
          className="w-14 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100 outline-none"
        />
        <button
          onClick={() => onAdd(expansion.id, quantity)}
          className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
        >
          <Plus size={12} /> {owned ? "Update" : "Add"}
        </button>
      </div>
    </div>
  );
}
