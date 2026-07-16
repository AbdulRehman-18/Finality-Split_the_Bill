"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import MetricStrip from "@/components/MetricStrip";
import DebtList from "@/components/DebtList";
import ForceGraph from "@/components/ForceGraph";
import LedgerStats from "@/components/LedgerStats";
import AlertFeed from "@/components/AlertFeed";
import NewExpenseModal from "@/components/NewExpenseModal";
import type { Group, Member, Expense, Debt } from "@/lib/types";

export default function GroupDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      const data = await res.json();
      if (data.error) {
        router.push("/");
        return;
      }
      setGroup(data.group);
      setMembers(data.members);
      setExpenses(data.expenses);
      setDebts(data.debts);
    } catch {
      console.error("Failed to fetch group data");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
    // Poll every 5s for live updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSettle = async (debtId: number) => {
    setSettlingId(debtId);
    try {
      const res = await fetch(`/api/debts/${debtId}/settle`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.error) {
        setRecentlySettled((prev) => new Set([...prev, debtId]));
        // Clear the animation after 3s
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

  if (loading) {
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
            onClick={() => router.push("/")}
            className="mt-4 font-mono text-xs text-blue hover:underline"
          >
            ← RETURN TO BASE
          </button>
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
            onClick={() => router.push("/")}
            className="font-mono text-xs text-muted hover:text-ink"
          >
            ←
          </button>
          <div className="w-2 h-2 rounded-full bg-green" />
          <h1 className="font-mono text-xs font-bold tracking-widest uppercase">
            Ledger Watch
          </h1>
          <span className="pill pill-live">
            <span className="live-dot" />
            LIVE
          </span>
          <span className="font-mono text-xs text-muted hidden sm:inline">|</span>
          <span className="font-mono text-xs font-semibold hidden sm:inline">
            {group.name}
          </span>
          <span className="font-mono text-[10px] text-muted hidden sm:inline">
            [{group.code}]
          </span>
        </div>
        <div className="flex items-center gap-3">
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
            className="bg-ink text-panel font-mono text-[10px] font-semibold tracking-wider uppercase py-1.5 px-3 rounded hover:opacity-90 transition-opacity"
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
