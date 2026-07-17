import { jwtVerify } from 'jose';
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getCurrentUserId() {
  const token = (await cookies()).get("jwt")?.value;
  if (!token) throw new Error("Unauthorized");

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.id;
  } catch {
    throw new Error("Unauthorized");
  }
}