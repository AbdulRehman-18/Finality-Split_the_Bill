import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, debts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const groupId = parseInt(id, 10);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if the current user is a member of the group
    const [membership] = await db
      .select()
      .from(members)
      .where(and(eq(members.groupId, groupId), eq(members.userId, currentUser.id)));

    if (!membership) {
      // User is not a member. Return restricted payload indicating they need to join.
      return NextResponse.json({
        group: {
          id: group.id,
          name: group.name,
        },
        isMember: false,
      });
    }

    // User is a member. Fetch full details.
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
      isMember: true,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}
