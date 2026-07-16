import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, members: memberList } = body as {
      name: string;
      members?: { name: string; wallet?: string }[];
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const code = generateCode();

    // Create the group
    const [group] = await db
      .insert(groups)
      .values({ name: name.trim(), code })
      .returning();

    const colors = [
      "#3b6fd6",
      "#d63b9e",
      "#1f9e9e",
      "#9b5fd6",
      "#d98a1f",
      "#d6394a",
      "#1f9e5c",
    ];

    // The first member is always the creator
    const memberInserts: {
      groupId: number;
      userId: number | null;
      name: string;
      wallet: string;
      color: string;
    }[] = [
      {
        groupId: group.id,
        userId: currentUser.id,
        name: currentUser.displayName,
        wallet: currentUser.wallet || "",
        color: currentUser.color || colors[0],
      },
    ];

    // Add other members if provided
    if (memberList && memberList.length > 0) {
      memberList.forEach((m, i) => {
        // Skip if they somehow provided a member matching the creator's name
        if (m.name.trim().toLowerCase() === currentUser.displayName.toLowerCase()) return;
        
        memberInserts.push({
          groupId: group.id,
          userId: null,
          name: m.name.trim(),
          wallet: m.wallet || "",
          color: colors[(i + 1) % colors.length],
        });
      });
    }

    await db.insert(members).values(memberInserts);

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only return groups the user belongs to
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
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
