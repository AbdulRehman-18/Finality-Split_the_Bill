"use client";

import type { Debt, Member, Expense } from "@/lib/types";
import { timeAgo } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

interface Alert {
  id: string;
  type: "settled" | "new" | "overdue";
  message: string;
  amount: string;
  time: string;
}

interface Props {
  debts: Debt[];
  members: Member[];
  expenses: Expense[];
}

export default function AlertFeed({ debts, members, expenses }: Props) {
  const { formatCurrency } = useAuth();
  const getMember = (id: number) => members.find((m) => m.id === id);
  const getExpense = (id: number) => expenses.find((e) => e.id === id);

  const alerts: Alert[] = [];

  // Generate alerts from debts
  const now = Date.now();
  debts.forEach((d) => {
    const debtor = getMember(d.debtorId);
    const creditor = getMember(d.creditorId);
    const expense = getExpense(d.expenseId);

    if (d.settled && d.settledAt) {
      alerts.push({
        id: `settled-${d.id}`,
        type: "settled",
        message: `${debtor?.name || "?"} settled ${formatCurrency(d.amount)} with ${creditor?.name || "?"}`,
        amount: d.amount,
        time: d.settledAt,
      });
    }

    if (!d.settled) {
      const age = now - new Date(d.createdAt).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        alerts.push({
          id: `overdue-${d.id}`,
          type: "overdue",
          message: `${debtor?.name || "?"} owes ${creditor?.name || "?"} — ${expense?.description || "expense"} overdue`,
          amount: d.amount,
          time: d.createdAt,
        });
      }
    }

    // New debt alert
    alerts.push({
      id: `new-${d.id}`,
      type: "new",
      message: `${debtor?.name || "?"} → ${creditor?.name || "?"}: ${expense?.description || "expense"}`,
      amount: d.amount,
      time: d.createdAt,
    });
  });

  // Sort by time descending
  alerts.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  const typeStyles = {
    settled: { bg: "bg-green/10", dot: "bg-green", text: "text-green" },
    new: { bg: "bg-blue/10", dot: "bg-blue", text: "text-blue" },
    overdue: { bg: "bg-orange/10", dot: "bg-orange", text: "text-orange" },
  };

  return (
    <div className="divide-y divide-border">
      {alerts.length === 0 ? (
        <div className="p-4 text-center">
          <div className="font-mono text-xs text-muted">
            No activity yet
          </div>
        </div>
      ) : (
        alerts.slice(0, 20).map((alert) => {
          const style = typeStyles[alert.type];
          return (
            <div
              key={alert.id}
              className={`px-3 py-2 ${style.bg} transition-colors`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] leading-tight">
                    {alert.message}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`font-mono text-[10px] font-bold ${style.text}`}
                    >
                      {formatCurrency(alert.amount)}
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      {timeAgo(alert.time)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
