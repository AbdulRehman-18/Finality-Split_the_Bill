"use client";

import { useState } from "react";
import type { Member, Debt, Expense } from "@/lib/types";
import { timeAgo, getCategoryColor, getCategoryLabel } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import { useWriteContract, useAccount } from "wagmi";
import { parseEther } from "viem";
import { ABI, CONTRACT_ADDRESS } from "@/lib/contract";

interface Props {
  debts: Debt[];
  expenses: Expense[];
  members: Member[];
  onSettle: (debtId: number) => void;
  settlingId: number | null;
}

export default function DebtList({
  debts,
  expenses,
  members,
  onSettle,
  settlingId,
}: Props) {
  const { user, formatCurrency } = useAuth();
  const [tab, setTab] = useState<"debts" | "log">("debts");
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const [loggingId, setLoggingId] = useState<number | null>(null);

  const handleLogDebt = async (debt: Debt, creditorWallet: string) => {
    setLoggingId(debt.id);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'logDebt',
        args: [creditorWallet as `0x${string}`, parseEther(debt.amount)],
      });
      console.log("Tx Hash:", hash);
      // API call to save onchainId would go here
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingId(null);
    }
  };

  const handleSettleOnchain = async (debt: Debt) => {
    onSettle(debt.id); // Triggers loading state in parent
    if (debt.onchainId == null) {
      console.error("No on-chain ID");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'settle',
        args: [BigInt(debt.onchainId)],
        value: parseEther(debt.amount),
      });
      console.log("Tx Hash:", hash);
      // Parent should ideally wait for receipt, but for now we let it refresh
    } catch (e) {
      console.error(e);
    }
  };

  const getMember = (id: number) => members.find((m) => m.id === id);
  const getExpense = (id: number) => expenses.find((e) => e.id === id);

  const activeDebts = debts.filter((d) => !d.settled);
  const settledDebts = debts.filter((d) => d.settled);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("debts")}
          className={`flex-1 px-4 py-2 font-mono text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-colors ${
            tab === "debts"
              ? "border-ink text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Debts ({activeDebts.length})
        </button>
        <button
          onClick={() => setTab("log")}
          className={`flex-1 px-4 py-2 font-mono text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-colors ${
            tab === "log"
              ? "border-ink text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Full Log ({debts.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "debts" ? (
          <div>
            {activeDebts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="font-mono text-sm text-muted">
                  No active debts
                </div>
                <div className="font-mono text-xs text-muted mt-1">
                  All clear — or log an expense to start
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeDebts.map((debt) => {
                  const debtor = getMember(debt.debtorId);
                  const creditor = getMember(debt.creditorId);
                  const expense = getExpense(debt.expenseId);

                  return (
                    <div
                      key={debt.id}
                      className="p-3 hover:bg-bg/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                background: debtor?.color || "#3b6fd6",
                              }}
                            />
                            <span className="font-mono text-xs font-semibold truncate">
                              {debtor?.userId === user?.id ? `${debtor?.name} (You)` : debtor?.name || "?"}
                            </span>
                            <span className="font-mono text-xs text-muted">
                              →
                            </span>
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                background:
                                  creditor?.color || "#3b6fd6",
                              }}
                            />
                            <span className="font-mono text-xs font-semibold truncate">
                              {creditor?.userId === user?.id ? `${creditor?.name} (You)` : creditor?.name || "?"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {expense && (
                              <span
                                className="pill"
                                style={{
                                  background: getCategoryColor(
                                    expense.category
                                  ),
                                  color: "white",
                                }}
                              >
                                {getCategoryLabel(expense.category)}
                              </span>
                            )}
                            <span className="font-mono text-xs text-muted truncate">
                              {expense?.description || ""}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono text-sm font-bold text-blue">
                            {formatCurrency(debt.amount)}
                          </div>
                          <div className="font-mono text-[10px] text-muted">
                            {timeAgo(debt.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {debtor?.userId === user?.id ? (
                        debt.onchainId != null ? (
                          <button
                            onClick={() => handleSettleOnchain(debt)}
                            disabled={settlingId === debt.id}
                            className="mt-2 w-full bg-green/10 text-green font-mono text-xs font-semibold tracking-wider uppercase py-1.5 rounded hover:bg-green/20 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {settlingId === debt.id ? "SETTLING ON-CHAIN..." : "SETTLE UP (ON-CHAIN)"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLogDebt(debt, creditor?.wallet || "")}
                            disabled={loggingId === debt.id}
                            className="mt-2 w-full border border-ink text-ink font-mono text-xs font-semibold tracking-wider uppercase py-1.5 rounded hover:bg-ink hover:text-panel transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {loggingId === debt.id ? "LOGGING..." : "LOG DEBT ON-CHAIN"}
                          </button>
                        )
                      ) : (
                        <div className="mt-2 w-full text-center py-1.5 font-mono text-[10px] text-muted border border-dashed border-border rounded">
                          {debt.onchainId != null ? "PENDING SETTLEMENT" : "AWAITING ON-CHAIN LOG"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {settledDebts.length > 0 && (
              <div className="border-t border-border">
                <div className="px-3 py-2 label-caps bg-bg/50">
                  Recently Settled
                </div>
                <div className="divide-y divide-border">
                  {settledDebts.slice(-5).reverse().map((debt) => {
                    const debtor = getMember(debt.debtorId);
                    const creditor = getMember(debt.creditorId);

                    return (
                      <div
                        key={debt.id}
                        className="p-3 opacity-60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {debtor?.userId === user?.id ? `${debtor?.name} (You)` : debtor?.name} → {creditor?.userId === user?.id ? `${creditor?.name} (You)` : creditor?.name}
                            </span>
                            <span className="pill pill-settled">
                              SETTLED
                            </span>
                          </div>
                          <span className="font-mono text-xs text-green">
                            {formatCurrency(debt.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {debts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="font-mono text-sm text-muted">
                  No transactions yet
                </div>
              </div>
            ) : (
              [...debts].reverse().map((debt) => {
                const debtor = getMember(debt.debtorId);
                const creditor = getMember(debt.creditorId);
                const expense = getExpense(debt.expenseId);

                return (
                  <div key={debt.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: debt.settled
                              ? "#1f9e5c"
                              : "#3b6fd6",
                          }}
                        />
                        <span className="font-mono text-xs">
                          {debtor?.userId === user?.id ? `${debtor?.name} (You)` : debtor?.name} → {creditor?.userId === user?.id ? `${creditor?.name} (You)` : creditor?.name}
                        </span>
                        {debt.settled && (
                          <span className="pill pill-settled">
                            SETTLED
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            debt.settled
                              ? "text-green"
                              : "text-blue"
                          }`}
                        >
                          {formatCurrency(debt.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 pl-4">
                      {expense && (
                        <span className="font-mono text-[10px] text-muted">
                          {expense.description}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-muted">
                        · {timeAgo(debt.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
