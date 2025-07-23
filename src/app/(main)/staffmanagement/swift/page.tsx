// /src/app/(main)/staffmanagement/swift/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, Save, Loader2, AlertCircle, Edit, XCircle, User, CalendarDays, Search, Moon } from 'lucide-react';
import Button from '@/components/ui/Button';

// --- TYPE DEFINITIONS ---
interface StaffMember {
  _id: string;
  staffIdNumber: string;
  name: string;
  status: 'active' | 'inactive';
}

interface Shift {
  _id?: string;
  employeeId: string;
  date: string;
  isWeekOff: boolean;
  shiftTiming: string;
}

type ShiftScheduleState = Record<string, Record<string, Shift>>;

interface StaffShiftCardProps {
  staff: StaffMember;
  weekDays: Date[];
  shifts: Record<string, Shift> | null;
  isEditing: boolean;
  isSaving: boolean;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onTempChange: (date: string, field: 'shiftTiming' | 'isWeekOff', value: any) => void;
}

// --- HELPER FUNCTIONS (Unchanged) ---
const getWeekDateRange = (date: Date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1));
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { startDate: start, endDate: end };
};

const getDaysOfWeek = (startDate: Date) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
};

const parseShiftTiming = (timing: string) => {
    if (!timing || !timing.includes('-')) {
        return { startTime: '', startPeriod: 'AM' as const, endTime: '', endPeriod: 'PM' as const };
    }
    const [startStr, endStr] = timing.split('-').map(s => s.trim());
    const parsePart = (part: string, defaultPeriod: 'AM' | 'PM') => {
        if (!part) return { time: '', period: defaultPeriod };
        const match = part.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)?/i);
        if (!match) return { time: '', period: defaultPeriod };
        const time = match[1] || '';
        let period: 'AM' | 'PM' = defaultPeriod;
        const periodStr = match[2]?.toUpperCase();
        if (periodStr === 'AM' || periodStr === 'PM') {
            period = periodStr; 
        }
        return { time, period };
    };
    const { time: startTime, period: startPeriod } = parsePart(startStr, 'AM');
    const { time: endTime, period: endPeriod } = parsePart(endStr, 'PM');
    return { startTime, startPeriod, endTime, endPeriod };
};

