import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

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
