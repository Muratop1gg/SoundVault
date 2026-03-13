import { type NextRequest } from "next/server"
import { updateSession } from "./lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Skip middleware for upload API routes
  if (request.nextUrl.pathname.startsWith('/api/tracks/')) {
    return;
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images files (svg, png, jpg, jpeg, gif, webp)
     * - API routes (we handle them separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/tracks/upload).*)",
  ],
}