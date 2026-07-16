"use client";

import type { Debt, Expense } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

interface Props {
  debts: Debt[];
  expenses: Expense[];
}

export default function MetricStrip({ debts, expenses }: Props) {
  const { formatCurrency } = useAuth();

  const totalPot = expenses.reduce(
    (sum, e) => sum + parseFloat(e.amount),
    0
  );
  const activeDebts = debts.filter((d) => !d.settled);
  const settledDebts = debts.filter((d) => d.settled);
  const totalOwed = activeDebts.reduce(
    (sum, d) => sum + parseFloat(d.amount),
    0
  );
  const settleRate =
    debts.length > 0
      ? ((settledDebts.length / debts.length) * 100).toFixed(0)
      : "0";

  // Check for overdue (debts older than 24h and unsettled)
  const now = Date.now();
  const overdueCount = activeDebts.filter((d) => {
    const age = now - new Date(d.createdAt).getTime();
    return age > 24 * 60 * 60 * 1000;
  }).length;

  const metrics = [
    {
      label: "POT TOTAL",
      value: formatCurrency(totalPot),
      color: "",
    },
    {
      label: "ACTIVE DEBTS",
      value: activeDebts.length.toString(),
      color: activeDebts.length > 0 ? "text-blue" : "",
    },
    {
      label: "SETTLED",
      value: settledDebts.length.toString(),
      color: "text-green",
    },
    {
      label: "OUTSTANDING",
      value: formatCurrency(totalOwed),
      color: totalOwed > 0 ? "text-orange" : "text-green",
    },
    {
      label: "SETTLE RATE",
      value: `${settleRate}%`,
      color:
        parseInt(settleRate) >= 80
          ? "text-green"
          : parseInt(settleRate) >= 50
          ? "text-orange"
          : "text-red",
    },
    {
      label: "TX COUNT",
      value: debts.length.toString(),
      color: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-stretch border-b border-border bg-panel">
      {overdueCount > 0 && (
        <div className="col-span-2 sm:col-span-3 lg:col-span-auto flex items-center justify-center gap-2 px-4 py-3 border-r border-b lg:border-b-0 border-border bg-red/5">
          <span className="pill pill-critical">
            {overdueCount} OVERDUE
          </span>
        </div>
      )}
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`px-4 py-3 border-r border-b lg:border-b-0 border-border ${
            i === metrics.length - 1 ? "lg:border-r-0" : ""
          }`}
        >
          <div className="label-caps mb-1">{m.label}</div>
          <div className={`metric-value text-lg ${m.color}`}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

