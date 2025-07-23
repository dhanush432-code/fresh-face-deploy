// /app/settings/components/SettingsNav.tsx

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// --- MODIFIED: Add 'Membership' to the navigation array ---
const settingsNavigation = [
  { 
    name: 'Attendance Settings', 
    href: '/settings/attendancesetting',
    permission: PERMISSIONS.ATTENDANCE_SETTINGS_READ 
  },

  { name: 'Loyalty Points', href: '/settings/loyalty', permission: PERMISSIONS.LOYALTY_SETTINGS_READ },
  { name: 'Membership', href: '/settings/membership', permission: PERMISSIONS.MEMBERSHIP_SETTINGS_READ }, 
  { 
    name: 'Position Hours', 
    href: '/settings/position-hours', 
    permission: PERMISSIONS.POSITION_HOURS_SETTINGS_MANAGE 
  },// <-- ADD THIS LINE
  { 
    name: 'Staff ID', 
    href: '/settings/staffid', 
    permission: PERMISSIONS.SETTINGS_STAFF_ID_MANAGE 
  },


];
// --- END MODIFICATION ---

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function SettingsNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userPermissions = session?.user?.role?.permissions || [];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200">
      <nav className="flex flex-col space-y-1 p-4">
        {settingsNavigation.map((item) => (
          hasPermission(userPermissions, item.permission) && (
            <Link
              key={item.name}
              href={item.href}
              className={classNames(
                pathname.startsWith(item.href)
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
              )}
              aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
            >
              <span className="truncate">{item.name}</span>
            </Link>
          )
        ))}
      </nav>
    </aside>
  );
}