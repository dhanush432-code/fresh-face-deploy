// app/(main)/dashboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  CreditCardIcon,
  ClockIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  CalendarDaysIcon as CalendarSolid,
  UserGroupIcon as UserSolid,
  CreditCardIcon as CreditSolid,
  ClockIcon as ClockSolid
} from '@heroicons/react/24/solid';

// Interfaces
interface DashboardStats {
  todayAppointments: number;
  totalCustomers: number;
  monthlyRevenue: number;
  activeMembers: number;
  pendingAppointments: number;
  completedToday: number;
  avgSessionValue: number;
}

interface RecentActivity {
  id: string;
  type: 'appointment' | 'customer' | 'payment';
  title: string;
  description: string;
  time: string;
  amount?: number;
}

interface UpcomingAppointment {
  id: string;
  customerName: string;
  service: string;
  time: string;
  stylist: string;
  status: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  appointments: number;
}

interface LowStockData {
  count: number;
  products: { name: string; numberOfItems: number; sku: string; }[];
  threshold: number;
}

// StatCard Component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'blue',
  onClick 
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onClick?: () => void;
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600 bg-blue-50',
    green: 'bg-green-500 text-green-600 bg-green-50',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50',
    orange: 'bg-orange-500 text-orange-600 bg-orange-50',
    red: 'bg-red-500 text-red-600 bg-red-50'
  };

  return (
    <div 
      className={`flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between flex-grow">
        <div className="flex-1 min-h-[60px] ">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trendValue}
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[2]}`}>
          <Icon className={`h-6 w-6 ${colorClasses[color].split(' ')[1]}`} />
        </div>
      </div>
    </div>
  );
};

// QuickActionCard Component
const QuickActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  color = 'blue' 
}: {
  title: string;
  description: string;
  icon: any;
  onClick: () => void;
  color?: string;
}) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group hover:border-gray-300"
  >
    <div className="flex items-start space-x-4">
      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
        <Icon className="h-6 w-6 text-gray-600" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </div>
);

// Main Dashboard Component
export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
    activeMembers: 0,
    pendingAppointments: 0,
    completedToday: 0,
    avgSessionValue: 0
  });

  // +++ ADD THIS ENTIRE NEW COMPONENT BELOW IT +++
