import { authMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const publicRoutePatterns = [
  "/(en|si|ta)",
  "/(en|si|ta)/videos(.*)",
  "/(en|si|ta)/media(.*)",
  "/(en|si|ta)/m/(.*)",
  "/(en|si|ta)/v/(.*)",
  "/m/(.*)",
  "/(en|si|ta)/channels/(.*)",
  "/(en|si|ta)/tags/(.*)",
  "/(en|si|ta)/embed/(.*)",
  "/(en|si|ta)/watch/(.*)",
  "/(en|si|ta)/sign-in(.*)",
  "/(en|si|ta)/sign-up(.*)",
  "/(en|si|ta)/login(.*)",
  "/(en|si|ta)/legal/(.*)",
  "/s/(.*)",
];

export default authMiddleware({
  beforeAuth: (req: NextRequest) => {
    const response = intlMiddleware(req);
    if (req.nextUrl.pathname.includes("/embed/")) {
      response.headers.set("Content-Security-Policy", "frame-ancestors *;");
    }
    return response;
  },
  publicRoutes: publicRoutePatterns,
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
