import { NextResponse } from "next/server";
import { getPersonnelList } from "@/src/lib/personnel";

export async function GET() {
  const personnel = await getPersonnelList();
  return NextResponse.json(personnel);
}
