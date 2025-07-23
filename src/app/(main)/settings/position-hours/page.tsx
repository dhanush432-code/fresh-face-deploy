"use client";

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Briefcase, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Info 
} from 'lucide-react';
import Button from '../../../../components/ui/Button'; // Assuming this is your custom button

// --- Data Interface ---
interface PositionHourSetting {
  positionName: string;
  requiredHours: number | ''; 
}


// --- Reusable UI Components (No changes here) ---

const PositionCard = ({ 
  positionName, 
  requiredHours, 
  onHourChange, 
  isSaving 
}: { 
  positionName: string; 
  requiredHours: number | ''; 
  onHourChange: (e: ChangeEvent<HTMLInputElement>) => void; 
  isSaving: boolean;
}) => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200/80 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 flex flex-col">
    <div className="border-t-4 border-indigo-500"></div>
    
    <div className="p-6 flex-grow">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-full">
          <Briefcase className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-800">{positionName}</h3>
          <p className="text-sm text-gray-500">Required monthly hours</p>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-md p-4">
        <label htmlFor={`hours-${positionName}`} className="block text-sm font-medium text-gray-600 mb-2">
          Set Hours
        </label>
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-gray-400" />
          <input
            id={`hours-${positionName}`}
            type="number"
            value={requiredHours} 
            onChange={onHourChange}
            min="0"
            placeholder="-"
            step="1"
            disabled={isSaving}
            className="w-full rounded-md border-gray-300 bg-white px-3 py-2 text-right text-lg font-semibold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-500 font-medium whitespace-nowrap">/ month</span>
        </div>
      </div>
    </div>
  </div>
);

const StateInfoCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-lg shadow-sm p-8 text-center border">
    <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {icon}
    </div>
    <h3 className="mt-5 text-xl font-semibold text-gray-900">{title}</h3>
    <div className="mt-2 text-base text-gray-500">
      {children}
    </div>
  </div>
);


// --- Main Page Component ---
const PositionHoursSettingsPage: React.FC = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<PositionHourSetting[]>([]);
  const [initialSettings, setInitialSettings] = useState<PositionHourSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        const response = await fetch('/api/settings/position-hours');
        if (!response.ok) throw new Error('Failed to fetch settings from the server.');
        
        const result = await response.json();
        if (result.success) {
          const sortedData = result.data.sort((a: any, b: any) => a.positionName.localeCompare(b.positionName));
          setSettings(sortedData);
          setInitialSettings(JSON.parse(JSON.stringify(sortedData)));
        } else {
          throw new Error(result.error || 'Could not retrieve settings.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleHourChange = (e: ChangeEvent<HTMLInputElement>, positionName: string) => {
    const value = e.target.value;
    setSettings(currentSettings =>
      currentSettings.map(setting => {
        if (setting.positionName === positionName) {
          return { ...setting, requiredHours: value === '' ? '' : Number(value) };
        }
        return setting;
      })
    );
  };
  
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  // --- MODIFIED: The fix is in this function ---
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const settingsToSave = settings.map(setting => ({
        ...setting,
        requiredHours: setting.requiredHours === '' ? 0 : setting.requiredHours,
      }));

      const response = await fetch('/api/settings/position-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // *** FIX: Send the array directly, not nested in an object ***
        body: JSON.stringify(settingsToSave),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save settings.');
      }
      
      setSettings(settingsToSave);
      setInitialSettings(JSON.parse(JSON.stringify(settingsToSave)));

    } catch (err: any)      {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDiscard = () => {
    setSettings(JSON.parse(JSON.stringify(initialSettings)));
    setError(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <StateInfoCard icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Loading Settings...">
          <p>Fetching the latest position hour configurations.</p>
        </StateInfoCard>
      );
    }

    if (error) {
      return (
        <StateInfoCard icon={<AlertCircle className="h-8 w-8 text-red-500" />} title="An Error Occurred">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                Try Again
            </Button>
        </StateInfoCard>
      );
    }

    if (settings.length === 0) {
      return (
        <StateInfoCard icon={<Briefcase className="h-8 w-8" />} title="No Positions Found">
          <p>
            You can add new positions through the staff management section.
          </p>
        </StateInfoCard>
      );
    }

    return settings.map((setting) => (
      <PositionCard
        key={setting.positionName}
        positionName={setting.positionName}
        requiredHours={setting.requiredHours}
        onHourChange={(e) => handleHourChange(e, setting.positionName)}
        isSaving={isSaving}
      />
    ));
  };


  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="flex items-center mb-8 pb-6 border-b border-gray-200">
            <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => router.back()} className="mr-5">
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Monthly Position Hours</h1>
              <p className="text-base text-gray-500 mt-1">Set the default required work hours for each staff position.</p>
            </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderContent()}
        </main>
      </div>

      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg-top z-50">
          <div className="max-w-7xl mx-auto p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="h-6 w-6 text-indigo-500" />
              <p className="font-semibold text-gray-800">You have unsaved changes.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
                Discard
              </Button>
              <Button 
                variant="black" 
                icon={<Save size={16} />} 
                onClick={handleSave}
                disabled={isSaving}
                isLoading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionHoursSettingsPage;