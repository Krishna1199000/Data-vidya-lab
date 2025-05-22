import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === "ADMIN";
    const path = req.nextUrl.pathname;

    // If authenticated, redirect from signin/signup based on role
    if ((path.startsWith("/User/signin") || path.startsWith("/User/signup")) && token) {
      const redirectUrl = isAdmin ? "/admin/Profile" : "/User/dashboard/labs";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // Protect admin-only routes
    if (
      path.startsWith("/admin/") && // Catch all admin routes
      !isAdmin
    ) {
      // Redirect non-admins trying to access admin routes to the user dashboard
      return NextResponse.redirect(new URL("/User/dashboard/labs", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Ensures the user is authenticated
    },
    pages: {
      signIn: "/User/signin", // Redirect unauthenticated users to your sign-in page
      error: '/auth/error',
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/User/dashboard/:path*", "/User/signin", "/User/signup"],
};