const nameToColor = (name: string) => {
  const colors = [
    'bg-orange-200 text-orange-800', 'bg-green-200 text-green-800', 'bg-purple-200 text-purple-800',
    'bg-blue-200 text-blue-800', 'bg-red-200 text-red-800', 'bg-teal-200 text-teal-800',
    'bg-yellow-200 text-yellow-800', 'bg-pink-200 text-pink-800', 'bg-cyan-200 text-cyan-800',
    'bg-indigo-200 text-indigo-800',
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const colorClasses = nameToColor(name);
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${colorClasses}`}>
      {initials || <User size={20}/>}
    </div>
  );
};

// --- Shift Day Cell Component ---
interface ShiftDayCellProps {
  day: Date;
  shift: Shift;
  isEditing: boolean;
  onTempChange: (date: string, field: 'shiftTiming' | 'isWeekOff', value: any) => void;
}

const ShiftDayCell: React.FC<ShiftDayCellProps> = ({ day, shift, isEditing, onTempChange }) => {
  const [startTime, setStartTime] = useState('');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');
  const [endTime, setEndTime] = useState('');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('PM');
  const endTimeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      const { startTime, startPeriod, endTime, endPeriod } = parseShiftTiming(shift.shiftTiming);
      setStartTime(startTime);
      setStartPeriod(startPeriod);
      setEndTime(endTime);
      setEndPeriod(endPeriod);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      const newShiftTiming = (startTime || endTime) 
        ? `${startTime} ${startPeriod} - ${endTime} ${endPeriod}`
        : '';
      if(newShiftTiming !== shift.shiftTiming) {
        onTempChange(day.toISOString().split('T')[0], 'shiftTiming', newShiftTiming);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, startPeriod, endTime, endPeriod]);

  // --- THE FIX: Updated auto-focus logic ---
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartTime(value);

    // Jump focus ONLY if two digits are entered OR if a colon is used.
    // This prevents jumping after a single digit like "9".
    if (value.length >= 2 || value.includes(':')) {
      endTimeRef.current?.focus();
    }
  };

  if (!shift) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border bg-gray-50 min-h-[120px]">
        <Loader2 className="animate-spin text-gray-400" size={20} />
      </div>
    );
  }

  const dateStr = day.toISOString().split('T')[0];
  const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
  const dayOfMonth = day.getDate();

  const AmPmButton = ({ period, selected, onClick }: { period: 'AM' | 'PM', selected: boolean, onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-1/2 py-1 text-xs font-semibold rounded-md transition-colors ${
        selected 
          ? 'bg-black text-white' 
          : 'bg-white text-black hover:bg-gray-100'
      }`}
    >
      {period}
    </button>
  );

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border bg-white min-h-[120px] transition-all">
      <div className="flex justify-between items-center">
        <span className="font-bold text-black">{dayName}</span>
        <span className="text-sm font-semibold text-gray-500 bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center">{dayOfMonth}</span>
      </div>
      <div className="flex-grow flex items-center justify-center">
        {isEditing ? (
          <div className="w-full space-y-2">
            <fieldset disabled={shift.isWeekOff} className="space-y-2 group">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Start"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  className="w-full p-1.5 text-center border-gray-300 border rounded-md text-sm focus:ring-2 focus:ring-black focus:border-black group-disabled:bg-gray-100 group-disabled:cursor-not-allowed"
                />
                <div className="flex w-16 shrink-0 rounded-md border border-gray-300 bg-gray-200 p-0.5">
                  <AmPmButton period="AM" selected={startPeriod === 'AM'} onClick={() => setStartPeriod('AM')} />
                  <AmPmButton period="PM" selected={startPeriod === 'PM'} onClick={() => setStartPeriod('PM')} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <input
                  ref={endTimeRef}
                  type="text"
                  placeholder="End"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-1.5 text-center border-gray-300 border rounded-md text-sm focus:ring-2 focus:ring-black focus:border-black group-disabled:bg-gray-100 group-disabled:cursor-not-allowed"
                />
                 <div className="flex w-16 shrink-0 rounded-md border border-gray-300 bg-gray-200 p-0.5">
                  <AmPmButton period="AM" selected={endPeriod === 'AM'} onClick={() => setEndPeriod('AM')} />
                  <AmPmButton period="PM" selected={endPeriod === 'PM'} onClick={() => setEndPeriod('PM')} />
                </div>
              </div>
            </fieldset>
            <button
              onClick={() => onTempChange(dateStr, 'isWeekOff', !shift.isWeekOff)}
              className={`w-full py-1 px-2 text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors ${shift.isWeekOff ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              <Moon size={12} /> {shift.isWeekOff ? 'Day Off' : 'Set as Off'}
            </button>
          </div>
        ) : (
          <div className="text-center font-semibold">
            {shift.isWeekOff ? (
              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-sm">
                <Moon size={14} /> OFF
              </span>
            ) : shift.shiftTiming ? (
              <span className="text-black text-lg">{shift.shiftTiming}</span>
            ) : (
              <span className="text-gray-400 text-lg">--</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- StaffShiftCard Component ---
const StaffShiftCard: React.FC<StaffShiftCardProps> = React.memo(({ staff, weekDays, shifts, isEditing, isSaving, canEdit, onEdit, onCancel, onSave, onTempChange }) => {
  if (!shifts) return null;
  const blackButtonClasses = "inline-flex items-center justify-center h-9 px-3 rounded-md text-sm font-medium bg-black text-white hover:bg-black/90 disabled:pointer-events-none disabled:opacity-50 transition-colors";
  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden border border-gray-200/80">
      <div className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isEditing ? 'bg-gray-100' : 'bg-white'} border-b border-gray-200/80`}>
        <div className="flex items-center gap-4">
          <Avatar name={staff.name} />
          <div>
            <h3 className="font-bold text-lg text-black">{staff.name}</h3>
            <p className="text-sm text-gray-500">ID: {staff.staffIdNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={onSave} disabled={isSaving} className={blackButtonClasses}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={16} className="mr-2 h-4 w-4" />}
                Save Changes
              </button>
              <Button variant="ghost" size="sm" icon={<XCircle size={16} />} onClick={onCancel} disabled={isSaving} className="text-red-600 hover:bg-red-50 hover:text-red-700">Cancel</Button>
            </>
          ) : (
            <button onClick={() => onEdit(staff._id)} disabled={!canEdit} className={blackButtonClasses}>
              <Edit size={16} className="mr-2 h-4 w-4" />
              Edit Shifts
            </button>
          )}
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 bg-gray-50">
        {weekDays.map((day: Date) => (
          <ShiftDayCell
            key={day.toISOString()}
            day={day}
            shift={shifts[day.toISOString().split('T')[0]]}
            isEditing={isEditing}
            onTempChange={onTempChange}
          />
        ))}
      </div>
    </div>
  );
});
StaffShiftCard.displayName = 'StaffShiftCard';

