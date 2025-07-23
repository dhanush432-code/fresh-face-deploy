// src/app/staffmanagement/staff/staffdetail/page.tsx
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Calendar as CalendarIcon, DollarSign,
  CheckCircle, XCircle, BarChart3, CalendarClock, AlertTriangle, Badge,
  FileText, Banknote, ShieldCheck, Eye
} from 'lucide-react';
import {
  useStaff,
  StaffMember,
  AttendanceRecordTypeFE as AttendanceRecord,
  PerformanceRecordType as PerformanceRecord
} from '@/context/StaffContext'; 
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { format, parseISO, isWeekend, startOfDay, isEqual } from 'date-fns';

const DEFAULT_STAFF_AVATAR = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d1d5db'%3e%3cpath fill-rule='evenodd' d='M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' clip-rule='evenodd' /%3e%3c/svg%3e`;

const DocumentViewerModal: React.FC<{ src: string | null; title: string; onClose: () => void; }> = ({ src, title, onClose }) => {
  if (!src) return null;
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" onClick={onClose}><XCircle /></Button>
        </div>
        <div className="p-4">
          <img src={src} alt={title} className="w-full h-auto object-contain" />
        </div>
      </div>
    </div>
  );
};

const StaffDetailsContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const staffIdFromQuery = searchParams.get('staffId');

  const {
    getStaffById,
    attendanceRecordsFE,
    performanceRecords,
    fetchPerformanceRecords,
  } = useStaff();

  const [staff, setStaff] = useState<StaffMember | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffAttendance, setStaffAttendance] = useState<AttendanceRecord[]>([]);
  const [viewingDocument, setViewingDocument] = useState<{src: string | null, title: string}>({ src: null, title: '' });
  
  useEffect(() => {
    const fetchStaffDetails = async () => {
      if (!staffIdFromQuery) {
        setError("Staff ID is missing in the URL.");
        setIsLoading(false);
        setStaff(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const staffData = getStaffById(staffIdFromQuery);
        if (staffData) {
            setStaff(staffData);
            await fetchPerformanceRecords({ month: '', year: new Date().getFullYear(), staffId: staffIdFromQuery });
        } else {
             const response = await fetch(`/api/staff?id=${staffIdFromQuery}`);
             if (!response.ok) throw new Error('Failed to fetch staff details from server.');
             const result = await response.json();
             if (result.success && result.data) {
                setStaff(result.data);
                await fetchPerformanceRecords({ month: '', year: new Date().getFullYear(), staffId: staffIdFromQuery });
             } else {
                throw new Error(result.error || 'Staff member not found.');
             }
        }

      } catch (err: any) {
        setError(err.message);
        setStaff(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaffDetails();
  }, [staffIdFromQuery, getStaffById, fetchPerformanceRecords]);


  useEffect(() => {
    if (staff && attendanceRecordsFE) {
      const filteredAttendance = (attendanceRecordsFE || [])
        .filter((record: AttendanceRecord) => record.staff.id === staff.id)
        .sort((a: AttendanceRecord, b: AttendanceRecord) => b.date.getTime() - a.date.getTime())
        .slice(0, 7);
      setStaffAttendance(filteredAttendance);
    }
  }, [staff, attendanceRecordsFE]);


  if (isLoading) return <div className="p-6 text-center">Loading staff details...</div>;
  if (error && !staff) return <div className="p-6 text-center"><p className="text-red-500">{error}</p><Button variant="black" onClick={() => router.push('/staffmanagement/staff/stafflist')} className="mt-4">Back to List</Button></div>;
  if (!staff) return <div className="flex flex-col items-center justify-center min-h-[60vh] p-4"><h2 className="text-xl font-bold text-gray-800 mb-2">Staff Not Found</h2><p className="text-gray-600 mb-6 text-center">ID: {staffIdFromQuery || 'N/A'}</p><Button variant="black" onClick={() => router.push('/staffmanagement/staff/stafflist')}>Back to List</Button></div>;

  const latestPerformance: PerformanceRecord | undefined = (performanceRecords || [])
    .filter((record: PerformanceRecord) => record.staffId.id === staff.id)
    .sort((a: PerformanceRecord, b: PerformanceRecord) => {
      const monthIndexA = new Date(Date.parse(a.month +" 1, 2000")).getMonth();
      const monthIndexB = new Date(Date.parse(b.month +" 1, 2000")).getMonth();
      const dateA = new Date(a.year, monthIndexA);
      const dateB = new Date(b.year, monthIndexB);
      return dateB.getTime() - dateA.getTime();
    })[0];

  const lastSevenDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return startOfDay(date);
  }).reverse();

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      <DocumentViewerModal 
        src={viewingDocument.src}
        title={viewingDocument.title}
        onClose={() => setViewingDocument({ src: null, title: '' })}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.push('/staffmanagement/staff/stafflist')} className="mr-4">Back</Button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Staff Details</h1>
        </div>
        <Button variant="black" icon={<Edit size={16} />} onClick={() => router.push(`/staffmanagement/staff/editstaff?staffId=${staff.id}`)} className="mt-4 md:mt-0">Edit Profile</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 self-start pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <img src={staff.image || DEFAULT_STAFF_AVATAR} alt={staff.name} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"/>
              <span className={`absolute bottom-1 right-4 w-5 h-5 rounded-full border-2 border-white ${staff.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} title={staff.status}></span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{staff.name}</h2>
            <p className="text-gray-600 mb-4">{staff.position}</p>
            <div className="w-full border-t border-gray-200 my-4"></div>
            <div className="w-full space-y-3 text-left px-4 text-sm">
              <div className="flex items-start">
                <Badge className="h-5 w-5 text-gray-500 mr-3 mt-0.5 shrink-0" />
                <span className="text-gray-700 font-medium">ID: {staff.staffIdNumber}</span>
              </div>
              <div className="flex items-start"><Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5 shrink-0" /><span className="text-gray-700 break-all">{staff.phone}</span></div>
              <div className="flex items-start"><Mail className="h-5 w-5 text-gray-500 mr-3 mt-0.5 shrink-0" /><span className="text-gray-700 break-all">{staff.email}</span></div>
              <div className="flex items-start"><MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5 shrink-0" /><span className="text-gray-700">{staff.address || 'N/A'}</span></div>
              <div className="flex items-start"><CalendarIcon className="h-5 w-5 text-gray-500 mr-3 mt-0.5 shrink-0" /><span className="text-gray-700">Joined {staff.joinDate ? format(parseISO(staff.joinDate), 'MMMM d, yyyy') : 'N/A'}</span></div>
              <div className="flex items-start"><DollarSign className="h-5 w-5 text-gray-500 mr-3 mt-0.5 shrink-0" /><span className="text-gray-700">₹{staff.salary.toLocaleString()} monthly</span></div>
              {staff.aadharNumber && (<div className="flex items-start"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-3 mt-0.5 shrink-0"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><circle cx="9" cy="10" r="1"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg><span className="text-gray-700">Aadhar: {staff.aadharNumber}</span></div>)}
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
           <Card title="Recent Attendance (Last 7 Days)">
            <div>
              {staffAttendance.length > 0 || lastSevenDays.some(day => isWeekend(day)) ? (
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-2">
                  {lastSevenDays.map((targetDay) => {
                    const attendance = staffAttendance.find((a: AttendanceRecord) => {
                        return isEqual(startOfDay(a.date), targetDay);
                    });

                    let bgColor = 'bg-gray-100';
                    let icon = <XCircle className="h-5 w-5 text-gray-400 mt-1" />;
                    let statusText = 'No record';

                    if (attendance) {
                        statusText = attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1).replace('_',' ');
                        if ((attendance.status === 'present' || attendance.status === 'incomplete')) {
                            if (attendance.isWorkComplete) {
                                bgColor = 'bg-green-100'; icon = <CheckCircle className="h-5 w-5 text-green-500 mt-1" />;
                            } else {
                                bgColor = 'bg-orange-100'; icon = <CheckCircle className="h-5 w-5 text-orange-500 mt-1" />;
                            }
                        }
                        else if (attendance.status === 'late') { bgColor = 'bg-yellow-100'; icon = <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />; }
                        else if (attendance.status === 'absent') { bgColor = 'bg-red-100'; icon = <XCircle className="h-5 w-5 text-red-500 mt-1" />; }
                        else if (attendance.status === 'on_leave') { bgColor = 'bg-blue-100'; icon = <CalendarIcon className="h-5 w-5 text-blue-500 mt-1" />; }
                    } else if (isWeekend(targetDay)) {
                        statusText = 'Weekend';
                        bgColor = 'bg-gray-50';
                        icon = <span className="block h-1 w-4 bg-gray-300 rounded-sm mt-1.5" />;
                    }

                    return (
                      <div key={format(targetDay, 'yyyy-MM-dd')}
                        className={`flex-shrink-0 min-w-[64px] h-24 rounded-lg flex flex-col items-center justify-center p-1 ${bgColor}`}
                        title={`${format(targetDay, 'EEE, MMM d')}: ${statusText}`}>
                        <p className="text-xs text-gray-500">{format(targetDay, 'EEE')}</p>
                        <p className="text-lg font-semibold text-gray-700">{format(targetDay, 'd')}</p>
                        {icon}
                      </div>);
                  })}
                </div>
              ) : (<p className="text-sm text-gray-500 text-center py-4">No recent attendance data for this staff.</p>)}
              <div className="flex justify-end items-center mt-2">
                <Link href={`/staffmanagement/attendance?staffId=${staff.id}`} className="text-sm text-black hover:text-gray-700 font-medium">View Full History</Link>
              </div>
            </div>
          </Card>
          
          <Card title="Documents">
             <div className="space-y-3">
               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                 <div className="flex items-center gap-3">
                   <ShieldCheck className="h-6 w-6 text-gray-500" />
                   <span className="font-medium text-gray-700">Aadhar Card</span>
                 </div>
                 {staff.aadharImage ? (
                   <Button variant="outline" size="sm" icon={<Eye size={14}/>} onClick={() => setViewingDocument({ src: staff.aadharImage!, title: 'Aadhar Card' })}>
                     View
                   </Button>
                 ) : <span className="text-sm text-gray-400">Not Uploaded</span>}
               </div>
               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                 <div className="flex items-center gap-3">
                   <Banknote className="h-6 w-6 text-gray-500" />
                   <span className="font-medium text-gray-700">Bank Passbook</span>
                 </div>
                 {staff.passbookImage ? (
                   <Button variant="outline" size="sm" icon={<Eye size={14}/>} onClick={() => setViewingDocument({ src: staff.passbookImage!, title: 'Bank Passbook' })}>
                     View
                   </Button>
                 ) : <span className="text-sm text-gray-400">Not Uploaded</span>}
               </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                 <div className="flex items-center gap-3">
                   <FileText className="h-6 w-6 text-gray-500" />
                   <span className="font-medium text-gray-700">Agreement</span>
                 </div>
                 {staff.agreementImage ? (
                   <Button variant="outline" size="sm" icon={<Eye size={14}/>} onClick={() => setViewingDocument({ src: staff.agreementImage!, title: 'Agreement' })}>
                     View
                   </Button>
                 ) : <span className="text-sm text-gray-400">Not Uploaded</span>}
               </div>
             </div>
          </Card>

          <Card title="Performance Overview">
            {latestPerformance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-xs text-gray-500 uppercase mb-1">Rating</p><p className="text-2xl font-bold text-gray-800">{latestPerformance.rating}/10</p></div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-xs text-gray-500 uppercase mb-1">Customers</p><p className="text-2xl font-bold text-gray-800">{latestPerformance.metrics.customersServed}</p></div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-xs text-gray-500 uppercase mb-1">Sales</p><p className="text-2xl font-bold text-gray-800">₹{latestPerformance.metrics.salesGenerated.toLocaleString()}</p></div>
                </div>
                {latestPerformance.comments && (<div><p className="text-sm text-gray-600 mb-1 font-medium">Comments:</p><p className="text-sm bg-gray-50 p-3 rounded-md whitespace-pre-wrap border border-gray-200">{latestPerformance.comments}</p></div>)}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-4">
                  <div className="flex items-center text-sm text-gray-500"><CalendarClock className="h-4 w-4 mr-1.5 shrink-0" /><span>{format(new Date(latestPerformance.year, new Date(Date.parse(latestPerformance.month +" 1, 2000")).getMonth()), 'MMMM yyyy')}</span></div>
                  <Link href={`/staffmanagement/performance?staffId=${staff.id}`} className="text-sm text-black hover:text-gray-700 font-medium flex items-center"><span>Full History</span><BarChart3 className="ml-1.5 h-4 w-4 shrink-0" /></Link>
                </div>
              </div>
            ) : (<div className="text-center py-8"><BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No performance data.</p><Link href={`/staffmanagement/performance/add?staffId=${staff.id}`} className="mt-3 inline-block text-sm text-black hover:text-gray-700 font-medium">Add Record</Link></div>)}
          </Card>
        </div>
      </div>
    </div>
  );
};

const StaffDetailsPage: React.FC = () => {
  return (
    <Suspense fallback={<div className="p-6 text-center text-lg font-semibold">Loading staff details...</div>}>
      <StaffDetailsContent />
    </Suspense>
  );
};

export default StaffDetailsPage;