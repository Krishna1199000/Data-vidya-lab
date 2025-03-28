import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === "ADMIN";
    const path = req.nextUrl.pathname;

    // Redirect authenticated users away from signin/signup
    if ((path.startsWith("/signin") || path.startsWith("/signup")) && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect admin-only routes
    if (
      (path.startsWith("/admin/dashboard/create-lab") || path.startsWith("/admin/dashboard/edit-lab")) &&
      !isAdmin
    ) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Ensures the user is authenticated
    },
    pages: {
      signIn: "/admin/auth", // Redirect unauthenticated users here
    },
  }
);

export const config = {
  matcher: ["/admin/dashboard/:path*", "/dashboard/:path*", "/signin", "/signup"],
};