// --- MAIN COMPONENT ---
export default function ShiftManagementPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<ShiftScheduleState>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [tempRowData, setTempRowData] = useState<Record<string, Shift> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { startDate, endDate } = useMemo(() => getWeekDateRange(currentDate), [currentDate]);
  const weekDays = useMemo(() => getDaysOfWeek(startDate), [startDate]);

  const fetchData = useCallback(async () => {
    if (!staffList.length) setIsLoading(true);
    setError(null);
    setEditingRowId(null);
    try {
      const staffResponse = await fetch('/api/staff?action=list');
      if (!staffResponse.ok) throw new Error('Failed to fetch staff list');
      const staffData = await staffResponse.json();
      const activeStaff: StaffMember[] = staffData.data.filter((s: StaffMember) => s.status === 'active');
      setStaffList(activeStaff);

      const { startDate: weekStart, endDate: weekEnd } = getWeekDateRange(currentDate);
      const shiftResponse = await fetch(`/api/shifts?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`);
      if (!shiftResponse.ok) throw new Error('Failed to fetch shift data');
      const shiftData = await shiftResponse.json();
      
      const currentWeekDays = getDaysOfWeek(weekStart);
      const schedule: ShiftScheduleState = {};
      activeStaff.forEach(staff => {
        schedule[staff._id] = {};
        currentWeekDays.forEach(day => {
          const dateStr = day.toISOString().split('T')[0];
          const existingShift = shiftData.data?.find(
            (s: any) => s.employeeId === staff._id && s.date.startsWith(dateStr)
          );
          schedule[staff._id][dateStr] = existingShift || {
            employeeId: staff._id,
            date: day.toISOString(),
            isWeekOff: false,
            shiftTiming: '',
          };
        });
      });
      setShifts(schedule);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, staffList.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredStaffList = useMemo(() => {
    if (!searchQuery) {
        return staffList;
    }
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    return staffList.filter(staff =>
        staff.name?.toLowerCase().includes(lowercasedQuery) ||
        staff.staffIdNumber?.toLowerCase().includes(lowercasedQuery)
    );
  }, [staffList, searchQuery]);

  const handleEditStart = (employeeId: string) => {
    setEditingRowId(employeeId);
    setTempRowData(JSON.parse(JSON.stringify(shifts[employeeId])));
  };

  const handleCancelClick = () => {
    setEditingRowId(null);
    setTempRowData(null);
  };
  
  const handleTempRowChange = (date: string, field: 'shiftTiming' | 'isWeekOff', value: string | boolean) => {
    if (!tempRowData) return;
    const newRowData = { ...tempRowData };
    newRowData[date] = { ...newRowData[date], [field]: value };
    if (field === 'isWeekOff' && value === true) {
      newRowData[date].shiftTiming = '';
    }
    setTempRowData(newRowData);
  };

  const handleSaveRow = async () => {
    if (!editingRowId || !tempRowData) return;
    setIsSaving(true);
    setError(null);
    const payload: Shift[] = Object.values(tempRowData);
    try {
        const response = await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to save changes.');
        }
        await fetchData();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSaving(false);
        setEditingRowId(null);
        setTempRowData(null);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-black">Shift Management</h1>
          <p className="text-gray-500 mt-1">Assign and manage weekly shifts for your active staff.</p>
        </header>
        
        <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-sm pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
        </div>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-center gap-3">
            <AlertCircle size={20} /> <div><strong className="font-bold">Error:</strong> {error}</div>
          </div>
        )}
        <main>
          {isLoading ? (
            <div className="text-center p-16 bg-white rounded-xl">
              <div className="flex justify-center items-center gap-3 text-gray-500 text-lg">
                <Loader2 className="animate-spin" size={24} /> Loading Schedule...
              </div>
            </div>
          ) : filteredStaffList.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold text-black">{searchQuery ? 'No Staff Found' : 'No Active Staff'}</h3>
              <p className="text-gray-500 mt-2">
                {searchQuery ? `No staff member matches "${searchQuery}". Try a different search.` : 'Please add staff members to the system.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredStaffList.map(staff => (
                <StaffShiftCard
                  key={staff._id}
                  staff={staff}
                  weekDays={weekDays}
                  shifts={editingRowId === staff._id ? tempRowData : shifts[staff._id]}
                  isEditing={editingRowId === staff._id}
                  isSaving={isSaving && editingRowId === staff._id}
                  canEdit={editingRowId === null}
                  onEdit={handleEditStart}
                  onCancel={handleCancelClick}
                  onSave={handleSaveRow}
                  onTempChange={handleTempRowChange}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}