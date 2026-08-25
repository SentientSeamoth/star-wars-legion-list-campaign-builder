import { useEffect, useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { createUser, listUsers } from "../../lib/api/accounts";
import type { User } from "../../lib/types/manual_seed";

interface ProfilePickerProps {
  onSelect: (userId: string) => void;
}

/**
 * Shown at app start whenever no profile is currently selected (first
 * launch, or after "Switch Profile" in App.tsx). Lists local profiles and
 * lets you pick one or create a new one -- replaces the old silent
 * getOrCreateDefaultUser() stopgap (see docs/DECISIONS.md's 2026-08-23
 * "accounts UI" entry).
 */
export default function ProfilePicker({ onSelect }: ProfilePickerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((u) => {
        if (cancelled) return;
        setUsers(u);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const user = await createUser(name);
      onSelect(user.id);
    } catch (err) {
      setError(String(err));
      setCreating(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center text-slate-100"
      style={{
        background: "radial-gradient(ellipse at top, #10131A 0%, #0A0D12 60%, #07090D 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="w-full max-w-sm px-5 space-y-6">
        <div className="text-center space-y-1">
          <h1
            className="text-2xl font-semibold text-slate-50"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            Select a Profile
          </h1>
          <p className="text-xs text-slate-500">
            Collections and army lists are saved per profile, on this device.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && <div className="text-center text-sm text-slate-400">Loading profiles...</div>}

        {!loading && users.length > 0 && (
          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelect(user.id)}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-left hover:border-slate-600 hover:bg-slate-900 transition-colors"
              >
                <UserRound size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-100">{user.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {!loading && (
          <div className="rounded-lg border border-dashed border-slate-700 p-4 space-y-2">
            <label className="block text-[11px] uppercase tracking-wider text-slate-400">
              New Profile
            </label>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Profile name"
                className="flex-1 bg-slate-950/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                <Plus size={14} /> Create
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