const LowStockStatCard = ({ data }: { data: LowStockData }) => {
  return (
    // 'group' enables the hover effect for child elements
    <div className="group relative">
    <StatCard
      title="Products Low on Stock"
      value={data.count}
      icon={ExclamationTriangleIcon}
      color="red"
      onClick={() => (window.location.href = '/shop')}
    />
    
    {/* +++ NEW LIGHT-THEME, DOWNWARD-HOVERING TOOLTIP +++ */}
    {data.count > 0 && (
      <div className="absolute top-full mt-2 w-72 max-h-64 overflow-y-auto rounded-xl bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none shadow-xl border border-gray-200">
        <div className="p-3">
          <div className="mb-2 pb-2 border-b border-gray-200">
            <h4 className="font-semibold text-base text-gray-800">Low Stock Items</h4>
            <p className="text-xs text-gray-500">Threshold is {data.threshold} or less</p>
          </div>
          
          <ul className="space-y-1">
            {data.products.slice(0, 10).map(p => (
              <li key={p.sku} className="flex items-center justify-between text-sm p-1.5 rounded-md">
                <div className="flex items-center min-w-0">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mr-2 shrink-0" />
                  <span className="truncate pr-2 text-gray-700">{p.name}</span>
                </div>
                <span className="font-bold text-red-600 whitespace-nowrap">{p.numberOfItems} left</span>
              </li>
            ))}
          </ul>
          
          {data.products.length > 10 && (
            <p className="text-gray-500 text-xs mt-2 text-center border-t border-gray-200 pt-2">
              ...and {data.products.length - 10} more
            </p>
          )}
        </div>
        {/* Tooltip arrow - now pointing up */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[-5px] h-2.5 w-2.5 bg-white rotate-45 border-l border-t border-gray-200"></div>
      </div>
    )}
  </div>
);
};

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [lowStockData, setLowStockData] = useState<LowStockData>({ count: 0, products: [], threshold: 0 });

  // Permission checks
  const canViewCustomers = session && hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_READ);
  const canViewAppointments = session && hasPermission(session.user.role.permissions, PERMISSIONS.APPOINTMENTS_READ);
  const canCreateAppointments = session && hasPermission(session.user.role.permissions, PERMISSIONS.APPOINTMENTS_CREATE);
  const canCreateCustomers = session && hasPermission(session.user.role.permissions, PERMISSIONS.CUSTOMERS_CREATE);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Parallel API calls
      const [statsRes, activitiesRes, appointmentsRes, revenueRes, lowStockRes] = await Promise.allSettled([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/activities'),
        fetch('/api/dashboard/upcoming-appointments'),
        fetch('/api/dashboard/revenue'),
        fetch('/api/dashboard/low-stock-products'),
      ]);

      // Handle stats
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }

      // Handle activities
      if (activitiesRes.status === 'fulfilled' && activitiesRes.value.ok) {
        const activitiesData = await activitiesRes.value.json();
        if (activitiesData.success) {
          setRecentActivities(activitiesData.activities);
        }
      }

      // Handle appointments
      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.ok) {
        const appointmentsData = await appointmentsRes.value.json();
        if (appointmentsData.success) {
          setUpcomingAppointments(appointmentsData.appointments);
        }
      }

      // Handle revenue
      if (revenueRes.status === 'fulfilled' && revenueRes.value.ok) {
        const revenueDataRes = await revenueRes.value.json();
        if (revenueDataRes.success) {
          setRevenueData(revenueDataRes.revenue);
        }
      }

       // +++ 5. HANDLE the new low stock data +++
       if (lowStockRes.status === 'fulfilled' && lowStockRes.value.ok) {
        const data = await lowStockRes.value.json();
        if (data.success) {
          setLowStockData(data);
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session?.user.name}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening at your salon today.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={CalendarSolid}
          trend="up"
          trendValue="+12%"
          color="blue"
          onClick={() => canViewAppointments && (window.location.href = '/appointment')}
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={UserSolid}
          trend="up"
          trendValue="+5%"
          color="green"
          onClick={() => canViewCustomers && (window.location.href = '/crm')}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={CreditSolid}
          trend="up"
          trendValue="+18%"
          color="purple"
        />
         <LowStockStatCard data={lowStockData} />

    </div>

      {/* Quick Actions */}
      {(canCreateAppointments || canCreateCustomers) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canCreateAppointments && (
              <QuickActionCard
                title="Book Appointment"
                description="Schedule a new appointment for a customer"
                icon={CalendarDaysIcon}
                onClick={() => window.location.href = '/appointment'}
              />
            )}
            {canCreateCustomers && (
              <QuickActionCard
                title="Add Customer"
                description="Register a new customer in the system"
                icon={UserGroupIcon}
                onClick={() => window.location.href = '/crm'}
              />
            )}
          
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        {canViewAppointments && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Today's Appointments</h2>
                <a
                  href="/appointment"
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                >
                  View all
                  <EyeIcon className="h-4 w-4 ml-1" />
                </a>
              </div>
            </div>
            <div className="p-6">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <ClockIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{appointment.customerName}</p>
                          <p className="text-sm text-gray-600">{appointment.service}</p>
                          <p className="text-xs text-gray-500">with {appointment.stylist}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{appointment.time}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          appointment.status === 'Scheduled' 
                            ? 'bg-blue-100 text-blue-800'
                            : appointment.status === 'In Progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity & Additional Stats */}
        <div className="space-y-6">
          {/* Additional Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{stats.completedToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-semibold text-orange-600">{stats.pendingAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">New Customers</span>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-gray-600">Avg. Session Value</span>
                <span className="font-semibold text-purple-600">{formatCurrency(stats.avgSessionValue)}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              {recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {recentActivities.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-full ${
                        activity.type === 'appointment' ? 'bg-blue-100' :
                        activity.type === 'customer' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        {activity.type === 'appointment' && <CalendarDaysIcon className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'customer' && <UserGroupIcon className="h-4 w-4 text-green-600" />}
                        {activity.type === 'payment' && <CreditCardIcon className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                      {activity.amount && (
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(activity.amount)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Revenue Overview</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Appointments</span>
              </div>
            </div>
          </div>
          
          {/* Simple Bar Chart */}
          <div className="h-64 flex items-end justify-between space-x-2">
            {revenueData.slice(-6).map((data, index) => {
              const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
              const height = (data.revenue / maxRevenue) * 100;
              
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="w-full flex items-end space-x-1 h-48">
                    <div 
                      className="bg-indigo-500 rounded-t-sm flex-1 relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatCurrency(data.revenue)}
                      </div>
                    </div>
                    <div 
                      className="bg-green-500 rounded-t-sm flex-1"
                      style={{ height: `${(data.appointments / 50) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    {data.month}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      
    </div>
  );
}