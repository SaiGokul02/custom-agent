import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";

export async function requireUserId() {
  try {
    const userId = await getCurrentUserId();
    return { userId, error: null } as const;
  } catch {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }
}