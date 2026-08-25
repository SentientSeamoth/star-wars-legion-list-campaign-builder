import { useMemo, useState } from "react";
import { Settings2, Shield, Users, Save, AlertTriangle, X, Plus, Check, Copy, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildListText, slugifyListName } from "./listExport";
import { hexToRgba } from "../../lib/utils/color";
import { useArmyListBuilder } from "./hooks/useArmyListBuilder";
import type { BuilderEntry } from "./hooks/useArmyListBuilder";
import ModeToggle from "./components/ModeToggle";
import RankSection from "./components/RankSection";
import SavedListsPanel from "./components/SavedListsPanel";
import UnitDetailModal from "./components/UnitDetailModal";
import AddCommandCardPicker from "./components/AddCommandCardPicker";
import AddBattleDeckPicker from "./components/AddBattleDeckPicker";
import { toDbFaction } from "./uiMapping";
import type { UiFactionId } from "./uiMapping";
import type { CommandCard, GameFormat, ScenarioObjective } from "../../lib/types/manual_seed";

/**
 * ARMY CREATION SCREEN
 * -----------------------------------------------------------------------
 * First screen of the Legion app's list builder. Establishes the visual
 * language ("Deployment Manifest" concept) that later unit menus and
 * sub-menus should follow: dark holotable-style panels, faction-hue
 * theming, and a Traditional (bold/saturated) vs Custom (light/tinted)
 * visual distinction applied consistently to every section.
 *
 * Unit selection, save, and load are wired to the real backend via
 * useArmyListBuilder (src-tauri/src/commands/lists.rs) -- see
 * docs/DECISIONS.md for the 2026-08-23 entry covering the entry-
 * persistence model and the points-honesty call below.
 *
 * Converted from .jsx to .tsx 2026-08-24 (see docs/TODO.md) -- last of
 * the structural code-gap cleanup pass's file-touching waves, done after
 * the rank-validation UI below so the conversion captures the file's
 * final shape once rather than twice.
 *
 * DESIGN NOTE ON THE "ASSASSINS" FACTION / "TRADITIONAL"/"CUSTOM" MODE:
 * Both are UI-only vocabulary; the real backend values ("mercenary" and
 * "official"/"freeform") are bridged at the save/load boundary in
 * ./uiMapping.ts, not renamed here or in the data layer.
 *
 * DESIGN NOTE ON RANK LIMITS AND UNIT STATS:
 * Traditional-mode rank badges show REAL live validation as of 2026-08-24
 * (src-tauri/src/domain/list_validation.rs + commands/list_validation.rs,
 * checked against data/factions.json's sourced standard-army rank
 * bounds) -- "OK" once a saved list satisfies a rank's min/max, or the
 * real shortfall/overflow message otherwise. No badge shows at all until
 * the list is actually saved (nothing to validate yet) or in Custom mode
 * (freeform has no rank constraints). Unit rows
 * show a real point cost when `unit.stats.points_verified` is true (most
 * units, as of the 2026-08-23 card-extraction batches) and "cost unknown"
 * otherwise -- wounds/speed/defense columns stay absent, since those
 * stats are still unpopulated for most units. The header's points total
 * only sums verified-cost entries, with a separate count of unpriced
 * units rather than silently treating them as free. This screen doesn't
 * invent numbers that haven't been verified.
 *
 * Command cards are real and pickable as of 2026-08-24 (see
 * useArmyListBuilder's `toggleCommandCard`) -- but the library only has
 * the 4 generic cards (`data/command-cards.json` has zero commander-
 * specific ones yet), so hands built here are an honest preview, not a
 * complete 7-card hand. The battle deck is pickable too (same day,
 * `toggleBattleDeckCard`) -- data/scenarios.json only has ~6 Primary
 * Objective cards and ZERO Secondary/Advantage cards, an even sparser
 * gap than command cards, against a 9-card (3+3+3) real deck rule. See
 * docs/DECISIONS.md.
 */

interface FactionMeta {
  label: string;
  hue: string;
  accent?: string;
}

