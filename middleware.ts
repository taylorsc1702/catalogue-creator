// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const USER = process.env.BASIC_AUTH_USER || "";
const PASS = process.env.BASIC_AUTH_PASS || "";

/**
 * Basic Auth for pages only.
 * - Skips /api/*, Next assets, and a couple of utility paths.
 * - If no USER/PASS are set (e.g., local dev), auth is disabled.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allowlist: don't auth-check these
  if (
    pathname.startsWith("/api/") ||            // APIs
    pathname.startsWith("/_next/") ||          // Next assets
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/healthz"
  ) {
    return NextResponse.next();
  }

  // If creds not configured, do nothing
  if (!USER || !PASS) return NextResponse.next();

  // Expect "Authorization: Basic base64(user:pass)"
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      // atob is available in the Edge runtime
      const decoded = atob(auth.slice(6));
      const [u, p] = decoded.split(":");
      if (u === USER && p === PASS) return NextResponse.next();
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Catalogue Creator"' },
  });
}

// Apply to everything except files we allowlisted above via early return
export const config = {
  matcher: ["/((?!.*\\.).*)"], // all "page" paths (no file extensions)
};
