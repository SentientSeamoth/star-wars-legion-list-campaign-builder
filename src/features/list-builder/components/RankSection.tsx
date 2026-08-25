import { useState } from "react";
import { ChevronDown, ChevronRight, Minus, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hexToRgba } from "../../../lib/utils/color";
import AddUnitPicker from "./AddUnitPicker";
import type { Unit, Upgrade, ValidationIssue } from "../../../lib/types/manual_seed";
import type { BuilderEntry } from "../hooks/useArmyListBuilder";
import type { UiMode } from "../uiMapping";

interface RankDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface RankSectionProps {
  rank: RankDef;
  mode: UiMode;
  hue: string;
  entries: BuilderEntry[];
  unitsById: Map<string, Unit>;
  upgradesById: Map<string, Upgrade>;
  availableUnits: Unit[];
  /** Real backend rank-count validation for this rank -- see
   *  commands/list_validation.rs. `null` means "not checked yet" (no
   *  saved list to validate against, or Custom mode has no rank
   *  constraints to check) -- distinct from an empty array, which means
   *  "checked, no issues." Never claim "OK" when it hasn't actually been
   *  checked. */
  issues: ValidationIssue[] | null;
  open: boolean;
  onToggle: () => void;
  onAddUnit: (unitId: string) => void;
  onRemoveEntry: (localKey: number) => void;
  onSetCount: (localKey: number, count: number) => void;
  onOpenDetail: (localKey: number) => void;
}

/**
 * Wounds/speed/defense columns are still absent from each row -- those
 * stats remain unpopulated for most units (see docs/TODO.md), so there's
 * nothing honest to show there yet, matching the "don't guess a number"
 * rule in docs/UI_DESIGN.md. Points are the one stat with real,
 * per-unit-verified data now (the 2026-08-23 card-extraction batches) --
 * shown only when `unit.stats.points_verified` is true, "cost unknown"
 * otherwise.
 */
export default function RankSection({
  rank,
  mode,
  hue,
  entries,
  unitsById,
  upgradesById,
  availableUnits,
  issues,
  open,
  onToggle,
  onAddUnit,
  onRemoveEntry,
  onSetCount,
  onOpenDetail,
}: RankSectionProps) {
  const [picking, setPicking] = useState(false);
  const Icon = rank.icon;
  const isTraditional = mode === "traditional";
  // Sum each entry's `count`, not `entries.length` -- a single entry can
  // represent many miniatures of the same unit (e.g. a 50-count entry),
  // and multiple entries of the same unit are also possible (the "+ Add
  // Unit" flow always creates a new entry rather than merging into an
  // existing one of the same unit).
  const rankUnitCount = entries.reduce((sum, e) => sum + e.count, 0);
  const fill = hexToRgba(hue, isTraditional ? 0.16 : 0.06);
  const border = hexToRgba(hue, isTraditional ? 0.65 : 0.28);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: fill,
        border: `1px solid ${border}`,
        borderStyle: isTraditional ? "solid" : "dashed",
      }}
    >
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
          <Icon size={16} style={{ color: hue }} />
          <span
            className="text-sm font-semibold tracking-wide text-slate-100"
            style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.04em" }}
          >
            {rank.label.toUpperCase()}
          </span>
          {isTraditional && issues != null && issues.length > 0 && (
            <span className="text-[11px] uppercase tracking-wider text-amber-400">
              {issues.map((i) => i.message).join("; ")}
            </span>
          )}
          {isTraditional && issues != null && issues.length === 0 && (
            <span className="text-[11px] uppercase tracking-wider text-emerald-500">OK</span>
          )}
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {rankUnitCount} unit{rankUnitCount === 1 ? "" : "s"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {entries.length === 0 && (
            <div className="text-xs text-slate-500 italic py-2 border-t border-slate-800/60">
              No units in this slot yet.
            </div>
          )}
          {entries.map((entry) => {
            const unit = unitsById.get(entry.unitId);
            const hasCost = unit?.stats.points_verified && unit.stats.points != null;
            const equippedUpgrades = entry.upgrades
              .map((id) => upgradesById.get(id))
              .filter((u): u is Upgrade => u != null);
            const upgradePoints = equippedUpgrades.reduce(
              (sum, u) => sum + (u.points_verified && u.points != null ? u.points : 0),
              0
            );
            const allUpgradeCostsKnown = equippedUpgrades.every(
              (u) => u.points_verified && u.points != null
            );
            return (
              <div
                key={entry.localKey}
                className="flex items-center justify-between rounded-md bg-slate-950/50 px-3 py-2 border border-slate-800"
              >
                <button
                  onClick={() => onOpenDetail(entry.localKey)}
                  className="flex flex-col items-start text-left hover:text-slate-50 transition-colors"
                >
                  <span className="text-sm text-slate-200">{unit?.name ?? entry.unitId}</span>
                  {equippedUpgrades.length > 0 && (
                    <span className="text-[10px] text-slate-500">
                      {equippedUpgrades.map((u) => u.name).join(", ")}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-400 w-16 text-right">
                    {hasCost
                      ? `${(unit!.stats.points as number) * entry.count + upgradePoints * entry.count}${
                          allUpgradeCostsKnown ? "" : "+"
                        } pts`
                      : "cost unknown"}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs text-slate-300">
                    <button
                      onClick={() => onSetCount(entry.localKey, entry.count - 1)}
                      disabled={entry.count <= 1}
                      className="w-5 h-5 flex items-center justify-center rounded border border-slate-700 disabled:opacity-30 hover:border-slate-500"
                      aria-label={`Decrease ${unit?.name ?? entry.unitId} count`}
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-5 text-center">{entry.count}</span>
                    <button
                      onClick={() => onSetCount(entry.localKey, entry.count + 1)}
                      className="w-5 h-5 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500"
                      aria-label={`Increase ${unit?.name ?? entry.unitId} count`}
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveEntry(entry.localKey)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    aria-label={`Remove ${unit?.name ?? entry.unitId}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {picking ? (
            <AddUnitPicker
              units={availableUnits}
              onAdd={(unitId) => {
                onAddUnit(unitId);
                setPicking(false);
              }}
              onCancel={() => setPicking(false)}
            />
          ) : (
            <button
              onClick={() => setPicking(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
            >
              <Plus size={13} /> Add Unit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