const FACTIONS: Record<UiFactionId, FactionMeta> = {
  separatist: { label: "Separatist", hue: "#2F7FD1" },
  republic: { label: "Republic", hue: "#8B5FE0" },
  rebel: { label: "Rebel", hue: "#3FA35A" },
  empire: { label: "Empire", hue: "#C23B3B" },
  assassins: { label: "Assassins", hue: "#1B1D22", accent: "#C9CBD3" },
};

interface RankDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

const RANKS: RankDef[] = [
  { id: "commander", label: "Commander", icon: Shield },
  { id: "operative", label: "Operative", icon: Shield },
  { id: "corps", label: "Corps", icon: Users },
  { id: "special-forces", label: "Special Forces", icon: Users },
  { id: "support", label: "Support", icon: Users },
  { id: "heavy", label: "Heavy", icon: Users },
];

const POINT_PRESETS: Array<{ label: string; value: number | null }> = [
  { label: "Standard · 1000", value: 1000 },
  { label: "Recon · 600", value: 600 },
  { label: "Custom", value: null },
];

interface ArmyCreationScreenProps {
  userId: string;
}

export default function ArmyCreationScreen({ userId }: ArmyCreationScreenProps) {
  const {
    loading,
    error,
    unitsById,
    keywords,
    upgrades,
    commandCards,
    scenarios,
    savedLists,
    listId,
    armyName,
    setArmyName,
    factionId,
    setFactionId,
    mode,
    setMode,
    entries,
    selectedCommandCardIds,
    selectedBattleDeckIds,
    validationIssues,
    availableUnitsForRank,
    addUnit,
    removeEntry,
    setEntryCount,
    setEntryUpgrades,
    toggleCommandCard,
    toggleBattleDeckCard,
    saveList,
    loadList,
    newList,
  } = useArmyListBuilder(userId);

  const [pointPreset, setPointPreset] = useState<number | null>(1000);
  const [customLimit, setCustomLimit] = useState(1000);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    commander: true,
    corps: true,
  });
  const [selectedEntryLocalKey, setSelectedEntryLocalKey] = useState<number | null>(null);
  const [addingCommandCard, setAddingCommandCard] = useState(false);
  const [addingBattleDeckCard, setAddingBattleDeckCard] = useState(false);

  const upgradesById = useMemo(() => new Map(upgrades.map((u) => [u.id, u])), [upgrades]);

  const faction = FACTIONS[factionId];
  const isTraditional = mode === "traditional";
  const pointLimit = pointPreset ?? customLimit;

  const rankEntries = useMemo(() => {
    const grouped: Record<string, BuilderEntry[]> = {};
    for (const rank of RANKS) grouped[rank.id] = [];
    for (const entry of entries) {
      const unit = unitsById.get(entry.unitId);
      if (unit && grouped[unit.rank]) grouped[unit.rank].push(entry);
    }
    return grouped;
  }, [entries, unitsById]);

  const totalUnitCount = entries.reduce((sum, e) => sum + e.count, 0);
  // Command cards can be owned by either rank -- Legion operatives (Boba
  // Fett, etc.) carry their own personal cards same as commanders, not
  // just the "commander" rank specifically.
  const personalityUnitIds = [...(rankEntries.commander || []), ...(rankEntries.operative || [])].map(
    (e) => e.unitId
  );
  const personalityNames = personalityUnitIds
    .map((id) => unitsById.get(id)?.name)
    .filter((name): name is string => Boolean(name));

  const dbFaction = toDbFaction(factionId);
  const selectedCommandCards = selectedCommandCardIds
    .map((id) => commandCards.find((c) => c.id === id))
    .filter((c): c is CommandCard => c != null);

  // Maps this screen's point-preset stepper to the real game_format field --
  // a custom point limit doesn't correspond to a real format, so battle
  // deck cards go unfiltered in that case rather than hidden.
  const gameFormat: GameFormat | null =
    pointPreset === 1000 ? "standard-1000" : pointPreset === 600 ? "recon-600" : null;
  const selectedScenarios = selectedBattleDeckIds
    .map((id) => scenarios.find((c) => c.id === id))
    .filter((c): c is ScenarioObjective => c != null);

  // Real total for the units whose cost is confirmed (unit.stats.points_verified) --
  // unpriced entries are counted separately rather than silently treated as
  // free, matching the honesty constraint in docs/UI_DESIGN.md. Equipped
  // upgrades with a verified cost are added in too; unverified-cost upgrades
  // are silently excluded from the sum rather than treated as free, same
  // principle as unpriced units.
  let total = 0;
  let unpricedCount = 0;
  for (const entry of entries) {
    const unit = unitsById.get(entry.unitId);
    const upgradePoints = entry.upgrades.reduce((sum, id) => {
      const u = upgradesById.get(id);
      return u?.points_verified && u.points != null ? sum + u.points : sum;
    }, 0);
    if (unit?.stats.points_verified && unit.stats.points != null) {
      total += (unit.stats.points + upgradePoints) * entry.count;
    } else {
      unpricedCount += entry.count;
    }
  }
  const overLimit = total > pointLimit;

  const exportText = useMemo(
    () =>
      buildListText({
        armyName,
        factionLabel: faction.label,
        modeLabel: isTraditional ? "Traditional" : "Custom",
        total,
        pointLimit,
        rankGroups: RANKS.map((rank) => ({
          label: rank.label,
          units: (rankEntries[rank.id] || []).map((entry) => ({
            name: unitsById.get(entry.unitId)?.name ?? entry.unitId,
            count: entry.count,
            upgradeNames: entry.upgrades
              .map((id) => upgradesById.get(id)?.name)
              .filter((name): name is string => Boolean(name)),
          })),
        })),
        commandCards: selectedCommandCards.map((c) => c.name),
        battleDeck: selectedScenarios.map((c) => c.name),
      }),
    [armyName, faction.label, isTraditional, total, pointLimit, rankEntries, unitsById, upgradesById, selectedCommandCards, selectedScenarios]
  );
  const [listCopied, setListCopied] = useState(false);

  async function handleCopyList() {
    try {
      await navigator.clipboard.writeText(exportText);
      setListCopied(true);
      setTimeout(() => setListCopied(false), 1500);
    } catch {
      // Clipboard permission denied/unavailable -- nothing more to do here.
    }
  }

  function handleExportList() {
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugifyListName(armyName)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const headerFill = hexToRgba(faction.hue, isTraditional ? 0.22 : 0.08);
  const headerBorder = hexToRgba(faction.accent || faction.hue, isTraditional ? 0.8 : 0.35);

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center text-sm text-slate-400"
        style={{ background: "#07090D" }}
      >
        Loading army builder...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full text-slate-100"
      style={{
        background:
          "radial-gradient(ellipse at top, #10131A 0%, #0A0D12 60%, #07090D 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @keyframes scanline-sweep {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .scanline::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.06), transparent);
          animation: scanline-sweep 5s linear infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .scanline::after { animation: none; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        {/* Top eyebrow */}
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <Settings2 size={12} />
          <span>Legion &middot; Army Creation</span>
        </div>

        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <SavedListsPanel
          savedLists={savedLists}
          currentListId={listId}
          onLoad={loadList}
          onNew={newList}
        />

        {/* ARMY META PANEL -- the "color-coded section" showing name, faction, points, mode */}
        <div
          className="relative overflow-hidden rounded-xl p-6 scanline"
          style={{
            background: headerFill,
            border: `1px solid ${headerBorder}`,
            borderWidth: isTraditional ? "2px" : "1px",
            borderStyle: isTraditional ? "solid" : "dashed",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                Army Name
              </label>
              <input
                value={armyName}
                onChange={(e) => setArmyName(e.target.value)}
                className="w-full bg-transparent text-2xl font-semibold text-slate-50 outline-none border-b border-transparent focus:border-slate-500 pb-1"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle mode={mode} setMode={setMode} />
              <button
                onClick={handleCopyList}
                className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 transition-colors"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
                title="Copy list as text"
              >
                {listCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={handleExportList}
                className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 transition-colors"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
                title="Export list as .txt"
              >
                <Download size={14} />
              </button>
              <button
                onClick={saveList}
                className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 transition-colors"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                <Save size={14} /> {listId ? "Save" : "Save List"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            {(Object.entries(FACTIONS) as Array<[UiFactionId, FactionMeta]>).map(([id, f]) => {
              const selected = id === factionId;
              return (
                <button
                  key={id}
                  onClick={() => setFactionId(id)}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform"
                  style={{
                    background: selected ? hexToRgba(f.hue, 0.9) : hexToRgba(f.hue, 0.15),
                    border: `1px solid ${hexToRgba(f.accent || f.hue, selected ? 1 : 0.4)}`,
                    color: selected ? (id === "assassins" ? f.accent : "#0A0D12") : "#CBD5E1",
                    transform: selected ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: f.accent || f.hue }}
                  />
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                Point Limit
              </label>
              <div className="flex items-center gap-2">
                {POINT_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPointPreset(p.value)}
                    className={`rounded px-3 py-1.5 text-xs font-semibold font-mono border ${
                      pointPreset === p.value
                        ? "border-slate-300 text-slate-100 bg-slate-800/60"
                        : "border-slate-700 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                {pointPreset === null && (
                  <input
                    type="number"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(Number(e.target.value) || 0)}
                    className="w-20 bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-100 outline-none"
                  />
                )}
              </div>
            </div>

            <div className="text-right max-w-[240px]">
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                Current Total
              </label>
              <div className="flex items-center gap-2 justify-end">
                {overLimit && <AlertTriangle size={14} className="text-amber-400" />}
                <span
                  className={`font-mono text-xl font-semibold ${overLimit ? "text-amber-400" : "text-slate-100"}`}
                >
                  {total} / {pointLimit}
                </span>
              </div>
              <div className="w-40 h-1.5 rounded-full bg-slate-800 mt-1.5 overflow-hidden ml-auto">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (total / pointLimit) * 100)}%`,
                    background: overLimit ? "#F59E0B" : faction.accent || faction.hue,
                  }}
                />
              </div>
              {unpricedCount > 0 && (
                <div className="text-[10px] text-slate-500 mt-1.5">
                  +{unpricedCount} unit{unpricedCount === 1 ? "" : "s"} with unpriced cost not
                  included ({totalUnitCount} total in list).
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/40 text-xs text-slate-400">
            {isTraditional ? (
              <span>
                <strong className="text-slate-200">Traditional</strong> &mdash; fixed point values and current unit-limit rules apply.
              </span>
            ) : (
              <span>
                <strong className="text-slate-200">Custom</strong> &mdash; any unit in any army, editable point costs, names, and stats.
              </span>
            )}
          </div>
        </div>

        {/* RANK SECTIONS */}
        <div className="space-y-3">
          {RANKS.map((rank) => (
            <RankSection
              key={rank.id}
              rank={rank}
              mode={mode}
              hue={faction.accent || faction.hue}
              entries={rankEntries[rank.id] || []}
              unitsById={unitsById}
              upgradesById={upgradesById}
              availableUnits={availableUnitsForRank(rank.id)}
              issues={validationIssues ? validationIssues.filter((i) => i.rank === rank.id) : null}
              open={!!openSections[rank.id]}
              onToggle={() =>
                setOpenSections((s) => ({ ...s, [rank.id]: !s[rank.id] }))
              }
              onAddUnit={addUnit}
              onRemoveEntry={removeEntry}
              onSetCount={setEntryCount}
              onOpenDetail={setSelectedEntryLocalKey}
            />
          ))}
        </div>

        {/* COMMAND CARDS -- bottom strip, filtered by mode. Real data as of
            2026-08-24; see the class doc comment above for the "only 4
            generic cards exist yet" caveat. */}
        <div
          className="rounded-lg p-4"
          style={{
            background: hexToRgba(faction.accent || faction.hue, isTraditional ? 0.14 : 0.05),
            border: `1px solid ${hexToRgba(faction.accent || faction.hue, isTraditional ? 0.6 : 0.25)}`,
            borderStyle: isTraditional ? "solid" : "dashed",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold tracking-wide text-slate-100"
              style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.04em" }}
            >
              COMMAND HAND
            </span>
            <span className="text-[11px] text-slate-500">
              {personalityNames.length
                ? `Commanders/Operatives: ${personalityNames.join(", ")}`
                : "No commander/operative in army yet"}
            </span>
          </div>
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              A full hand needs 7 cards (2×1-pip + 2×2-pip + 2×3-pip + Standing Orders); this
              library only has the 4 generic cards so far -- commander-specific cards aren't
              catalogued yet. Pick what's available.
            </span>
          </div>

          {selectedCommandCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {selectedCommandCards.map((c) => (
                <div
                  key={c.id}
                  className="text-left rounded-md border px-3 py-2"
                  style={{
                    background: hexToRgba(faction.accent || faction.hue, 0.25),
                    borderColor: hexToRgba(faction.accent || faction.hue, 0.9),
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-slate-900"
                      style={{ background: faction.accent || faction.hue }}
                    >
                      {c.pips ?? "?"}
                    </span>
                    <button
                      onClick={() => toggleCommandCard(c.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${c.name}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="text-xs text-slate-200 leading-tight">{c.name}</div>
                  <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                    {c.effect_verified && c.effect_description
                      ? c.effect_description
                      : "effect not yet verified"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {addingCommandCard ? (
            <AddCommandCardPicker
              allCommandCards={commandCards}
              unitsById={unitsById}
              dbFaction={dbFaction}
              presentUnitIds={personalityUnitIds}
              excludeIds={selectedCommandCardIds}
              allowBroaderScope={!isTraditional}
              onAdd={(id) => {
                toggleCommandCard(id);
                setAddingCommandCard(false);
              }}
              onCancel={() => setAddingCommandCard(false)}
            />
          ) : (
            <button
              onClick={() => setAddingCommandCard(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
            >
              <Plus size={13} /> Add Command Card
            </button>
          )}
        </div>

        {/* BATTLE DECK -- same shape as COMMAND HAND above. Real data as of
            2026-08-24; see the class doc comment for the "0 Secondary/
            Advantage cards" caveat. */}
        <div
          className="rounded-lg p-4"
          style={{
            background: hexToRgba(faction.accent || faction.hue, isTraditional ? 0.14 : 0.05),
            border: `1px solid ${hexToRgba(faction.accent || faction.hue, isTraditional ? 0.6 : 0.25)}`,
            borderStyle: isTraditional ? "solid" : "dashed",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold tracking-wide text-slate-100"
              style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.04em" }}
            >
              BATTLE DECK
            </span>
            <span className="text-[11px] text-slate-500">
              {gameFormat ? `Format: ${gameFormat}` : "Custom point limit -- all formats shown"}
            </span>
          </div>
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              A full deck needs 9 cards (3 Primary + 3 Secondary + 3 Advantage, no duplicates);
              this library only has Primary Objective cards so far -- Secondary and Advantage
              cards aren't catalogued yet. Pick what's available.
            </span>
          </div>

          {selectedScenarios.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {selectedScenarios.map((c) => (
                <div
                  key={c.id}
                  className="text-left rounded-md border px-3 py-2"
                  style={{
                    background: hexToRgba(faction.accent || faction.hue, 0.25),
                    borderColor: hexToRgba(faction.accent || faction.hue, 0.9),
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase tracking-wide text-slate-400">
                      {c.category.replace("-", " ")}
                    </span>
                    <button
                      onClick={() => toggleBattleDeckCard(c.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${c.name}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="text-xs text-slate-200 leading-tight">{c.name}</div>
                </div>
              ))}
            </div>
          )}

          {addingBattleDeckCard ? (
            <AddBattleDeckPicker
              allScenarios={scenarios}
              gameFormat={gameFormat}
              excludeIds={selectedBattleDeckIds}
              onAdd={(id) => {
                toggleBattleDeckCard(id);
                setAddingBattleDeckCard(false);
              }}
              onCancel={() => setAddingBattleDeckCard(false)}
            />
          ) : (
            <button
              onClick={() => setAddingBattleDeckCard(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
            >
              <Plus size={13} /> Add Battle Deck Card
            </button>
          )}
        </div>
      </div>

      {selectedEntryLocalKey != null &&
        (() => {
          const selectedEntry = entries.find((e) => e.localKey === selectedEntryLocalKey);
          const selectedUnit = selectedEntry && unitsById.get(selectedEntry.unitId);
          if (!selectedEntry || !selectedUnit) return null;
          return (
            <UnitDetailModal
              entry={selectedEntry}
              unit={selectedUnit}
              keywords={keywords}
              upgrades={upgrades}
              onClose={() => setSelectedEntryLocalKey(null)}
              onSetUpgrades={(upgradeIds) => setEntryUpgrades(selectedEntry.localKey, upgradeIds)}
            />
          );
        })()}
    </div>
  );
}
