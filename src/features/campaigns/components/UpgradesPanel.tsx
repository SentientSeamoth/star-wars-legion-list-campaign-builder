import { useState } from "react";
import { Plus, Sparkles, Trash2, Trophy } from "lucide-react";
import type { CampaignState } from "../CampaignDashboardScreen";
import type { CampaignParticipant, CampaignUpgradeOption } from "../../../lib/types/manual_seed";

export default function UpgradesPanel({
  campaignState,
  participantId,
}: {
  campaignState: CampaignState;
  participantId: string;
}) {
  const { detail, chooseParticipantPath, addUpgradeOption, saveUpgradeOption, deleteUpgradeOption, buyUpgradeOption } =
    campaignState;
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [tier, setTier] = useState("1");
  const [effect, setEffect] = useState("");
  const [isTrophy, setIsTrophy] = useState(false);
  const [pathScope, setPathScope] = useState("");

  if (!detail) return null;
  const participant = detail.participants.find((p) => p.id === participantId);
  if (!participant) return null;

  const purchasedIds = new Set(
    detail.participant_upgrades.filter((pu) => pu.participant_id === participantId).map((pu) => pu.upgrade_option_id)
  );
  // Show every written upgrade regardless of the active participant's
  // chosen path -- a path not yet chosen (or a GM authoring content
  // ahead of time) still needs to see and edit what was written.
  // Purchase eligibility (below) is gated separately, not visibility --
  // conflating the two used to make a saved, path-scoped upgrade look
  // like it had silently failed to save.
  const allSorted = [...detail.upgrade_options].sort((a, b) => a.tier - b.tier || a.sort_order - b.sort_order);
  const core = allSorted.filter((o) => o.path_id == null);
  const byPath = detail.paths.map((p) => ({ path: p, options: allSorted.filter((o) => o.path_id === p.id) }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-400">Chosen Path</label>
        <select
          value={participant.chosen_path_id ?? ""}
          onChange={(e) => chooseParticipantPath(participantId, e.target.value || null)}
          className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
        >
          <option value="">None yet</option>
          {detail.paths.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {participant.upgrade_purchase_available ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 text-[10px] text-emerald-300">
            <Sparkles size={10} /> purchase available
          </span>
        ) : (
          <span className="text-[10px] text-slate-600">no purchase available -- complete a mission to earn one</span>
        )}
      </div>

      {allSorted.length === 0 && <div className="text-sm text-slate-500">No upgrades written yet.</div>}

      {core.length > 0 && (
        <UpgradeGroup
          label="Core (any path)"
          options={core}
          participant={participant}
          purchasedIds={purchasedIds}
          eligiblePathId={null}
          onSave={saveUpgradeOption}
          onDelete={deleteUpgradeOption}
          onBuy={(id) => buyUpgradeOption(participantId, id, null)}
        />
      )}
      {byPath.map(
        ({ path, options }) =>
          options.length > 0 && (
            <UpgradeGroup
              key={path.id}
              label={path.name}
              options={options}
              participant={participant}
              purchasedIds={purchasedIds}
              eligiblePathId={path.id}
              onSave={saveUpgradeOption}
              onDelete={deleteUpgradeOption}
              onBuy={(id) => buyUpgradeOption(participantId, id, null)}
            />
          )
      )}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors"
        >
          <Plus size={13} /> Add Upgrade
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-700 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Upgrade name"
              className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 outline-none"
            />
            <label className="flex items-center gap-1 text-[11px] text-slate-400">
              Tier
              <input
                type="number"
                min={1}
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-14 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
              />
            </label>
          </div>
          <textarea
            value={effect}
            onChange={(e) => setEffect(e.target.value)}
            placeholder="Effect text (optional)"
            rows={2}
            className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={pathScope}
              onChange={(e) => setPathScope(e.target.value)}
              className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
            >
              <option value="">Core (any path)</option>
              {detail.paths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} only
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[11px] text-slate-400">
              <input type="checkbox" checked={isTrophy} onChange={(e) => setIsTrophy(e.target.checked)} />
              Trophy (unique narrative unlock)
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!name.trim()) return;
                addUpgradeOption(pathScope || null, name.trim(), Number(tier) || 1, effect.trim() || null, isTrophy, allSorted.length);
                setName("");
                setEffect("");
                setTier("1");
                setIsTrophy(false);
                setPathScope("");
                setShowAdd(false);
              }}
              disabled={!name.trim()}
              className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-40"
            >
              Save
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UpgradeGroup({
  label,
  options,
  participant,
  purchasedIds,
  eligiblePathId,
  onSave,
  onDelete,
  onBuy,
}: {
  label: string;
  options: CampaignUpgradeOption[];
  participant: CampaignParticipant;
  purchasedIds: Set<string>;
  eligiblePathId: string | null;
  onSave: CampaignState["saveUpgradeOption"];
  onDelete: CampaignState["deleteUpgradeOption"];
  onBuy: (upgradeOptionId: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="space-y-2">
        {options.map((o) => {
          const owned = purchasedIds.has(o.id);
          const pathMatches = eligiblePathId == null || participant.chosen_path_id === eligiblePathId;
          const canBuy = pathMatches && participant.upgrade_purchase_available && !owned;
          return (
            <div
              key={o.id}
              className={`rounded-md border px-4 py-3 ${
                owned ? "border-emerald-900 bg-emerald-950/10" : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-slate-100">{o.name}</span>
                  <span className="ml-2 text-[11px] text-slate-500">
                    {o.tier} pt{o.tier === 1 ? "" : "s"}
                  </span>
                  {o.is_trophy && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-950/50 border border-amber-800 px-1.5 py-0.5 text-[10px] text-amber-300">
                      <Trophy size={10} /> trophy
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {owned ? (
                    <span className="text-[11px] text-emerald-400">owned</span>
                  ) : (
                    <button
                      onClick={() => onBuy(o.id)}
                      disabled={!canBuy}
                      title={!pathMatches ? `Requires choosing the ${label} path` : undefined}
                      className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Purchase
                    </button>
                  )}
                  <button onClick={() => onDelete(o.id)} className="text-slate-600 hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {!owned && !pathMatches && (
                <div className="mt-1 text-[10px] text-slate-600">Requires choosing the {label} path first.</div>
              )}
              <textarea
                value={o.effect ?? ""}
                onChange={(e) => onSave(o.id, o.path_id, o.name, o.tier, e.target.value || null, o.is_trophy, o.sort_order)}
                placeholder="Effect text..."
                rows={2}
                className="mt-2 w-full bg-slate-950/40 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-400 outline-none focus:border-slate-600"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
