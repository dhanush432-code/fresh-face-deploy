import { useState, useEffect, FC } from 'react';
import { CurrencyRupeeIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cost: number) => void;
  cost: number; // The current cost from the parent (e.g., 0)
  isLoading: boolean;
}

const CostModal: FC<CostModalProps> = ({ isOpen, onClose, onSave, cost, isLoading }) => {
  // === THIS IS THE KEY CHANGE ===
  // 1. A new local state 'inputValue' is created as a STRING.
  // A string can be empty (''), while a number cannot. This is how we get the empty field.
  const [inputValue, setInputValue] = useState<string>('');

  // 2. This 'useEffect' hook runs ONLY when the modal opens.
  // It sets the initial value for our string state.
  useEffect(() => {
    if (isOpen) {
      // THE LOGIC FOR THE EMPTY FIELD:
      // If the 'cost' from the parent is 0, set our 'inputValue' to an empty string ('').
      // If the 'cost' is anything else (like 8), set 'inputValue' to "8".
      setInputValue(cost > 0 ? String(cost) : '');
    }
  }, [isOpen, cost]);

  const handleSave = () => {
    // When saving, convert the string from the input back to a number.
    const numericCost = parseFloat(inputValue);

    if (isNaN(numericCost) || numericCost < 0) {
      alert('Please enter a valid, non-negative number for the cost.');
      return;
    }
    // Send the final, valid number back to the parent page.
    onSave(numericCost);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800">Set Cost Per Unit</h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200" aria-label="Close">
                <XMarkIcon className="h-6 w-6" />
            </button>
        </div>

        <div className="p-6">
            <p className="text-sm text-gray-600">This cost will be applied to all currently displayed readings.</p>
            <div className="mt-4">
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700">Cost (INR)</label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <CurrencyRupeeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                {/* 3. The input field's value is now tied to our 'inputValue' string state. */}
                <input
                  type="number"
                  name="cost"
                  id="cost"
                  className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  placeholder="e.g., 8.50"
                  step="0.01"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none disabled:opacity-50" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
              <button type="button" className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save & Recalculate'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}

export default CostModal;