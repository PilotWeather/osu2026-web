import { getPersonnelList } from "@/src/lib/personnel";
import { can, getAuthorizedUser } from "@/src/lib/authz";

export async function GET() {
  const user = await getAuthorizedUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "VIEW_DASHBOARD")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json(await getPersonnelList());
}
