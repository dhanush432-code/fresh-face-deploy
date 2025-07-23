// src/app/(main)/staffmanagement/attendance/page.tsx
// This is the final, CORRECTED version.

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Calendar, Clock, Search, CheckCircle, XCircle, AlertTriangle, LogOut, LogIn, PlayCircle, PauseCircle, Info, ChevronLeft, ChevronRight, Bed, X, Trash2, Target } from 'lucide-react';
import { useStaff } from '../../../../context/StaffContext';
import { AttendanceRecordTypeFE, StaffMember, TemporaryExitTypeFE } from '../../../../context/StaffContext';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWeekend, differenceInMinutes, addMonths, subMonths, isEqual, startOfDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import { PERMISSIONS, hasPermission } from '../../../../lib/permissions';

// Helper function to get initials from a name (Original Function)
const getInitials = (name: string = ''): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 1) {
    return `${parts[0][0]}${parts[0][1]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return 'S';
};

// Centralized helper function to format duration (Original Function)
const formatDuration = (minutes: number | null): string => {
    if (minutes === null || isNaN(minutes) || minutes < 0) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
};

// Avatar component with a vibrant, modern color palette and ring effect.
const Avatar: React.FC<{
  src?: string | null;
  name: string;
  className?: string;
}> = ({ src, name, className = "h-10 w-10" }) => {
  const [imageError, setImageError] = useState(false);
  useEffect(() => { setImageError(false); }, [src]);
  const initials = getInitials(name);
  const colorClasses = [
    'bg-violet-200 text-violet-800', 'bg-emerald-200 text-emerald-800', 'bg-sky-200 text-sky-800',
    'bg-rose-200 text-rose-800', 'bg-amber-200 text-amber-800', 'bg-indigo-200 text-indigo-800',
    'bg-pink-200 text-pink-800'
  ];
  const colorIndex = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colorClasses.length;
  const handleImageError = () => setImageError(true);
  if (src && !imageError) {
    return <img src={src} alt={name} className={`${className} rounded-full object-cover ring-2 ring-white`} onError={handleImageError} />;
  }
  return (
    <div className={`${className} rounded-full flex items-center justify-center font-bold text-sm ${colorClasses[colorIndex]} ring-2 ring-white`} title={name}>
      {initials}
    </div>
  );
};


// Attendance Detail Modal (Unchanged)
const AttendanceDetailModal: React.FC<{ record: AttendanceRecordTypeFE; onClose: () => void }> = ({ record, onClose }) => {
  const requiredMinutesForRecord = record.requiredMinutes || (9 * 60);
  const statusText = record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ');
  const statusColor = record.isWorkComplete ? 'bg-green-100 text-green-800' : record.status === 'week_off' ? 'bg-cyan-100 text-cyan-800' : 'bg-orange-100 text-orange-800';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
        <div className="p-6 bg-gradient-to-br from-purple-600 to-indigo-600 text-white relative">
          <h3 className="text-xl font-bold text-white mb-2">Attendance Details</h3>
          <p className="text-sm opacity-80">{format(record.date, 'eeee, MMMM d, yyyy')}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center pb-4 border-b border-gray-200">
            <Avatar src={record.staff.image} name={record.staff.name} className="h-14 w-14" />
            <div className="ml-4">
              <div className="text-lg font-bold text-gray-900">{record.staff.name}</div>
              <div className="text-sm text-gray-500">{record.staff.position}</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Status:</span><span className={`px-2 py-1 inline-flex leading-5 font-semibold rounded-full ${statusColor}`}>{statusText}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Check In:</span><span className="font-mono text-gray-800">{record.checkIn ? format(record.checkIn, 'HH:mm:ss') : 'N/A'}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Check Out:</span><span className="font-mono text-gray-800">{record.checkOut ? format(record.checkOut, 'HH:mm:ss') : 'N/A'}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Total Working Time:</span><span className="font-semibold text-gray-800">{formatDuration(record.totalWorkingMinutes)}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-gray-600">Required Time:</span><span className={`font-semibold ${record.isWorkComplete ? 'text-green-600' : 'text-red-600'}`}>{record.status === 'week_off' ? 'N/A' : `${formatDuration(requiredMinutesForRecord)} ${record.isWorkComplete ? '' : '(Incomplete)'}`}</span></div>
          </div>
          {record.temporaryExits && record.temporaryExits.length > 0 && (
            <div className="pt-3 border-t">
              <h4 className="font-medium text-gray-600 mb-2">Temporary Exits:</h4>
              <ul className="space-y-2 max-h-32 overflow-y-auto pr-2">
                {record.temporaryExits.map((exit: TemporaryExitTypeFE) => (
                  <li key={exit.id} className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center font-mono text-xs text-gray-800"><span>{format(exit.startTime, 'HH:mm')} - {exit.endTime ? format(exit.endTime, 'HH:mm') : 'Ongoing'}</span><span className="font-sans font-semibold text-purple-600">({formatDuration(exit.durationMinutes)})</span></div>
                    {exit.reason && <p className="text-xs text-gray-500 mt-1 italic">Reason: {exit.reason}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <Button variant="danger" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};


const StaffMonthlySummaryModal: React.FC<{ 
    staff: StaffMember; 
    records: AttendanceRecordTypeFE[]; 
    monthDate: Date; 
    onClose: () => void;
    positionHoursMap: Map<string, number>;
    defaultDailyHours: number;
}> = ({ staff, records, monthDate, onClose, positionHoursMap, defaultDailyHours }) => {
    
    const staffMonthlyRecords = records.filter(r => r.staff.id === staff.id && r.date.getMonth() === monthDate.getMonth() && r.date.getFullYear() === monthDate.getFullYear());
    const presentDays = staffMonthlyRecords.filter(r => ['present', 'late'].includes(r.status) && r.isWorkComplete).length;
    const leaveDays = staffMonthlyRecords.filter(r => r.status === 'on_leave' || (['present', 'late', 'incomplete'].includes(r.status) && !r.isWorkComplete)).length;
    const totalOvertimeMinutes = staffMonthlyRecords.reduce((total, record) => { const requiredMinutes = record.requiredMinutes || (9 * 60); if (record.totalWorkingMinutes && record.totalWorkingMinutes > requiredMinutes) { return total + (record.totalWorkingMinutes - requiredMinutes); } return total; }, 0);
    const totalOvertimeHours = Math.floor(totalOvertimeMinutes / 60);
    const weekOffDays = staffMonthlyRecords.filter(r => r.status === 'week_off').length;
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
    const absentDays = daysInMonth.filter(day => { const dayStr = format(day, 'yyyy-MM-dd'); const record = staffMonthlyRecords.find(r => format(r.date, 'yyyy-MM-dd') === dayStr); if (record && record.status === 'absent') { return true; } if (!record && day < startOfDay(new Date()) && !isWeekend(day)) { return true; } return false; }).length;

    const { requiredMonthlyMinutes, totalAchievedMinutes, achievementPercentage } = useMemo(() => {
        const requiredMonthlyHours = positionHoursMap.get(staff.position ?? '') ?? (defaultDailyHours * 22);
        const requiredMonthlyMinutes = requiredMonthlyHours * 60;
        const totalAchievedMinutes = staffMonthlyRecords.reduce((acc, record) => acc + (record.totalWorkingMinutes || 0), 0);
        const achievementPercentage = requiredMonthlyMinutes > 0 ? Math.min(100, (totalAchievedMinutes / requiredMonthlyMinutes) * 100) : 0;
        return { requiredMonthlyMinutes, totalAchievedMinutes, achievementPercentage };
    }, [staff, staffMonthlyRecords, positionHoursMap, defaultDailyHours]);


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all">
                <div className="p-6 bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
                     <h3 className="text-xl font-bold text-white mb-2">Monthly Summary - {format(monthDate, 'MMMM yyyy')}</h3>
                     <div className="flex items-center">
                        <Avatar src={staff.image} name={staff.name} className="h-14 w-14" />
                        <div className="ml-4">
                            <div className="text-lg font-bold">{staff.name}</div>
                            <div className="text-sm opacity-80">{staff.position}</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-b">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center"><Target className="h-5 w-5 mr-2 text-purple-600"/>Monthly Hours Target</h4>
                    <div className="space-y-2">
                         <div className="flex justify-between items-baseline">
                             <span className="text-sm font-medium text-gray-600">Achieved: <span className="text-lg font-bold text-black">{formatDuration(totalAchievedMinutes)}</span></span>
                             <span className="text-sm font-medium text-gray-500">Required: <span className="text-lg font-bold text-gray-800">{formatDuration(requiredMonthlyMinutes)}</span></span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full" style={{ width: `${achievementPercentage}%` }} title={`${achievementPercentage.toFixed(1)}% Complete`}></div>
                         </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-green-100 p-4 rounded-lg text-center border border-green-200"><p className="text-sm text-green-700 font-medium">Present Days</p><p className="text-3xl font-bold text-green-800">{presentDays}</p></div>
                    <div className="bg-red-100 p-4 rounded-lg text-center border border-red-200"><p className="text-sm text-red-700 font-medium">Absent Days</p><p className="text-3xl font-bold text-red-800">{absentDays}</p></div>
                    <div className="bg-blue-100 p-4 rounded-lg text-center border border-blue-200"><p className="text-sm text-blue-700 font-medium">On Leave</p><p className="text-3xl font-bold text-blue-800">{leaveDays}</p></div>
                    <div className="bg-purple-100 p-4 rounded-lg text-center border border-purple-200"><p className="text-sm text-purple-700 font-medium">Total OT Hours</p><p className="text-3xl font-bold text-purple-800">{totalOvertimeHours}</p></div>
                    <div className="bg-cyan-100 p-4 rounded-lg text-center border border-cyan-200"><p className="text-sm text-cyan-700 font-medium">Week Offs</p><p className="text-3xl font-bold text-cyan-800">{weekOffDays}</p></div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <Button variant="danger" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};


// Apply Week Off Modal (Unchanged)
const ApplyWeekOffModal: React.FC<{ staffMembers: StaffMember[]; attendanceRecords: AttendanceRecordTypeFE[]; onClose: () => void; onApply: (data: { staffIds: string[]; date: Date }) => Promise<void>; }> = ({ staffMembers, attendanceRecords, onClose, onApply }) => {
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [isApplying, setIsApplying] = useState(false);

    const staffOnWeekOff = useMemo(() => {
        const ids = new Set<string>();
        if (!selectedDate) return ids;
        for (const record of attendanceRecords) {
            if (record.status === 'week_off' && format(record.date, 'yyyy-MM-dd') === selectedDate) {
                ids.add(record.staff.id);
            }
        }
        return ids;
    }, [selectedDate, attendanceRecords]);
    
    const availableStaff = useMemo(() => staffMembers.filter(s => !staffOnWeekOff.has(s.id)), [staffMembers, staffOnWeekOff]);
    
    const handleStaffSelection = (staffId: string) => { setSelectedStaffIds(prev => prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]); };
    const handleSelectAll = () => { if (selectedStaffIds.length === availableStaff.length) { setSelectedStaffIds([]); } else { setSelectedStaffIds(availableStaff.map(s => s.id)); } };

    const handleSubmit = async () => {
        if (selectedStaffIds.length === 0 || !selectedDate) {
            toast.warn("Please select at least one staff member and a date.");
            return;
        }
        setIsApplying(true);
        try {
            const [year, month, day] = selectedDate.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            await onApply({ staffIds: selectedStaffIds, date: localDate });
            onClose();
        } catch (error) {
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transform transition-all">
                <div className="p-6 flex justify-between items-center border-b">
                    <h3 className="text-xl font-bold text-gray-800">Apply Week Off</h3>
                    <Button variant="ghost" size="sm" className="!p-2" onClick={onClose}><X className="h-5 w-5" /></Button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label htmlFor="weekoff-date" className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                        <input id="weekoff-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-3 text-gray-900" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-sm font-medium text-gray-700">Select Staff</label>
                             <button onClick={handleSelectAll} className="text-sm font-medium text-purple-600 hover:text-purple-800 disabled:text-gray-400" disabled={availableStaff.length === 0}>
                                {selectedStaffIds.length === availableStaff.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                            {staffMembers.map(staff => {
                                const isAlreadyOnWeekOff = staffOnWeekOff.has(staff.id);
                                return (
                                <div key={staff.id} className={`flex items-center p-2 rounded-md ${isAlreadyOnWeekOff ? 'opacity-60 bg-gray-50' : 'hover:bg-gray-100'}`}>
                                    <input type="checkbox" id={`staff-${staff.id}`} checked={selectedStaffIds.includes(staff.id)} onChange={() => handleStaffSelection(staff.id)} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed" disabled={isAlreadyOnWeekOff} />
                                    <label htmlFor={`staff-${staff.id}`} className={`ml-3 text-sm flex-1 ${isAlreadyOnWeekOff ? 'text-gray-500 cursor-not-allowed' : 'text-gray-800 cursor-pointer'}`}>{staff.name}</label>
                                    {isAlreadyOnWeekOff && (<span className="text-xs font-medium text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-full">On Week Off</span>)}
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
                    <Button variant="outline-danger" onClick={onClose} disabled={isApplying}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={selectedStaffIds.length === 0 || !selectedDate || isApplying}>
                        {isApplying ? 'Applying...' : 'Apply Week Off'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Attendance: React.FC = () => {
    // NEW: Get session data to check for permissions
  const { data: session } = useSession();
  const userPermissions = useMemo(() => session?.user?.role?.permissions || [], [session]);

    // NEW: Create a specific permission variable for managing attendance
  const canManageAttendance = useMemo(() => hasPermission(userPermissions, PERMISSIONS.STAFF_ATTENDANCE_MANAGE), [userPermissions]);


  const { staffMembers, attendanceRecordsFE, loadingAttendance, errorAttendance, fetchAttendanceRecords, checkInStaff, checkOutStaff, startTemporaryExit, endTemporaryExit, applyWeekOff, removeWeekOff } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyRequiredHours, setDailyRequiredHours] = useState(9); 
  const [positionHoursMap, setPositionHoursMap] = useState<Map<string, number>>(new Map());
  const [settingsLoading, setSettingsLoading] = useState(true); 
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<AttendanceRecordTypeFE | null>(null);
  const [selectedStaffForSummary, setSelectedStaffForSummary] = useState<StaffMember | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCheckOutData, setPendingCheckOutData] = useState<{ attendanceId: string; staffName: string; requiredHours: number } | null>(null);
  const [showTempExitModal, setShowTempExitModal] = useState(false);
  const [selectedAttendanceIdForTempExit, setSelectedAttendanceIdForTempExit] = useState<string | null>(null);
  const [tempExitReason, setTempExitReason] = useState('');
  const [showWeekOffModal, setShowWeekOffModal] = useState(false);
  const [weekOffToRemove, setWeekOffToRemove] = useState<AttendanceRecordTypeFE | null>(null);

  type StaffMemberWithId = StaffMember & { staffIdNumber?: string };

  useEffect(() => {
    fetchAttendanceRecords({ year: currentMonthDate.getFullYear(), month: currentMonthDate.getMonth() + 1 });
  }, [currentMonthDate, fetchAttendanceRecords]);

  useEffect(() => {
    const fetchAllSettings = async () => {
      setSettingsLoading(true);
      try {
        const shopSettingsResponse = await fetch('/api/settings');
        const shopSettingsResult = await shopSettingsResponse.json();
        
        if (shopSettingsResult.success && shopSettingsResult.data && shopSettingsResult.data.settings) {
          setDailyRequiredHours(shopSettingsResult.data.settings.defaultDailyHours);
        }

        const positionHoursResponse = await fetch('/api/settings/position-hours');
        const positionHoursResult = await positionHoursResponse.json();
        if (positionHoursResult.success && Array.isArray(positionHoursResult.data)) {
            const map = new Map<string, number>();
            positionHoursResult.data.forEach((setting: { positionName: string, requiredHours: number }) => {
                map.set(setting.positionName, setting.requiredHours);
            });
            setPositionHoursMap(map);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Could not load required hour settings.");
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchAllSettings();
  }, []);
  
  const todayAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecordTypeFE>();
    const todayStart = startOfDay(new Date());
    for (const record of attendanceRecordsFE) {
      if (isEqual(startOfDay(record.date), todayStart)) {
        map.set(record.staff.id, record);
      }
    }
    return map;
  }, [attendanceRecordsFE]);

  const monthlyAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecordTypeFE>();
    for (const record of attendanceRecordsFE) {
      const key = `${record.staff.id}-${format(record.date, 'yyyy-MM-dd')}`;
      map.set(key, record);
    }
    return map;
  }, [attendanceRecordsFE]);

  const activeStaffMembers = useMemo(() => staffMembers.filter((staff: StaffMember) => staff.status === 'active'), [staffMembers]);
  
  const filteredStaff = useMemo(() => {
    if (!searchTerm) {
      return activeStaffMembers;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return activeStaffMembers.filter((staff: StaffMemberWithId) => 
        staff.name.toLowerCase().includes(lowercasedFilter) ||
        (staff.staffIdNumber && staff.staffIdNumber.includes(lowercasedFilter))
    );
  }, [activeStaffMembers, searchTerm]);

  const daysInMonth = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonthDate), end: endOfMonth(currentMonthDate) }), [currentMonthDate]);
  const goToPreviousMonth = () => setCurrentMonthDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonthDate(prev => addMonths(prev, 1));
  
  const handleCalendarCellClick = (staffId: string, day: Date) => {
    if (day.getTime() > new Date().getTime()) return;
    const key = `${staffId}-${format(day, 'yyyy-MM-dd')}`;
    const record = monthlyAttendanceMap.get(key);
    if (record) {
      if (record.status === 'week_off') {
        setWeekOffToRemove(record);
      } else {
        setSelectedRecordForDetail(record);
      }
    }
  };
  
  const getMonthlyAttendanceIcon = (staffId: string, day: Date): React.ReactNode => {
    const key = `${staffId}-${format(day, 'yyyy-MM-dd')}`;
    const record = monthlyAttendanceMap.get(key);
    
    let icon: React.ReactNode = null;
    let title = "";

    if (!record) {
      if (isWeekend(day)) { title = "Weekend"; icon = <span className="block h-2 w-2 rounded-sm bg-gray-200" />; } 
      else if (day.getTime() > new Date().setHours(23, 59, 59, 999)) { title = "Future"; icon = <span className="block h-5 w-5" />; } 
      else if (isToday(day)) { title = "Not Recorded"; icon = <Info className="h-4 w-4 text-gray-400" />; } 
      else { title = "Absent"; icon = <XCircle className="h-5 w-5 text-red-500" />; }
      return <div className="flex justify-center items-center h-full" title={title}>{icon}</div>;
    }
    
    switch (record.status) {
      case 'present': case 'incomplete': title = `View details for ${record.staff.name}`; icon = <CheckCircle className={`h-5 w-5 ${record.isWorkComplete ? 'text-green-500' : 'text-orange-400'}`} />; break;
      case 'absent': title = `View details for ${record.staff.name}`; icon = <XCircle className="h-5 w-5 text-red-500" />; break;
      case 'late': title = `View details for ${record.staff.name}`; icon = <AlertTriangle className="h-5 w-5 text-yellow-500" />; break;
      case 'on_leave': title = `View details for ${record.staff.name}`; icon = <Calendar className="h-5 w-5 text-blue-500" />; break;
      case 'week_off': title = `Click to edit/remove week off for ${record.staff.name}`; icon = <Bed className="h-5 w-5 text-cyan-500" />; break;
      default: icon = <span className="block h-2 w-2 rounded-full bg-gray-300" />;
    }
    return <div className="flex justify-center items-center h-full w-full cursor-pointer rounded-lg hover:bg-purple-100 transition-colors" title={title} onClick={() => handleCalendarCellClick(staffId, day)}>{icon}</div>;
  };
  

  
  const handleConfirmRemoveWeekOff = async () => {
    if (!weekOffToRemove) return;
    try {
        await removeWeekOff(weekOffToRemove.id);
        toast.success(`Week off for ${weekOffToRemove.staff.name} has been removed.`);
    } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove week off.");
    } finally {
        setWeekOffToRemove(null);
    }
  };
  

  // --- THE FIX IS HERE ---
  // The typo 'checkin' has been corrected to 'checkIn'.
  const calculateFrontendWorkingMinutes = useCallback((attendance: AttendanceRecordTypeFE): number => { let totalMinutes = 0; if (attendance.checkIn && attendance.checkOut) { return attendance.totalWorkingMinutes; } else if (attendance.checkIn && !attendance.checkOut) { totalMinutes = differenceInMinutes(new Date(), attendance.checkIn); } let tempExitDeduction = 0; (attendance.temporaryExits || []).forEach((exit: TemporaryExitTypeFE) => { if (!exit.isOngoing && exit.endTime) { tempExitDeduction += exit.durationMinutes; } else if (exit.isOngoing) { tempExitDeduction += differenceInMinutes(new Date(), exit.startTime); } }); return Math.max(0, totalMinutes - tempExitDeduction); }, []);
  
  const handleCheckIn = async (staff: StaffMember) => { 
    try { 
      await checkInStaff(staff.id, dailyRequiredHours); 
      toast.success('Successfully checked in!'); 
    } catch (err) { 
      toast.error(err instanceof Error ? err.message : 'Check-in failed'); 
    } 
  };
  
  const handleCheckOutAttempt = async (attendanceId: string, staffId: string, staffName: string) => {
    const attendance = todayAttendanceMap.get(staffId);
    if (!attendance || attendance.checkOut) return;

    if (attendance.temporaryExits?.some((exit: TemporaryExitTypeFE) => exit.isOngoing)) {
        toast.error("Please end the ongoing temporary exit before checking out.");
        return;
    }
    
    const estimatedMinutes = attendance.checkOut ? attendance.totalWorkingMinutes : calculateFrontendWorkingMinutes(attendance);
    const requiredMinutes = attendance.requiredMinutes || (dailyRequiredHours * 60);
    
    if (estimatedMinutes < requiredMinutes) {
        setPendingCheckOutData({ attendanceId, staffName, requiredHours: requiredMinutes / 60 });
        setShowConfirmModal(true);
    } else {
        await confirmCheckOut(attendanceId, requiredMinutes / 60);
    }
  };

  const confirmCheckOut = async (attendanceId: string, requiredHours: number) => { try { await checkOutStaff(attendanceId, requiredHours); toast.success('Successfully checked out!'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Check-out failed'); } finally { setPendingCheckOutData(null); setShowConfirmModal(false); } };
  const handleOpenTempExitModal = (attendanceId: string) => { const att = [...todayAttendanceMap.values()].find(a => a.id === attendanceId); if (!att || att.checkOut || (att.temporaryExits || []).some((e: TemporaryExitTypeFE) => e.isOngoing)) { toast.error("Cannot start temp exit: Staff already checked out or an exit is ongoing."); return; } setSelectedAttendanceIdForTempExit(attendanceId); setShowTempExitModal(true); setTempExitReason(''); };
  const handleSubmitTempExit = async () => { if (!selectedAttendanceIdForTempExit || !tempExitReason.trim()) { toast.error("A reason is required to start a temporary exit."); return; } try { await startTemporaryExit(selectedAttendanceIdForTempExit, tempExitReason.trim()); toast.success('Temporary exit started.'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Starting temp exit failed'); } finally { setShowTempExitModal(false); setTempExitReason(''); setSelectedAttendanceIdForTempExit(null); } };
  const handleEndTempExit = async (attendanceId: string, tempExitId: string) => { try { await endTemporaryExit(attendanceId, tempExitId); toast.success('Temporary exit ended.'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Ending temp exit failed'); } };
  const getTodayAttendance = (staffIdToFind: string): AttendanceRecordTypeFE | undefined => { return todayAttendanceMap.get(staffIdToFind); };
  const handleStaffSummaryClick = (staff: StaffMember) => { setSelectedStaffForSummary(staff); };

  return (
    <div className="space-y-8 p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Attendance Management</h1>
      {errorAttendance && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg" role="alert"><p>{errorAttendance}</p></div>}
      
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search by staff name or ID..." className="pl-12 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
                   {/* MODIFIED: Conditionally render the "Apply Week Off" button */}
          {canManageAttendance && (
            <Button onClick={() => setShowWeekOffModal(true)}>Apply Week Off</Button>
          )}
          <label htmlFor="dailyHours" className="text-sm font-medium text-gray-700 whitespace-nowrap">Shop Default Hours:</label>
          <input type="number" id="dailyHours" value={settingsLoading ? '...' : dailyRequiredHours} readOnly className="w-20 border-gray-300 rounded-lg shadow-sm bg-gray-100 sm:text-sm px-3 py-2 text-gray-900 font-semibold" />
        </div>
      </div>

      {(loadingAttendance || settingsLoading) && <div className="text-center py-20 text-gray-500 flex items-center justify-center gap-3"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div><p>Loading Data...</p></div>}
      
      {!(loadingAttendance || settingsLoading) && (
        <>
        <Card title={`Today's Attendance (${format(new Date(), 'eeee, MMMM d')})`} className="!p-0 overflow-hidden shadow-lg rounded-xl border">
          <div>
            <table className="min-w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[20%]">Staff</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[8%]">Staff ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[12%]">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[12%]">Check In/Out</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[10%]">Working Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[10%]">Required</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[13%]">Temp Exits</th>
                    {canManageAttendance && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-[15%]">Actions</th>
                    )}                
                    </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((staff) => { 
                  const todayAttendance = getTodayAttendance(staff.id); 
                  const workingMinutes = todayAttendance ? (todayAttendance.checkOut ? todayAttendance.totalWorkingMinutes : calculateFrontendWorkingMinutes(todayAttendance)) : 0;
                  
                  const requiredMinutesForStaff = todayAttendance?.requiredMinutes || (dailyRequiredHours * 60);
                  
                  const remainingMinutes = Math.max(0, requiredMinutesForStaff - workingMinutes);
                  const ongoingTempExit = todayAttendance?.temporaryExits?.find((exit: TemporaryExitTypeFE) => exit.isOngoing);
                  const staffWithId = staff as StaffMemberWithId;
                  
                  return (
                   <tr key={staff.id} className="hover:bg-violet-50/70 transition-colors">
  {/* Column 1: Staff */}
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="flex items-center">
      <Avatar src={staff.image} name={staff.name} className="h-11 w-11" />
      <div className="ml-4">
        <div className="text-sm font-medium text-gray-900 truncate">{staff.name}</div>
        <div className="text-xs text-gray-500">{staff.position}</div>
      </div>
    </div>
  </td>
  
  {/* Column 2: Staff ID */}
  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">{staffWithId.staffIdNumber || 'N/A'}</td>
  
  {/* Column 3: Status */}
  <td className="px-6 py-4 whitespace-nowrap">
    {todayAttendance ? ( 
      todayAttendance.status === 'week_off' ? 
      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-cyan-100 text-cyan-800">Week Off</span> : 
      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md ${todayAttendance.isWorkComplete ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
        {todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1).replace('_', ' ')}
        {!todayAttendance.isWorkComplete && ' (Inc.)'}
      </span> 
    ) : <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-md bg-gray-100 text-gray-800">Not Recorded</span>}
  </td>

  {/* Column 4: Check In/Out */}
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
    <div><Clock className="h-4 w-4 text-gray-400 mr-1.5 inline-block" /> In: {todayAttendance?.checkIn ? format(todayAttendance.checkIn, 'HH:mm') : '—'}</div>
    <div><Clock className="h-4 w-4 text-gray-400 mr-1.5 inline-block" /> Out: {todayAttendance?.checkOut ? format(todayAttendance.checkOut, 'HH:mm') : '—'}</div>
  </td>
  
  {/* Column 5: Working Time */}
  <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-semibold text-gray-900">{formatDuration(workingMinutes)}</span></td>

  {/* Column 6: Required */}
  <td className="px-6 py-4 whitespace-nowrap">
    <span className={`text-sm font-medium ${remainingMinutes > 0 && workingMinutes > 0 && !todayAttendance?.isWorkComplete ? 'text-red-600' : (todayAttendance?.isWorkComplete ? 'text-green-600' : 'text-gray-700')}`}>
      {todayAttendance?.isWorkComplete ? 'Completed' : (remainingMinutes > 0 && workingMinutes > 0 ? `${formatDuration(remainingMinutes)} rem.` : formatDuration(requiredMinutesForStaff))}
    </span>
  </td>
  
  {/* Column 7: Temp Exits */}
  <td className="px-6 py-4 whitespace-nowrap max-w-xs">
    {todayAttendance?.temporaryExits && todayAttendance.temporaryExits.length > 0 && (
      <div className="space-y-1.5">
        {todayAttendance.temporaryExits.map((exit: TemporaryExitTypeFE) => (
          <div key={exit.id} className="text-xs" title={exit.reason ?? undefined}>
            <div className={`flex items-center space-x-1.5 ${exit.isOngoing ? 'text-blue-600 font-semibold animate-pulse' : 'text-gray-500'}`}>
              <span>{format(exit.startTime, 'HH:mm')} - {exit.endTime ? format(exit.endTime, 'HH:mm') : 'Ongoing'}</span>
              {!exit.isOngoing && exit.endTime && (<span className="text-purple-600">({formatDuration(exit.durationMinutes)})</span>)}
            </div>
            {exit.reason && <p className="text-gray-600 truncate">{exit.reason}</p>}
          </div>
        ))}
      </div>
    )}
  </td>

  {/* Column 8: Actions (Conditional) */}
  {canManageAttendance && (
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
      {!todayAttendance ? 
        <Button size="sm" icon={<LogIn size={14} />} onClick={() => handleCheckIn(staff)}>Check In</Button> : 
      todayAttendance.status === 'week_off' ? 
        <span className="text-xs text-cyan-700 bg-cyan-100 px-2 py-1 rounded-md font-semibold">On Week Off</span> : 
      <div className="flex justify-end items-center space-x-2">
        {!todayAttendance.checkOut && (
          <>
            {ongoingTempExit ? 
              <Button size="xs" variant="success" icon={<PauseCircle size={12} />} onClick={() => handleEndTempExit(todayAttendance.id, ongoingTempExit.id)}>End Exit</Button> : 
              <Button size="xs" variant="outline" icon={<PlayCircle size={12} />} onClick={() => handleOpenTempExitModal(todayAttendance.id)} disabled={!!todayAttendance.checkOut}>Temp Exit</Button>
            }
            <Button size="xs" variant="secondary" icon={<LogOut size={12} />} onClick={() => handleCheckOutAttempt(todayAttendance.id, staff.id, staff.name)} disabled={!!todayAttendance.checkOut || !!ongoingTempExit}>Check Out</Button>
          </>
        )}
        {todayAttendance.checkOut && (
          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-md font-semibold">Checked Out</span>
        )}
      </div>
      }
    </td>
  )}
</tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        
        <div className="flex items-center justify-between mt-8 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Monthly Attendance Overview</h2>
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="!p-2"><ChevronLeft size={16}/></Button>
                <span className="font-semibold text-gray-700 w-36 text-center">{format(currentMonthDate, 'MMMM yyyy')}</span>
                <Button variant="outline" size="sm" onClick={goToNextMonth} className="!p-2"><ChevronRight size={16}/></Button>
            </div>
        </div>
        <Card className="!p-0 overflow-hidden shadow-lg rounded-xl border">
          <div className="overflow-x-auto pb-2">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-50"><tr><th className="w-52 py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50/80 backdrop-blur-sm z-10 border-b border-r">Staff</th>{daysInMonth.map((day) => (<th key={format(day, 'd')} className={`w-14 h-14 text-center py-2 text-xs font-semibold uppercase border-b border-l ${isWeekend(day) ? 'text-gray-400 bg-gray-100/50' : isToday(day) ? 'text-purple-700 font-bold bg-purple-50' : 'text-gray-500'}`}><div>{format(day, 'd')}</div><div className="text-[10px] font-normal">{format(day, 'EEE').charAt(0)}</div></th>))}</tr></thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="border-b border-gray-200 last:border-b-0 group">
                    <td className="py-2 px-3 sticky left-0 bg-white group-hover:bg-violet-50 z-10 border-r cursor-pointer transition-colors" onClick={() => handleStaffSummaryClick(staff)} title={`View monthly summary for ${staff.name}`}><div className="flex items-center"><Avatar src={staff.image} name={staff.name} className="h-9 w-9 mr-3" /><p className="text-sm font-medium text-gray-800 whitespace-nowrap">{staff.name}</p></div></td>
                    {daysInMonth.map((day) => (<td key={format(day, 'd')} className="text-center py-2 border-l">{getMonthlyAttendanceIcon(staff.id, day)}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}

      {selectedRecordForDetail && (<AttendanceDetailModal record={selectedRecordForDetail} onClose={() => setSelectedRecordForDetail(null)} />)}
      
      {selectedStaffForSummary && (
        <StaffMonthlySummaryModal 
            staff={selectedStaffForSummary} 
            records={attendanceRecordsFE} 
            monthDate={currentMonthDate} 
            onClose={() => setSelectedStaffForSummary(null)} 
            positionHoursMap={positionHoursMap}
            defaultDailyHours={dailyRequiredHours}
        />
      )}

      {showWeekOffModal && <ApplyWeekOffModal staffMembers={activeStaffMembers} attendanceRecords={attendanceRecordsFE} onClose={() => setShowWeekOffModal(false)} onApply={applyWeekOff} />}
      {showConfirmModal && pendingCheckOutData && ( <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center"><div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100"><AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" /></div><h3 className="text-xl font-bold text-gray-900 mt-5">Incomplete Hours</h3><p className="text-sm text-gray-500 mt-2">Staff <span className="font-semibold">{pendingCheckOutData.staffName}</span> hasn't completed required hours ({formatDuration(pendingCheckOutData.requiredHours * 60)}). Checkout anyway?</p><div className="flex justify-center space-x-4 mt-8"><Button variant="secondary" onClick={() => { setShowConfirmModal(false); setPendingCheckOutData(null); }}>Go Back</Button><Button variant="danger" onClick={() => {if (pendingCheckOutData) confirmCheckOut(pendingCheckOutData.attendanceId, pendingCheckOutData.requiredHours);}}>Check Out</Button></div></div></div>)}
      {showTempExitModal && selectedAttendanceIdForTempExit && ( <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"><h3 className="text-xl font-bold text-gray-800 mb-4">Record Temporary Exit</h3><div className="space-y-4"><div><label htmlFor="tempExitReason" className="block text-sm font-medium text-gray-700 mb-1">Reason*</label><textarea id="tempExitReason" rows={3} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-3 text-gray-900" value={tempExitReason} onChange={(e) => setTempExitReason(e.target.value)} placeholder="e.g., Lunch break, client meeting..." required /></div><div className="flex justify-end space-x-3 pt-4"><Button variant="outline-danger" onClick={() => { setShowTempExitModal(false); setTempExitReason(''); setSelectedAttendanceIdForTempExit(null); }}>Cancel</Button><Button onClick={handleSubmitTempExit} disabled={!tempExitReason.trim()}>Start Exit</Button></div></div></div></div>)}
    
      {weekOffToRemove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100">
                    <AlertTriangle className="h-8 w-8 text-orange-600" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mt-5">Edit Week Off</h3>
                <p className="text-sm text-gray-500 mt-2">
                    Are you sure you want to remove the week off for <span className="font-semibold">{weekOffToRemove.staff.name}</span> on <span className="font-semibold">{format(weekOffToRemove.date, 'MMMM d, yyyy')}</span>?
                </p>
                <div className="flex justify-center space-x-4 mt-8">
                    <Button variant="secondary" onClick={() => setWeekOffToRemove(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" icon={<Trash2 size={16}/>} onClick={handleConfirmRemoveWeekOff}>
                        Remove Week Off
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
  ;
};
export default Attendance;