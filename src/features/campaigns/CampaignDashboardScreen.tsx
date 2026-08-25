import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, ClipboardList, Coins, ScrollText, Sparkles, Store } from "lucide-react";
import { useCampaign } from "./hooks/useCampaign";
import PathsPanel from "./components/PathsPanel";
import MissionsPanel from "./components/MissionsPanel";
import RosterStorePanel from "./components/RosterStorePanel";
import UpgradesPanel from "./components/UpgradesPanel";
import StoryPanel from "./components/StoryPanel";
import type { CampaignStatus } from "../../lib/types/manual_seed";

export type CampaignState = ReturnType<typeof useCampaign>;

interface CampaignDashboardScreenProps {
  campaignId: string;
  userId: string;
  onBack: () => void;
}

type DashTab = "overview" | "paths" | "missions" | "roster" | "upgrades" | "story";

export default function CampaignDashboardScreen({ campaignId, userId, onBack }: CampaignDashboardScreenProps) {
  const campaignState = useCampaign(campaignId);
  const { loading, error, setError, detail, users } = campaignState;
  const [tab, setTab] = useState<DashTab>("overview");
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const participants = detail?.participants ?? [];
  const currentParticipantId =
    activeParticipantId ?? participants.find((p) => p.user_id === userId)?.id ?? participants[0]?.id ?? null;

  if (loading) {
    return <ScreenShell onBack={onBack}><div className="text-sm text-slate-400">Loading campaign...</div></ScreenShell>;
  }
  if (!detail) {
    return (
      <ScreenShell onBack={onBack}>
        <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error ?? "Campaign not found."}
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell onBack={onBack} title={detail.name}>
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            dismiss
          </button>
        </div>
      )}

      {detail.summary && <p className="text-sm text-slate-400">{detail.summary}</p>}

      <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
        <DashTabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={<Coins size={13} />}>
          Overview
        </DashTabButton>
        <DashTabButton active={tab === "paths"} onClick={() => setTab("paths")} icon={<BookOpen size={13} />}>
          Paths
        </DashTabButton>
        <DashTabButton active={tab === "missions"} onClick={() => setTab("missions")} icon={<ClipboardList size={13} />}>
          Missions
        </DashTabButton>
        <DashTabButton active={tab === "roster"} onClick={() => setTab("roster")} icon={<Store size={13} />}>
          Roster &amp; Store
        </DashTabButton>
        <DashTabButton active={tab === "upgrades"} onClick={() => setTab("upgrades")} icon={<Sparkles size={13} />}>
          Upgrades
        </DashTabButton>
        <DashTabButton active={tab === "story"} onClick={() => setTab("story")} icon={<ScrollText size={13} />}>
          Story
        </DashTabButton>
      </div>

      {participants.length > 1 && tab !== "overview" && tab !== "story" && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-400">Viewing as</label>
          <select
            value={currentParticipantId ?? ""}
            onChange={(e) => setActiveParticipantId(e.target.value)}
            className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.side_name || usersById.get(p.user_id)?.display_name || p.role} ({p.role})
              </option>
            ))}
          </select>
        </div>
      )}

      {tab === "overview" && <OverviewPanel campaignState={campaignState} usersById={usersById} />}
      {tab === "paths" && <PathsPanel campaignState={campaignState} />}
      {tab === "missions" && currentParticipantId && (
        <MissionsPanel campaignState={campaignState} participantId={currentParticipantId} />
      )}
      {tab === "roster" && currentParticipantId && (
        <RosterStorePanel campaignState={campaignState} participantId={currentParticipantId} />
      )}
      {tab === "upgrades" && currentParticipantId && (
        <UpgradesPanel campaignState={campaignState} participantId={currentParticipantId} />
      )}
      {tab === "story" && <StoryPanel detail={detail} />}
      {(tab === "missions" || tab === "roster" || tab === "upgrades") && !currentParticipantId && (
        <div className="text-sm text-slate-500">Add a participant on the Overview tab first.</div>
      )}
    </ScreenShell>
  );
}

