// /app/settings/membership/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { toast } from 'react-toastify';

export default function MembershipSettingsPage() {
  const [price, setPrice] = useState<string>('');
  const [initialPrice, setInitialPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings/membership');
        const data = await res.json();
        if (data.success) {
          const priceString = String(data.price || '0');
          setPrice(priceString);
          setInitialPrice(priceString);
        } else {
          toast.error(data.message || 'Failed to load settings.');
        }
      } catch (error) {
        toast.error('An error occurred while loading settings.');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      toast.error('Please enter a valid, non-negative price.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/settings/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: numericPrice }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Membership fee saved!');
        setInitialPrice(String(numericPrice));
      } else {
        toast.error(data.message || 'Failed to save settings.');
      }
    } catch (error) {
      toast.error('An error occurred while saving.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = price !== initialPrice;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Membership Settings</h1>
      <p className="text-gray-600 mb-6">
        Define the one-time fee a customer pays to become a member. This fee will be automatically added to the bill when a membership is granted.
      </p>

      {isLoading ? (
        <p>Loading settings...</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="membership-fee" className="block text-sm font-medium text-gray-700">
              Membership Fee (₹)
            </label>
            <div className="mt-1">
              <input
                type="number"
                id="membership-fee"
                name="membership-fee"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 text-base py-3 px-4"
                placeholder="e.g., 1500"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!hasChanges || isSaving || isLoading}
              className="inline-flex justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}