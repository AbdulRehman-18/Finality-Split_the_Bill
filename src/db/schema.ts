import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .references(() => groups.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  wallet: varchar("wallet", { length: 255 }).default(""),
  color: varchar("color", { length: 20 }).default("#3b6fd6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .references(() => groups.id)
    .notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  paidByMemberId: integer("paid_by_member_id")
    .references(() => members.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .references(() => groups.id)
    .notNull(),
  expenseId: integer("expense_id")
    .references(() => expenses.id)
    .notNull(),
  debtorId: integer("debtor_id")
    .references(() => members.id)
    .notNull(),
  creditorId: integer("creditor_id")
    .references(() => members.id)
    .notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  settled: boolean("settled").default(false).notNull(),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
