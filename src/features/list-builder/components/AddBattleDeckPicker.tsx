import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { GameFormat, ScenarioObjective } from "../../../lib/types/manual_seed";

const CATEGORY_LABELS: Record<ScenarioObjective["category"], string> = {
  primary: "Primary Objective",
  secondary: "Secondary Objective",
  advantage: "Advantage",
  recon: "Recon",
  "narrative-scenario": "Narrative Scenario",
};

interface AddBattleDeckPickerProps {
  allScenarios: ScenarioObjective[];
  /** null means "no specific format selected" (a custom point limit) --
   *  every card is shown regardless of game_format in that case. */
  gameFormat: GameFormat | null;
  excludeIds: string[];
  onAdd: (scenarioObjectiveId: string) => void;
  onCancel: () => void;
}

/**
 * "+ Add Battle Deck Card" picker, mirroring AddCommandCardPicker's shape.
 * Every scenario objective card is generic/universal (unlike command cards,
 * none are owned by a specific unit or faction), so there's no equivalent
 * of that picker's scope toggle -- the only real filter is game format.
 * The category is always shown in the dropdown from the start (a direct
 * lesson from the command-card picker's first version, which initially
 * left generic cards' "who is this for" unlabeled -- see
 * docs/DECISIONS.md's 2026-08-24 entries).
 */
export default function AddBattleDeckPicker({
  allScenarios,
  gameFormat,
  excludeIds,
  onAdd,
  onCancel,
}: AddBattleDeckPickerProps) {
  const available = useMemo(
    () =>
      allScenarios.filter(
        (c) => !excludeIds.includes(c.id) && (gameFormat == null || c.game_format === gameFormat)
      ),
    [allScenarios, gameFormat, excludeIds]
  );

  const [selected, setSelected] = useState(available[0]?.id ?? "");
  const selectedCard = available.find((c) => c.id === selected);

  if (available.length === 0) {
    return (
      <div className="border-t border-slate-800/60 pt-2 space-y-2">
        <div className="text-xs text-slate-500 italic py-1">
          No battle deck cards available for this format yet.
        </div>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 px-1">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800/60 pt-2 space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
        >
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {CATEGORY_LABELS[c.category]}
            </option>
          ))}
        </select>
        <button
          onClick={() => selected && onAdd(selected)}
          className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
        >
          <Plus size={12} /> Add
        </button>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 px-1">
          Cancel
        </button>
      </div>
      {selectedCard && (
        <div className="text-[10px] text-slate-500 leading-tight">
          {selectedCard.victory_condition_verified && selectedCard.victory_condition
            ? selectedCard.victory_condition
            : "victory condition not yet verified"}
        </div>
      )}
    </div>
  );
}
