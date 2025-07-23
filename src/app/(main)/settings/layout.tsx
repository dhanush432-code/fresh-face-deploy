'use client'

import SettingsNav from './components/SettingsNav';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const canReadSettings = hasPermission(session?.user?.role?.permissions || [], PERMISSIONS.SETTINGS_READ);

  if (!canReadSettings) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Renders the vertical sub-navigation menu on the left */}
      <SettingsNav />

      {/* Renders the page content (e.g., the loyalty form) on the right */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}