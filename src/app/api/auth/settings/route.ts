import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, members } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, wallet, color, currency, theme } = body as {
      displayName?: string;
      wallet?: string;
      color?: string;
      currency?: string;
      theme?: string;
    };

    const updateFields: Partial<typeof users.$inferInsert> = {};

    if (displayName !== undefined) {
      if (!displayName.trim()) {
        return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
      }
      updateFields.displayName = displayName.trim();
    }
    if (wallet !== undefined) updateFields.wallet = wallet.trim();
    if (color !== undefined) updateFields.color = color;
    if (currency !== undefined) updateFields.currency = currency;
    if (theme !== undefined) updateFields.theme = theme;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, currentUser.id))
      .returning();

    // Propagate profile changes (name, wallet, color) to matching group member profiles
    const memberUpdates: Partial<typeof members.$inferInsert> = {};
    if (displayName !== undefined) memberUpdates.name = displayName.trim();
    if (wallet !== undefined) memberUpdates.wallet = wallet.trim();
    if (color !== undefined) memberUpdates.color = color;

    if (Object.keys(memberUpdates).length > 0) {
      await db
        .update(members)
        .set(memberUpdates)
        .where(eq(members.userId, currentUser.id));
    }

    const { password: _, ...safeUser } = updatedUser;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
