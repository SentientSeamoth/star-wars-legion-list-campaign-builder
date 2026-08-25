import { useMemo } from "react";
import { Boxes } from "lucide-react";
import { useCollection } from "./hooks/useCollection";
import ExpansionCatalog from "./components/ExpansionCatalog";
import OwnedExpansions from "./components/OwnedExpansions";
import UnitOwnershipTable from "./components/UnitOwnershipTable";

interface CollectionScreenProps {
  userId: string;
}

/**
 * "My Collection" -- browse the product catalog, track what you own, and
 * see the units that ownership derives (plus manual overrides for proxies/
 * losses/trades). See src-tauri/migrations/0002_collection.sql for the
 * product-level-ownership design this screen is a thin view over. `userId`
 * comes from the ProfilePicker in App.tsx.
 */
export default function CollectionScreen({ userId }: CollectionScreenProps) {
  const {
    loading,
    error,
    expansions,
    units,
    owned,
    ownership,
    addExpansion,
    removeExpansion,
    adjustUnitOverride,
    clearUnitOverride,
  } = useCollection(userId);

  const expansionsById = useMemo(() => new Map(expansions.map((e) => [e.id, e])), [expansions]);
  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const ownedIds = useMemo(() => new Set(owned.map((o) => o.expansion_id)), [owned]);

  return (
    <div
      className="min-h-screen w-full text-slate-100"
      style={{
        background: "radial-gradient(ellipse at top, #10131A 0%, #0A0D12 60%, #07090D 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <Boxes size={12} />
          <span>Legion &middot; My Collection</span>
        </div>

        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(79, 209, 197, 0.08)",
            border: "1px solid rgba(79, 209, 197, 0.35)",
          }}
        >
          <h1 className="text-2xl font-semibold text-slate-50" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            My Collection
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Products you own drive which units you have physical miniatures for. Add a
            product below, or adjust a unit directly for proxies, losses, or trades.
          </p>
        </div>

        {loading && <div className="text-sm text-slate-400">Loading collection...</div>}
        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <OwnedExpansions owned={owned} expansionsById={expansionsById} onRemove={removeExpansion} />
            <UnitOwnershipTable
              ownership={ownership}
              unitsById={unitsById}
              onAdjust={adjustUnitOverride}
              onClear={clearUnitOverride}
            />
            <ExpansionCatalog expansions={expansions} ownedIds={ownedIds} onAdd={addExpansion} />
          </>
        )}
      </div>
    </div>
  );
}
