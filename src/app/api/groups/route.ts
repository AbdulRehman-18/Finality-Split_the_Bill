import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, members } from "@/db/schema";
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
    const body = await request.json();
    const { name, members: memberList } = body as {
      name: string;
      members: { name: string; wallet?: string }[];
    };

    if (!name || !memberList || memberList.length < 2) {
      return NextResponse.json(
        { error: "Name and at least 2 members required" },
        { status: 400 }
      );
    }

    const code = generateCode();

    const [group] = await db
      .insert(groups)
      .values({ name, code })
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

    const memberInserts = memberList.map((m, i) => ({
      groupId: group.id,
      name: m.name,
      wallet: m.wallet || "",
      color: colors[i % colors.length],
    }));

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
    const allGroups = await db.select().from(groups).orderBy(groups.createdAt);
    return NextResponse.json({ groups: allGroups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
