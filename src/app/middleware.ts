// middleware.ts (in root directory)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromToken, extractTokenFromRequest, hasPermission } from '@/lib/auth';

// Define route permissions
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['dashboard:read'],
  '/crm': ['customers:read'],
  '/appointment': ['appointments:read'],
  '/admin': ['users:read', 'roles:read'],
  '/admin/users': ['users:read'],
  '/admin/roles': ['roles:read'],
    '/DayendClosing': ['dayend:read'], // Added
  '/DayendClosing/history': ['dayend:read'] // Added
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public routes
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Extract token
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    return redirectToLogin(request);
  }

  // Get user from token
  const user = await getUserFromToken(token);
  
  if (!user) {
    return redirectToLogin(request);
  }

  // Check route permissions
  const requiredPermissions = getRequiredPermissions(pathname);
  
  if (requiredPermissions.length > 0) {
    const hasAccess = requiredPermissions.some(permission => 
      hasPermission(user.permissions, permission)
    );

    console.log(`User ${user.id} accessing ${pathname} with permissions: ${JSON.stringify(user.permissions)}`);
    
    
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Add user info to request headers for API routes
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.id);
  response.headers.set('x-user-permissions', JSON.stringify(user.permissions));
  
  return response;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function getRequiredPermissions(pathname: string): string[] {
  // Check exact match first
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname];
  }

  // Check pattern matches
  for (const [pattern, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(pattern)) {
      return permissions;
    }
  }

  return [];
}

export const config = {
  matcher: [
    '/((?!api/auth/login|login|_next/static|_next/image|favicon.ico).*)',
  ],
};