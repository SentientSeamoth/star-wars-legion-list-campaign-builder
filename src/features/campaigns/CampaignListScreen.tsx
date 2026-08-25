import { useState } from "react";
import { Plus, Swords, Trash2 } from "lucide-react";
import { useCampaignList } from "./hooks/useCampaignList";
import type { CampaignMode } from "../../lib/types/manual_seed";

interface CampaignListScreenProps {
  userId: string;
  onOpenCampaign: (campaignId: string) => void;
}

const MODE_LABELS: Record<CampaignMode, string> = {
  solo: "Solo",
  "two-player": "Two Player",
  "gm-player": "GM + Player",
};

/**
 * Entry screen for Campaign Mode -- lists campaigns the current profile
 * participates in, and a form to start a new one. Mirrors
 * CollectionScreen.tsx's layout conventions (gradient background, rounded
 * card sections).
 */
export default function CampaignListScreen({ userId, onOpenCampaign }: CampaignListScreenProps) {
  const { loading, error, campaigns, addCampaign, removeCampaign } = useCampaignList(userId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState<CampaignMode>("solo");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const creatorRole = mode === "gm-player" ? "gm" : "player";
    const campaign = await addCampaign(name.trim(), summary.trim() || null, mode, creatorRole, null);
    setCreating(false);
    if (campaign) {
      setShowCreate(false);
      setName("");
      setSummary("");
      onOpenCampaign(campaign.id);
    }
  }

  return (
    <div
      className="min-h-screen w-full text-slate-100"
      style={{
        background: "radial-gradient(ellipse at top, #10131A 0%, #0A0D12 60%, #07090D 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <Swords size={12} />
          <span>Legion &middot; Campaign Mode</span>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: "rgba(214, 158, 46, 0.08)", border: "1px solid rgba(214, 158, 46, 0.35)" }}
        >
          <h1 className="text-2xl font-semibold text-slate-50" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Campaign Mode
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Narrative, warband-style campaigns: permanent unit losses, a credits economy for
            recruiting reinforcements, branching hero upgrade paths, and a written battle history.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && <div className="text-sm text-slate-400">Loading campaigns...</div>}

        {!loading && (
          <>
            {campaigns.length > 0 && (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 hover:border-slate-600 transition-colors"
                  >
                    <button
                      onClick={() => onOpenCampaign(c.id)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-semibold text-slate-100">{c.name}</div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">
                        {MODE_LABELS[c.mode]} &middot; {c.status}
                      </div>
                      {c.summary && <div className="mt-1 text-xs text-slate-400 line-clamp-2">{c.summary}</div>}
                    </button>
                    <button
                      onClick={() => removeCampaign(c.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 transition-colors"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                <Plus size={14} /> New Campaign
              </button>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 p-4 space-y-3">
                <label className="block text-[11px] uppercase tracking-wider text-slate-400">
                  New Campaign
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Campaign name"
                  className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                />
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Opening narrative summary (optional)"
                  rows={3}
                  className="w-full bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as CampaignMode)}
                    className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="solo">Solo</option>
                    <option value="two-player">Two Player</option>
                    <option value="gm-player">GM + Player</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!name.trim() || creating}
                    className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                  >
                    <Plus size={14} /> Create
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="rounded-md px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
