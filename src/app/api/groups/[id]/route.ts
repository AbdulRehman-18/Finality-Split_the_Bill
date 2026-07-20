import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members, expenses, debts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq, and, or, asc } from "drizzle-orm";

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

    // The creator is the first member inserted for a group. Keep deletion
    // restricted to that operator even though all members can view it.
    const [ownerMembership] = await db
      .select({ userId: members.userId })
      .from(members)
      .where(eq(members.groupId, groupId))
      .orderBy(asc(members.id))
      .limit(1);

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
      canDelete: ownerMembership?.userId === currentUser.id,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const [ownerMembership] = await db
      .select({ userId: members.userId })
      .from(members)
      .where(eq(members.groupId, groupId))
      .orderBy(asc(members.id))
      .limit(1);

    if (ownerMembership?.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "Only the group creator can delete this group" },
        { status: 403 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(debts).where(eq(debts.groupId, groupId));
      await tx.delete(expenses).where(eq(expenses.groupId, groupId));
      await tx.delete(members).where(eq(members.groupId, groupId));
      await tx.delete(groups).where(eq(groups.id, groupId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
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

    // Verify the user is a member of the group
    const [membership] = await db
      .select()
      .from(members)
      .where(and(eq(members.groupId, groupId), eq(members.userId, currentUser.id)));

    if (!membership) {
      return NextResponse.json({ error: "Access denied. You are not a member of this group" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "rename") {
      const { name } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Group name is required" }, { status: 400 });
      }
      const [updatedGroup] = await db
        .update(groups)
        .set({ name: name.trim() })
        .where(eq(groups.id, groupId))
        .returning();
      return NextResponse.json({ group: updatedGroup });
    }

    if (action === "addMember") {
      const { name, wallet, color } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Member name is required" }, { status: 400 });
      }
      const [newMember] = await db
        .insert(members)
        .values({
          groupId,
          name: name.trim(),
          wallet: wallet?.trim() || "",
          color: color?.trim() || "#3b6fd6",
          userId: null,
        })
        .returning();
      return NextResponse.json({ member: newMember });
    }

    if (action === "editMember") {
      const { memberId, name, wallet, color } = body;
      if (!memberId) {
        return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
      }
      if (!name?.trim()) {
        return NextResponse.json({ error: "Member name is required" }, { status: 400 });
      }

      // Check if member exists in this group and is a placeholder
      const [placeholder] = await db
        .select()
        .from(members)
        .where(and(eq(members.id, memberId), eq(members.groupId, groupId)));

      if (!placeholder) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      if (placeholder.userId !== null) {
        return NextResponse.json({ error: "Cannot edit a registered user's profile" }, { status: 400 });
      }

      const [updatedMember] = await db
        .update(members)
        .set({
          name: name.trim(),
          wallet: wallet?.trim() || "",
          color: color?.trim() || placeholder.color,
        })
        .where(eq(members.id, memberId))
        .returning();

      return NextResponse.json({ member: updatedMember });
    }

    if (action === "deleteMember") {
      const { memberId } = body;
      if (!memberId) {
        return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
      }

      // Check if member exists in this group and is a placeholder
      const [placeholder] = await db
        .select()
        .from(members)
        .where(and(eq(members.id, memberId), eq(members.groupId, groupId)));

      if (!placeholder) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      if (placeholder.userId !== null) {
        return NextResponse.json({ error: "Cannot delete a registered user's profile" }, { status: 400 });
      }

      // Check if member has active transactions/debts
      const memberDebts = await db
        .select()
        .from(debts)
        .where(
          and(
            eq(debts.groupId, groupId),
            or(eq(debts.debtorId, memberId), eq(debts.creditorId, memberId))
          )
        );

      const memberExpenses = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.groupId, groupId), eq(expenses.paidByMemberId, memberId)));

      if (memberDebts.length > 0 || memberExpenses.length > 0) {
        return NextResponse.json(
          { error: "Cannot remove member with active ledger history" },
          { status: 400 }
        );
      }

      await db.delete(members).where(eq(members.id, memberId));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating group/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
