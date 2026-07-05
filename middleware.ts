import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/explore", "/api/auth", "/register", "/login"];

function isPublic(path: string): boolean {
  return publicPaths.some((p) => path === p || path.startsWith(p + "/"));
}

const adminPrefix = "/admin";

const protectedPrefixes = [
  "/dashboard",
  "/bookings",
  "/profile/edit",
  "/messages",
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAdmin = pathname.startsWith(adminPrefix);

  if (!isProtected && !isAdmin) return NextResponse.next();

  const sessionRes = await fetch(
    new URL("/api/auth/get-session", req.url),
    { headers: { cookie: req.headers.get("cookie") ?? "" } },
  );

  if (!sessionRes.ok) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await sessionRes.json();

  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAdmin && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
