import { Lock, Unlock } from "lucide-react";
import type { UiMode } from "../uiMapping";

interface ModeToggleProps {
  mode: UiMode;
  setMode: (mode: UiMode) => void;
}

const MODES: UiMode[] = ["traditional", "custom"];

export default function ModeToggle({ mode, setMode }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-slate-700 bg-slate-950/60 p-1">
      {MODES.map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold tracking-wide transition-colors ${
              active ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-200"
            }`}
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            {m === "traditional" ? <Lock size={14} /> : <Unlock size={14} />}
            {m === "traditional" ? "Traditional" : "Custom"}
          </button>
        );
      })}
    </div>
  );
}
