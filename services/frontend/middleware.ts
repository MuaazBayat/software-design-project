import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher([
  // Add your protected routes here
  '/inbox(.*)'
  
  //'/dashboard(.*)',
  //'/profile(.*)',
  //'/admin(.*)',
  
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const authResult = await auth()
    if (!authResult.userId) {
      return authResult.redirectToSignIn()
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}