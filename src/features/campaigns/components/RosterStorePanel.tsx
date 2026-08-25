import { useMemo, useState } from "react";
import { Minus, Plus, Skull, Trash2 } from "lucide-react";
import type { CampaignState } from "../CampaignDashboardScreen";
import type { CampaignStoreItem, Unit } from "../../../lib/types/manual_seed";

export default function RosterStorePanel({
  campaignState,
  participantId,
}: {
  campaignState: CampaignState;
  participantId: string;
}) {
  const {
    detail,
    units,
    addFreeRosterEntry,
    applyCasualty,
    retireEntry,
    deleteRosterEntry,
    addStoreItem,
    addStoreModifier,
    deleteStoreModifier,
    deleteStoreItem,
    buyStoreItem,
  } = campaignState;

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  if (!detail) return null;
  const roster = detail.roster_entries.filter((r) => r.participant_id === participantId);
  const totalSpent = detail.purchases
    .filter((p) => p.participant_id === participantId)
    .reduce((sum, p) => sum + p.credits_spent, 0);
  const participant = detail.participants.find((p) => p.id === participantId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          Roster
        </h2>
        {roster.length === 0 && <div className="text-sm text-slate-500">No units recruited yet.</div>}
        <div className="space-y-2">
          {roster.map((r) => {
            const unit = r.unit_id ? unitsById.get(r.unit_id) : undefined;
            const alive = r.models_total - r.models_lost;
            return (
              <div
                key={r.id}
                className={`rounded-md border px-4 py-3 ${
                  r.retired ? "border-slate-900 bg-slate-950/50 opacity-50" : "border-slate-800 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-slate-100">
                      {r.nickname || unit?.name || "Unlinked unit"}
                    </span>
                    {r.is_specialty && (
                      <span className="ml-2 rounded-full bg-purple-950/50 border border-purple-800 px-1.5 py-0.5 text-[10px] text-purple-300">
                        specialty
                      </span>
                    )}
                    {r.retired && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-950/50 border border-red-800 px-1.5 py-0.5 text-[10px] text-red-300">
                        <Skull size={10} /> retired
                      </span>
                    )}
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {alive}/{r.models_total} models{unit ? ` · ${unit.name}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!r.retired && (
                      <>
                        <button
                          onClick={() => applyCasualty(r.id, 1)}
                          className="rounded border border-slate-700 p-1 text-slate-400 hover:border-red-700 hover:text-red-300"
                          aria-label="Record a casualty"
                        >
                          <Minus size={12} />
                        </button>
                        <button
                          onClick={() => applyCasualty(r.id, -1)}
                          className="rounded border border-slate-700 p-1 text-slate-400 hover:border-emerald-700 hover:text-emerald-300"
                          aria-label="Undo a casualty"
                        >
                          <Plus size={12} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => retireEntry(r.id, !r.retired)}
                      className="ml-1 text-[11px] text-slate-500 hover:text-slate-300"
                    >
                      {r.retired ? "revive" : "retire"}
                    </button>
                    <button onClick={() => deleteRosterEntry(r.id)} className="ml-1 text-slate-600 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <FreeUnitForm units={units} onAdd={(unitId, nickname, modelsTotal, isSpecialty) =>
          addFreeRosterEntry(participantId, unitId, nickname, modelsTotal, isSpecialty)
        } />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Store
          </h2>
          <span className="text-[11px] text-slate-500">
            {participant?.credits_balance ?? 0} credits &middot; {totalSpent} spent lifetime
          </span>
        </div>
        {detail.store_items.length === 0 && <div className="text-sm text-slate-500">No store items yet.</div>}
        <div className="space-y-2">
          {detail.store_items.map((item) => {
            const ownedCount = detail.purchases.filter(
              (p) => p.participant_id === participantId && p.store_item_id === item.id
            ).length;
            const unlocked = item.unlock_spend_threshold == null || totalSpent >= item.unlock_spend_threshold;
            const atMax = item.max_count != null && ownedCount >= item.max_count;
            return (
              <StoreItemRow
                key={item.id}
                item={item}
                unlocked={unlocked}
                atMax={atMax}
                totalSpent={totalSpent}
                unit={item.unit_id ? unitsById.get(item.unit_id) : undefined}
                onAddModifier={(label, cost) => addStoreModifier(item.id, label, cost, item.modifiers.length)}
                onDeleteModifier={(modifierId) => deleteStoreModifier(item.id, modifierId)}
                onDelete={() => deleteStoreItem(item.id)}
                onBuy={(creditsSpent, modelsTotal, nickname, isSpecialty) =>
                  buyStoreItem(participantId, item.id, creditsSpent, modelsTotal, nickname, isSpecialty)
                }
              />
            );
          })}
        </div>
        <AddStoreItemForm units={units} onAdd={addStoreItem} />
      </div>
    </div>
  );
}

function FreeUnitForm({
  units,
  onAdd,
}: {
  units: CampaignState["units"];
  onAdd: (unitId: string | null, nickname: string | null, modelsTotal: number, isSpecialty: boolean) => void;
}) {
  const [unitId, setUnitId] = useState("");
  const [nickname, setNickname] = useState("");
  const [modelsTotal, setModelsTotal] = useState("1");

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-slate-800 px-3 py-2">
      <span className="text-[11px] text-slate-500">Grant a free unit:</span>
      <select
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
      >
        <option value="">(unlinked)</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Nickname (optional)"
        className="w-32 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
      />
      <input
        type="number"
        value={modelsTotal}
        onChange={(e) => setModelsTotal(e.target.value)}
        className="w-14 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
      />
      <button
        onClick={() => {
          onAdd(unitId || null, nickname.trim() || null, Number(modelsTotal) || 1, false);
          setNickname("");
        }}
        className="text-[11px] text-slate-400 hover:text-slate-200"
      >
        + add
      </button>
    </div>
  );
}

function StoreItemRow({
  item,
  unlocked,
  atMax,
  totalSpent,
  unit,
  onAddModifier,
  onDeleteModifier,
  onDelete,
  onBuy,
}: {
  item: CampaignStoreItem;
  unlocked: boolean;
  atMax: boolean;
  totalSpent: number;
  unit: Unit | undefined;
  onAddModifier: (label: string, cost: number) => void;
  onDeleteModifier: (modifierId: string) => void;
  onDelete: () => void;
  onBuy: (creditsSpent: number, modelsTotal: number, nickname: string | null, isSpecialty: boolean) => void;
}) {
  const [showBuy, setShowBuy] = useState(false);
  const [creditsSpent, setCreditsSpent] = useState(String(item.base_cost));
  const [modelsTotal, setModelsTotal] = useState(String(unit?.stats.base_count ?? 1));
  const [nickname, setNickname] = useState("");
  const [isSpecialty, setIsSpecialty] = useState(false);
  const [modLabel, setModLabel] = useState("");
  const [modCost, setModCost] = useState("0");

  const disabled = !unlocked || atMax;

  return (
    <div className={`rounded-md border px-4 py-3 ${disabled ? "border-slate-900 bg-slate-950/40" : "border-slate-800 bg-slate-900/50"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-sm font-semibold text-slate-100">{item.display_name}</span>
          <span className="ml-2 text-xs text-amber-400">{item.base_cost} credits</span>
          {item.unlock_only && (
            <span className="ml-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">unlock only</span>
          )}
          {item.unlock_spend_threshold != null && !unlocked && (
            <div className="mt-0.5 text-[11px] text-slate-500">
              Unlocks at {item.unlock_spend_threshold} total credits spent (currently {totalSpent}).
            </div>
          )}
          {item.max_count != null && (
            <div className="mt-0.5 text-[11px] text-slate-500">Max {item.max_count} in roster.</div>
          )}
          {item.modifiers.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {item.modifiers.map((m) => (
                <span key={m.id} className="flex items-center gap-1 rounded bg-slate-950/60 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {m.label} +{m.cost}
                  <button onClick={() => onDeleteModifier(m.id)} className="text-slate-600 hover:text-red-400">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowBuy((s) => !s)}
            disabled={disabled}
            className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Buy
          </button>
          <button onClick={onDelete} className="text-slate-600 hover:text-red-400">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {showBuy && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
          <label className="text-[11px] text-slate-500">Credits</label>
          <input
            type="number"
            value={creditsSpent}
            onChange={(e) => setCreditsSpent(e.target.value)}
            className="w-16 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
          />
          <label className="text-[11px] text-slate-500">Models</label>
          <input
            type="number"
            value={modelsTotal}
            onChange={(e) => setModelsTotal(e.target.value)}
            className="w-14 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
          />
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (optional)"
            className="w-28 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
          />
          <label className="flex items-center gap-1 text-[11px] text-slate-500">
            <input type="checkbox" checked={isSpecialty} onChange={(e) => setIsSpecialty(e.target.checked)} />
            specialty
          </label>
          <button
            onClick={() => {
              onBuy(Number(creditsSpent) || 0, Number(modelsTotal) || 1, nickname.trim() || null, isSpecialty);
              setShowBuy(false);
              setNickname("");
            }}
            className="rounded-md border border-emerald-800 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:border-emerald-600"
          >
            Confirm Purchase
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 border-t border-slate-900 pt-2">
        <input
          value={modLabel}
          onChange={(e) => setModLabel(e.target.value)}
          placeholder="Modifier (e.g. per upgrade)"
          className="w-40 bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 outline-none"
        />
        <input
          type="number"
          value={modCost}
          onChange={(e) => setModCost(e.target.value)}
          className="w-14 bg-slate-950/60 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-300 outline-none"
        />
        <button
          onClick={() => {
            if (!modLabel.trim()) return;
            onAddModifier(modLabel.trim(), Number(modCost) || 0);
            setModLabel("");
            setModCost("0");
          }}
          className="text-[11px] text-slate-500 hover:text-slate-300"
        >
          + modifier
        </button>
      </div>
    </div>
  );
}

function AddStoreItemForm({
  units,
  onAdd,
}: {
  units: CampaignState["units"];
  onAdd: (
    unitId: string | null,
    displayName: string,
    baseCost: number,
    unlockSpendThreshold: number | null,
    unlockOnly: boolean,
    maxCount: number | null,
    sortOrder: number
  ) => void;
}) {
  const [show, setShow] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [baseCost, setBaseCost] = useState("0");
  const [unlockThreshold, setUnlockThreshold] = useState("");
  const [unlockOnly, setUnlockOnly] = useState(false);
  const [maxCount, setMaxCount] = useState("");

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200">
        <Plus size={12} /> Add store item
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-dashed border-slate-700 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
        >
          <option value="">(unlinked)</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          Base cost
          <input
            type="number"
            value={baseCost}
            onChange={(e) => setBaseCost(e.target.value)}
            className="w-16 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          Unlock at (total spent)
          <input
            type="number"
            value={unlockThreshold}
            onChange={(e) => setUnlockThreshold(e.target.value)}
            placeholder="none"
            className="w-16 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          Max count
          <input
            type="number"
            value={maxCount}
            onChange={(e) => setMaxCount(e.target.value)}
            placeholder="unlimited"
            className="w-16 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          <input type="checkbox" checked={unlockOnly} onChange={(e) => setUnlockOnly(e.target.checked)} />
          Unlock only (mission-granted)
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!displayName.trim()) return;
            onAdd(
              unitId || null,
              displayName.trim(),
              Number(baseCost) || 0,
              unlockThreshold ? Number(unlockThreshold) : null,
              unlockOnly,
              maxCount ? Number(maxCount) : null,
              0
            );
            setDisplayName("");
            setBaseCost("0");
            setUnlockThreshold("");
            setMaxCount("");
            setUnlockOnly(false);
            setShow(false);
          }}
          disabled={!displayName.trim()}
          className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-40"
        >
          Save
        </button>
        <button onClick={() => setShow(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">
          Cancel
        </button>
      </div>
    </div>
  );
}
