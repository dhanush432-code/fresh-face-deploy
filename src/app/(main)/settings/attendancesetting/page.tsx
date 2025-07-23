'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

// --- Types ---
interface IPositionRateSetting {
    positionName: string;
    otRate: number;
    extraDayRate: number;
}
interface AttendanceSettings {
    defaultDailyHours: number;
    positionRates: IPositionRateSetting[];
}

// --- Reusable UI Components ---
const Button = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        className={`inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
    >
        {children}
    </button>
);

const InputField = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-gray-900 disabled:bg-gray-100"
    />
);

// --- MODAL for Adding/Editing Position Rates ---
const PositionRateModal = ({
    isOpen,
    onClose,
    onSave,
    positions,
    existingRates,
    editingRate,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rate: IPositionRateSetting) => void;
    positions: string[];
    existingRates: IPositionRateSetting[];
    editingRate: IPositionRateSetting | null;
}) => {
    // --- MODIFIED: State for rate fields will now be 'string' to avoid type errors on input.
    const [rateData, setRateData] = useState<{
        positionName: string;
        otRate: string;
        extraDayRate: string;
    }>({ positionName: '', otRate: '', extraDayRate: '' });

    // --- MODIFIED: useEffect now converts incoming numbers to strings for the form state.
    useEffect(() => {
        if (!isOpen) return;

        if (editingRate) {
            // If editing, convert the numbers to strings to populate the form state.
            setRateData({
                positionName: editingRate.positionName,
                otRate: String(editingRate.otRate),
                extraDayRate: String(editingRate.extraDayRate),
            });
        } else {
            // If adding, initialize with empty strings.
            const availablePosition = positions.find(p => !existingRates.some(r => r.positionName === p));
            setRateData({
                positionName: availablePosition || '',
                otRate: '',
                extraDayRate: ''
            });
        }
    }, [isOpen, editingRate, positions, existingRates]);

    if (!isOpen) return null;

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        // Convert the string state back to numbers on save.
        onSave({
            positionName: rateData.positionName,
            otRate: Number(rateData.otRate) || 0,
            extraDayRate: Number(rateData.extraDayRate) || 0,
        });
    };

    const availablePositions = positions.filter(p =>
        !existingRates.some(r => r.positionName === p) || p === editingRate?.positionName
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900">{editingRate ? 'Edit' : 'Add'} Position Rate</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="positionName" className="block text-sm font-medium text-gray-700">Position</label>
                                <select
                                    id="positionName"
                                    value={rateData.positionName}
                                    onChange={(e) => setRateData({ ...rateData, positionName: e.target.value })}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-gray-900"
                                    disabled={!!editingRate}
                                >
                                    <option value="">Select a position</option>
                                    {availablePositions.map(p => <option key={p} value={p}>{p}</option>)}
                                    {editingRate && !availablePositions.includes(editingRate.positionName) && <option value={editingRate.positionName}>{editingRate.positionName}</option>}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="modalOtRate" className="block text-sm font-medium text-gray-700">OT Rate per Hour (₹)</label>
                                {/* This now works without error because e.target.value (string) matches the state type (string) */}
                                <InputField type="number" id="modalOtRate" value={rateData.otRate} onChange={(e) => setRateData({ ...rateData, otRate: e.target.value })} min="0" />
                            </div>
                            <div>
                                <label htmlFor="modalExtraDayRate" className="block text-sm font-medium text-gray-700">Extra Day Rate (₹)</label>
                                {/* This now works without error because e.target.value (string) matches the state type (string) */}
                                <InputField type="number" id="modalExtraDayRate" value={rateData.extraDayRate} onChange={(e) => setRateData({ ...rateData, extraDayRate: e.target.value })} min="0" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                        <Button type="button" className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-black hover:bg-gray-800 focus:ring-gray-500" disabled={!rateData.positionName}>Save</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AttendanceSettingsForm: React.FC = () => {
    const [settings, setSettings] = useState<AttendanceSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [allPositions, setAllPositions] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRate, setEditingRate] = useState<IPositionRateSetting | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/settings');
                const result = await response.json();
                
                if (result.success) {
                    setSettings({
                        defaultDailyHours: result.data.settings.defaultDailyHours ?? 0,
                        positionRates: result.data.settings.positionRates || [],
                    });
                    setAllPositions(result.data.positions || []);
                } else {
                     throw new Error(result.error || "Failed to fetch settings");
                }
            } catch (error) {
                console.error("An error occurred while fetching initial data:", error);
                 alert(`Error: ${error instanceof Error ? error.message : "Could not load settings from server."}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (settings) {
            setSettings({ ...settings, [e.target.name]: e.target.valueAsNumber || 0 });
        }
    };

    const handleSavePositionRate = (rateToSave: IPositionRateSetting) => {
        if (!settings) return;
        
        let updatedRates;
        const existingIndex = settings.positionRates.findIndex(r => r.positionName === rateToSave.positionName);

        if (existingIndex > -1) {
            updatedRates = [...settings.positionRates];
            updatedRates[existingIndex] = rateToSave;
        } else {
            updatedRates = [...settings.positionRates, rateToSave];
        }

        setSettings({ ...settings, positionRates: updatedRates });
        setIsModalOpen(false);
        setEditingRate(null);
    };

    const handleDeletePositionRate = (positionNameToDelete: string) => {
        if (settings && window.confirm(`Are you sure you want to remove the specific rate for ${positionNameToDelete}?`)) {
            const updatedRates = settings.positionRates.filter(r => r.positionName !== positionNameToDelete);
            setSettings({ ...settings, positionRates: updatedRates });
        }
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setIsSaving(true);
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const result = await response.json();
            if (result.success) {
                alert("Attendance settings saved successfully!");
            } else {
                throw new Error(result.error || "Failed to save settings");
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            alert(`Error: ${error instanceof Error ? error.message : "An unexpected error occurred."}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !settings) {
        return <div className="text-center p-8">Loading settings...</div>;
    }

    return (
        <div>
            <PositionRateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePositionRate}
                positions={allPositions}
                existingRates={settings.positionRates}
                editingRate={editingRate}
            />

            <h2 className="text-xl font-semibold text-gray-900 mb-2">Attendance Requirements</h2>
            <p className="text-sm text-gray-600 mb-8">Set defaults and position-specific rates for salary calculations.</p>
            
            <form onSubmit={handleSubmit} className="space-y-12">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Default Settings</h3>
                    <p className="text-xs text-gray-500 mt-1 mb-4">This value is used as the standard working hours for all positions.</p>
                    <div className="max-w-md space-y-6">
                        <div>
                            <label htmlFor="defaultDailyHours" className="block text-sm font-medium text-gray-700">Default Daily Working Hours</label>
                            <InputField 
                                type="number" 
                                id="defaultDailyHours" 
                                name="defaultDailyHours" 
                                value={settings.defaultDailyHours === 0 ? '' : settings.defaultDailyHours} 
                                onChange={handleChange} 
                                min="0" 
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center">
                        <div>
                           <h3 className="text-lg font-medium text-gray-900">Position-Specific Rates</h3>
                           <p className="text-xs text-gray-500 mt-1">Set specific OT and Extra Day rates for different job roles.</p>
                        </div>
                        <Button
                            type="button"
                            className="bg-gray-700 hover:bg-gray-800 focus:ring-gray-600 text-xs"
                            onClick={() => { setEditingRate(null); setIsModalOpen(true); }}
                        >
                            <PlusCircle size={16} className="mr-2" />
                            Add Position Rate
                        </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                        {settings.positionRates.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-md">
                                <p className="text-sm text-gray-500">No position-specific rates have been set.</p>
                            </div>
                        ) : (
                            settings.positionRates.map((rate) => (
                                <div key={rate.positionName} className="p-4 bg-gray-50 rounded-md border border-gray-200 flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800">{rate.positionName}</p>
                                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                            <span>OT: ₹{rate.otRate}/hr</span>
                                            <span>Extra Day: ₹{rate.extraDayRate}/day</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button type="button" onClick={() => { setEditingRate(rate); setIsModalOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 transition-colors" title="Edit Rate"><Edit size={16} /></button>
                                        <button type="button" onClick={() => handleDeletePositionRate(rate.positionName)} className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Delete Rate"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                
                <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end">
                    <Button type="submit" disabled={isSaving || isLoading} className="bg-black hover:bg-gray-800 focus:ring-gray-500">
                        {isSaving ? 'Saving...' : 'Save All Settings'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

// --- Main Page Component ---
const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('attendance');
    const settingsTabs = [
        { id: 'attendance', label: 'Attendance & Salary' },
        { id: 'billing', label: 'Billing', disabled: true },
        { id: 'integrations', label: 'Integrations', disabled: true },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'attendance': return <AttendanceSettingsForm />;
            default: return <div>Coming Soon</div>;
        }
    };

    return (
        <div className="bg-white">
          <div className="flex flex-col md:flex-row min-h-screen">
            <aside className="w-full md:w-[240px] border-b md:border-b-0 md:border-r border-gray-200 flex-shrink-0">
              <div className="p-4">
                <ul className="space-y-1">
                  {settingsTabs.map(tab => (
                    <li key={tab.id}>
                      <button
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={`w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${activeTab === tab.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'} ${tab.disabled ? 'text-gray-400 cursor-not-allowed hover:bg-transparent' : ''}`}
                      >
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
            <main className="w-full">
              <div className="p-6 md:p-8 h-full">
                {renderContent()}
              </div>
            </main>
          </div>
        </div>
    );
};

export default SettingsPage;