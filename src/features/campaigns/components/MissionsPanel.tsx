import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import MissionDetailModal from "./MissionDetailModal";
import type { CampaignState } from "../CampaignDashboardScreen";

export default function MissionsPanel({
  campaignState,
  participantId,
}: {
  campaignState: CampaignState;
  participantId: string;
}) {
  const { detail, addMission, deleteMission } = campaignState;
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [pathId, setPathId] = useState<string>("");
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);

  if (!detail) return null;
  const missions = [...detail.missions].sort((a, b) => a.sort_order - b.sort_order);
  const openMission = missions.find((m) => m.id === openMissionId) ?? null;

  function handleAdd() {
    if (!name.trim()) return;
    addMission(pathId || null, name.trim(), missions.length, null, null, null);
    setName("");
    setPathId("");
    setShowAdd(false);
  }

  return (
    <div className="space-y-3">
      {missions.length === 0 && !showAdd && <div className="text-sm text-slate-500">No missions written yet.</div>}
      {missions.map((m) => {
        const path = detail.paths.find((p) => p.id === m.path_id);
        return (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-600 transition-colors cursor-pointer"
            onClick={() => setOpenMissionId(m.id)}
          >
            <div>
              <div className="text-sm font-semibold text-slate-100">{m.name}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
                {m.status}
                {path ? ` · ${path.name}` : ""}
                {m.outcomes.length > 0 ? ` · ${m.outcomes.length} outcome${m.outcomes.length === 1 ? "" : "s"}` : ""}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteMission(m.id);
              }}
              className="text-slate-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors"
        >
          <Plus size={13} /> Add Mission
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-700 p-4 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mission name"
            className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 outline-none"
          />
          {detail.paths.length > 0 && (
            <select
              value={pathId}
              onChange={(e) => setPathId(e.target.value)}
              className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
            >
              <option value="">No specific path</option>
              {detail.paths.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
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

      {openMission && (
        <MissionDetailModal
          mission={openMission}
          participantId={participantId}
          campaignState={campaignState}
          onClose={() => setOpenMissionId(null)}
        />
      )}
    </div>
  );
}
