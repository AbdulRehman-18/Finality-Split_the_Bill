import { NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, debts, members } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      groupId,
      description,
      amount,
      category,
      paidByMemberId,
      splitAmong,
    } = body as {
      groupId: number;
      description: string;
      amount: string;
      category: string;
      paidByMemberId: number;
      splitAmong: number[];
    };

    if (
      !groupId ||
      !description ||
      !amount ||
      !paidByMemberId ||
      !splitAmong?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        groupId,
        description,
        amount,
        category: category || "general",
        paidByMemberId,
      })
      .returning();

    // Calculate split amount — divide among everyone in splitAmong
    const splitCount = splitAmong.length;
    const perPerson = (parseFloat(amount) / splitCount).toFixed(6);

    // Create debts for each person who didn't pay
    const debtInserts = splitAmong
      .filter((memberId) => memberId !== paidByMemberId)
      .map((memberId) => ({
        groupId,
        expenseId: expense.id,
        debtorId: memberId,
        creditorId: paidByMemberId,
        amount: perPerson,
        settled: false,
      }));

    if (debtInserts.length > 0) {
      await db.insert(debts).values(debtInserts);
    }

    // Fetch updated debts
    const groupDebts = await db
      .select()
      .from(debts)
      .where(eq(debts.groupId, groupId))
      .orderBy(debts.createdAt);

    return NextResponse.json({ expense, debts: groupDebts });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
