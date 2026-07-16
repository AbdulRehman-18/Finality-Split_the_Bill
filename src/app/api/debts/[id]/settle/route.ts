import { NextResponse } from "next/server";
import { db } from "@/db";
import { debts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const debtId = parseInt(id);

    const [debt] = await db.select().from(debts).where(eq(debts.id, debtId));

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    if (debt.settled) {
      return NextResponse.json(
        { error: "Debt already settled" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(debts)
      .set({ settled: true, settledAt: new Date() })
      .where(eq(debts.id, debtId))
      .returning();

    return NextResponse.json({ debt: updated });
  } catch (error) {
    console.error("Error settling debt:", error);
    return NextResponse.json(
      { error: "Failed to settle debt" },
      { status: 500 }
    );
  }
}
