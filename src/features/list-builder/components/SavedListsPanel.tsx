import { FolderOpen, Plus } from "lucide-react";
import type { ArmyList } from "../../../lib/types/manual_seed";

interface SavedListsPanelProps {
  savedLists: ArmyList[];
  currentListId: string | null;
  onLoad: (listId: string) => void;
  onNew: () => void;
}

export default function SavedListsPanel({
  savedLists,
  currentListId,
  onLoad,
  onNew,
}: SavedListsPanelProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-100"
          style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.04em" }}
        >
          <FolderOpen size={14} /> SAVED LISTS
        </h2>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200"
        >
          <Plus size={12} /> New
        </button>
      </div>
      {savedLists.length === 0 ? (
        <div className="text-xs text-slate-500 italic">
          No saved lists yet -- save this one below to start your library.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {savedLists.map((list) => (
            <button
              key={list.id}
              onClick={() => onLoad(list.id)}
              className={`rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
                list.id === currentListId
                  ? "border-slate-300 text-slate-100 bg-slate-800/60"
                  : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
              }`}
            >
              {list.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
