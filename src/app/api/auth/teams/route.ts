import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        code: groups.code,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .innerJoin(members, eq(members.groupId, groups.id))
      .where(eq(members.userId, currentUser.id))
      .orderBy(groups.createdAt);

    return NextResponse.json({ groups: userGroups });
  } catch (error) {
    console.error("Fetch teams error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, name } = await request.json();

    if (!groupId || !name?.trim()) {
      return NextResponse.json({ error: "Group ID and name are required" }, { status: 400 });
    }

    // Verify the user is a member of the group
    const [membership] = await db
      .select()
      .from(members)
      .where(and(eq(members.groupId, groupId), eq(members.userId, currentUser.id)));

    if (!membership) {
      return NextResponse.json({ error: "Access denied. You are not a member of this group" }, { status: 403 });
    }

    // Update the group name
    const [updatedGroup] = await db
      .update(groups)
      .set({ name: name.trim() })
      .where(eq(groups.id, groupId))
      .returning();

    return NextResponse.json({ group: updatedGroup });
  } catch (error) {
    console.error("Rename team error:", error);
    return NextResponse.json(
      { error: "Failed to rename team" },
      { status: 500 }
    );
  }
}
