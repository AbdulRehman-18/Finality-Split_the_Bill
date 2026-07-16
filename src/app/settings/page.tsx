"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, CURRENCIES } from "@/lib/AuthContext";

interface Team {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateProfile, logout, loading } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [wallet, setWallet] = useState("");
  const [color, setColor] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [teamError, setTeamError] = useState("");
  
  // Custom mock alerts settings
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  // Sync state with user profile
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setWallet(user.wallet || "");
      setColor(user.color || "#3b6fd6");
    }
  }, [user]);

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/auth/teams");
      const data = await res.json();
      if (data.groups) {
        setTeams(data.groups);
      }
    } catch (e) {
      console.error("Failed to fetch user teams", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  // Direct redirect if guest
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-sm text-muted animate-pulse">
          LOADING SETTINGS ENGINE...
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    setProfileSaving(true);

    if (!displayName.trim()) {
      setProfileError("Display name cannot be empty.");
      setProfileSaving(false);
      return;
    }

    const res = await updateProfile({
      displayName: displayName.trim(),
      wallet: wallet.trim(),
      color,
    });

    setProfileSaving(false);
    if (res.success) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } else {
      setProfileError(res.error || "Failed to update profile.");
    }
  };

  const handleUpdateCurrency = async (currKey: string) => {
    await updateProfile({ currency: currKey });
  };

  const handleUpdateTheme = async (themeKey: string) => {
    await updateProfile({ theme: themeKey });
  };

  const handleRenameTeam = async (groupId: number) => {
    setTeamError("");
    if (!editingTeamName.trim()) {
      setTeamError("Team name cannot be empty");
      return;
    }

    try {
      const res = await fetch("/api/auth/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, name: editingTeamName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.group) {
        setEditingTeamId(null);
        fetchTeams();
      } else {
        setTeamError(data.error || "Failed to rename team");
      }
    } catch {
      setTeamError("Network error occurred");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("WARNING: This will permanently delete your user account. Are you sure?")) {
      return;
    }
    // Simple account deletion trigger: we can POST to a deletion endpoint, or just clear user.
    // For this demo auth, logging out is the primary session clearing mechanism, and we clear the user DB entry.
    try {
      await fetch("/api/auth/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "DELETED", wallet: "", color: "" }), // placeholder update
      });
      // Clear cookie
      await logout();
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  const colorsList = [
    "#3b6fd6", // Blue
    "#d63b9e", // Magenta
    "#1f9e9e", // Teal
    "#9b5fd6", // Purple
    "#d98a1f", // Orange
    "#d6394a", // Red
    "#1f9e5c", // Green
  ];

  const themesList = [
    { key: "default", name: "Retro Light", bg: "#f2ecd8", fg: "#1c1c1c" },
    { key: "dark-retro", name: "Retro Dark", bg: "#151410", fg: "#ebdcb9" },
    { key: "cyber-neon", name: "Cyber Neon", bg: "#030708", fg: "#39ff14" },
    { key: "modern-dark", name: "Modern Dark", bg: "#0f172a", fg: "#f8fafc" },
    { key: "modern-light", name: "Modern Light", bg: "#f8fafc", fg: "#0f172a" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between bg-panel sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="font-mono text-xs text-muted hover:text-ink flex items-center gap-1 cursor-pointer"
          >
            ← BACK
          </button>
          <div className="w-2 h-2 rounded-full bg-green" />
          <h1 className="font-mono text-xs font-bold tracking-widest uppercase">
            Ledger Watch
          </h1>
          <span className="font-mono text-xs text-muted">|</span>
          <span className="font-mono text-xs font-semibold">Settings Center</span>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className="font-mono text-xs text-red hover:underline cursor-pointer"
        >
          LOGOUT
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-mono text-xl font-bold tracking-tight">System Configuration</h2>
          <span className="label-caps">OPERATOR: {user.username}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: User Profile & Currency */}
          <div className="space-y-6">
            {/* User Profile Form */}
            <div className="panel p-5 bg-panel">
              <h3 className="label-caps mb-4">Operator Profile</h3>
              
              {profileError && (
                <div className="panel border-red/40 bg-red/5 p-3 mb-4 text-red font-mono text-xs">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="panel border-green/40 bg-green/5 p-3 mb-4 text-green font-mono text-xs">
                  Profile updated successfully!
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="label-caps block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Satoshi Nakamoto"
                    className="w-full panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                    required
                  />
                </div>

                <div>
                  <label className="label-caps block mb-1">Wallet Address / Public Key</label>
                  <input
                    type="text"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder="0x..."
                    className="w-full panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                  />
                </div>

                <div>
                  <label className="label-caps block mb-2">Member Node Color</label>
                  <div className="flex flex-wrap gap-2">
                    {colorsList.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                          color === c ? "ring-2 ring-ink scale-110 border-transparent" : "border-border"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full bg-ink text-panel font-mono text-xs font-semibold tracking-wider uppercase py-2 px-4 rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {profileSaving ? "SAVING..." : "SAVE PROFILE"}
                </button>
              </form>
            </div>

            {/* Currency Selector */}
            <div className="panel p-5 bg-panel">
              <h3 className="label-caps mb-4">Currency Representation</h3>
              <p className="font-mono text-xs text-muted mb-4 leading-relaxed">
                Choose the fiat or cryptocurrency symbol used to format outstanding balances, pot totals, and log details.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(CURRENCIES).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleUpdateCurrency(key)}
                    className={`panel p-3 text-center border font-mono text-sm font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                      user.currency === key
                        ? "border-ink bg-ink/5"
                        : "border-border hover:border-ink"
                    }`}
                  >
                    <span className="text-lg">{val.symbol}</span>
                    <span className="label-caps text-[9px] text-ink">{key}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Themes, Teams & More Settings */}
          <div className="space-y-6">
            {/* Theme Toggle */}
            <div className="panel p-5 bg-panel">
              <h3 className="label-caps mb-4">Aesthetics Engine (Theme Toggle)</h3>
              <div className="space-y-2">
                {themesList.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleUpdateTheme(t.key)}
                    className={`w-full panel p-3 border font-mono text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                      user.theme === t.key
                        ? "border-ink bg-ink/5"
                        : "border-border hover:border-ink"
                    }`}
                  >
                    <span>{t.name}</span>
                    <div
                      className="w-16 h-6 border border-border rounded flex items-center justify-around text-[10px]"
                      style={{ backgroundColor: t.bg, color: t.fg }}
                    >
                      <span>Aa</span>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.fg }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Team Renaming Settings */}
            <div className="panel p-5 bg-panel">
              <h3 className="label-caps mb-3">Group Directory (Team Names)</h3>
              <p className="font-mono text-xs text-muted mb-4 leading-relaxed">
                Manage the names of the active groups (teams) you belong to. Changes apply to all members.
              </p>
              {teamError && (
                <div className="panel border-red/40 bg-red/5 p-2 mb-3 text-red font-mono text-xs">
                  {teamError}
                </div>
              )}
              {teams.length === 0 ? (
                <div className="font-mono text-xs text-muted p-2 border border-dashed border-border rounded text-center">
                  No active operations teams found.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="panel p-3 border border-border flex items-center justify-between"
                    >
                      {editingTeamId === t.id ? (
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            value={editingTeamName}
                            onChange={(e) => setEditingTeamName(e.target.value)}
                            className="flex-1 panel border border-border px-2 py-1 font-mono text-xs outline-none focus:border-ink"
                            required
                          />
                          <button
                            onClick={() => handleRenameTeam(t.id)}
                            className="px-2 py-1 bg-ink text-panel font-mono text-[10px] font-bold rounded cursor-pointer"
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditingTeamId(null)}
                            className="px-2 py-1 border border-border font-mono text-[10px] rounded cursor-pointer hover:bg-ink/5"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-bold truncate">{t.name}</div>
                            <div className="label-caps text-[8px] mt-0.5">CODE: {t.code}</div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingTeamId(t.id);
                              setEditingTeamName(t.name);
                            }}
                            className="font-mono text-[10px] text-blue hover:underline cursor-pointer flex-shrink-0"
                          >
                            RENAME
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* More Settings (Alerts & Danger Zone) */}
            <div className="panel p-5 bg-panel border-red/20">
              <h3 className="label-caps mb-3">Auxiliary Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div>
                    <div className="font-mono text-xs font-bold">Ledger Audio Alerts</div>
                    <div className="font-mono text-[10px] text-muted mt-0.5">Sound feedback on live updates</div>
                  </div>
                  <button
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className={`pill font-bold py-1 px-3 transition-colors cursor-pointer ${
                      alertsEnabled ? "bg-green text-white" : "bg-muted text-white"
                    }`}
                  >
                    {alertsEnabled ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-mono text-xs font-bold text-red">Danger Operations</div>
                    <div className="font-mono text-[10px] text-muted mt-0.5">Irreversible administrative actions</div>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="panel border-red text-red hover:bg-red/5 font-mono text-[10px] font-bold py-1.5 px-3 rounded cursor-pointer"
                  >
                    DELETE PROFILE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-3 flex items-center justify-between bg-panel text-center">
        <span className="label-caps">SETTINGS CONSOLE V1.0</span>
        <span className="label-caps hidden sm:inline">NOMINAL OPERATION</span>
      </footer>
    </div>
  );
}
