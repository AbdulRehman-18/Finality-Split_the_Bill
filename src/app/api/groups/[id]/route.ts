import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, debts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const groupMembers = await db
      .select()
      .from(members)
      .where(eq(members.groupId, groupId));

    const groupExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))
      .orderBy(expenses.createdAt);

    const groupDebts = await db
      .select()
      .from(debts)
      .where(eq(debts.groupId, groupId))
      .orderBy(debts.createdAt);

    return NextResponse.json({
      group,
      members: groupMembers,
      expenses: groupExpenses,
      debts: groupDebts,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}
