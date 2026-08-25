import { X } from "lucide-react";
import type { Expansion, UserCollectionEntry } from "../../../lib/types/manual_seed";

interface OwnedExpansionsProps {
  owned: UserCollectionEntry[];
  expansionsById: Map<string, Expansion>;
  onRemove: (expansionId: string) => void;
}

export default function OwnedExpansions({ owned, expansionsById, onRemove }: OwnedExpansionsProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <h2
        className="text-sm font-semibold tracking-wide text-slate-100 mb-3"
        style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.04em" }}
      >
        OWNED PRODUCTS
      </h2>
      {owned.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-2">
          Nothing in your collection yet -- add a product from the catalog below.
        </div>
      ) : (
        <div className="space-y-2">
          {owned.map((entry) => {
            const expansion = expansionsById.get(entry.expansion_id);
            return (
              <div
                key={entry.expansion_id}
                className="flex items-center justify-between gap-3 rounded-md bg-slate-900/50 border border-slate-800 px-3 py-2"
              >
                <div>
                  <div className="text-sm text-slate-200">{expansion?.name ?? entry.expansion_id}</div>
                  <div className="text-[11px] text-slate-500 font-mono">x{entry.quantity_owned}</div>
                </div>
                <button
                  onClick={() => onRemove(entry.expansion_id)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${expansion?.name ?? entry.expansion_id}`}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
