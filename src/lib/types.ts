export interface Group {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

export interface Member {
  id: number;
  groupId: number;
  userId?: number | null;
  name: string;
  wallet: string;
  color: string;
  createdAt: string;
}

export interface Expense {
  id: number;
  groupId: number;
  description: string;
  amount: string;
  category: string;
  paidByMemberId: number;
  createdAt: string;
}

export interface Debt {
  id: number;
  groupId: number;
  expenseId: number;
  debtorId: number;
  creditorId: number;
  amount: string;
  onchainId?: number | null;
  settled: boolean;
  settledAt: string | null;
  createdAt: string;
}

export const CATEGORIES = [
  { key: "food", label: "FOOD", color: "#9b5fd6" },
  { key: "transport", label: "TRANSPORT", color: "#1f9e9e" },
  { key: "lodging", label: "LODGING", color: "#d63b9e" },
  { key: "drinks", label: "DRINKS", color: "#d98a1f" },
  { key: "activities", label: "ACTIVITIES", color: "#3b6fd6" },
  { key: "general", label: "GENERAL", color: "#8a8475" },
] as const;

export function getCategoryColor(key: string): string {
  const cat = CATEGORIES.find((c) => c.key === key);
  return cat ? cat.color : "#8a8475";
}

export function getCategoryLabel(key: string): string {
  const cat = CATEGORIES.find((c) => c.key === key);
  return cat ? cat.label : "GENERAL";
}

export function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

export function timeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
