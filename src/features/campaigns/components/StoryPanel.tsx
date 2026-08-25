import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import type { CampaignDetail } from "../../../lib/types/manual_seed";

/**
 * Compiles the campaign's narrative so far into one plain-text document:
 * the opening summary, then every played mission in chronological order
 * (its setup narrative once, followed by each battle report's own
 * narrative). Purely a read-only writeup -- mechanical fields (credits,
 * casualties, stats) are intentionally left out, this is the story, not
 * a log.
 */
function buildStoryText(detail: CampaignDetail): string {
  const lines: string[] = [detail.name, ""];
  if (detail.summary) {
    lines.push(detail.summary.trim(), "");
  }
  lines.push("-".repeat(48), "");

  const missionsById = new Map(detail.missions.map((m) => [m.id, m]));
  const participantsById = new Map(detail.participants.map((p) => [p.id, p]));
  const multiParticipant = detail.participants.length > 1;
  const seenMissions = new Set<string>();

  for (const report of detail.battle_reports) {
    const mission = missionsById.get(report.mission_id);
    if (mission && !seenMissions.has(mission.id)) {
      seenMissions.add(mission.id);
      lines.push(mission.name.toUpperCase());
      if (mission.setup_narrative) {
        lines.push("", mission.setup_narrative.trim());
      }
      lines.push("");
    }
    const participant = participantsById.get(report.participant_id);
    const who = multiParticipant ? participant?.side_name ?? null : null;
    const date = new Date(report.created_at).toLocaleDateString();
    lines.push(`— ${date}${who ? ` · ${who}` : ""} —`);
    if (report.narrative) {
      lines.push("", report.narrative.trim());
    }
    lines.push("", "");
  }

  if (detail.battle_reports.length === 0) {
    lines.push("(No battles have been fought yet.)");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "campaign";
}

export default function StoryPanel({ detail }: { detail: CampaignDetail }) {
  const text = useMemo(() => buildStoryText(detail), [detail]);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable -- nothing more this
      // screen can do; the text is still selectable/copyable by hand.
    }
  }

  function handleExport() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(detail.name)}-story.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors"
        >
          <Download size={13} /> Export .txt
        </button>
      </div>
      <pre
        className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/50 px-5 py-4 text-sm leading-relaxed text-slate-300"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {text}
      </pre>
    </div>
  );
}
