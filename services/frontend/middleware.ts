import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher([
  // Add your protected routes here
  '/inbox(.*)',
  '/compose-letter(.*)',
  '/conversation(.*)',
  '/settings(.*)',
  '/moderation(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Use the auth() function properly
  const authResult = await auth()
  
  if (isProtectedRoute(req)) {
    if (!authResult.userId) {
      // Use the proper redirect method
      return authResult.redirectToSignIn()
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}