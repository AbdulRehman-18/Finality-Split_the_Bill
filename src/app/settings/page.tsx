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

  const [from, setFrom] = useState("/dashboard");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "group">("general");

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

  // Group settings tab states
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupData, setGroupData] = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupRenameName, setGroupRenameName] = useState("");
  const [groupSettingsError, setGroupSettingsError] = useState("");
  const [groupSettingsSuccess, setGroupSettingsSuccess] = useState("");

  // Member management states
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberWallet, setNewMemberWallet] = useState("");
  const [newMemberColor, setNewMemberColor] = useState("#3b6fd6");

  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [editingMemberWallet, setEditingMemberWallet] = useState("");
  const [editingMemberColor, setEditingMemberColor] = useState("");

  // Parse query params safely on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from");
      const groupIdParam = params.get("groupId");
      if (fromParam) {
        setFrom(fromParam);
      }
      if (groupIdParam) {
        const id = parseInt(groupIdParam, 10);
        if (!isNaN(id)) {
          setGroupId(id);
          setSelectedGroupId(id);
          setActiveTab("group"); // Open group settings tab directly if group ID was provided
        }
      }
    }
  }, []);

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

  // Load group details for Group Settings tab
  const fetchGroupSettingsData = async (gId: number) => {
    setGroupLoading(true);
    setGroupSettingsError("");
    try {
      const res = await fetch(`/api/groups/${gId}`);
      const data = await res.json();
      if (data.error) {
        setGroupSettingsError(data.error);
        setGroupData(null);
      } else {
        setGroupData(data);
        setGroupRenameName(data.group.name);
      }
    } catch {
      setGroupSettingsError("Failed to fetch group details.");
      setGroupData(null);
    } finally {
      setGroupLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupSettingsData(selectedGroupId);
    } else {
      setGroupData(null);
    }
  }, [selectedGroupId]);

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

  const handleRenameTeam = async (teamId: number) => {
    setTeamError("");
    if (!editingTeamName.trim()) {
      setTeamError("Team name cannot be empty");
      return;
    }

    try {
      const res = await fetch("/api/auth/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: teamId, name: editingTeamName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.group) {
        setEditingTeamId(null);
        fetchTeams();
        if (selectedGroupId === teamId) {
          fetchGroupSettingsData(teamId);
        }
      } else {
        setTeamError(data.error || "Failed to rename team");
      }
    } catch {
      setTeamError("Network error occurred");
    }
  };

  // Group settings specific handlers
  const handleRenameGroup = async () => {
    if (!selectedGroupId || !groupRenameName.trim()) return;
    setGroupSettingsError("");
    setGroupSettingsSuccess("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", name: groupRenameName }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroupSettingsSuccess("Group name updated successfully!");
        fetchGroupSettingsData(selectedGroupId);
        fetchTeams();
        setTimeout(() => setGroupSettingsSuccess(""), 3000);
      } else {
        setGroupSettingsError(data.error || "Failed to rename group");
      }
    } catch {
      setGroupSettingsError("Network error occurred");
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId || !groupData?.canDelete) return;
    const groupName = groupData.group?.name || "this group";
    if (!confirm(`Permanently delete ${groupName} and all of its ledger data? This cannot be undone.`)) {
      return;
    }

    setGroupSettingsError("");
    setGroupSettingsSuccess("");
    setGroupLoading(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setGroupSettingsError(data.error || "Failed to delete group");
        return;
      }

      router.push("/dashboard");
    } catch {
      setGroupSettingsError("Network error occurred");
    } finally {
      setGroupLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroupId || !newMemberName.trim()) return;
    setGroupSettingsError("");
    setGroupSettingsSuccess("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addMember",
          name: newMemberName,
          wallet: newMemberWallet,
          color: newMemberColor,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroupSettingsSuccess("Member added successfully!");
        setNewMemberName("");
        setNewMemberWallet("");
        setNewMemberColor("#3b6fd6");
        setShowAddMember(false);
        fetchGroupSettingsData(selectedGroupId);
        setTimeout(() => setGroupSettingsSuccess(""), 3000);
      } else {
        setGroupSettingsError(data.error || "Failed to add member");
      }
    } catch {
      setGroupSettingsError("Network error occurred");
    }
  };

  const handleEditMember = async (memberId: number) => {
    if (!selectedGroupId || !editingMemberName.trim()) return;
    setGroupSettingsError("");
    setGroupSettingsSuccess("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editMember",
          memberId,
          name: editingMemberName,
          wallet: editingMemberWallet,
          color: editingMemberColor,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroupSettingsSuccess("Member details updated!");
        setEditingMemberId(null);
        fetchGroupSettingsData(selectedGroupId);
        setTimeout(() => setGroupSettingsSuccess(""), 3000);
      } else {
        setGroupSettingsError(data.error || "Failed to update member");
      }
    } catch {
      setGroupSettingsError("Network error occurred");
    }
  };

  const handleDeleteMember = async (memberId: number) => {
    if (!selectedGroupId) return;
    if (!confirm("Are you sure you want to remove this offline member? This is irreversible.")) return;
    setGroupSettingsError("");
    setGroupSettingsSuccess("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteMember",
          memberId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroupSettingsSuccess("Member removed successfully!");
        fetchGroupSettingsData(selectedGroupId);
        setTimeout(() => setGroupSettingsSuccess(""), 3000);
      } else {
        setGroupSettingsError(data.error || "Failed to remove member");
      }
    } catch {
      setGroupSettingsError("Network error occurred");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("WARNING: This will permanently delete your user account. Are you sure?")) {
      return;
    }
    try {
      await fetch("/api/auth/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "DELETED", wallet: "", color: "" }),
      });
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
            onClick={() => router.push(from)}
            className="font-mono text-xs text-muted hover:text-ink flex items-center gap-1 cursor-pointer"
          >
            ← BACK
          </button>
          <div
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-green" />
            <h1 className="font-mono text-xs font-bold tracking-widest uppercase">
              Finality
            </h1>
          </div>
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

        {/* Tabs Bar */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-ink text-ink bg-panel/10"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={`px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "group"
                ? "border-ink text-ink bg-panel/10"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Group Settings
          </button>
        </div>

        {activeTab === "general" ? (
          /* General Settings tab content */
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

                  <div className="flex items-center justify-between mb-4 border border-border p-3 rounded bg-bg/30">
                    <div>
                      <label className="label-caps block mb-1">Blockchain (Optional)</label>
                      <div className="font-mono text-[9px] text-muted">Only needed if you want optional on-chain features</div>
                    </div>
                    <span className="font-mono text-[10px] text-muted">Not connected</span>
                  </div>

                  <div>
                    <label className="label-caps block mb-1">Wallet Address (Fallback / Manual)</label>
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
        ) : (
          /* Group Settings tab content */
          <div className="space-y-6">
            {groupSettingsSuccess && (
              <div className="panel border-green/40 bg-green/5 p-3 text-green font-mono text-xs">
                {groupSettingsSuccess}
              </div>
            )}
            {groupSettingsError && (
              <div className="panel border-red/40 bg-red/5 p-3 text-red font-mono text-xs">
                {groupSettingsError}
              </div>
            )}

            {/* Active group selector */}
            <div className="panel p-5 bg-panel">
              <label className="label-caps block mb-2">Selected Operations Group</label>
              {teams.length === 0 ? (
                <div className="font-mono text-xs text-muted border border-dashed border-border p-4 text-center rounded">
                  No active operations groups found. Join or create a group to begin configuring details.
                </div>
              ) : (
                <select
                  value={selectedGroupId || ""}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    setSelectedGroupId(id || null);
                  }}
                  className="w-full bg-panel text-ink border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                >
                  <option value="">-- SELECT GROUP --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Code: {t.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Config workspace if group selected */}
            {selectedGroupId ? (
              groupLoading && !groupData ? (
                <div className="font-mono text-xs text-muted text-center py-8">
                  SYNCHRONIZING GROUP SYSTEM STATE...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group Rename & Access Code */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rename */}
                    <div className="panel p-5 bg-panel">
                      <h3 className="label-caps mb-3">Group Configuration</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="label-caps block mb-1">Rename Group</label>
                          <input
                            type="text"
                            value={groupRenameName}
                            onChange={(e) => setGroupRenameName(e.target.value)}
                            className="w-full panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                          />
                        </div>
                        <button
                          onClick={handleRenameGroup}
                          disabled={!groupRenameName.trim() || groupLoading}
                          className="w-full bg-ink text-panel font-mono text-xs font-semibold py-2 px-4 rounded hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          SAVE GROUP NAME
                        </button>
                      </div>
                    </div>

                    {/* Access credentials */}
                    <div className="panel p-5 bg-panel flex flex-col justify-between">
                      <div>
                        <h3 className="label-caps mb-2">Access Credentials</h3>
                        <p className="font-mono text-[10px] text-muted leading-relaxed mb-4">
                          Share this unique code to let other operators claim offline placeholder profiles or join this group as new profiles.
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 panel border border-border bg-bg/20 px-4 py-2 font-mono text-md font-bold tracking-widest text-center select-all">
                          {groupData?.group?.code}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(groupData?.group?.code || "");
                            setGroupSettingsSuccess("Access code copied to clipboard!");
                            setTimeout(() => setGroupSettingsSuccess(""), 3000);
                          }}
                          className="border border-border hover:border-ink font-mono text-xs py-2 px-4 rounded cursor-pointer transition-colors"
                        >
                          COPY CODE
                        </button>
                      </div>
                    </div>
                  </div>

                  {groupData?.canDelete && (
                    <div className="panel p-5 bg-panel border-red/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="label-caps text-red mb-1">Danger Zone</h3>
                          <p className="font-mono text-[10px] text-muted leading-relaxed">
                            Permanently remove this group, its members, expenses, and debt history.
                          </p>
                        </div>
                        <button
                          onClick={handleDeleteGroup}
                          disabled={groupLoading}
                          className="border border-red text-red hover:bg-red/5 font-mono text-[10px] font-bold py-2 px-4 rounded cursor-pointer disabled:opacity-50"
                        >
                          DELETE GROUP
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Member Directory */}
                  <div className="panel p-5 bg-panel">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/40">
                      <div>
                        <h3 className="label-caps">Member Directory</h3>
                        <p className="font-mono text-[10px] text-muted">Manage nodes and placeholder profiles within the ledger.</p>
                      </div>
                      <button
                        onClick={() => setShowAddMember(!showAddMember)}
                        className="bg-ink text-panel font-mono text-[10px] font-bold py-1.5 px-3 rounded hover:opacity-90 transition-opacity cursor-pointer uppercase"
                      >
                        {showAddMember ? "✕ CANCEL" : "+ ADD MEMBER SLOT"}
                      </button>
                    </div>

                    {/* Add Member Slot */}
                    {showAddMember && (
                      <div className="panel p-4 bg-bg/25 border-dashed border-border mb-4 space-y-4">
                        <h4 className="label-caps text-xs">New Placeholder Member Profile</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="label-caps block mb-1">Profile Name</label>
                            <input
                              type="text"
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              placeholder="e.g. Alice Smith"
                              className="w-full panel border border-border px-3 py-1.5 font-mono text-xs outline-none focus:border-ink"
                            />
                          </div>
                          <div>
                            <label className="label-caps block mb-1">Web3 Wallet (Optional)</label>
                            <input
                              type="text"
                              value={newMemberWallet}
                              onChange={(e) => setNewMemberWallet(e.target.value)}
                              placeholder="0x..."
                              className="w-full panel border border-border px-3 py-1.5 font-mono text-xs outline-none focus:border-ink"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="label-caps block mb-2">Member Node Color</label>
                          <div className="flex flex-wrap gap-1.5">
                            {colorsList.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewMemberColor(c)}
                                className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                                  newMemberColor === c ? "ring-2 ring-ink scale-110 border-transparent" : "border-border"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handleAddMember}
                          disabled={!newMemberName.trim() || groupLoading}
                          className="bg-ink text-panel font-mono text-xs font-semibold py-1.5 px-4 rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                        >
                          ADD OFFLINE MEMBER
                        </button>
                      </div>
                    )}

                    {/* Member List */}
                    {groupData?.members && groupData.members.length > 0 ? (
                      <div className="space-y-3">
                        {groupData.members.map((m: any) => {
                          const isPlaceholder = m.userId === null;
                          const isEditing = editingMemberId === m.id;

                          return (
                            <div
                              key={m.id}
                              className={`panel p-4 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-panel ${
                                isEditing ? "border-ink ring-1 ring-ink" : ""
                              }`}
                            >
                              {isEditing ? (
                                /* Editing inline form */
                                <div className="w-full space-y-4">
                                  <div className="flex justify-between items-center pb-2 border-b border-border/20">
                                    <span className="label-caps text-xs">Edit Offline Profile: {m.name}</span>
                                    <button
                                      onClick={() => setEditingMemberId(null)}
                                      className="font-mono text-[10px] text-muted hover:text-ink cursor-pointer"
                                    >
                                      ✕ CANCEL
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="label-caps block mb-1">Profile Name</label>
                                      <input
                                        type="text"
                                        value={editingMemberName}
                                        onChange={(e) => setEditingMemberName(e.target.value)}
                                        className="w-full panel border border-border px-3 py-1.5 font-mono text-xs outline-none focus:border-ink"
                                      />
                                    </div>
                                    <div>
                                      <label className="label-caps block mb-1">Web3 Wallet (Optional)</label>
                                      <input
                                        type="text"
                                        value={editingMemberWallet}
                                        onChange={(e) => setEditingMemberWallet(e.target.value)}
                                        className="w-full panel border border-border px-3 py-1.5 font-mono text-xs outline-none focus:border-ink"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="label-caps block mb-2">Member Node Color</label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {colorsList.map((c) => (
                                        <button
                                          key={c}
                                          type="button"
                                          onClick={() => setEditingMemberColor(c)}
                                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                                            editingMemberColor === c ? "ring-2 ring-ink scale-110 border-transparent" : "border-border"
                                          }`}
                                          style={{ backgroundColor: c }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditMember(m.id)}
                                      disabled={groupLoading}
                                      className="bg-ink text-panel font-mono text-xs font-semibold py-1.5 px-4 rounded hover:opacity-90 transition-opacity cursor-pointer"
                                    >
                                      SAVE CHANGES
                                    </button>
                                    <button
                                      onClick={() => setEditingMemberId(null)}
                                      className="border border-border font-mono text-xs py-1.5 px-4 rounded hover:bg-ink/5 cursor-pointer"
                                    >
                                      CANCEL
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* View layout */
                                <>
                                  <div className="flex items-center gap-3">
                                    <span
                                      className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
                                      style={{ backgroundColor: m.color || "#3b6fd6" }}
                                    />
                                    <div>
                                      <div className="font-mono text-sm font-bold flex items-center gap-2">
                                        {m.name}
                                        {isPlaceholder ? (
                                          <span className="font-mono text-[9px] font-bold text-orange px-1.5 py-0.5 rounded border border-orange/40 bg-orange/5 uppercase tracking-wider">
                                            Offline Profile
                                          </span>
                                        ) : (
                                          <span className="font-mono text-[9px] font-bold text-green px-1.5 py-0.5 rounded border border-green/40 bg-green/5 uppercase tracking-wider">
                                            Active User
                                          </span>
                                        )}
                                      </div>
                                      <div className="font-mono text-[10px] text-muted mt-1 select-all">
                                        Wallet: <span className="underline decoration-dotted">{m.wallet || "None configured"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {isPlaceholder && (
                                    <div className="flex gap-2 items-center justify-end">
                                      <button
                                        onClick={() => {
                                          setEditingMemberId(m.id);
                                          setEditingMemberName(m.name);
                                          setEditingMemberWallet(m.wallet || "");
                                          setEditingMemberColor(m.color || "#3b6fd6");
                                        }}
                                        className="font-mono text-[10px] text-blue hover:underline cursor-pointer border border-border hover:border-blue px-2.5 py-1 rounded transition-colors"
                                      >
                                        EDIT
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMember(m.id)}
                                        className="font-mono text-[10px] text-red hover:underline cursor-pointer border border-border hover:border-red px-2.5 py-1 rounded transition-colors"
                                      >
                                        DELETE
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="font-mono text-xs text-muted text-center py-4">
                        No members registered in directory.
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="border border-dashed border-border rounded p-8 text-center bg-panel/30">
                <div className="font-mono text-sm text-muted">No group selected.</div>
                <div className="font-mono text-xs text-muted mt-1">Select an active operations group from the dropdown list above to configure settings.</div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-3 flex items-center justify-between bg-panel text-center">
        <span className="label-caps">SETTINGS CONSOLE V1.0</span>
        <span className="label-caps hidden sm:inline">NOMINAL OPERATION</span>
      </footer>
    </div>
  );
}
