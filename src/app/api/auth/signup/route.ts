import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, displayName, password } = body as {
      username?: string;
      displayName?: string;
      password?: string;
    };

    if (!username?.trim() || !displayName?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Username, display name, and password are required" },
        { status: 400 }
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedUsername));

    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      );
    }

    // Insert user (using basic plain passwords for this demo)
    const [user] = await db
      .insert(users)
      .values({
        username: normalizedUsername,
        displayName: displayName.trim(),
        password: password, // Plain text for demo
        currency: "INR",
        theme: "default",
      })
      .returning();

    await setSessionUser(user.id);

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
