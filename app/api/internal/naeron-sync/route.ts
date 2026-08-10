import { timingSafeEqual } from "node:crypto";
import { runNaeronIncrementalSync } from "@/src/lib/naeron/sync";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.NAERON_SYNC_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7)); const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await runNaeronIncrementalSync()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Naeron synchronization failed." }, { status: 500 }); }
}
