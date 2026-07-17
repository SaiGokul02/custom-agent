import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const conversations = await prisma.conversations.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { threadId: true, title: true, updatedAt: true },
  });

  return NextResponse.json(conversations);
}