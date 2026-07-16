import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type SafeUser = Omit<typeof users.$inferSelect, "password">;

/**
 * Returns the currently authenticated user based on the session cookie.
 * Excludes the password from the returned object.
 */
export async function getSessionUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get("session_user_id")?.value;
    if (!userIdStr) return null;

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;

    const { password, ...safeUser } = user;
    return safeUser as SafeUser;
  } catch (error) {
    console.error("Failed to retrieve session user:", error);
    return null;
  }
}

/**
 * Sets the session cookie for the authenticated user ID.
 */
export async function setSessionUser(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session_user_id", userId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
    sameSite: "lax",
  });
}

/**
 * Clears the session cookie, logging the user out.
 */
export async function clearSessionUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session_user_id");
}
