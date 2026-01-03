import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/security(.*)",
  "/interact(.*)",
  "/_betterstack/(.*)",
]);
const isEarlyAccessRoute = createRouteMatcher(["/early-access(.*)"]);

// Helper function to fetch user data in middleware
const fetchUserData = async (token: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Error fetching user data in middleware:", error);
    return null;
  }
};

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { isAuthenticated, getToken } = await auth();

  // Early access control for authenticated users
  if (isAuthenticated) {
    const token = await getToken();
    if (token) {
      const user = await fetchUserData(token);

      if (user) {
        const pathname = req.nextUrl.pathname;

        // If user has early access, redirect them away from /early-access route
        if (user.earlyAccess && isEarlyAccessRoute(req)) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        // If user doesn't have early access, only allow / and /early-access routes
        if (!user.earlyAccess) {
          // Allow home route (/), early access route, and sign-in/sign-up routes
          const isAllowedRoute =
            pathname === "/" ||
            isEarlyAccessRoute(req) ||
            pathname.startsWith("/sign-in") ||
            pathname.startsWith("/sign-up") ||
            pathname.startsWith("/security");

          if (!isAllowedRoute) {
            return NextResponse.redirect(new URL("/early-access", req.url));
          }

          // If user is on home route and doesn't have early access, allow them to stay
          if (pathname === "/") {
            return NextResponse.next();
          }
        }
      }
    }
  }

  if (isAuthenticated && isPublicRoute(req)) {
    const pathname = req.nextUrl.pathname;
    const searchParams = req.nextUrl.searchParams;
    const isExtensionAuth = searchParams.get("source") === "extension";
    const isCliAuth = searchParams.get("source") === "cli";

    // If authenticated and it's an extension auth request, redirect to callback
    if (isExtensionAuth) {
      const callbackUrl = new URL("/extension-auth-callback", req.url);
      // Preserve all search params (scheme, source, etc.)
      searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(callbackUrl);
    }

    // If authenticated and it's a CLI auth request, redirect to callback
    if (isCliAuth) {
      const callbackUrl = new URL("/cli-auth-callback", req.url);
      // Preserve port param
      const port = searchParams.get("port");
      if (port) {
        callbackUrl.searchParams.set("port", port);
      }
      return NextResponse.redirect(callbackUrl);
    }

    // Allow access to security and interact pages without redirecting
    if (pathname.startsWith("/security") || pathname.startsWith("/interact")) {
      return NextResponse.next();
    }

    // Don't redirect from home route if user doesn't have early access
    if (pathname === "/") {
      const token = await getToken();
      if (token) {
        const user = await fetchUserData(token);
        if (user && !user.earlyAccess) {
          return NextResponse.next();
        }
      }
    }

    // Redirect to personal dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|ogv?|mov|m4v|mp3|wav|ogg)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