function ScreenShell({ children, onBack, title }: { children: ReactNode; onBack: () => void; title?: string }) {
  return (
    <div
      className="min-h-screen w-full text-slate-100"
      style={{
        background: "radial-gradient(ellipse at top, #10131A 0%, #0A0D12 60%, #07090D 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="max-w-4xl mx-auto px-5 py-8 space-y-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={12} /> All Campaigns
        </button>
        {title && (
          <h1 className="text-2xl font-semibold text-slate-50" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            {title}
          </h1>
        )}
        {children}
      </div>
    </div>
  );
}

function DashTabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
      }`}
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      {icon}
      {children}
    </button>
  );
}

// ---------------- Overview: participants, credits, meters ----------------

function OverviewPanel({
  campaignState,
  usersById,
}: {
  campaignState: CampaignState;
  usersById: Map<string, { display_name: string }>;
}) {
  const { detail, users, addParticipant, removeParticipant, setCredits, saveMeter, deleteMeter, saveCampaignHeader } =
    campaignState;
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"player" | "gm" | "opponent">("player");
  const [newSideName, setNewSideName] = useState("");
  const [newMeterName, setNewMeterName] = useState<Record<string, string>>({});
  const [newMeterValue, setNewMeterValue] = useState<Record<string, string>>({});

  if (!detail) return null;
  const availableUsers = users.filter((u) => !detail.participants.some((p) => p.user_id === u.id));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          Campaign
        </h2>
        <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/50 px-4 py-3">
          <input
            value={detail.name}
            onChange={(e) => saveCampaignHeader(e.target.value, detail.summary, detail.mode, detail.status)}
            className="w-full bg-transparent text-lg font-semibold text-slate-100 outline-none border-b border-transparent focus:border-slate-600"
          />
          <textarea
            value={detail.summary ?? ""}
            onChange={(e) => saveCampaignHeader(detail.name, e.target.value || null, detail.mode, detail.status)}
            placeholder="Opening narrative summary..."
            rows={3}
            className="w-full bg-slate-950/40 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-slate-600"
          />
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase tracking-wider text-slate-500">Status</label>
            <select
              value={detail.status}
              onChange={(e) =>
                saveCampaignHeader(detail.name, detail.summary, detail.mode, e.target.value as CampaignStatus)
              }
              className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
            <span className="text-[11px] text-slate-600">{detail.mode}</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          Participants
        </h2>
        <div className="space-y-2">
          {detail.participants.map((p) => {
            const metersFor = detail.meters.filter((m) => m.participant_id === p.id);
            return (
              <div key={p.id} className="rounded-md border border-slate-800 bg-slate-900/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-100">
                      {p.side_name || usersById.get(p.user_id)?.display_name || "Unnamed"}
                    </span>
                    <span className="ml-2 text-[11px] uppercase tracking-wide text-slate-500">{p.role}</span>
                  </div>
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-[11px] text-slate-600 hover:text-red-400 transition-colors"
                  >
                    remove
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <Coins size={13} className="text-amber-400" />
                  <input
                    type="number"
                    value={p.credits_balance}
                    onChange={(e) => setCredits(p.id, Number(e.target.value) || 0)}
                    className="w-24 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none"
                  />
                  <span className="text-slate-500">credits</span>
                  {p.upgrade_purchase_available && (
                    <span className="rounded-full bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 text-[10px] text-emerald-300">
                      upgrade purchase available
                    </span>
                  )}
                </div>
                {metersFor.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {metersFor.map((m) => (
                      <div key={m.id} className="flex items-center gap-1 rounded bg-slate-950/50 px-2 py-1 text-[11px]">
                        <span className="text-slate-400">{m.name}:</span>
                        <input
                          type="number"
                          value={m.current_value}
                          onChange={(e) => saveMeter(p.id, m.name, Number(e.target.value) || 0, m.description)}
                          className="w-14 bg-transparent text-slate-100 outline-none"
                        />
                        <button onClick={() => deleteMeter(p.id, m.name)} className="text-slate-600 hover:text-red-400">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    placeholder="Meter name (e.g. Heat)"
                    value={newMeterName[p.id] ?? ""}
                    onChange={(e) => setNewMeterName((s) => ({ ...s, [p.id]: e.target.value }))}
                    className="w-32 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
                  />
                  <input
                    placeholder="0"
                    type="number"
                    value={newMeterValue[p.id] ?? ""}
                    onChange={(e) => setNewMeterValue((s) => ({ ...s, [p.id]: e.target.value }))}
                    className="w-16 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 outline-none"
                  />
                  <button
                    onClick={() => {
                      const name = (newMeterName[p.id] ?? "").trim();
                      if (!name) return;
                      saveMeter(p.id, name, Number(newMeterValue[p.id]) || 0, null);
                      setNewMeterName((s) => ({ ...s, [p.id]: "" }));
                      setNewMeterValue((s) => ({ ...s, [p.id]: "" }));
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    + meter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {availableUsers.length > 0 && (
        <div className="rounded-lg border border-dashed border-slate-700 p-4 space-y-2">
          <label className="block text-[11px] uppercase tracking-wider text-slate-400">Add Participant</label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
            >
              <option value="">Select profile...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "player" | "gm" | "opponent")}
              className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
            >
              <option value="player">Player</option>
              <option value="gm">GM</option>
              <option value="opponent">Opponent</option>
            </select>
            <input
              placeholder="Side name (optional, e.g. Grievous)"
              value={newSideName}
              onChange={(e) => setNewSideName(e.target.value)}
              className="bg-slate-950/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 outline-none"
            />
            <button
              onClick={() => {
                if (!newUserId) return;
                addParticipant(newUserId, newRole, newSideName.trim() || null);
                setNewUserId("");
                setNewSideName("");
              }}
              disabled={!newUserId}
              className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
