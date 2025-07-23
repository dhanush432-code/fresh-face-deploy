'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';
import { hasAnyPermission, PERMISSIONS } from '@/lib/permissions';

import {
  HomeIcon, CalendarDaysIcon, UserGroupIcon, UsersIcon, CogIcon, Cog6ToothIcon, PowerIcon,
  LightBulbIcon, DocumentTextIcon, ShoppingCartIcon, BuildingStorefrontIcon, BanknotesIcon,
  BellAlertIcon, ReceiptPercentIcon, ChevronDownIcon
} from '@heroicons/react/24/outline';

import { BeakerIcon } from 'lucide-react';
const AttendanceIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg> );
const AdvanceIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 18v-2m0-8a6 6 0 100 12 6 6 0 000-12z"></path></svg> );
const PerformanceIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg> );
const SalaryIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> );
const StaffListIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> );
const TargetIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 100-18 9 9 0 000 18z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 12a3 3 0 100-6 3 3 0 000 6z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v2m0 16v2m-8-9H2m18 0h-2"></path></svg> );
const IncentivesIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg> );
const SwiftIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> );

interface NavSubItem { href: string; label: string; icon: JSX.Element; show: boolean; basePathForActive?: string; }
interface NavItemConfig { href: string; label: string; icon: JSX.Element; show: boolean; subItems?: NavSubItem[]; }

