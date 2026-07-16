import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, claimMemberId, joinNew } = body as {
      code?: string;
      claimMemberId?: number;
      joinNew?: boolean;
    };

    if (!code?.trim()) {
      return NextResponse.json({ error: "Group code is required" }, { status: 400 });
    }

    const groupCode = code.trim().toUpperCase();

    // Find group by code
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.code, groupCode));

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(members)
      .where(and(eq(members.groupId, group.id), eq(members.userId, currentUser.id)));

    if (existingMember) {
      return NextResponse.json({ group, alreadyJoined: true });
    }

    // If checking group details and unlinked members (pre-join validation)
    if (claimMemberId === undefined && !joinNew) {
      const unclaimed = await db
        .select()
        .from(members)
        .where(and(eq(members.groupId, group.id), isNull(members.userId)));

      return NextResponse.json({
        group,
        alreadyJoined: false,
        unclaimedMembers: unclaimed,
      });
    }

    // Join action: Claim member profile or create new member profile
    if (claimMemberId) {
      const [placeholder] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.id, claimMemberId),
            eq(members.groupId, group.id),
            isNull(members.userId)
          )
        );

      if (!placeholder) {
        return NextResponse.json(
          { error: "Member profile not found or already claimed" },
          { status: 400 }
        );
      }

      await db
        .update(members)
        .set({
          userId: currentUser.id,
          name: currentUser.displayName,
          wallet: currentUser.wallet || placeholder.wallet,
          color: currentUser.color || placeholder.color,
        })
        .where(eq(members.id, claimMemberId));
    } else {
      // Check if there is already a member with this name to avoid double member lists,
      // but standard is creating a new member.
      await db.insert(members).values({
        groupId: group.id,
        userId: currentUser.id,
        name: currentUser.displayName,
        wallet: currentUser.wallet || "",
        color: currentUser.color || "#3b6fd6",
      });
    }

    return NextResponse.json({ group, success: true });
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}
