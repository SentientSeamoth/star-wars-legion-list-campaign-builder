import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CampaignState } from "../CampaignDashboardScreen";

/**
 * GM-authored branching narrative arcs. Freeform narrative/style text --
 * this app doesn't simulate path mechanics, it just records them (see
 * docs/DECISIONS.md's Campaign Mode entry).
 */
export default function PathsPanel({ campaignState }: { campaignState: CampaignState }) {
  const { detail, addPath, savePath, deletePath } = campaignState;
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [style, setStyle] = useState("");
  const [narrative, setNarrative] = useState("");

  if (!detail) return null;
  const paths = [...detail.paths].sort((a, b) => a.sort_order - b.sort_order);

  function handleAdd() {
    if (!name.trim()) return;
    addPath(name.trim(), style.trim() || null, narrative.trim() || null, paths.length);
    setName("");
    setStyle("");
    setNarrative("");
    setShowAdd(false);
  }

  return (
    <div className="space-y-3">
      {paths.length === 0 && !showAdd && (
        <div className="text-sm text-slate-500">No paths written yet.</div>
      )}
      {paths.map((p) => (
        <div key={p.id} className="rounded-md border border-slate-800 bg-slate-900/50 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <input
              value={p.name}
              onChange={(e) => savePath(p.id, e.target.value, p.style_summary, p.narrative, p.sort_order)}
              className="flex-1 bg-transparent text-sm font-semibold text-slate-100 outline-none border-b border-transparent focus:border-slate-600"
            />
            <button onClick={() => deletePath(p.id)} className="text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
          <input
            value={p.style_summary ?? ""}
            onChange={(e) => savePath(p.id, p.name, e.target.value || null, p.narrative, p.sort_order)}
            placeholder="Style summary, e.g. Formation control, droid synergy"
            className="w-full bg-slate-950/40 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-slate-600"
          />
          <textarea
            value={p.narrative ?? ""}
            onChange={(e) => savePath(p.id, p.name, p.style_summary, e.target.value || null, p.sort_order)}
            placeholder="Full narrative..."
            rows={4}
            className="w-full bg-slate-950/40 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-slate-600"
          />
        </div>
      ))}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors"
        >
          <Plus size={13} /> Add Path
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-700 p-4 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Path name"
            className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 outline-none"
          />
          <input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Style summary (optional)"
            className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none"
          />
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Narrative (optional)"
            rows={4}
            className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none"
          />
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
    </div>
  );
}
