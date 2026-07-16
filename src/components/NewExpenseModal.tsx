"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

interface Props {
  groupId: number;
  members: Member[];
  onClose: () => void;
  onCreated: () => void;
}

export default function NewExpenseModal({
  groupId,
  members,
  onClose,
  onCreated,
}: Props) {
  const { user, currencySymbol } = useAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const [paidBy, setPaidBy] = useState<number>(currentUserMember?.id || members[0]?.id || 0);
  const [splitAmong, setSplitAmong] = useState<Set<number>>(
    new Set(members.map((m) => m.id))
  );
  const [loading, setLoading] = useState(false);

  const toggleMember = (id: number) => {
    const next = new Set(splitAmong);
    if (next.has(id)) {
      if (next.size <= 1) return; // keep at least 1
      next.delete(id);
    } else {
      next.add(id);
    }
    setSplitAmong(next);
  };

  const submit = async () => {
    if (!description || !amount || !paidBy || splitAmong.size < 1) return;
    setLoading(true);
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          description,
          amount,
          category,
          paidByMemberId: paidBy,
          splitAmong: Array.from(splitAmong),
        }),
      });
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const perPerson =
    amount && splitAmong.size > 0
      ? (parseFloat(amount || "0") / splitAmong.size).toFixed(2)
      : "0.00";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm">
      <div className="panel p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="label-caps text-xs">Log New Expense</h2>
          <button
            onClick={onClose}
            className="font-mono text-xs text-muted hover:text-ink"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Description */}
        <label className="label-caps block mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Team dinner at Nobu"
          className="w-full panel border border-border px-3 py-2 font-mono text-sm mb-4 outline-none focus:border-ink"
        />

        {/* Amount */}
        <label className="label-caps block mb-1">Amount ({currencySymbol})</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full panel border border-border px-3 py-2 font-mono text-sm mb-4 outline-none focus:border-ink"
        />

        {/* Category */}
        <label className="label-caps block mb-2">Category</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className="pill transition-all"
              style={{
                background:
                  category === c.key ? c.color : "transparent",
                color: category === c.key ? "white" : c.color,
                border: `1px solid ${c.color}`,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Paid by */}
        <label className="label-caps block mb-2">Paid By</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setPaidBy(m.id)}
              className="pill transition-all cursor-pointer"
              style={{
                background:
                  paidBy === m.id ? m.color : "transparent",
                color: paidBy === m.id ? "white" : m.color,
                border: `1px solid ${m.color || "#3b6fd6"}`,
              }}
            >
              {m.userId === user?.id ? `${m.name} (You)` : m.name}
            </button>
          ))}
        </div>

        {/* Split among */}
        <label className="label-caps block mb-2">
          Split Among ({splitAmong.size})
        </label>
        <div className="flex flex-wrap gap-2 mb-4">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleMember(m.id)}
              className="pill transition-all cursor-pointer"
              style={{
                background: splitAmong.has(m.id)
                  ? (m.color || "#3b6fd6")
                  : "transparent",
                color: splitAmong.has(m.id)
                  ? "white"
                  : (m.color || "#3b6fd6"),
                border: `1px solid ${m.color || "#3b6fd6"}`,
              }}
            >
              {m.userId === user?.id ? `${m.name} (You)` : m.name}
            </button>
          ))}
        </div>

        {/* Per person */}
        <div className="panel border border-border p-3 mb-6">
          <div className="label-caps mb-1">Per Person Share</div>
          <div className="font-mono text-xl font-bold">{currencySymbol}{perPerson}</div>
          <div className="font-mono text-xs text-muted mt-1">
            {splitAmong.size} {splitAmong.size === 1 ? "person" : "people"} ×
            {currencySymbol}{perPerson} = {currencySymbol}{amount || "0.00"}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading || !description || !amount}
          className="w-full bg-ink text-panel font-mono text-sm font-semibold tracking-wider uppercase py-3 px-6 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "LOGGING..." : "LOG EXPENSE"}
        </button>
      </div>
    </div>
  );
}
