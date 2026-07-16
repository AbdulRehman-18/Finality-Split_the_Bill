import { NextResponse } from "next/server";
import { clearSessionUser } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionUser();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to log out" },
      { status: 500 }
    );
  }
}
