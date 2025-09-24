// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const USER = process.env.BASIC_AUTH_USER!;
const PASS = process.env.BASIC_AUTH_PASS!;

export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic") {
      const [u, p] = Buffer.from(encoded, "base64").toString().split(":");
      if (u === USER && p === PASS) return NextResponse.next();
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Catalogue Creator"' }
  });
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
