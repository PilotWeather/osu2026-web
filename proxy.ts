import { NextResponse } from "next/server";
import { auth } from "@/auth";

const publicPaths = ["/login", "/api/auth"];

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isAuthorized = request.auth?.user?.active === true;

  if (pathname === "/login" && isAuthorized) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (isPublic) return NextResponse.next();
  if (!isAuthorized && pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAuthorized) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