const Sidebar = () => {
  // ✅ FIX: All hooks are called at the top, unconditionally.
  const pathname = usePathname();
  const { data: session, status } = useSession(); 
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  
  const userPermissions = useMemo(() => session?.user?.role?.permissions || [], [session]);

  const navItems = useMemo((): NavItemConfig[] => {
    const staffSubItems: NavSubItem[] = [
      { href: '/staffmanagement/attendance', label: 'Attendance', icon: <AttendanceIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_ATTENDANCE_READ]) },
      { href: '/staffmanagement/advance', label: 'Advance', icon: <AdvanceIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_ADVANCE_READ]) },
      { href: '/staffmanagement/performance', label: 'Performance', icon: <PerformanceIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_PERFORMANCE_READ]) },
      { href: '/staffmanagement/target', label: 'Target', icon: <TargetIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_TARGET_READ]) },
      { href: '/staffmanagement/incentives', label: 'Incentives', icon: <IncentivesIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_INCENTIVES_READ]) },
      { href: '/staffmanagement/salary', label: 'Salary', icon: <SalaryIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_SALARY_READ]) },
      { href: '/staffmanagement/staff/stafflist', label: 'Staff List', icon: <StaffListIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_LIST_READ]), basePathForActive: '/staffmanagement/staff' },
      { href: '/staffmanagement/swift', label: 'Shift Management', icon: <SwiftIcon />, show: hasAnyPermission(userPermissions, [PERMISSIONS.STAFF_SWIFT_MANAGE]) },
    ];

    const adminSubItems: NavSubItem[] = [
      { href: '/admin/users', label: 'Users', icon: <UsersIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.USERS_READ]) },
      { href: '/admin/roles', label: 'Roles', icon: <CogIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.ROLES_READ]) }
    ];

    const canSeeStaffManagement = staffSubItems.some(item => item.show);
    const canSeeAdministration = adminSubItems.some(item => item.show);

    return [
      { href: '/dashboard', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.DASHBOARD_READ, PERMISSIONS.DASHBOARD_MANAGE]) },
      { href: '/appointment', label: 'Appointments', icon: <CalendarDaysIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.APPOINTMENTS_CREATE]) },
      { href: '/crm', label: 'Customers', icon: <UserGroupIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.CUSTOMERS_CREATE]) },
      { href: '/shop', label: 'Shop', icon: <BuildingStorefrontIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.PRODUCTS_READ, PERMISSIONS.SERVICES_READ]) },
      { href: '/staffmanagement', label: 'Staff Management', icon: <UsersIcon className="h-5 w-5" />, show: canSeeStaffManagement, subItems: staffSubItems.filter(item => item.show) },
      { href: '/DayendClosing', label:'Day-end Closing', icon: <BanknotesIcon className="h-5 w-5"/>, show: hasAnyPermission(userPermissions, [PERMISSIONS.DAYEND_READ, PERMISSIONS.DAYEND_CREATE]) },
      { href: '/alerts', label: 'Alerts', icon: <BellAlertIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.ALERTS_READ]) },
      { href: '/procurement', label: 'Procurements', icon: <ShoppingCartIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.PROCUREMENT_READ, PERMISSIONS.PROCUREMENT_CREATE]) },
      { href: '/eb-upload', label: 'EB Upload', icon: <LightBulbIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.EB_UPLOAD]) },
      { href: '/eb-view', label: 'EB View & Calculate', icon: <DocumentTextIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.EB_VIEW_CALCULATE]) },
      { href: '/inventory-checker', label: 'Inventory Checker', icon: <BeakerIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.INVENTORY_CHECKER_READ]) },
      { href: '/expenses', label: 'Expenses', icon: <ReceiptPercentIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [PERMISSIONS.EXPENSES_READ]) },
      { href: '/admin', label: 'Administration', icon: <Cog6ToothIcon className="h-5 w-5" />, show: canSeeAdministration, subItems: adminSubItems.filter(item => item.show) },
      { href: '/settings', label: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" />, show: hasAnyPermission(userPermissions, [ PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_STAFF_ID_MANAGE, PERMISSIONS.ATTENDANCE_SETTINGS_READ, PERMISSIONS.LOYALTY_SETTINGS_READ, ])},
    ];
  }, [userPermissions]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const activeParent = navItems.find(item => item.subItems?.some(subItem => {
      const activeCheckPath = subItem.basePathForActive || subItem.href;
      return pathname.startsWith(activeCheckPath);
    }));
    setOpenItemKey(activeParent?.href || null);
  }, [pathname, navItems, status]);
  
  // ✅ FIX: The conditional return is moved AFTER all hooks.
  if (status === 'loading') {
    return <div className="w-64 h-screen bg-white fixed" />;
  }

  if (status === 'unauthenticated' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const handleItemClick = (itemKey: string) => setOpenItemKey(openItemKey === itemKey ? null : itemKey);
  const handleSignOut = () => signOut({ callbackUrl: '/login' });
  const isItemOrSubitemActive = (item: NavItemConfig, currentPath: string): boolean => {
    if (item.subItems?.length) {
      return item.subItems.some(subItem => currentPath.startsWith(subItem.basePathForActive || subItem.href));
    }
    return currentPath.startsWith(item.href);
  };

  return (
    <div className="w-64 h-screen bg-white text-black fixed left-0 top-0 shadow-lg flex flex-col">
        {/* The rest of your JSX code is correct and does not need changes */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg">FF</div>
            <div><h1 className="text-xl font-semibold text-gray-800">Fresh Face</h1><p className="text-xs text-gray-500">Salon Management</p></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.filter(item => item.show).map((item) => {
              const isActive = isItemOrSubitemActive(item, pathname);
              const isOpen = openItemKey === item.href;
              return (
                <div key={item.href}>
                  {item.subItems?.length ? (
                    <>
                      <button onClick={() => handleItemClick(item.href)} className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-left text-gray-700 ${isActive ? 'bg-gray-100 text-black font-medium' : 'hover:bg-gray-50 hover:text-black'}`}>
                        <span className="flex items-center gap-3">{item.icon}<span>{item.label}</span></span>
                        <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                        {isOpen && (
                          <div className="mt-1 space-y-0.5 py-1">
                            {item.subItems.map((subItem) => {
                              const isSubActive = pathname.startsWith(subItem.basePathForActive || subItem.href);
                              return (
                                <Link key={subItem.href} href={subItem.href} className={`flex items-center gap-3 pl-8 pr-4 py-2 rounded-lg transition-colors text-sm text-gray-600 ${ isSubActive ? 'bg-gray-200 text-black font-medium' : 'hover:bg-gray-100 hover:text-black' }`}>
                                  {subItem.icon}<span>{subItem.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <Link href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 ${isActive ? 'bg-gray-100 text-black font-medium' : 'hover:bg-gray-50 hover:text-black'}`}>
                      {item.icon}<span>{item.label}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200">
          {session && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">{session.user.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{session.user.name}</div>
                  <div className="text-xs text-gray-500 truncate">{session.user.role.displayName || session.user.role.name}</div>
                </div>
              </div>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <PowerIcon className="h-5 w-5" /><span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
    </div>
  );
};

export default Sidebar;
