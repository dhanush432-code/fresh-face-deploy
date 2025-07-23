// src/components/AppLayout.tsx  (Create this new file)

'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LoadingSpinner from './LoadingSpinner';

// A simple full-page loader to show while the session is being determined.
const FullPageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    {/* You can add a spinner here if you like */}
    <LoadingSpinner />
  </div>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  // On public pages like login/signup, we don't want the main layout.
  // We just render the page content directly.
  const isPublicPage = pathname === '/login' || pathname === '/signup';

  if (isPublicPage) {
    return <>{children}</>;
  }

  // **THE HYDRATION FIX**:
  // While the session status is loading, we show a full-page loader.
  // This will be the initial state on the client, which avoids any layout rendering
  // until we are certain of the user's authentication status.
  if (status === 'loading') {
    return <FullPageLoader />;
  }

  // If the user is not authenticated, we can also choose to render nothing or redirect.
  // For now, returning children is safe as they will likely be redirected by other logic.
  if (status === 'unauthenticated') {
     return <>{children}</>
  }

  // **THE FINAL LAYOUT**:
  // Only when the status is 'authenticated' do we render the full application layout.
  // This happens purely on the client-side after hydration is complete.
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}