"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import MetricStrip from "@/components/MetricStrip";
import DebtList from "@/components/DebtList";
import ForceGraph from "@/components/ForceGraph";
import LedgerStats from "@/components/LedgerStats";
import AlertFeed from "@/components/AlertFeed";
import NewExpenseModal from "@/components/NewExpenseModal";
import type { Group, Member, Expense, Debt } from "@/lib/types";

interface UnclaimedMember {
  id: number;
  name: string;
  color: string;
}

export default function GroupDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const [isMember, setIsMember] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [recentlySettled, setRecentlySettled] = useState<Set<number>>(
    new Set()
  );
  const [rightTab, setRightTab] = useState<"stats" | "alerts">("stats");
  const [activeTab, setActiveTab] = useState<"network" | "debts" | "engine">(
    "network"
  );

  // Join Gate States
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [unclaimedMembers, setUnclaimedMembers] = useState<UnclaimedMember[]>([]);
  const [joinError, setJoinError] = useState("");
  const dataSignatureRef = useRef("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      const data = await res.json();
      if (data.error) {
        router.push("/dashboard");
        return;
      }
      const nextIsMember = data.isMember !== false;
      const nextMembers = data.members || [];
      const nextExpenses = data.expenses || [];
      const nextDebts = data.debts || [];
      const signature = JSON.stringify({
        group: data.group,
        isMember: nextIsMember,
        members: nextMembers,
        expenses: nextExpenses,
        debts: nextDebts,
      });

      // Polling is frequent enough to keep the dashboard live, but most polls
      // return the same data. Avoid replacing arrays and re-running the graph
      // and every derived panel when nothing actually changed.
      if (dataSignatureRef.current === signature) return;
      dataSignatureRef.current = signature;

      setGroup(data.group);
      setIsMember(nextIsMember);
      if (nextIsMember) {
        setMembers(nextMembers);
        setExpenses(nextExpenses);
        setDebts(nextDebts);
      }
    } catch {
      console.error("Failed to fetch group data");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Auth gate check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch data on load and poll if member
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  useEffect(() => {
    if (!user || !isMember) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    const poll = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    const startPolling = () => {
      if (!interval) interval = setInterval(poll, 15000);
    };
    const stopPolling = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
    };

    startPolling();
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", poll);
    };
  }, [user, isMember, fetchData]);

  // Settle handler
  const handleSettle = async (debtId: number) => {
    setSettlingId(debtId);
    try {
      const res = await fetch(`/api/debts/${debtId}/settle`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.error) {
        setRecentlySettled((prev) => new Set([...prev, debtId]));
        setTimeout(() => {
          setRecentlySettled((prev) => {
            const next = new Set(prev);
            next.delete(debtId);
            return next;
          });
        }, 3000);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSettlingId(null);
    }
  };

  // Join Gate Handlers
  const handleValidateCodeOnly = async () => {
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
        setJoinError(data.error || "Failed to verify group code.");
        return;
      }
      setUnclaimedMembers(data.unclaimedMembers || []);
      if (!data.unclaimedMembers || data.unclaimedMembers.length === 0) {
        // No unclaimed members, join as a new member directly
        await handleExecuteJoin(undefined, true);
      }
    } catch {
      setJoinError("Network error occurred.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleExecuteJoin = async (claimMemberId?: number, joinNew?: boolean) => {
    setJoinLoading(true);
    setJoinError("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: joinCode.trim() || group?.code, // use explicit code or fall back to known group code if claiming
          claimMemberId,
          joinNew,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsMember(true);
        setLoading(true);
        await fetchData();
      } else {
        setJoinError(data.error || "Failed to join group.");
      }
    } catch {
      setJoinError("Network error occurred.");
    } finally {
      setJoinLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-sm text-muted animate-pulse">
            LOADING OPS CENTER...
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-sm text-red">GROUP NOT FOUND</div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 font-mono text-xs text-blue hover:underline cursor-pointer"
          >
            ← RETURN TO BASE
          </button>
        </div>
      </div>
    );
  }

  // Join Gate Render
  if (!isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md panel p-6 sm:p-8 bg-panel relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-red opacity-60" />
          
          <h2 className="label-caps text-red mb-3">ACCESS GATED</h2>
          <p className="font-mono text-2xl font-bold mb-4">Join {group.name}</p>
          <p className="font-mono text-xs text-muted mb-6 leading-relaxed">
            You are not currently registered as a member of this operations group. To view the ledger and network dashboard, you must enter this group's access code.
          </p>

          {joinError && (
            <div className="panel border-red/40 bg-red/5 p-3 mb-4 text-red font-mono text-xs">
              {joinError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label-caps block mb-1">Group Access Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. F8D5KW"
                maxLength={12}
                className="w-full panel border border-border px-3 py-2 font-mono text-sm outline-none focus:border-ink text-center tracking-widest text-lg font-bold"
              />
            </div>

            {unclaimedMembers.length > 0 && (
              <div className="border-t border-border/40 pt-4">
                <span className="label-caps block mb-2">Claim Existing Profile Slot</span>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {unclaimedMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleExecuteJoin(m.id)}
                      disabled={joinLoading}
                      className="panel p-2 text-left border border-border hover:border-ink bg-panel transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="font-mono text-[10px] font-bold">{m.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleExecuteJoin(undefined, true)}
                disabled={joinLoading}
                className="flex-1 bg-ink text-panel font-mono text-xs font-semibold py-2.5 px-4 rounded hover:opacity-90 transition-opacity cursor-pointer uppercase text-center"
              >
                {joinLoading ? "JOINING..." : "JOIN AS NEW"}
              </button>
              
              {unclaimedMembers.length === 0 && (
                <button
                  onClick={handleValidateCodeOnly}
                  disabled={joinLoading || !joinCode.trim()}
                  className="border border-border font-mono text-xs py-2.5 px-4 rounded hover:border-ink transition-colors cursor-pointer uppercase text-center"
                >
                  VERIFY CODE
                </button>
              )}
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full text-center font-mono text-xs text-muted hover:text-ink mt-4 block cursor-pointer"
            >
              ← RETURN TO BASE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between bg-panel flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="font-mono text-xs text-muted hover:text-ink cursor-pointer"
          >
            ←
          </button>
          <div
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-green" />
            <h1 className="font-mono text-xs font-bold tracking-widest uppercase">
              Finality
            </h1>
            <span className="pill pill-live">
              <span className="live-dot" />
              LIVE
            </span>
          </div>
          <span className="font-mono text-xs text-muted hidden sm:inline">|</span>
          <span className="font-mono text-xs font-semibold hidden sm:inline">
            {group.name}
          </span>
          <span className="font-mono text-[10px] text-muted hidden sm:inline">
            [{group.code}]
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Settings Shortcut */}
          <button
            onClick={() => router.push(`/settings?from=/group/${group.id}&groupId=${group.id}`)}
            className="font-mono text-xs text-muted hover:text-ink cursor-pointer"
            title="Settings Center"
          >
            ⚙ settings
          </button>


          <span className="font-mono text-[10px] text-muted hidden md:inline">
            {new Date().toLocaleString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </span>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-ink text-panel font-mono text-[10px] font-semibold tracking-wider uppercase py-1.5 px-3 rounded hover:opacity-90 transition-opacity cursor-pointer"
          >
            + LOG EXPENSE
          </button>
        </div>
      </header>

      {/* Metric Strip */}
      <MetricStrip debts={debts} expenses={expenses} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Debts */}
        <div className={`w-full lg:w-72 xl:w-80 border-b lg:border-b-0 lg:border-r border-border bg-panel flex-shrink-0 flex flex-col overflow-hidden ${
          activeTab === "debts" ? "flex" : "hidden lg:flex"
        }`}>
          <DebtList
            debts={debts}
            expenses={expenses}
            members={members}
            onSettle={handleSettle}
            settlingId={settlingId}
          />
        </div>

        {/* Center - Force Graph */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          activeTab === "network" ? "flex" : "hidden lg:flex"
        }`}>
          <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-panel/50">
            <div className="flex items-center gap-2">
              <span className="label-caps">Debt Network</span>
              <span className="font-mono text-[10px] text-muted">
                {members.length} NODES · {debts.length} EDGES
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue rounded" />
                <span className="font-mono text-[10px] text-muted">
                  PENDING
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-green rounded" />
                <span className="font-mono text-[10px] text-muted">
                  SETTLED
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            {members.length > 0 ? (
              <ForceGraph
                members={members}
                debts={debts}
                recentlySettled={recentlySettled}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="font-mono text-sm text-muted">
                  NO DATA — LOG AN EXPENSE TO BEGIN
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Stats/Alerts */}
        <div className={`w-full lg:w-64 xl:w-72 border-t lg:border-t-0 lg:border-l border-border bg-panel flex-shrink-0 flex flex-col overflow-hidden ${
          activeTab === "engine" ? "flex" : "hidden lg:flex"
        }`}>
          {/* Right tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setRightTab("stats")}
              className={`flex-1 px-3 py-2 font-mono text-[10px] font-semibold tracking-wider uppercase text-center border-b-2 transition-colors ${
                rightTab === "stats"
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Engine
            </button>
            <button
              onClick={() => setRightTab("alerts")}
              className={`flex-1 px-3 py-2 font-mono text-[10px] font-semibold tracking-wider uppercase text-center border-b-2 transition-colors ${
                rightTab === "alerts"
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Alerts
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rightTab === "stats" ? (
              <LedgerStats members={members} debts={debts} />
            ) : (
              <AlertFeed
                debts={debts}
                members={members}
                expenses={expenses}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex border-t border-border bg-panel flex-shrink-0">
        <button
          onClick={() => setActiveTab("debts")}
          className={`flex-1 py-3 font-mono text-xs font-bold tracking-wider uppercase text-center border-t-2 transition-all ${
            activeTab === "debts"
              ? "border-t-ink text-ink bg-bg/10"
              : "border-t-transparent text-muted hover:text-ink"
          }`}
        >
          Debts ({debts.filter((d) => !d.settled).length})
        </button>
        <button
          onClick={() => setActiveTab("network")}
          className={`flex-1 py-3 font-mono text-xs font-bold tracking-wider uppercase text-center border-t-2 border-l border-r border-border transition-all ${
            activeTab === "network"
              ? "border-t-ink text-ink bg-bg/10"
              : "border-t-transparent text-muted hover:text-ink"
          }`}
        >
          Network
        </button>
        <button
          onClick={() => setActiveTab("engine")}
          className={`flex-1 py-3 font-mono text-xs font-bold tracking-wider uppercase text-center border-t-2 transition-all ${
            activeTab === "engine"
              ? "border-t-ink text-ink bg-bg/10"
              : "border-t-transparent text-muted hover:text-ink"
          }`}
        >
          Engine
        </button>
      </div>

      {/* Bottom bar */}
      <footer className="border-t border-border px-4 py-1.5 flex items-center justify-between bg-panel flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="label-caps">
            {members.length} OPERATORS
          </span>
          <span className="label-caps hidden sm:inline">
            {debts.filter((d) => !d.settled).length} ACTIVE ·{" "}
            {debts.filter((d) => d.settled).length} SETTLED
          </span>
        </div>
        <span className="label-caps hidden md:inline">
          ALL SYSTEMS NOMINAL
        </span>
      </footer>

      {/* Expense Modal */}
      {showExpenseModal && (
        <NewExpenseModal
          groupId={group.id}
          members={members}
          onClose={() => setShowExpenseModal(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}
