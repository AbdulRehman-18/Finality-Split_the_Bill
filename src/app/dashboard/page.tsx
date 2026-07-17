"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
interface Group {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

interface UnclaimedMember {
  id: number;
  name: string;
  color: string;
}

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  
  // Create Group States
  const [name, setName] = useState("");
  const [memberNames, setMemberNames] = useState([""]); // Creator is auto-added, so we start with 1 slot for additional members
  const [createLoading, setCreateLoading] = useState(false);

  // Join Group States
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinStep, setJoinStep] = useState<"code" | "claim">("code");
  const [joinGroupData, setJoinGroupData] = useState<Group | null>(null);
  const [unclaimedMembers, setUnclaimedMembers] = useState<UnclaimedMember[]>([]);
  const [joinError, setJoinError] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch groups user belongs to
  useEffect(() => {
    if (user) {
      fetch("/api/groups")
        .then((r) => r.json())
        .then((d) => setGroups(d.groups || []))
        .catch(() => {});
    }
  }, [user]);

  const addMemberSlot = () => setMemberNames([...memberNames, ""]);
  const removeMemberSlot = (i: number) => {
    setMemberNames(memberNames.filter((_, idx) => idx !== i));
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) return;
    setCreateLoading(true);
    try {
      const extraMembers = memberNames
        .filter((m) => m.trim())
        .map((m) => ({ name: m.trim() }));

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          members: extraMembers,
        }),
      });
      const data = await res.json();
      if (data.group) {
        router.push(`/group/${data.group.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleValidateJoinCode = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || "Group validation failed.");
        setJoinLoading(false);
        return;
      }

      if (data.alreadyJoined) {
        // Redirect directly
        router.push(`/group/${data.group.id}`);
        return;
      }

      setJoinGroupData(data.group);
      setUnclaimedMembers(data.unclaimedMembers || []);
      
      if (data.unclaimedMembers && data.unclaimedMembers.length > 0) {
        setJoinStep("claim");
      } else {
        // No unclaimed members, join as a new member automatically
        await executeJoin(joinCode.trim(), undefined, true);
      }
    } catch {
      setJoinError("Network error occurred.");
    } finally {
      setJoinLoading(false);
    }
  };

  const executeJoin = async (codeStr: string, claimMemberId?: number, joinNew?: boolean) => {
    setJoinLoading(true);
    setJoinError("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeStr,
          claimMemberId,
          joinNew,
        }),
      });
      const data = await res.json();
      if (res.ok && data.group) {
        router.push(`/group/${data.group.id}`);
      } else {
        setJoinError(data.error || "Failed to join group.");
      }
    } catch {
      setJoinError("Network error occurred.");
    } finally {
      setJoinLoading(false);
    }
  };

  const resetJoinFlow = () => {
    setJoinCode("");
    setJoinStep("code");
    setJoinGroupData(null);
    setUnclaimedMembers([]);
    setJoinError("");
    setShowJoin(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-sm text-muted animate-pulse">
          INITIALIZING GATEWAY...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between bg-panel sticky top-0 z-10">
        <div
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-green" />
          <h1 className="font-mono text-sm font-bold tracking-widest uppercase">
            Finality
          </h1>
          <span className="pill pill-live">
            <span className="live-dot" />
            LIVE
          </span>
        </div>

        {/* User Identity widget */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => router.push("/settings")}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: user.color || "#3b6fd6" }}
            />
            <span className="font-mono text-xs font-bold text-ink underline decoration-dotted">
              {user.displayName}
            </span>
          </div>
          
          <button
            onClick={() => router.push("/settings")}
            className="font-mono text-xs text-muted hover:text-ink cursor-pointer"
            title="Settings Center"
          >
            ⚙
          </button>


          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="font-mono text-xs text-red hover:underline cursor-pointer"
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          {!showCreate && !showJoin ? (
            <div className="panel p-5 sm:p-8 bg-panel">
              <h2 className="label-caps mb-1">Operations Center</h2>
              <p className="font-mono text-2xl font-bold mb-6">
                Split the Bill, Track Every Debt
              </p>
              <p className="font-sans text-sm text-muted mb-8 leading-relaxed">
                Create an operations group, add members, or join using an active group access code to keep track of balances and resolve transactions on-chain.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full bg-ink text-panel font-mono text-sm font-semibold tracking-wider uppercase py-3 px-4 rounded hover:opacity-90 transition-opacity cursor-pointer text-center"
                >
                  + New Group
                </button>
                <button
                  onClick={() => setShowJoin(true)}
                  className="w-full border border-border text-ink hover:border-ink font-mono text-sm font-semibold tracking-wider uppercase py-3 px-4 rounded transition-colors cursor-pointer text-center"
                >
                  Join Group By Code
                </button>
              </div>

              {groups.length > 0 ? (
                <div>
                  <h3 className="label-caps mb-3">Active Operations Groups ({groups.length})</h3>
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => router.push(`/group/${g.id}`)}
                        className="w-full panel p-4 flex items-center justify-between hover:border-ink transition-colors text-left bg-panel cursor-pointer"
                      >
                        <div>
                          <div className="font-mono text-sm font-bold">
                            {g.name}
                          </div>
                          <div className="label-caps mt-1">
                            CODE: {g.code}
                          </div>
                        </div>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M6 4l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded p-6 text-center">
                  <div className="font-mono text-sm text-muted">No active groups</div>
                  <div className="font-mono text-xs text-muted mt-1">Initialize a new group or input a code above.</div>
                </div>
              )}
            </div>
          ) : showCreate ? (
            /* Creation Flow */
            <div className="panel p-5 sm:p-8 bg-panel">
              <div className="flex items-center justify-between mb-6">
                <h2 className="label-caps">New Operations Group</h2>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setName("");
                    setMemberNames([""]);
                  }}
                  className="font-mono text-xs text-muted hover:text-ink cursor-pointer"
                >
                  ✕ CANCEL
                </button>
              </div>

              <label className="label-caps block mb-2">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Hackathon Crew"
                className="w-full panel border border-border px-3 py-2 font-mono text-sm mb-6 outline-none focus:border-ink"
              />

              <div className="flex items-center justify-between mb-2">
                <label className="label-caps">Initial Placeholder Members</label>
                <span className="font-mono text-[9px] text-muted">Creator ({user.displayName}) is auto-included</span>
              </div>
              
              <div className="space-y-2 mb-4">
                {memberNames.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={m}
                      onChange={(e) => {
                        const copy = [...memberNames];
                        copy[i] = e.target.value;
                        setMemberNames(copy);
                      }}
                      placeholder={`Name for member ${i + 1}`}
                      className="flex-1 panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink"
                    />
                    {memberNames.length > 1 && (
                      <button
                        onClick={() => removeMemberSlot(i)}
                        className="px-3 font-mono text-xs text-red hover:opacity-75 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addMemberSlot}
                className="font-mono text-xs text-blue hover:opacity-70 mb-6 block cursor-pointer"
              >
                + ADD MEMBER SLOT
              </button>

              <button
                onClick={handleCreateGroup}
                disabled={createLoading || !name.trim()}
                className="w-full bg-ink text-panel font-mono text-sm font-semibold tracking-wider uppercase py-3 px-6 rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {createLoading ? "CREATING..." : "CREATE & ENTER GROUP"}
              </button>
            </div>
          ) : (
            /* Join Flow */
            <div className="panel p-5 sm:p-8 bg-panel">
              <div className="flex items-center justify-between mb-6">
                <h2 className="label-caps">Join Operations Group</h2>
                <button
                  onClick={resetJoinFlow}
                  className="font-mono text-xs text-muted hover:text-ink cursor-pointer"
                >
                  ✕ CANCEL
                </button>
              </div>

              {joinError && (
                <div className="panel border-red/40 bg-red/5 p-3 mb-4 text-red font-mono text-xs">
                  {joinError}
                </div>
              )}

              {joinStep === "code" ? (
                <div>
                  <label className="label-caps block mb-2">Group Access Code (6 Characters)</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. F8D5KW"
                    maxLength={12}
                    className="w-full panel border border-border px-3 py-2 font-mono text-sm mb-6 outline-none focus:border-ink text-center tracking-widest text-lg font-bold"
                  />
                  <button
                    onClick={handleValidateJoinCode}
                    disabled={joinLoading || !joinCode.trim()}
                    className="w-full bg-ink text-panel font-mono text-sm font-semibold tracking-wider uppercase py-3 px-6 rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {joinLoading ? "VERIFYING CODE..." : "VERIFY ACCESS CODE"}
                  </button>
                </div>
              ) : (
                /* Claim Profile Selection */
                <div>
                  <div className="panel border-border bg-ink/5 p-3 mb-6 font-mono text-xs">
                    <span className="font-bold text-ink uppercase tracking-wider block mb-1">Group Found</span>
                    Name: <span className="font-bold">{joinGroupData?.name}</span><br />
                    Code: <span className="font-bold">{joinGroupData?.code}</span>
                  </div>

                  <p className="font-mono text-sm font-semibold mb-4 leading-relaxed">
                    Choose how you want to join this group:
                  </p>

                  <div className="space-y-4">
                    {unclaimedMembers.length > 0 && (
                      <div>
                        <span className="label-caps block mb-2">Claim Existing Offline Profile</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {unclaimedMembers.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => executeJoin(joinCode, m.id)}
                              disabled={joinLoading}
                              className="panel p-3 text-left border border-border hover:border-ink bg-panel transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                                <span className="font-mono text-xs font-bold text-ink">{m.name}</span>
                              </div>
                              <span className="font-mono text-[9px] text-muted block mt-1">Claim this role and sync outstanding debts.</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-border/60 pt-4">
                      <span className="label-caps block mb-2">Join as a New Member</span>
                      <button
                        onClick={() => executeJoin(joinCode, undefined, true)}
                        disabled={joinLoading}
                        className="w-full panel p-3 text-left border border-border hover:border-ink bg-panel transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono text-xs font-bold text-ink">Create New Profile</span>
                          <span className="font-mono text-[9px] text-muted block mt-1">Join as '{user.displayName}' beside existing members.</span>
                        </div>
                        <span className="font-mono text-xs text-blue">JOIN →</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-3 flex items-center justify-between bg-panel">
        <span className="label-caps">
          Finality v1.0
        </span>
        <span className="label-caps hidden xs:inline">
          ALL SYSTEMS NOMINAL
        </span>
      </footer>
    </div>
  );
}
