import { getPersonnelList } from "@/src/lib/personnel";

export async function GET() {
  return Response.json(await getPersonnelList());
}
