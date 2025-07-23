// src/app/(main)/settings/staffid/page.tsx

"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Save, Settings as SettingsIcon, Badge } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { IShopSetting } from '../../../../models/ShopSetting';
import { Document } from 'mongoose';

type SettingsFormData = Omit<IShopSetting, keyof Document | 'key'>;

const StaffIdSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Partial<SettingsFormData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- THIS IS THE FIX ---
        // Add { cache: 'no-store' } to force a fresh request every time.
        const response = await fetch('/api/settings/staffid', { cache: 'no-store' });
        
        if (!response.ok) throw new Error('Failed to fetch settings data.');
        const result = await response.json();
        if (result.success) {
          setSettings(result.data);
        } else {
          throw new Error(result.error || 'An unknown error occurred.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // ... (the rest of your component remains the same)
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/settings/staffid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffIdBaseNumber: settings.staffIdBaseNumber
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save settings.');
      }
      
      setSuccessMessage('Settings saved successfully!');
      setSettings(result.data); 
    } catch (err: any)      {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-7 w-7 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-800">Staff ID Settings</h1>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
          <p>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Staff Configuration</h2>
          
          <div>
            <label htmlFor="staffIdBaseNumber" className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Badge size={16} />
                <span>Staff ID Start Number</span>
              </div>
            </label>
            <input
              id="staffIdBaseNumber"
              name="staffIdBaseNumber"
              type="number"
              value={settings.staffIdBaseNumber || ''}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black disabled:bg-gray-100"
              disabled={isSaving}
              placeholder="e.g., 4101"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Set the number for the next new staff member if no staff exist or if existing IDs are lower than this number.
            </p>
          </div>
          
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            type="submit"
            variant="black"
            icon={<Save size={16} />}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StaffIdSettingsPage;