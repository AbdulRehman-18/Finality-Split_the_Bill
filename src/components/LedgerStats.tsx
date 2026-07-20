"use client";

import type { Member, Debt } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

interface Props {
  members: Member[];
  debts: Debt[];
}

export default function LedgerStats({ members, debts }: Props) {
  const { formatCurrency } = useAuth();
  // Net balance per member
  const balances = new Map<number, number>();
  members.forEach((m) => balances.set(m.id, 0));

  debts.forEach((d) => {
    if (!d.settled) {
      const amt = parseFloat(d.amount);
      balances.set(d.debtorId, (balances.get(d.debtorId) || 0) - amt);
      balances.set(d.creditorId, (balances.get(d.creditorId) || 0) + amt);
    }
  });

  const sortedMembers = [...members].sort((a, b) => {
    return (balances.get(b.id) || 0) - (balances.get(a.id) || 0);
  });

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  debts.forEach((d) => {
    // We don't have category on debt directly, but we can use a simple count
    const amt = parseFloat(d.amount);
    const existing = categoryTotals.get("all") || 0;
    categoryTotals.set("all", existing + amt);
  });

  const totalDebtAmount = debts.reduce(
    (s, d) => s + parseFloat(d.amount),
    0
  );
  const settledAmount = debts
    .filter((d) => d.settled)
    .reduce((s, d) => s + parseFloat(d.amount), 0);
  const unsettledAmount = debts
    .filter((d) => !d.settled)
    .reduce((s, d) => s + parseFloat(d.amount), 0);

  // Max single debt
  const maxDebt = debts.length > 0
    ? Math.max(...debts.map((d) => parseFloat(d.amount)))
    : 0;

  // Avg debt
  const avgDebt = debts.length > 0 ? totalDebtAmount / debts.length : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <span className="label-caps">Engine Metrics</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Key stats */}
        <div className="p-3 space-y-3 border-b border-border">
          <div className="flex justify-between items-baseline">
            <span className="label-caps">Total Throughput</span>
            <span className="font-mono text-sm font-bold">
              {formatCurrency(totalDebtAmount)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="label-caps">Settled Vol</span>
            <span className="font-mono text-sm font-bold text-green">
              {formatCurrency(settledAmount)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="label-caps">Unsettled Vol</span>
            <span className="font-mono text-sm font-bold text-orange">
              {formatCurrency(unsettledAmount)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="label-caps">Peak TX</span>
            <span className="font-mono text-sm font-bold">
              {formatCurrency(maxDebt)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="label-caps">Avg TX Size</span>
            <span className="font-mono text-sm font-bold">
              {formatCurrency(avgDebt)}
            </span>
          </div>
        </div>

        {/* Balance bars */}
        <div className="p-3 border-b border-border">
          <div className="label-caps mb-3">Net Positions</div>
          <div className="space-y-2">
            {sortedMembers.map((m) => {
              const bal = balances.get(m.id) || 0;
              const maxBal = Math.max(
                ...Array.from(balances.values()).map(Math.abs),
                1
              );
              const pct = Math.abs(bal) / maxBal;

              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: m.color || "#3b6fd6" }}
                      />
                      <span className="font-mono text-xs font-semibold">
                        {m.name}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        bal > 0
                          ? "text-green"
                          : bal < 0
                          ? "text-red"
                          : "text-muted"
                      }`}
                    >
                      {bal > 0 ? "+" : ""}{formatCurrency(Math.abs(bal))}
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct * 100}%`,
                        background:
                          bal > 0
                            ? "#1f9e5c"
                            : bal < 0
                            ? "#d6394a"
                            : "#d4cfc0",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="p-3">
          <div className="label-caps mb-3">Category Legend</div>
          <div className="space-y-1">
            {CATEGORIES.map((c) => (
              <div
                key={c.key}
                className="flex items-center gap-2"
              >
                <span
                  className="w-3 h-1.5 rounded-sm"
                  style={{ background: c.color }}
                />
                <span className="font-mono text-[10px] text-muted">
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status indicators */}
        <div className="p-3 border-t border-border">
          <div className="label-caps mb-3">System Status</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green" />
              <span className="font-mono text-[10px]">
                LEDGER SYNC: NOMINAL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green" />
              <span className="font-mono text-[10px]">
                GRAPH ENGINE: ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green" />
              <span className="font-mono text-[10px]">
                SETTLEMENT: READY
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
