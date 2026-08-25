import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { listBattleReportsForMission } from "../../../lib/api/campaignsPlay";
import type { CampaignBattleReport, CampaignMissionWithOutcomes, CasualtyInput } from "../../../lib/types/manual_seed";
import type { CampaignState } from "../CampaignDashboardScreen";

interface MissionDetailModalProps {
  mission: CampaignMissionWithOutcomes;
  participantId: string;
  campaignState: CampaignState;
  onClose: () => void;
}

/**
 * Mission editing (narrative/objectives/mechanics + branching outcomes)
 * plus the "Log Battle Report" flow: pick which outcome(s) triggered,
 * record casualties against the active participant's roster, write the
 * narrative, and submit -- awards credits, grants the next upgrade
 * purchase, and marks the mission completed (see
 * commands/campaigns_play.rs::log_battle_report).
 */
export default function MissionDetailModal({
  mission,
  participantId,
  campaignState,
  onClose,
}: MissionDetailModalProps) {
  const { detail, saveMission, addOutcome, saveOutcome, deleteOutcome, submitBattleReport } = campaignState;
  const [reports, setReports] = useState<CampaignBattleReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listBattleReportsForMission(mission.id)
      .then((r) => {
        if (!cancelled) {
          setReports(r);
          setLoadingReports(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingReports(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mission.id]);

  const roster = useMemo(
    () => (detail?.roster_entries ?? []).filter((r) => r.participant_id === participantId && !r.retired),
    [detail, participantId]
  );

  const [newOutcomeLabel, setNewOutcomeLabel] = useState("");
  const [newOutcomeCredits, setNewOutcomeCredits] = useState("0");

  const [reportNarrative, setReportNarrative] = useState("");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<string[]>([]);
  const [creditsAwarded, setCreditsAwarded] = useState("0");
  const [reportNotes, setReportNotes] = useState("");
  const [casualties, setCasualties] = useState<CasualtyInput[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleOutcome(id: string, rewardCredits: number) {
    setSelectedOutcomeIds((ids) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      const sum = mission.outcomes
        .filter((o) => next.includes(o.id))
        .reduce((total, o) => total + o.reward_credits, 0);
      setCreditsAwarded(String(sum));
      return next;
    });
    void rewardCredits;
  }

  function addCasualtyRow() {
    setCasualties((c) => [...c, { label: "", models_lost: 1, roster_entry_id: null }]);
  }

  function updateCasualty(i: number, patch: Partial<CasualtyInput>) {
    setCasualties((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function removeCasualtyRow(i: number) {
    setCasualties((c) => c.filter((_, idx) => idx !== i));
  }

  async function handleSubmitReport() {
    setSubmitting(true);
    await submitBattleReport(
      mission.id,
      participantId,
      reportNarrative.trim() || null,
      selectedOutcomeIds,
      Number(creditsAwarded) || 0,
      reportNotes.trim() || null,
      casualties.filter((c) => c.label.trim())
    );
    setSubmitting(false);
    setReportNarrative("");
    setSelectedOutcomeIds([]);
    setCreditsAwarded("0");
    setReportNotes("");
    setCasualties([]);
    const fresh = await listBattleReportsForMission(mission.id);
    setReports(fresh);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl border border-slate-700 bg-[#0A0D12] text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div className="flex-1">
            <input
              value={mission.name}
              onChange={(e) =>
                saveMission(
                  mission.id,
                  mission.path_id,
                  e.target.value,
                  mission.sort_order,
                  mission.setup_narrative,
                  mission.objectives,
                  mission.battle_mechanics
                )
              }
              className="w-full bg-transparent text-xl font-semibold text-slate-50 outline-none"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            />
            <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">{mission.status}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-5">
          <Section title="Setup Narrative">
            <textarea
              value={mission.setup_narrative ?? ""}
              onChange={(e) =>
                saveMission(mission.id, mission.path_id, mission.name, mission.sort_order, e.target.value || null, mission.objectives, mission.battle_mechanics)
              }
              rows={4}
              className="w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 outline-none focus:border-slate-600"
              placeholder="The story leading into this battle..."
            />
          </Section>

          <Section title="Mission Rules / Objectives">
            <textarea
              value={mission.objectives ?? ""}
              onChange={(e) =>
                saveMission(mission.id, mission.path_id, mission.name, mission.sort_order, mission.setup_narrative, e.target.value || null, mission.battle_mechanics)
              }
              rows={2}
              className="w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 outline-none focus:border-slate-600"
              placeholder="Win conditions, constraints..."
            />
          </Section>

          <Section title="Battle Mechanics">
            <textarea
              value={mission.battle_mechanics ?? ""}
              onChange={(e) =>
                saveMission(mission.id, mission.path_id, mission.name, mission.sort_order, mission.setup_narrative, mission.objectives, e.target.value || null)
              }
              rows={3}
              className="w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 outline-none focus:border-slate-600"
              placeholder="Spawn schedules, reinforcements, custom rules..."
            />
          </Section>

          <Section title="Possible Outcomes">
            <div className="space-y-2">
              {mission.outcomes.map((o) => (
                <div key={o.id} className="rounded-md bg-slate-950/50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      value={o.condition_label}
                      onChange={(e) => saveOutcome(o.id, mission.id, e.target.value, o.reward_credits, o.reward_notes, o.sort_order)}
                      className="flex-1 bg-transparent text-xs font-semibold text-slate-200 outline-none"
                    />
                    <input
                      type="number"
                      value={o.reward_credits}
                      onChange={(e) =>
                        saveOutcome(o.id, mission.id, o.condition_label, Number(e.target.value) || 0, o.reward_notes, o.sort_order)
                      }
                      className="w-16 bg-slate-900/60 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-slate-300 outline-none"
                    />
                    <span className="text-[10px] text-slate-500">credits</span>
                    <button onClick={() => deleteOutcome(mission.id, o.id)} className="text-slate-600 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <input
                    value={o.reward_notes ?? ""}
                    onChange={(e) => saveOutcome(o.id, mission.id, o.condition_label, o.reward_credits, e.target.value || null, o.sort_order)}
                    placeholder="Other rewards (units, upgrades...)"
                    className="w-full bg-transparent text-[11px] text-slate-400 outline-none"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newOutcomeLabel}
                  onChange={(e) => setNewOutcomeLabel(e.target.value)}
                  placeholder="If..."
                  className="flex-1 bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 outline-none"
                />
                <input
                  type="number"
                  value={newOutcomeCredits}
                  onChange={(e) => setNewOutcomeCredits(e.target.value)}
                  className="w-16 bg-slate-950/60 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-300 outline-none"
                />
                <button
                  onClick={() => {
                    if (!newOutcomeLabel.trim()) return;
                    addOutcome(mission.id, newOutcomeLabel.trim(), Number(newOutcomeCredits) || 0, null, mission.outcomes.length);
                    setNewOutcomeLabel("");
                    setNewOutcomeCredits("0");
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </Section>

          <Section title="Log Battle Report">
            <div className="space-y-3 rounded-md border border-amber-900/40 bg-amber-950/10 p-3">
              <textarea
                value={reportNarrative}
                onChange={(e) => setReportNarrative(e.target.value)}
                rows={3}
                placeholder="What actually happened..."
                className="w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 outline-none focus:border-slate-600"
              />
              {mission.outcomes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mission.outcomes.map((o) => (
                    <label key={o.id} className="flex items-center gap-1.5 rounded bg-slate-950/50 px-2 py-1 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedOutcomeIds.includes(o.id)}
                        onChange={() => toggleOutcome(o.id, o.reward_credits)}
                      />
                      {o.condition_label}
                    </label>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Credits awarded</span>
                <input
                  type="number"
                  value={creditsAwarded}
                  onChange={(e) => setCreditsAwarded(e.target.value)}
                  className="w-20 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Casualties</div>
                {casualties.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={c.label}
                      onChange={(e) => updateCasualty(i, { label: e.target.value })}
                      placeholder="e.g. 4 rebel soldiers"
                      className="flex-1 bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
                    />
                    <input
                      type="number"
                      value={c.models_lost}
                      onChange={(e) => updateCasualty(i, { models_lost: Number(e.target.value) || 0 })}
                      className="w-14 bg-slate-950/60 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-300 outline-none"
                    />
                    <select
                      value={c.roster_entry_id ?? ""}
                      onChange={(e) => updateCasualty(i, { roster_entry_id: e.target.value || null })}
                      className="bg-slate-950/60 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-300 outline-none"
                    >
                      <option value="">(narrative only)</option>
                      {roster.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nickname || r.unit_id || "Unit"}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => removeCasualtyRow(i)} className="text-slate-600 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={addCasualtyRow} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200">
                  <Plus size={11} /> Add casualty line
                </button>
              </div>

              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                rows={2}
                placeholder="Other notes..."
                className="w-full bg-slate-950/50 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 outline-none focus:border-slate-600"
              />

              <button
                onClick={handleSubmitReport}
                disabled={submitting}
                className="rounded-md border border-amber-700 bg-amber-900/40 px-3 py-2 text-xs font-semibold text-amber-200 hover:border-amber-500 transition-colors disabled:opacity-40"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                {submitting ? "Logging..." : "Log Battle Report"}
              </button>
            </div>
          </Section>

          <Section title="Past Battle Reports">
            {loadingReports && <div className="text-xs text-slate-500">Loading...</div>}
            {!loadingReports && reports.length === 0 && <div className="text-xs text-slate-500">None logged yet.</div>}
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="rounded-md bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                    <span>+{r.credits_awarded} credits</span>
                  </div>
                  {r.narrative && <p className="mt-1 whitespace-pre-wrap">{r.narrative}</p>}
                  {r.casualties.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-500">
                      {r.casualties.map((c) => (
                        <li key={c.id}>{c.label}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        {title}
      </div>
      {children}
    </div>
  );
}
