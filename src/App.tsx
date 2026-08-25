import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import ArmyCreationScreen from "./features/list-builder/ArmyCreationScreen";
import CollectionScreen from "./features/collection/CollectionScreen";
import CampaignsFeature from "./features/campaigns/CampaignsFeature";
import ProfilePicker from "./features/accounts/ProfilePicker";
import { listUsers } from "./lib/api/accounts";

const LAST_USER_KEY = "legion-app:last-user-id";

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingRememberedUser, setCheckingRememberedUser] = useState(true);

  // On launch, re-use the last-selected local profile if it still exists,
  // rather than always showing the picker -- ProfilePicker only appears on
  // first launch or after an explicit "Switch Profile".
  useEffect(() => {
    let cancelled = false;
    async function checkRememberedUser() {
      const remembered = localStorage.getItem(LAST_USER_KEY);
      if (!remembered) {
        setCheckingRememberedUser(false);
        return;
      }
      try {
        const users = await listUsers();
        if (cancelled) return;
        if (users.some((u) => u.id === remembered)) {
          setUserId(remembered);
        } else {
          localStorage.removeItem(LAST_USER_KEY);
        }
      } catch {
        // Ignore here -- ProfilePicker's own listUsers() call surfaces any
        // real backend error to the user.
      } finally {
        if (!cancelled) setCheckingRememberedUser(false);
      }
    }
    checkRememberedUser();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectUser(id: string) {
    localStorage.setItem(LAST_USER_KEY, id);
    setUserId(id);
  }

  function handleSwitchProfile() {
    localStorage.removeItem(LAST_USER_KEY);
    setUserId(null);
  }

  if (checkingRememberedUser) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center text-sm text-slate-400"
        style={{ background: "#07090D" }}
      >
        Loading...
      </div>
    );
  }

  if (!userId) {
    return <ProfilePicker onSelect={handleSelectUser} />;
  }

  return (
    <div>
      <nav className="flex items-center justify-between gap-1 border-b border-slate-800 bg-slate-950 px-4 py-2">
        <div className="flex items-center gap-1">
          <TabLink to="/army-builder">Army Builder</TabLink>
          <TabLink to="/collection">My Collection</TabLink>
          <TabLink to="/campaigns">Campaign Mode</TabLink>
        </div>
        <button
          onClick={handleSwitchProfile}
          className="text-[11px] uppercase tracking-wide text-slate-500 hover:text-slate-300 transition-colors"
        >
          Switch Profile
        </button>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/army-builder" replace />} />
        <Route path="/army-builder" element={<ArmyCreationScreen userId={userId} />} />
        <Route path="/collection" element={<CollectionScreen userId={userId} />} />
        <Route path="/campaigns/*" element={<CampaignsFeature userId={userId} />} />
      </Routes>
    </div>
  );
}

function TabLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
          isActive ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
        }`
      }
      style={{ fontFamily: "'Rajdhani', sans-serif" }}
    >
      {children}
    </NavLink>
  );
}
