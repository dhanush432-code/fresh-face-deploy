'use client'; 

import React from 'react';
import {
  Users, Calendar, Banknote, Award, ChevronUp, ChevronDown,
  TrendingUp, Clock, CircleUser
} from 'lucide-react';
// ✅ FIX: Import StaffMember directly from the context, which is the single source of truth.
import { useStaff, StaffMember } from '../../../context/StaffContext'; 
import CardComponent from '../../../components/ui/Card'; 
import { format } from 'date-fns';

// ✅ FIX: The local StaffMember interface has been REMOVED. 
// We now rely entirely on the type imported from StaffContext.

// Props for the Card component (can be kept if the component doesn't export its own props)
interface UICardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

// Your StatCard component (No changes needed here)
const StatCard = ({ title, value, icon, change, changeType }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeType?: 'up' | 'down' | 'neutral';
}) => {
  return (
    <CardComponent className="flex flex-col h-full p-4 shadow rounded-lg bg-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="p-3 bg-purple-100 rounded-lg">
          {icon}
        </div>
      </div>
      {change !== undefined && changeType && (
        <div className="mt-3 flex items-center">
          {changeType === 'up' ? <ChevronUp className="w-4 h-4 text-green-500" /> : <ChevronDown className="w-4 h-4 text-red-500" />}
          <p className={`text-xs font-medium ml-1 ${changeType === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {change}% from last month
          </p>
        </div>
      )}
    </CardComponent>
  );
};


const Dashboard: React.FC = () => {
  const { staffMembers } = useStaff(); 
  const today = new Date();

  // ✅ FIX: All type errors are now resolved because staffMembers uses the correct, consistent type.
  const activeStaffCount = staffMembers.filter((staff) => staff.status === 'active').length;
  const totalSalaryExpense = staffMembers.reduce((acc, staff) => acc + (staff.salary || 0), 0);

  const recentActivities = staffMembers
    .slice(0, 3) 
    .map(staff => ({
      ...staff,
      activity: staff.status === 'active' ? 'clocked in' : 'updated profile',
      time: format(new Date(), 'p'),
  }));

  const topPerformers = [...staffMembers]
    .sort((a, b) => (b.salary || 0) - (a.salary || 0)) // Added || 0 for safety
    .slice(0, 3)
    .map((staff, index) => ({
      ...staff,
      performance: 95 - index * 5,
  }));


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {format(today, 'EEEE, MMMM do, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Staff"
          value={staffMembers.length}
          icon={<Users className="h-6 w-6 text-purple-600" />}
        />
        <StatCard
          title="Present Today"
          value={activeStaffCount}
          icon={<Calendar className="h-6 w-6 text-teal-600" />}
        />
        <StatCard
          title="Salary Expense (Monthly)"
          value={`₹${totalSalaryExpense.toLocaleString()}`} // Changed to Rupee symbol
          icon={<Banknote className="h-6 w-6 text-pink-600" />}
        />
        <StatCard
          title="Avg. Performance"
          value={topPerformers.length > 0 ? `${Math.round(topPerformers.reduce((sum, p) => sum + p.performance, 0) / topPerformers.length)}%` : "N/A"}
          icon={<Award className="h-6 w-6 text-amber-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardComponent title="Recent Activity" className="lg:col-span-2 bg-white p-4 shadow rounded-lg">
          <div className="space-y-4">
             {/* ✅ FIX: The type for activityItem is now correctly inferred from the consistent StaffMember type. */}
            {recentActivities.length > 0 ? recentActivities.map((activityItem) => (
              <div key={activityItem.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="relative flex-shrink-0">
                  <img
                    // This logic correctly handles the possibility of a null image
                    src={activityItem.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(activityItem.name)}&background=random`}
                    alt={activityItem.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                  {activityItem.status === 'active' && (
                     <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-800">{activityItem.name} {activityItem.activity}</p>
                  <p className="text-xs text-gray-500">{activityItem.time}</p>
                </div>
                <div>
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-sm">No recent activity to show.</p>
            )}
          </div>
        </CardComponent>

        <CardComponent title="Top Performers" className="lg:col-span-1 bg-white p-4 shadow rounded-lg">
          <div className="space-y-4">
            {/* ✅ FIX: The type for staff is now correctly inferred. */}
            {topPerformers.length > 0 ? topPerformers.map((staff, index) => (
              <div key={staff.id} className="flex items-center py-2">
                <div className="flex-shrink-0 mr-3">
                  <div className="relative">
                    <img
                      src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`}
                      alt={staff.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow">
                        1st
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {staff.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{staff.position}</p>
                </div>
                <div className="flex items-center text-sm text-green-600 font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>{staff.performance}%</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CircleUser className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-600">No staff members yet</p>
                <p className="text-xs text-gray-500">Add staff to see top performers.</p>
              </div>
            )}
          </div>
        </CardComponent>
      </div>
    </div>
  );
};

export default Dashboard;