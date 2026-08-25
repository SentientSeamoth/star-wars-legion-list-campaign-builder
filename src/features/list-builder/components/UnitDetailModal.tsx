import { useMemo } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { Keyword, Unit, Upgrade } from "../../../lib/types/manual_seed";
import type { BuilderEntry } from "../hooks/useArmyListBuilder";
import { resolveKeywordId } from "../keywordResolve";

interface UnitDetailModalProps {
  entry: BuilderEntry;
  unit: Unit;
  keywords: Keyword[];
  upgrades: Upgrade[];
  onClose: () => void;
  onSetUpgrades: (upgradeIds: string[]) => void;
}

/**
 * Click-to-open detail popup for a single army-list entry: unit card info,
 * keyword descriptions, and a best-effort upgrade-equip picker. See
 * docs/DECISIONS.md's 2026-08-23 "upgrade equipping" entry for why the
 * upgrade bar here is a best-effort stand-in rather than a verified slot
 * list -- units.json's `upgrade_bar` field isn't populated for any unit
 * yet, so this offers every generic-category upgrade card instead of a
 * real per-unit slot layout.
 */
export default function UnitDetailModal({
  entry,
  unit,
  keywords,
  upgrades,
  onClose,
  onSetUpgrades,
}: UnitDetailModalProps) {
  const keywordsById = useMemo(() => new Map(keywords.map((k) => [k.id, k])), [keywords]);
  const knownKeywordIds = useMemo(() => new Set(keywords.map((k) => k.id)), [keywords]);
  const upgradesById = useMemo(() => new Map(upgrades.map((u) => [u.id, u])), [upgrades]);

  const categories = useMemo(() => {
    const set = new Set(upgrades.map((u) => u.category));
    return Array.from(set).sort();
  }, [upgrades]);

  const resolvedKeywords = useMemo(
    () =>
      (unit.stats.keywords ?? []).map((raw) => {
        const id = resolveKeywordId(raw, knownKeywordIds);
        return { raw, keyword: id ? keywordsById.get(id) ?? null : null };
      }),
    [unit.stats.keywords, knownKeywordIds, keywordsById]
  );

  function selectedForCategory(category: string): string {
    return entry.upgrades.find((id) => upgradesById.get(id)?.category === category) ?? "";
  }

  function handleCategoryChange(category: string, upgradeId: string) {
    const withoutCategory = entry.upgrades.filter(
      (id) => upgradesById.get(id)?.category !== category
    );
    onSetUpgrades(upgradeId ? [...withoutCategory, upgradeId] : withoutCategory);
  }

  const s = unit.stats;
  const hasWeapons = Array.isArray(s.weapons) && s.weapons.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#0A0D12] text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <h2
              className="text-xl font-semibold text-slate-50"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              {unit.name}
            </h2>
            {unit.subtitle && <div className="text-xs text-slate-400">{unit.subtitle}</div>}
            <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
              {unit.rank}
              {unit.unique ? " · Unique" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Stat block -- honesty-gated, same as RankSection/ArmyCreationScreen: only
              show a stat when it's actually known, never a guessed/default value. */}
          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            <Stat label="Points" value={s.points_verified && s.points != null ? `${s.points}` : "unknown"} />
            <Stat label="Wound Thresh." value={s.wound_threshold ?? "—"} />
            <Stat label="Courage/Res." value={s.courage ?? s.resilience ?? "—"} />
            <Stat label="Speed" value={s.speed ?? "—"} />
            <Stat label="Defense Die" value={s.defense_die ?? "—"} />
            <Stat
              label="Surges"
              value={
                s.attack_surge || s.defense_surge
                  ? `${s.attack_surge ?? "-"} / ${s.defense_surge ?? "-"}`
                  : "—"
              }
            />
          </div>

          {/* Weapons */}
          {hasWeapons && (
            <Section title="Weapons">
              <div className="space-y-1.5">
                {(s.weapons as Array<{ name: string; range: string; dice: string; keywords: string[] }>).map(
                  (w, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md bg-slate-950/50 px-3 py-1.5 text-xs"
                    >
                      <span className="text-slate-200">{w.name}</span>
                      <span className="font-mono text-slate-400">
                        {w.range} · {w.dice}
                        {w.keywords.length > 0 ? ` · ${w.keywords.join(", ")}` : ""}
                      </span>
                    </div>
                  )
                )}
              </div>
            </Section>
          )}

          {/* Keywords */}
          {resolvedKeywords.length > 0 && (
            <Section title="Keywords">
              <div className="space-y-2">
                {resolvedKeywords.map(({ raw, keyword }, i) => (
                  <div key={i} className="rounded-md bg-slate-950/50 px-3 py-2 text-xs">
                    <div className="font-semibold text-slate-200">{keyword?.name ?? raw}</div>
                    <div className="mt-0.5 text-slate-400">
                      {keyword?.description ?? "Not in the keyword library yet -- no description available."}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Upgrade bar -- best-effort picker, see component doc comment. */}
          {categories.length > 0 && (
            <Section title="Upgrade Bar">
              <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>
                  This unit's real upgrade-slot layout isn't sourced yet -- showing all generic
                  upgrade categories as a best-effort stand-in, not a verified slot list.
                </span>
              </div>
              <div className="space-y-2">
                {categories.map((category) => {
                  const options = upgrades.filter((u) => u.category === category);
                  return (
                    <div key={category} className="flex items-center gap-2">
                      <label className="w-20 shrink-0 text-[11px] uppercase tracking-wider text-slate-400">
                        {category}
                      </label>
                      <select
                        value={selectedForCategory(category)}
                        onChange={(e) => handleCategoryChange(category, e.target.value)}
                        className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
                      >
                        <option value="">None equipped</option>
                        {options.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                            {u.points_verified && u.points != null ? ` (${u.points} pts)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-950/50 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-100">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
        style={{ fontFamily: "'Rajdhani', sans-serif" }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
