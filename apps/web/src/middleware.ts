import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["en", "si", "ta"],
  defaultLocale: "en",
  localePrefix: "always"
});

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  
  // Add CSP header for embed routes to allow iframe embedding
  if (request.nextUrl.pathname.includes('/embed/')) {
    response.headers.set('Content-Security-Policy', 'frame-ancestors *;');
  }
  
  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"]
};
