import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { CommandCard, Faction, Unit } from "../../../lib/types/manual_seed";

type Scope = "army" | "faction" | "all";

interface AddCommandCardPickerProps {
  allCommandCards: CommandCard[];
  unitsById: Map<string, Unit>;
  dbFaction: Faction;
  /** Commander- or Operative-rank unit ids currently in the army. */
  presentUnitIds: string[];
  excludeIds: string[];
  /** Only Custom-mode lists get the "same faction" / "all cards" scope
   *  toggle -- Traditional mode is always scoped to "army". */
  allowBroaderScope: boolean;
  onAdd: (commandCardId: string) => void;
  onCancel: () => void;
}

function isInScope(
  card: CommandCard,
  scope: Scope,
  dbFaction: Faction,
  presentUnitIds: string[],
  unitsById: Map<string, Unit>
): boolean {
  if (scope === "all") return true;

  if (card.category === "generic") {
    if (card.faction_restriction && card.faction_restriction !== dbFaction) return false;
    return true;
  }

  // Commander-specific: legal in "army" scope only if its owning
  // commander/operative is actually in the list; "faction" scope also
  // allows any commander-specific card whose owner belongs to the chosen
  // faction, even if that unit isn't in the army yet ("other cards from
  // the same army type").
  if (!card.commander_unit_id) return false;
  if (presentUnitIds.includes(card.commander_unit_id)) return true;
  if (scope !== "faction") return false;
  const owner = unitsById.get(card.commander_unit_id);
  return owner ? owner.factions.includes(dbFaction) : false;
}

/**
 * "+ Add Command Card" picker, opened from ArmyCreationScreen -- mirrors
 * AddUnitPicker's shape. Default pool ("army" scope) is the 4 generic
 * cards plus any commander/operative-specific card whose owning unit is
 * actually in the list, per the project owner's explicit spec (2026-08-24).
 * Custom-mode lists additionally offer "faction" (same army/faction, not
 * just units present) and "all" (every command card in the library,
 * unrestricted) scopes.
 */
export default function AddCommandCardPicker({
  allCommandCards,
  unitsById,
  dbFaction,
  presentUnitIds,
  excludeIds,
  allowBroaderScope,
  onAdd,
  onCancel,
}: AddCommandCardPickerProps) {
  const [scope, setScope] = useState<Scope>("army");

  const available = useMemo(
    () =>
      allCommandCards.filter(
        (c) =>
          !excludeIds.includes(c.id) &&
          isInScope(c, scope, dbFaction, presentUnitIds, unitsById)
      ),
    [allCommandCards, scope, dbFaction, presentUnitIds, unitsById, excludeIds]
  );

  const [selected, setSelected] = useState(available[0]?.id ?? "");
  const selectedCard = available.find((c) => c.id === selected);

  return (
    <div className="border-t border-slate-800/60 pt-2 space-y-2">
      {allowBroaderScope && (
        <div className="flex items-center gap-1.5 text-[10px]">
          {(
            [
              ["army", "My Army"],
              ["faction", "Same Faction"],
              ["all", "All Cards"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setScope(value);
                setSelected("");
              }}
              className={`rounded px-2 py-1 uppercase tracking-wide border ${
                scope === value
                  ? "border-slate-400 text-slate-100 bg-slate-800/60"
                  : "border-slate-700 text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {available.length === 0 ? (
        <div className="text-xs text-slate-500 italic py-1">
          No command cards available in this scope yet.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
          >
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.pips}-pip · {c.name} —{" "}
                {c.category === "generic"
                  ? "Any Commander"
                  : unitsById.get(c.commander_unit_id ?? "")?.name ?? "Unknown Commander"}
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
      )}
      {selectedCard && (
        <div className="text-[10px] text-slate-500 leading-tight">
          {selectedCard.effect_verified && selectedCard.effect_description
            ? selectedCard.effect_description
            : "effect not yet verified"}
        </div>
      )}
    </div>
  );
}
