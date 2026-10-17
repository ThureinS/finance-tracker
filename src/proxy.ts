import { auth } from "@/auth";

export const proxy = auth;

export const config = {
  // Skip API routes, static assets, and files with an image extension.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
